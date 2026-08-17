from braintodo.models.node import NodeUpdate


async def test_search_finds_node_by_keyword(auth_headers) -> None:
    client, headers, store = auth_headers
    node = (await client.post("/nodes", json={"title": "Neural networks"}, headers=headers)).json()
    other = (await client.post("/nodes", json={"title": "Gardening tips"}, headers=headers)).json()
    owner_id = node["owner_id"]
    # FakeEmbeddingProvider's vectors aren't semantically meaningful (all
    # components positive, so cosine similarity is always high regardless of
    # topic - see its docstring). Zero them out so only the keyword signal
    # is under test here; real semantic ranking is covered by test_search.py.
    await store.update_node(node["id"], NodeUpdate(embedding=[0.0] * 8), owner_id)
    await store.update_node(other["id"], NodeUpdate(embedding=[0.0] * 8), owner_id)

    resp = await client.get("/search", params={"q": "neural"}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["matches"]) == 1
    assert body["matches"][0]["node_id"] == node["id"]


async def test_search_includes_neighboring_subgraph(auth_headers) -> None:
    client, headers, _store = auth_headers
    a = (await client.post("/nodes", json={"title": "Neural networks"}, headers=headers)).json()
    b = (await client.post("/nodes", json={"title": "Backpropagation"}, headers=headers)).json()
    await client.post(
        "/edges", json={"source_id": a["id"], "target_id": b["id"]}, headers=headers
    )

    resp = await client.get("/search", params={"q": "neural", "depth": 1}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    subgraph_ids = {n["id"] for n in body["subgraph_nodes"]}
    assert subgraph_ids == {a["id"], b["id"]}
    assert len(body["subgraph_edges"]) == 1


async def test_no_match_returns_empty_result(auth_headers) -> None:
    client, headers, store = auth_headers
    node = (await client.post("/nodes", json={"title": "Gardening tips"}, headers=headers)).json()
    owner_id = node["owner_id"]
    await store.update_node(node["id"], NodeUpdate(embedding=[0.0] * 8), owner_id)

    resp = await client.get("/search", params={"q": "quantum computing"}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["matches"] == []
    assert body["subgraph_nodes"] == []
    assert body["subgraph_edges"] == []