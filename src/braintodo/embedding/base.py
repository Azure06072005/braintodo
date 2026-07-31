from typing import Protocol


class EmbeddingProvider(Protocol): 
    """Backend-agnostic interface for turning text into a vector embedding.
    Real implementation uses a Transformer model; tests use a deterministic
    fake so they don't need network access or a model download."""

    dimension: int

    def embed(self, text: str) -> list[float]: ...

    