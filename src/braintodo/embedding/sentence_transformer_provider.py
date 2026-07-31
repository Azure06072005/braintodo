"""Real EmbeddingProvider backed by a sentence-transformers model.

NOTE: loading the model downloads weights from huggingface.co on first use.
Set HF_HOME to control the local cache location, or pre-download the model
in environments without internet access at runtime.
"""

from functools import lru_cache

_DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


class SentenceTransformerProvider:
    """Wraps a sentence-transformers model. `dimension` matches the model's
    native output size (384 for all-MiniLM-L6-v2)."""

    def __init__(self, model_name: str = _DEFAULT_MODEL) -> None:
        # Imported lazily so the (heavy) sentence-transformers/torch
        # dependency is only loaded if this provider is actually used.
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name)
        self.dimension = self._model.get_sentence_embedding_dimension()

    def embed(self, text: str) -> list[float]:
        vector = self._model.encode(text, normalize_embeddings=True)
        return vector.tolist()


@lru_cache
def get_sentence_transformer_provider() -> SentenceTransformerProvider:
    """Singleton so the model is loaded into memory only once per process."""
    return SentenceTransformerProvider()