from unittest.mock import MagicMock, patch

import pytest

from app.routing import (
    GeocodingError,
    Location,
    RoutingError,
    geocode_address,
    get_distance_matrix,
    optimize_route,
    solve_tsp,
)


class TestGeocodeAddress:
    @patch("app.routing.requests.get")
    def test_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "OK",
            "results": [{"geometry": {"location": {"lat": 40.7128, "lng": -74.006}}}],
        }
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        lat, lng = geocode_address("123 Main St", "New York", "10001", "fake-key")
        assert lat == 40.7128
        assert lng == -74.006

    @patch("app.routing.requests.get")
    def test_zero_results(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": "ZERO_RESULTS", "results": []}
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        with pytest.raises(GeocodingError):
            geocode_address("nonexistent", "", "", "fake-key")

    @patch("app.routing.requests.get")
    def test_http_error(self, mock_get):
        import requests

        mock_get.side_effect = requests.RequestException("Connection error")
        with pytest.raises(GeocodingError):
            geocode_address("addr", "city", "zip", "fake-key")


class TestSolveTsp:
    def test_two_nodes(self):
        matrix = [[0, 100], [100, 0]]
        result = solve_tsp(matrix, 0, 1)
        assert result == [0, 1]

    def test_three_nodes(self):
        matrix = [
            [0, 10, 20],
            [10, 0, 5],
            [20, 5, 0],
        ]
        result = solve_tsp(matrix, 0, 2)
        assert result[0] == 0
        assert result[-1] == 2
        assert len(result) == 3

    def test_single_node(self):
        matrix = [[0]]
        result = solve_tsp(matrix, 0, 0)
        assert 0 in result


class TestGetDistanceMatrix:
    @patch("app.routing.requests.get")
    def test_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "OK",
            "rows": [
                {
                    "elements": [
                        {"status": "OK", "distance": {"value": 0}},
                        {"status": "OK", "distance": {"value": 1000}},
                    ]
                },
                {
                    "elements": [
                        {"status": "OK", "distance": {"value": 1000}},
                        {"status": "OK", "distance": {"value": 0}},
                    ]
                },
            ],
        }
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        locations = [
            Location("a", "c", "z", 40.0, -74.0, "Alice", 0),
            Location("b", "c", "z", 41.0, -73.0, "Bob", 1),
        ]
        matrix = get_distance_matrix(locations, "fake-key")
        assert matrix[0][1] == 1000
        assert matrix[1][0] == 1000
        assert matrix[0][0] == 0

    @patch("app.routing.requests.get")
    def test_api_error(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": "REQUEST_DENIED"}
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        locations = [
            Location("a", "c", "z", 40.0, -74.0, "Alice", 0),
        ]
        with pytest.raises(RoutingError):
            get_distance_matrix(locations, "fake-key")


class TestOptimizeRoute:
    @patch("app.routing.get_distance_matrix")
    @patch("app.routing.geocode_address")
    def test_full_flow(self, mock_geocode, mock_matrix):
        mock_geocode.side_effect = [
            (40.0, -74.0),  # start
            (40.1, -73.9),  # order 1
            (40.2, -73.8),  # order 2
            (40.3, -73.7),  # end
        ]
        mock_matrix.return_value = [
            [0, 100, 200, 300],
            [100, 0, 100, 200],
            [200, 100, 0, 100],
            [300, 200, 100, 0],
        ]

        orders = [
            {"index": 0, "customer": "Alice", "address": "a1", "city": "NYC", "zip_code": "10001"},
            {"index": 1, "customer": "Bob", "address": "a2", "city": "NYC", "zip_code": "10002"},
        ]
        stops = optimize_route(orders, "start addr", "end addr", "fake-key")

        assert len(stops) == 4
        assert stops[0].customer == "Start"
        assert stops[-1].customer == "End"
        assert stops[0].stop_number == 1

    @patch("app.routing.geocode_address")
    def test_geocoding_failure(self, mock_geocode):
        mock_geocode.side_effect = [
            (40.0, -74.0),  # start succeeds
            GeocodingError("bad addr", "not found"),  # order fails
        ]

        orders = [
            {"index": 0, "customer": "Alice", "address": "bad", "city": "", "zip_code": ""},
        ]
        with pytest.raises(GeocodingError):
            optimize_route(orders, "start", "end", "fake-key")
