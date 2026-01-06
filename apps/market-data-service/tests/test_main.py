

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_get_symbols():
    response = client.get("/api/symbols")
    assert response.status_code == 200
    assert "symbols" in response.json()
    assert len(response.json()["symbols"]) > 0

def test_get_market_data():
    response = client.get("/api/market/BTC")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "BTC"
    assert "price" in data
    assert "timestamp" in data

def test_get_all_markets():
    response = client.get("/api/markets")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) > 0

def test_invalid_symbol():
    response = client.get("/api/market/INVALID")
    assert response.status_code == 404

def test_websocket():
    with client.websocket_connect("/ws/BTC") as websocket:
        data = websocket.receive_json()
        assert data["symbol"] == "BTC"
        assert "price" in data
