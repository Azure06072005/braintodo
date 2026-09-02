from datetime import UTC, datetime, timedelta


async def test_today_excludes_idea_nodes(auth_headers) -> None:
    client, headers, _store = auth_headers
    await client.post("/nodes", json={"title": "Just an idea"}, headers=headers)

    resp = await client.get("/tasks/today", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_today_includes_overdue_and_due_today_tasks(auth_headers) -> None:
    client, headers, _store = auth_headers
    yesterday = (datetime.now(UTC).date() - timedelta(days=1)).isoformat()
    today = datetime.now(UTC).date().isoformat()
    await client.post(
        "/nodes",
        json={"title": "Overdue", "node_type": "task", "due_date": yesterday},
        headers=headers,
    )
    await client.post(
        "/nodes",
        json={"title": "Due today", "node_type": "task", "due_date": today},
        headers=headers,
    )

    resp = await client.get("/tasks/today", headers=headers)
    assert resp.status_code == 200
    titles = {n["title"] for n in resp.json()}
    assert titles == {"Overdue", "Due today"}


async def test_today_excludes_future_tasks(auth_headers) -> None:
    client, headers, _store = auth_headers
    next_year = (datetime.now(UTC).date() + timedelta(days=365)).isoformat()
    await client.post(
        "/nodes",
        json={"title": "Next year", "node_type": "task", "due_date": next_year},
        headers=headers,
    )

    resp = await client.get("/tasks/today", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_today_excludes_tasks_with_no_due_date(auth_headers) -> None:
    client, headers, _store = auth_headers
    await client.post(
        "/nodes", json={"title": "Someday", "node_type": "task"}, headers=headers
    )

    resp = await client.get("/tasks/today", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_today_excludes_completed_tasks(auth_headers) -> None:
    client, headers, _store = auth_headers
    yesterday = (datetime.now(UTC).date() - timedelta(days=1)).isoformat()
    resp = await client.post(
        "/nodes",
        json={"title": "Done already", "node_type": "task", "due_date": yesterday},
        headers=headers,
    )
    node_id = resp.json()["id"]
    await client.patch(f"/nodes/{node_id}/complete", headers=headers)

    resp = await client.get("/tasks/today", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_today_is_owner_scoped(app_client) -> None:
    client, _store, make_token = app_client
    token_a = await make_token(email="taskday_a@example.com")
    token_b = await make_token(email="taskday_b@example.com")
    yesterday = (datetime.now(UTC).date() - timedelta(days=1)).isoformat()

    await client.post(
        "/nodes",
        json={"title": "A's overdue task", "node_type": "task", "due_date": yesterday},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    resp = await client.get(
        "/tasks/today", headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 200
    assert resp.json() == []


async def test_today_requires_authentication(app_client) -> None:
    client, _store, _make_token = app_client
    resp = await client.get("/tasks/today")
    assert resp.status_code == 401


async def test_summary_counts_created_today(auth_headers) -> None:
    client, headers, _store = auth_headers
    today = datetime.now(UTC).date().isoformat()
    await client.post(
        "/nodes", json={"title": "New task", "node_type": "task"}, headers=headers
    )
    # An idea-node created the same moment must not count - summary is task-only.
    await client.post("/nodes", json={"title": "Idea"}, headers=headers)

    resp = await client.get(f"/tasks/summary?date={today}", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["created"] == 1
    assert body["completed"] == 0
    assert body["avg_completion_seconds"] is None


async def test_summary_counts_completed_today_and_avg_completion(auth_headers) -> None:
    client, headers, _store = auth_headers
    today = datetime.now(UTC).date().isoformat()
    resp = await client.post(
        "/nodes", json={"title": "Quick task", "node_type": "task"}, headers=headers
    )
    node_id = resp.json()["id"]
    await client.patch(f"/nodes/{node_id}/complete", headers=headers)

    resp = await client.get(f"/tasks/summary?date={today}", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["completed"] == 1
    assert body["avg_completion_seconds"] is not None
    assert body["avg_completion_seconds"] >= 0


async def test_summary_counts_overdue_uncompleted_tasks(auth_headers) -> None:
    client, headers, _store = auth_headers
    today = datetime.now(UTC).date().isoformat()
    yesterday = (datetime.now(UTC).date() - timedelta(days=1)).isoformat()
    await client.post(
        "/nodes",
        json={"title": "Overdue", "node_type": "task", "due_date": yesterday},
        headers=headers,
    )

    resp = await client.get(f"/tasks/summary?date={today}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["overdue"] == 1


async def test_summary_excludes_completed_tasks_from_overdue(auth_headers) -> None:
    client, headers, _store = auth_headers
    today = datetime.now(UTC).date().isoformat()
    yesterday = (datetime.now(UTC).date() - timedelta(days=1)).isoformat()
    resp = await client.post(
        "/nodes",
        json={"title": "Was overdue, now done", "node_type": "task", "due_date": yesterday},
        headers=headers,
    )
    node_id = resp.json()["id"]
    await client.patch(f"/nodes/{node_id}/complete", headers=headers)

    resp = await client.get(f"/tasks/summary?date={today}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["overdue"] == 0


async def test_summary_is_owner_scoped(app_client) -> None:
    client, _store, make_token = app_client
    token_a = await make_token(email="tasksummary_a@example.com")
    token_b = await make_token(email="tasksummary_b@example.com")
    today = datetime.now(UTC).date().isoformat()

    await client.post(
        "/nodes",
        json={"title": "A's task", "node_type": "task"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    resp = await client.get(
        f"/tasks/summary?date={today}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert resp.json()["created"] == 0


async def test_summary_requires_date_param(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.get("/tasks/summary", headers=headers)
    assert resp.status_code == 422


async def test_summary_requires_authentication(app_client) -> None:
    client, _store, _make_token = app_client
    today = datetime.now(UTC).date().isoformat()
    resp = await client.get(f"/tasks/summary?date={today}")
    assert resp.status_code == 401