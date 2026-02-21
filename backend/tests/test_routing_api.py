from unittest.mock import patch

from app.routing import GeocodingError, RouteStop


def test_route_success(client, auth_headers):
    mock_stops = [
        RouteStop(1, "Start", "start addr", "", "", -1, 0),
        RouteStop(2, "Alice", "a1", "NYC", "10001", 0, 600),
    ]
    with patch("app.routers.routing.optimize_route", return_value=mock_stops):
        with patch("app.routers.routing.get_google_maps_api_key", return_value="fake"):
            resp = client.post(
                "/api/route",
                headers={**auth_headers, "Content-Type": "application/json"},
                json={
                    "orders": [
                        {
                            "index": 0,
                            "customer": "Alice",
                            "address": "a1",
                            "city": "NYC",
                            "zip_code": "10001",
                        },
                    ],
                    "start_address": "start addr",
                },
            )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_stops"] == 2
    assert data["stops"][0]["customer"] == "Start"
    assert data["stops"][0]["duration_seconds"] == 0
    assert data["stops"][1]["duration_seconds"] == 600


def test_route_no_orders(client, auth_headers):
    with patch("app.routers.routing.get_google_maps_api_key", return_value="fake"):
        resp = client.post(
            "/api/route",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "orders": [],
                "start_address": "start",
            },
        )
    assert resp.status_code == 400


def test_route_geocoding_error(client, auth_headers):
    with patch(
        "app.routers.routing.optimize_route",
        side_effect=GeocodingError("bad", "not found"),
    ):
        with patch("app.routers.routing.get_google_maps_api_key", return_value="fake"):
            resp = client.post(
                "/api/route",
                headers={**auth_headers, "Content-Type": "application/json"},
                json={
                    "orders": [
                        {
                            "index": 0,
                            "customer": "A",
                            "address": "bad",
                            "city": "",
                            "zip_code": "",
                        },
                    ],
                    "start_address": "start",
                },
            )
    assert resp.status_code == 400


def test_route_no_auth(client):
    resp = client.post(
        "/api/route",
        json={
            "orders": [],
            "start_address": "s",
        },
    )
    assert resp.status_code == 422
