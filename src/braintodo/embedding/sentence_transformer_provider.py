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

    dimension: int

    def __init__(self, model_name: str = _DEFAULT_MODEL) -> None:
        # Imported lazily so the (heavy) sentence-transformers/torch
        # dependency is only loaded if this provider is actually used.
        from sentence_transformers import SentenceTransformer

        try:
            self._model = SentenceTransformer(model_name)
        except OSError as exc:
            raise RuntimeError(
                f"Could not load sentence-transformers model '{model_name}'. "
                "This provider needs outbound network access to huggingface.co "
                "on first use, or a pre-populated local HF cache (set HF_HOME "
                "and pre-download the model in offline/sandboxed environments). "
                "If this environment can't reach huggingface.co (e.g. local "
                "dev, CI, or a network-restricted sandbox), set "
                "EMBEDDING_PROVIDER=fake to use the dependency-free fake "
                "provider instead."
            ) from exc
        # get_sentence_embedding_dimension() is typed as returning `int |
        # None` upstream, but is None in practice only for exotic custom
        # model heads with no fixed output size - not a case this app
        # supports anyway (EmbeddingProvider.dimension is a required int).
        # Falling back to 384 (all-MiniLM-L6-v2's real dimension) rather
        # than asserting/crashing keeps this provider usable even against
        # such a model, while still satisfying the EmbeddingProvider
        # protocol's `dimension: int` for mypy.
        dim = self._model.get_sentence_embedding_dimension()
        self.dimension = int(dim) if dim is not None else 384

    def embed(self, text: str) -> list[float]:
        vector = self._model.encode(text, normalize_embeddings=True)
        return vector.tolist()


@lru_cache
def get_sentence_transformer_provider(
    model_name: str = _DEFAULT_MODEL,
) -> SentenceTransformerProvider:
    """Singleton (per model_name) so the model is loaded into memory only once
    per process."""
    return SentenceTransformerProvider(model_name)