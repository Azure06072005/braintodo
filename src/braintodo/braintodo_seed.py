"""
braintodo_seed.py — Tạo nhanh 1 "dự án" (node gốc) + các ý tưởng con, tự
động nối edge giữa gốc và từng con.

Cách dùng:
    pip install httpx
    python braintodo_seed.py

Chỉnh phần CONFIG bên dưới để đổi nội dung dự án / API URL.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field

import httpx

# ---------------------------------------------------------------------------
# CONFIG — chỉnh phần này cho phù hợp với dự án của bạn
# ---------------------------------------------------------------------------

BASE_URL = "http://localhost:8000"

PROJECT = {
    "title": "Dự án: Ra mắt tính năng Search",
    "content": "Xây dựng semantic + keyword search cho braintodo",
    "tags": ["project", "phase-3"],
    "weight": 3.0,
    "color": "#ff4d4f",
    "shape": "square",
    "size": 20.0,
}

# Mỗi item: (nội dung node con, relation_type dùng để nối về node gốc)
CHILDREN = [
    (
        {
            "title": "Thiết kế thuật toán keyword + semantic match",
            "content": "Kết hợp substring match và cosine similarity",
            "tags": ["subtask", "design"],
        },
        "expands",
    ),
    (
        {
            "title": "Viết endpoint GET /search",
            "content": "Nhận q, limit, depth; trả về matches + subgraph",
            "tags": ["subtask", "implementation"],
        },
        "part_of",
    ),
    (
        {
            "title": "Viết test cho search (unit + API)",
            "content": "test_search.py và test_search_api.py",
            "tags": ["subtask", "testing"],
        },
        "part_of",
    ),
    (
        {
            "title": "Thiết kế thuật toán keyword + semantic match",
            "content": "Kết hợp substring match và cosine similarity",
            "tags": ["subtask", "design"],
        },
        "expands",
    ),
    (
        {
            "title": "Viết endpoint GET /search",
            "content": "Nhận q, limit, depth; trả về matches + subgraph",
            "tags": ["subtask", "implementation"],
        },
        "part_of",
    ),
    (
        {
            "title": "Viết test cho search (unit + API)",
            "content": "test_search.py và test_search_api.py",
            "tags": ["subtask", "testing"],
        },
        "part_of",
    ),
]


# ---------------------------------------------------------------------------
# Không cần sửa gì bên dưới
# ---------------------------------------------------------------------------


@dataclass
class SeedResult:
    project_id: str
    child_ids: list[str] = field(default_factory=list)
    edge_ids: list[str] = field(default_factory=list)


class BraintodoClient:
    """Wrapper mỏng quanh httpx để gọi API braintodo."""

    def __init__(self, base_url: str) -> None:
        self._client = httpx.Client(base_url=base_url, timeout=10.0)

    def close(self) -> None:
        self._client.close()

    def create_node(self, data: dict) -> dict:
        resp = self._client.post("/nodes", json=data)
        resp.raise_for_status()
        return resp.json()

    def create_edge(self, source_id: str, target_id: str, relation_type: str) -> dict:
        resp = self._client.post(
            "/edges",
            json={
                "source_id": source_id,
                "target_id": target_id,
                "relation_type": relation_type,
            },
        )
        resp.raise_for_status()
        return resp.json()


def seed_project(client: BraintodoClient) -> SeedResult:
    project_node = client.create_node(PROJECT)
    project_id = project_node["id"]
    print(f"[OK] Tạo node dự án chính: {PROJECT['title']!r} -> id={project_id}")

    result = SeedResult(project_id=project_id)

    for child_data, relation_type in CHILDREN:
        child_node = client.create_node(child_data)
        child_id = child_node["id"]
        print(f"[OK] Tạo node con: {child_data['title']!r} -> id={child_id}")

        edge = client.create_edge(project_id, child_id, relation_type)
        print(
            f"     -> nối edge ({relation_type}) "
            f"{project_id[:8]}... -> {child_id[:8]}... (edge id={edge['id']})"
        )

        result.child_ids.append(child_id)
        result.edge_ids.append(edge["id"])

    return result


def main() -> int:
    client = BraintodoClient(BASE_URL)
    try:
        result = seed_project(client)
    except httpx.HTTPStatusError as exc:
        print(f"[LỖI] {exc.request.method} {exc.request.url} -> {exc.response.status_code}")
        print(exc.response.text)
        return 1
    except httpx.ConnectError:
        print(f"[LỖI] Không kết nối được tới {BASE_URL}. App braintodo đã chạy chưa?")
        return 1
    finally:
        client.close()

    print()
    print("=== Tóm tắt ===")
    print(f"Project node id : {result.project_id}")
    print(f"Số node con     : {len(result.child_ids)}")
    print(f"Số edge đã nối  : {len(result.edge_ids)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())