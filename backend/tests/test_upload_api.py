from io import BytesIO


def test_upload_success(client, auth_headers, sample_xlsx_bytes):
    resp = client.post("/api/upload", headers=auth_headers, files={"file": ("test.xlsx", sample_xlsx_bytes)})
    assert resp.status_code == 200
    data = resp.json()
    assert "orders" in data
    assert "discrepancies" in data
    assert "food_columns" in data
    assert "format" in data
    assert data["format"] in ("raw", "formatted")
    assert len(data["orders"]) == 4


def test_upload_no_auth(client, sample_xlsx_bytes):
    resp = client.post("/api/upload", files={"file": ("test.xlsx", sample_xlsx_bytes)})
    assert resp.status_code == 422  # missing header


def test_upload_wrong_password(client, sample_xlsx_bytes):
    resp = client.post(
        "/api/upload",
        headers={"X-Password": "wrong"},
        files={"file": ("test.xlsx", sample_xlsx_bytes)},
    )
    assert resp.status_code == 401


def test_upload_invalid_file(client, auth_headers):
    resp = client.post(
        "/api/upload",
        headers=auth_headers,
        files={"file": ("test.txt", BytesIO(b"not an xlsx"))},
    )
    assert resp.status_code == 400
