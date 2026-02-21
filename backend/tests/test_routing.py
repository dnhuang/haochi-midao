import json
from unittest.mock import MagicMock, patch

import pytest

from app.routing import (
    _CACHE_PATH,
    GeocodingError,
    Location,
    RoutingError,
    geocode_address,
    get_distance_matrix,
    optimize_route,
    solve_tsp,
)


@pytest.fixture(autouse=True)
def _clean_geocode_cache():
    """Remove geocode cache file before and after each test."""
    _CACHE_PATH.unlink(missing_ok=True)
    yield
    _CACHE_PATH.unlink(missing_ok=True)


class TestGeocodeCache:
    def test_geocode_uses_cache(self):
        """When the address is in the cache, the API should NOT be called."""
        cache = {"123 Main St, New York 10001": {"lat": 40.7, "lng": -74.0}}
        _CACHE_PATH.write_text(json.dumps(cache))

        with patch("app.routing.requests.get") as mock_get:
            lat, lng = geocode_address("123 Main St", "New York", "10001", "fake-key")

        mock_get.assert_not_called()
        assert lat == 40.7
        assert lng == -74.0

    @patch("app.routing.requests.get")
    def test_geocode_saves_to_cache(self, mock_get):
        """After a successful API call, the result should be written to the cache file."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "OK",
            "results": [{"geometry": {"location": {"lat": 37.77, "lng": -122.42}}}],
        }
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        geocode_address("456 Elm St", "San Francisco", "94102", "fake-key")

        cache = json.loads(_CACHE_PATH.read_text())
        assert "456 Elm St, San Francisco 94102" in cache
        assert cache["456 Elm St, San Francisco 94102"] == {"lat": 37.77, "lng": -122.42}

    @patch("app.routing.requests.get")
    def test_geocode_cache_miss_calls_api(self, mock_get):
        """When the address is NOT in the cache, the API should be called."""
        # Pre-populate cache with a different address
        cache = {"other address,": {"lat": 0, "lng": 0}}
        _CACHE_PATH.write_text(json.dumps(cache))

        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "OK",
            "results": [{"geometry": {"location": {"lat": 41.0, "lng": -73.0}}}],
        }
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        lat, lng = geocode_address("789 Oak Ave", "Boston", "02101", "fake-key")

        mock_get.assert_called_once()
        assert lat == 41.0
        assert lng == -73.0


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
        result = solve_tsp(matrix, 0)
        assert result == [0, 1]

    def test_three_nodes(self):
        matrix = [
            [0, 10, 20],
            [10, 0, 5],
            [20, 5, 0],
        ]
        result = solve_tsp(matrix, 0)
        assert result[0] == 0
        assert len(result) == 3

    def test_single_node(self):
        matrix = [[0]]
        result = solve_tsp(matrix, 0)
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
                        {"status": "OK", "distance": {"value": 0}, "duration": {"value": 0}},
                        {"status": "OK", "distance": {"value": 1000}, "duration": {"value": 600}},
                    ]
                },
                {
                    "elements": [
                        {"status": "OK", "distance": {"value": 1000}, "duration": {"value": 600}},
                        {"status": "OK", "distance": {"value": 0}, "duration": {"value": 0}},
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
        dist_matrix, dur_matrix = get_distance_matrix(locations, "fake-key")
        assert dist_matrix[0][1] == 1000
        assert dist_matrix[1][0] == 1000
        assert dist_matrix[0][0] == 0
        assert dur_matrix[0][1] == 600
        assert dur_matrix[1][0] == 600
        assert dur_matrix[0][0] == 0

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
        ]
        dist = [
            [0, 100, 200],
            [100, 0, 100],
            [200, 100, 0],
        ]
        dur = [
            [0, 300, 900],
            [300, 0, 420],
            [900, 420, 0],
        ]
        mock_matrix.return_value = (dist, dur)

        orders = [
            {"index": 0, "customer": "Alice", "address": "a1", "city": "NYC", "zip_code": "10001"},
            {"index": 1, "customer": "Bob", "address": "a2", "city": "NYC", "zip_code": "10002"},
        ]
        stops = optimize_route(orders, "start addr", "fake-key")

        # 3 stops: Start + 2 orders (no End stop)
        assert len(stops) == 3
        assert stops[0].customer == "Start"
        assert stops[0].stop_number == 1
        assert stops[0].duration_seconds == 0
        # All stops should have non-negative duration
        for stop in stops[1:]:
            assert stop.duration_seconds > 0
        # No End stop
        assert all(s.customer != "End" for s in stops)

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
            optimize_route(orders, "start", "fake-key")
