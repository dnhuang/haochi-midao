def test_analyze_success(client, auth_headers):
    payload = {
        "orders": [
            {"肉末香茹胡罗卜糯米烧卖15个/份": 3, "荠菜鲜肉馄饨50/份": 2},
            {"肉末香茹胡罗卜糯米烧卖15个/份": 1, "素鸭每份": 2},
        ]
    }
    resp = client.post("/analyze", headers={**auth_headers, "Content-Type": "application/json"}, json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["orders_analyzed"] == 2
    assert data["total_items"] == 8
    assert len(data["sorted_items"]) == 3
    # First item should have highest quantity
    assert data["sorted_items"][0]["quantity"] >= data["sorted_items"][-1]["quantity"]


def test_analyze_empty_orders(client, auth_headers):
    resp = client.post("/analyze", headers={**auth_headers, "Content-Type": "application/json"}, json={"orders": []})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_items"] == 0
    assert data["orders_analyzed"] == 0


def test_analyze_no_auth(client):
    resp = client.post("/analyze", json={"orders": []})
    assert resp.status_code == 422
