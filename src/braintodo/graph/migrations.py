from neo4j import AsyncDriver

_STATEMENTS = (
    ("CREATE CONSTRAINT idea_id_unique IF NOT EXISTS "
     "FOR (n:Idea) REQUIRE n.id IS UNIQUE"),
    ("CREATE CONSTRAINT relation_id_unique IF NOT EXISTS "
     "FOR ()-[r:RELATION]-() REQUIRE r.id IS UNIQUE"),
)

async def run_migrations(driver: AsyncDriver) -> None: 
    async with driver.session() as session: 
        for statement in _STATEMENTS: 
            await session.run(statement)