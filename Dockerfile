# Backend image for docker-compose.yml's `app` service.
#
# NOTE: written and reviewed against the actual repo structure
# (requirements.txt/requirements-dev.txt, src/ layout, pyproject.toml's
# package-dir mapping, braintodo.main:app entrypoint) but NOT verified by
# an actual `docker build` run - this sandbox has no docker daemon
# available. A future session with docker access should run
# `docker compose build app` and `docker compose up` as the first real
# end-to-end verification of this file and of docker-compose.yml as a
# whole (see Decisions.md and verification.md).
FROM python:3.12-slim

WORKDIR /app

# python-igraph (F022's Leiden clustering) and some scientific-stack wheels
# need a C build toolchain if a matching pre-built wheel isn't available
# for this exact base image/architecture.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Only runtime dependencies - requirements-dev.txt (pytest/ruff/mypy) is
# deliberately not installed in the production image.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir --no-deps -e .

EXPOSE 8000

CMD ["uvicorn", "braintodo.main:app", "--host", "0.0.0.0", "--port", "8000"]
