import hashlib


class FakeEmbeddingProvider: 
    """Deterministic test double for EmbeddingProvider. Same text always
    produces the same vector, different text produces a different vector -
    good enough to test the pipeline's plumbing without downloading a real
    model or needing network access."""

    def __init__(self, dimension: int = 8) -> None: 
        self.dimension = dimension

    def embed(self, text: str) -> list[float]: 
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        # Turn the first dimension bytes of the hash into floats in [0,1)
        return [b / 255 for b in digest[: self.dimension]]