async def test_returns_a_cluster_for_connected_nodes(auth_headers) -> None:
    client, headers, _store = auth_headers
    a = (await client.post("/nodes", json={"title": "A"}, headers=headers)).json()
    b = (await client.post("/nodes", json={"title": "B"}, headers=headers)).json()
    await client.post(
        "/edges", json={"source_id": a["id"], "target_id": b["id"]}, headers=headers
    )

    resp = await client.get("/clusters", headers=headers)
    assert resp.status_code == 200
    clusters = resp.json()
    assert len(clusters) == 1
    assert set(clusters[0]["node_ids"]) == {a["id"], b["id"]}
    assert "label" in clusters[0]


async def test_empty_graph_returns_empty_list(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.get("/clusters", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_resolution_query_param_is_accepted(auth_headers) -> None:
    client, headers, _store = auth_headers
    a = (await client.post("/nodes", json={"title": "A"}, headers=headers)).json()
    b = (await client.post("/nodes", json={"title": "B"}, headers=headers)).json()
    await client.post(
        "/edges", json={"source_id": a["id"], "target_id": b["id"]}, headers=headers
    )

    resp = await client.get("/clusters", params={"resolution": 2.5}, headers=headers)
    assert resp.status_code == 200


async def test_resolution_must_be_positive(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.get("/clusters", params={"resolution": 0}, headers=headers)
    assert resp.status_code == 422

    resp = await client.get("/clusters", params={"resolution": -1}, headers=headers)
    assert resp.status_code == 422