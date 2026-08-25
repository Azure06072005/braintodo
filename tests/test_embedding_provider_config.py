"""Regression tests for get_embedder()'s EMBEDDING_PROVIDER branching.

Context: production always hardcoded SentenceTransformerProvider, which
downloads model weights from huggingface.co on first use with no fallback.
Every existing test overrides get_embedder with a fake, so this path was
never actually exercised - meaning a network-restricted deploy would 500 on
every POST /nodes despite a fully green test suite. These tests exercise
get_embedder() directly (not via dependency_overrides) so a regression here
would actually be caught.
"""

import pytest

from braintodo.api.nodes import _default_fake_embedder, get_embedder
from braintodo.config import settings
from braintodo.embedding.fake_provider import FakeEmbeddingProvider


@pytest.fixture(autouse=True)
def _reset_embedding_provider_setting():
    """Isolate settings.embedding_provider mutations to each test."""
    original = settings.embedding_provider
    yield
    settings.embedding_provider = original


def test_fake_provider_selected_returns_fake_embedding_provider() -> None:
    settings.embedding_provider = "fake"
    embedder = get_embedder()
    assert isinstance(embedder, FakeEmbeddingProvider)


def test_fake_provider_is_a_cached_singleton() -> None:
    settings.embedding_provider = "fake"
    assert get_embedder() is _default_fake_embedder()


def test_fake_provider_embeds_deterministically_without_network() -> None:
    settings.embedding_provider = "fake"
    embedder = get_embedder()
    assert embedder.embed("hello world") == embedder.embed("hello world")


def test_unknown_provider_raises_clear_runtime_error() -> None:
    settings.embedding_provider = "not-a-real-provider"
    with pytest.raises(RuntimeError, match="Unknown EMBEDDING_PROVIDER"):
        get_embedder()


def test_sentence_transformer_unreachable_raises_actionable_error() -> None:
    """When EMBEDDING_PROVIDER is left at its production default and
    huggingface.co is unreachable (e.g. this sandboxed/offline test
    environment), get_embedder() must fail with a clear, actionable
    RuntimeError - not a raw OSError/connection-timeout stack trace, and
    not a silent fallback that masks the misconfiguration.
    """
    settings.embedding_provider = "sentence_transformer"
    with pytest.raises(RuntimeError, match="EMBEDDING_PROVIDER=fake"):
        get_embedder()