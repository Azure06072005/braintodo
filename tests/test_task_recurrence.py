from datetime import date


async def test_completing_daily_recurring_task_creates_next_day_instance(
    auth_headers,
) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes",
        json={
            "title": "Water plants",
            "node_type": "task",
            "due_date": "2026-06-10",
            "priority": "low",
            "recurrence_rule": "daily",
        },
        headers=headers,
    )
    node_id = resp.json()["id"]

    resp = await client.patch(f"/nodes/{node_id}/complete", headers=headers)
    assert resp.status_code == 200

    resp = await client.get("/nodes?type=task", headers=headers)
    tasks = resp.json()["items"]
    assert len(tasks) == 2
    next_task = next(t for t in tasks if t["id"] != node_id)
    assert next_task["title"] == "Water plants"
    assert next_task["due_date"] == "2026-06-11"
    assert next_task["priority"] == "low"
    assert next_task["recurrence_rule"] == "daily"
    assert next_task["completed_at"] is None


async def test_completing_weekly_recurring_task_advances_seven_days(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes",
        json={
            "title": "Team sync",
            "node_type": "task",
            "due_date": "2026-06-10",
            "recurrence_rule": "weekly",
        },
        headers=headers,
    )
    node_id = resp.json()["id"]
    await client.patch(f"/nodes/{node_id}/complete", headers=headers)

    resp = await client.get("/nodes?type=task", headers=headers)
    tasks = resp.json()["items"]
    next_task = next(t for t in tasks if t["id"] != node_id)
    assert next_task["due_date"] == "2026-06-17"


async def test_completing_monthly_recurring_task_clamps_month_end(auth_headers) -> None:
    client, headers, _store = auth_headers
    # Jan 31 has no equivalent day in February - must clamp to Feb's last day.
    resp = await client.post(
        "/nodes",
        json={
            "title": "Pay rent",
            "node_type": "task",
            "due_date": "2026-01-31",
            "recurrence_rule": "monthly",
        },
        headers=headers,
    )
    node_id = resp.json()["id"]
    await client.patch(f"/nodes/{node_id}/complete", headers=headers)

    resp = await client.get("/nodes?type=task", headers=headers)
    tasks = resp.json()["items"]
    next_task = next(t for t in tasks if t["id"] != node_id)
    assert next_task["due_date"] == "2026-02-28"  # 2026 is not a leap year


async def test_completing_non_recurring_task_creates_nothing(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes",
        json={"title": "One-off", "node_type": "task", "due_date": "2026-06-10"},
        headers=headers,
    )
    node_id = resp.json()["id"]
    await client.patch(f"/nodes/{node_id}/complete", headers=headers)

    resp = await client.get("/nodes?type=task", headers=headers)
    assert resp.json()["total"] == 1


async def test_completing_recurring_task_with_no_due_date_creates_nothing(
    auth_headers,
) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes",
        json={"title": "No due date", "node_type": "task", "recurrence_rule": "daily"},
        headers=headers,
    )
    node_id = resp.json()["id"]
    await client.patch(f"/nodes/{node_id}/complete", headers=headers)

    resp = await client.get("/nodes?type=task", headers=headers)
    assert resp.json()["total"] == 1


async def test_completing_idea_node_never_recurs(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post("/nodes", json={"title": "Just an idea"}, headers=headers)
    node_id = resp.json()["id"]
    resp = await client.patch(f"/nodes/{node_id}/complete", headers=headers)
    assert resp.status_code == 200

    resp = await client.get("/nodes", headers=headers)
    assert resp.json()["total"] == 1


def test_advance_due_date_helper_covers_all_rules() -> None:
    from braintodo.graph.repository import _advance_due_date

    assert _advance_due_date(date(2026, 6, 10), "daily") == date(2026, 6, 11)
    assert _advance_due_date(date(2026, 6, 10), "weekly") == date(2026, 6, 17)
    assert _advance_due_date(date(2026, 12, 15), "monthly") == date(2027, 1, 15)
    assert _advance_due_date(date(2024, 1, 31), "monthly") == date(2024, 2, 29)  # leap year