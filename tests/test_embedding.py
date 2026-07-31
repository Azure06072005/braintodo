from braintodo.embedding.fake_provider import FakeEmbeddingProvider


def test_same_text_produces_same_embedding() -> None: 
    provider = FakeEmbeddingProvider()
    assert provider.embed("hello world") == provider.embed("hello world")

def test_different_text_produces_different_embedding() -> None: 
    provider = FakeEmbeddingProvider()
    assert provider.embed("hello") != provider.embed("goodbye")

def test_embedding_has_configured_dimension() -> None: 
    provider = FakeEmbeddingProvider(dimension=16)
    assert len(provider.embed("anything")) == 16
    assert provider.dimension == 16
    