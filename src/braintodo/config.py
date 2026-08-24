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

    # "sentence_transformer" downloads/loads a real model from huggingface.co
    # on first use and requires outbound network access (or a pre-populated
    # HF cache). "fake" uses a deterministic, dependency-free provider - use
    # this in offline/sandboxed/CI environments where huggingface.co is not
    # reachable, to avoid every node-create call failing with a raw
    # OSError/connection-timeout stack trace.
    embedding_provider: str = "sentence_transformer"
    sentence_transformer_model: str = "sentence-transformers/all-MiniLM-L6-v2"


settings = Settings()