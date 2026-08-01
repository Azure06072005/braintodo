# ---- Builder stage ----
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only torch wheels — nhẹ hơn nhiều so với bản CUDA, đủ dùng vì service
# chỉ chạy inference nhỏ (GCN 32-d, MiniLM 384-d). Để chuyển sang GPU sau
# này: đổi base image sang một bản có CUDA và bỏ dòng --index-url dưới đây.
RUN pip install --no-cache-dir --user \
    --index-url https://download.pytorch.org/whl/cpu \
    torch \
    && pip install --no-cache-dir --user -r requirements.txt

# ---- Runtime stage ----
FROM python:3.12-slim

WORKDIR /app

RUN useradd --create-home --shell /bin/bash appuser
COPY --from=builder /root/.local /home/appuser/.local
COPY src ./src
COPY pyproject.toml .

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONPATH=/app/src \
    PYTHONUNBUFFERED=1

USER appuser

EXPOSE 8000

CMD ["uvicorn", "braintodo.main:app", "--host", "0.0.0.0", "--port", "8000"]