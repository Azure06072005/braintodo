import pytest

from braintodo.models.node import NodeUpdate


async def test_suggests_link_between_similar_nodes(auth_headers) -> None:
    client, headers, store = auth_headers
    a = (await client.post("/nodes", json={"title": "A"}, headers=headers)).json()
    b = (await client.post("/nodes", json={"title": "B"}, headers=headers)).json()
    owner_id = a["owner_id"]
    await store.update_node(a["id"], NodeUpdate(graph_embedding=[1.0, 0.0]), owner_id)
    await store.update_node(b["id"], NodeUpdate(graph_embedding=[1.0, 0.0]), owner_id)

    resp = await client.get("/links/suggestions", headers=headers)
    assert resp.status_code == 200
    suggestions = resp.json()
    assert len(suggestions) == 1
    assert {suggestions[0]["source_id"], suggestions[0]["target_id"]} == {
        a["id"],
        b["id"],
    }
    assert suggestions[0]["score"] == pytest.approx(1.0)


async def test_no_suggestions_on_empty_graph(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.get("/links/suggestions", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []