from dataclasses import dataclass
from typing import List, Tuple

import requests
from ortools.constraint_solver import pywrapcp, routing_enums_pb2


@dataclass
class Location:
    """A geocoded delivery location."""

    address: str
    city: str
    zip_code: str
    lat: float
    lng: float
    customer: str
    index: int  # original order index, -1 for start/end


class GeocodingError(Exception):
    """Raised when geocoding fails for an address."""

    def __init__(self, address: str, reason: str):
        self.address = address
        self.reason = reason
        super().__init__(f"Failed to geocode '{address}': {reason}")


class RoutingError(Exception):
    """Raised when route optimization fails."""

    pass


def geocode_address(
    address: str,
    city: str,
    zip_code: str,
    api_key: str,
) -> Tuple[float, float]:
    """Geocode a single address using Google Geocoding API. Returns (lat, lng)."""
    full_address = f"{address}, {city} {zip_code}".strip()
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": full_address, "key": api_key}

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise GeocodingError(full_address, f"HTTP error: {e}")

    data = resp.json()
    if data["status"] != "OK" or not data.get("results"):
        raise GeocodingError(full_address, f"Google API returned status: {data['status']}")

    location = data["results"][0]["geometry"]["location"]
    return location["lat"], location["lng"]


def get_distance_matrix(
    locations: List[Location],
    api_key: str,
) -> List[List[int]]:
    """Get N×N driving distance matrix (in meters) using Google Distance Matrix API.

    Batches requests in 25×25 chunks to respect the API limit.
    """
    n = len(locations)
    coords = [f"{loc.lat},{loc.lng}" for loc in locations]
    matrix = [[0] * n for _ in range(n)]

    batch_size = 25
    for i_start in range(0, n, batch_size):
        i_end = min(i_start + batch_size, n)
        for j_start in range(0, n, batch_size):
            j_end = min(j_start + batch_size, n)

            origin_str = "|".join(coords[i_start:i_end])
            dest_str = "|".join(coords[j_start:j_end])

            url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            params = {
                "origins": origin_str,
                "destinations": dest_str,
                "mode": "driving",
                "key": api_key,
            }

            try:
                resp = requests.get(url, params=params, timeout=30)
                resp.raise_for_status()
            except requests.RequestException as e:
                raise RoutingError(f"Distance Matrix API error: {e}")

            data = resp.json()
            if data["status"] != "OK":
                raise RoutingError(f"Distance Matrix API returned status: {data['status']}")

            for i_offset, row in enumerate(data["rows"]):
                for j_offset, element in enumerate(row["elements"]):
                    if element["status"] == "OK":
                        matrix[i_start + i_offset][j_start + j_offset] = element["distance"]["value"]
                    else:
                        matrix[i_start + i_offset][j_start + j_offset] = 999_999_999

    return matrix


def solve_tsp(
    distance_matrix: List[List[int]],
    start_idx: int,
    end_idx: int,
) -> List[int]:
    """Solve TSP with fixed start and end nodes using OR-Tools.

    Returns ordered list of node indices representing the optimal route.
    """
    n = len(distance_matrix)
    if n <= 2:
        return list(range(n))

    manager = pywrapcp.RoutingIndexManager(n, 1, [start_idx], [end_idx])
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.FromSeconds(5)

    solution = routing.SolveWithParameters(search_parameters)
    if not solution:
        raise RoutingError("OR-Tools could not find a solution")

    route = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        route.append(node)
        index = solution.Value(routing.NextVar(index))
    route.append(manager.IndexToNode(index))

    return route


@dataclass
class RouteStop:
    """A single stop in the optimized route."""

    stop_number: int
    customer: str
    address: str
    city: str
    zip_code: str
    order_index: int  # -1 for start/end waypoints


def optimize_route(
    orders: List[dict],
    start_address: str,
    end_address: str,
    api_key: str,
) -> List[RouteStop]:
    """Geocode all addresses, compute distance matrix, solve TSP, return ordered stops.

    orders: list of dicts with keys: index, customer, address, city, zip_code
    start_address: free-text start address (geocoded as-is)
    end_address: free-text end address (geocoded as-is)
    """
    locations: List[Location] = []

    # Geocode start
    start_lat, start_lng = geocode_address(start_address, "", "", api_key)
    locations.append(
        Location(address=start_address, city="", zip_code="", lat=start_lat, lng=start_lng, customer="Start", index=-1)
    )

    # Geocode each order address, collecting all errors
    errors = []
    for order in orders:
        try:
            lat, lng = geocode_address(order["address"], order["city"], order["zip_code"], api_key)
            locations.append(
                Location(
                    address=order["address"],
                    city=order["city"],
                    zip_code=order["zip_code"],
                    lat=lat,
                    lng=lng,
                    customer=order["customer"],
                    index=order["index"],
                )
            )
        except GeocodingError as e:
            errors.append(str(e))

    if errors:
        raise GeocodingError("multiple addresses", "Failed to geocode: " + "; ".join(errors))

    # Geocode end
    end_lat, end_lng = geocode_address(end_address, "", "", api_key)
    locations.append(
        Location(address=end_address, city="", zip_code="", lat=end_lat, lng=end_lng, customer="End", index=-1)
    )

    start_idx = 0
    end_idx = len(locations) - 1

    matrix = get_distance_matrix(locations, api_key)
    route_indices = solve_tsp(matrix, start_idx, end_idx)

    stops = []
    for stop_num, loc_idx in enumerate(route_indices, 1):
        loc = locations[loc_idx]
        stops.append(
            RouteStop(
                stop_number=stop_num,
                customer=loc.customer,
                address=loc.address,
                city=loc.city,
                zip_code=loc.zip_code,
                order_index=loc.index,
            )
        )

    return stops
