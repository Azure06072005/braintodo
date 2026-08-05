from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"
    database_url: str = "postgresql+asyncpg://braintodo:changeme@localhost:5432/braintodo"

    jwt_secret_key: str = "change-this-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "braintodo <no-reply@braintodo.local>"

    frontend_base_url: str = "http://localhost:5173"

settings = Settings()