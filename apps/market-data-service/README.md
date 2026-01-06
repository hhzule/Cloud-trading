
# Market Data Service

Real-time cryptocurrency market data service built with FastAPI and WebSockets.

## Features

- Real-time price updates via WebSocket
- REST API for market data
- Redis caching
- Prometheus metrics
- Health checks for Kubernetes

## Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload

# Run tests
pytest

# Run with Docker
docker build -t market-data-service .
docker run -p 8000:8000 market-data-service
```

## API Endpoints

- `GET /health` - Health check
- `GET /ready` - Readiness check
- `GET /metrics` - Prometheus metrics
- `GET /api/markets` - Get all market data
- `GET /api/market/{symbol}` - Get specific market
- `GET /api/symbols` - List available symbols
- `WS /ws/{symbol}` - WebSocket for real-time updates

## WebSocket Example

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/BTC');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Price update:', data);
};
```