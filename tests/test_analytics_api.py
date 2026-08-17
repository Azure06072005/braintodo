async def test_returns_metrics_for_each_node(auth_headers) -> None:
    client, headers, _store = auth_headers
    a = (await client.post("/nodes", json={"title": "A"}, headers=headers)).json()
    b = (await client.post("/nodes", json={"title": "B"}, headers=headers)).json()
    await client.post(
        "/edges", json={"source_id": a["id"], "target_id": b["id"]}, headers=headers
    )

    resp = await client.get("/analytics/topology", headers=headers)
    assert resp.status_code == 200
    metrics = resp.json()
    assert {m["node_id"] for m in metrics} == {a["id"], b["id"]}
    for m in metrics:
        assert m["degree"] == 1


async def test_empty_graph_returns_empty_list(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.get("/analytics/topology", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []