import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import requests
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

logger = logging.getLogger("uvicorn.error")

_CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "geocode_cache.json"


def _load_cache() -> dict:
    """Load geocode cache from disk. Returns empty dict if file doesn't exist."""
    try:
        return json.loads(_CACHE_PATH.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_cache(cache: dict) -> None:
    """Write geocode cache to disk."""
    _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _CACHE_PATH.write_text(json.dumps(cache, indent=2))


@dataclass
class Location:
    """A geocoded delivery location."""

    address: str
    city: str
    zip_code: str
    lat: float
    lng: float
    customer: str
    index: int  # original order index, -1 for start


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

    # Check cache first
    cache = _load_cache()
    if full_address in cache:
        logger.info("Geocode cache hit: %s", full_address)
        entry = cache[full_address]
        return entry["lat"], entry["lng"]

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
    lat, lng = location["lat"], location["lng"]

    # Save to cache
    logger.info("Geocode cache miss, calling API: %s", full_address)
    cache[full_address] = {"lat": lat, "lng": lng}
    _save_cache(cache)

    return lat, lng


def get_distance_matrix(
    locations: List[Location],
    api_key: str,
) -> Tuple[List[List[int]], List[List[int]]]:
    """Get N×N driving distance (meters) and duration (seconds) matrices.

    Batches requests so each has at most 10×10 = 100 elements,
    respecting the API's 100-element-per-request limit.

    Returns (distance_matrix, duration_matrix).
    """
    n = len(locations)
    coords = [f"{loc.lat},{loc.lng}" for loc in locations]
    dist_matrix = [[0] * n for _ in range(n)]
    dur_matrix = [[0] * n for _ in range(n)]

    batch_size = 10
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
                        dist_matrix[i_start + i_offset][j_start + j_offset] = element["distance"]["value"]
                        dur_matrix[i_start + i_offset][j_start + j_offset] = element["duration"]["value"]
                    else:
                        dist_matrix[i_start + i_offset][j_start + j_offset] = 999_999_999
                        dur_matrix[i_start + i_offset][j_start + j_offset] = 999_999_999

    return dist_matrix, dur_matrix


def solve_tsp(
    distance_matrix: List[List[int]],
    start_idx: int,
) -> List[int]:
    """Solve open-ended TSP with fixed start using OR-Tools.

    Returns ordered list of node indices (does not return to start).
    """
    n = len(distance_matrix)
    if n <= 2:
        return list(range(n))

    # Zero out return-to-start costs so the solver treats this as open-ended
    matrix = [row[:] for row in distance_matrix]
    for i in range(n):
        matrix[i][start_idx] = 0

    manager = pywrapcp.RoutingIndexManager(n, 1, start_idx)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return matrix[from_node][to_node]

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
    # Don't append return-to-start — route is open-ended

    return route


@dataclass
class RouteStop:
    """A single stop in the optimized route."""

    stop_number: int
    customer: str
    address: str
    city: str
    zip_code: str
    order_index: int  # -1 for start waypoint
    duration_seconds: int  # travel time from previous stop (0 for start)


def optimize_route(
    orders: List[dict],
    start_address: str,
    api_key: str,
) -> List[RouteStop]:
    """Geocode all addresses, compute distance matrix, solve TSP, return ordered stops.

    The route starts at start_address and ends at the last delivery stop (no round-trip).

    orders: list of dicts with keys: index, customer, address, city, zip_code
    start_address: free-text start address (geocoded as-is)
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

    dist_matrix, dur_matrix = get_distance_matrix(locations, api_key)
    route_indices = solve_tsp(dist_matrix, 0)

    stops = []
    for i, loc_idx in enumerate(route_indices):
        loc = locations[loc_idx]
        if i == 0:
            duration_seconds = 0
        else:
            prev_loc_idx = route_indices[i - 1]
            duration_seconds = dur_matrix[prev_loc_idx][loc_idx]
        stops.append(
            RouteStop(
                stop_number=i + 1,
                customer=loc.customer,
                address=loc.address,
                city=loc.city,
                zip_code=loc.zip_code,
                order_index=loc.index,
                duration_seconds=duration_seconds,
            )
        )

    return stops
