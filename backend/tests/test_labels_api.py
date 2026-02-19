def test_labels_returns_pdf(client, auth_headers):
    payload = {
        "sorted_items": [
            {"item_name": "肉末香茹胡罗卜糯米烧卖15个/份", "quantity": 3},
            {"item_name": "荠菜鲜肉馄饨50/份", "quantity": 2},
        ]
    }
    resp = client.post("/labels", headers={**auth_headers, "Content-Type": "application/json"}, json=payload)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:5] == b"%PDF-"


def test_labels_no_auth(client):
    resp = client.post("/labels", json={"sorted_items": []})
    assert resp.status_code == 422
