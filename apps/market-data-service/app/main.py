
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, generate_latest, REGISTRY
from contextlib import asynccontextmanager
import asyncio
import json
import random
import logging
from datetime import datetime
from typing import Dict, List, Set
import redis.asyncio as redis
from pydantic import BaseModel
import os

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('market_data_requests_total', 'Total market data requests', ['endpoint', 'method'])
REQUEST_DURATION = Histogram('market_data_request_duration_seconds', 'Request duration', ['endpoint'])
ACTIVE_CONNECTIONS = Counter('market_data_active_connections', 'Active WebSocket connections')
PRICE_UPDATES = Counter('market_data_price_updates_total', 'Total price updates sent', ['symbol'])

# Redis connection
redis_client = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, symbol: str):
        await websocket.accept()
        if symbol not in self.active_connections:
            self.active_connections[symbol] = set()
        self.active_connections[symbol].add(websocket)
        ACTIVE_CONNECTIONS.inc()
        logger.info(f"New connection for {symbol}. Total: {len(self.active_connections[symbol])}")
        
    def disconnect(self, websocket: WebSocket, symbol: str):
        if symbol in self.active_connections:
            self.active_connections[symbol].discard(websocket)
            if not self.active_connections[symbol]:
                del self.active_connections[symbol]
        ACTIVE_CONNECTIONS.dec()
        logger.info(f"Connection closed for {symbol}")
        
    async def broadcast(self, symbol: str, message: dict):
        if symbol in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[symbol]:
                try:
                    await connection.send_json(message)
                    PRICE_UPDATES.labels(symbol=symbol).inc()
                except Exception as e:
                    logger.error(f"Error sending to client: {e}")
                    dead_connections.add(connection)
            
            # Clean up dead connections
            for conn in dead_connections:
                self.active_connections[symbol].discard(conn)

manager = ConnectionManager()

# Market data generator
class MarketDataGenerator:
    def __init__(self):
        self.symbols = {
            "BTC": 45000.0,
            "ETH": 3000.0,
            "SOL": 100.0,
            "MATIC": 0.80,
            "AVAX": 35.0
        }
        self.running = False
        
    async def generate_price_updates(self):
        """Generate realistic price movements"""
        self.running = True
        while self.running:
            for symbol, base_price in self.symbols.items():
                # Random price movement (-2% to +2%)
                change_percent = random.uniform(-0.02, 0.02)
                new_price = base_price * (1 + change_percent)
                self.symbols[symbol] = new_price
                
                # Create market data
                market_data = {
                    "symbol": symbol,
                    "price": round(new_price, 2),
                    "change_24h": round(change_percent * 100, 2),
                    "volume_24h": round(random.uniform(1000000, 10000000), 2),
                    "high_24h": round(new_price * 1.05, 2),
                    "low_24h": round(new_price * 0.95, 2),
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                # Cache in Redis
                if redis_client:
                    try:
                        await redis_client.setex(
                            f"market:{symbol}",
                            60,  # 60 second TTL
                            json.dumps(market_data)
                        )
                    except Exception as e:
                        logger.error(f"Redis error: {e}")
                
                # Broadcast to WebSocket clients
                await manager.broadcast(symbol, market_data)
            
            await asyncio.sleep(1)  # Update every second
    
    def stop(self):
        self.running = False

market_generator = MarketDataGenerator()

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global redis_client
    # accessing docker
    redis_host = os.getenv("REDIS_HOST", "localhost") 
    # redis_host = os.getenv("REDIS_HOST", "redis")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    
    try:
        redis_client = await redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        await redis_client.ping()
        logger.info("Connected to Redis")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
    
    # Start market data generator
    asyncio.create_task(market_generator.generate_price_updates())
    logger.info("Market data generator started")
    
    yield
    
    # Shutdown
    market_generator.stop()
    if redis_client:
        await redis_client.close()
    logger.info("Market data service stopped")

# FastAPI app
app = FastAPI(
    title="Market Data Service",
    description="Real-time cryptocurrency market data",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class MarketData(BaseModel):
    symbol: str
    price: float
    change_24h: float
    volume_24h: float
    high_24h: float
    low_24h: float
    timestamp: str

class SymbolList(BaseModel):
    symbols: List[str]

# Health check endpoints
@app.get("/health")
async def health_check():
    """Kubernetes liveness probe"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    try:
        if redis_client:
            await redis_client.ping()
        return {
            "status": "ready",
            "redis": "connected" if redis_client else "disconnected"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Not ready: {str(e)}")

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest(REGISTRY)

# API endpoints
@app.get("/")
async def root():
    return {
        "service": "Market Data Service",
        "version": "1.0.0",
        "endpoints": {
            "market_data": "/api/market/{symbol}",
            "all_markets": "/api/markets",
            "websocket": "/ws/{symbol}"
        }
    }

@app.get("/api/markets", response_model=List[MarketData])
async def get_all_markets():
    """Get current data for all markets"""
    REQUEST_COUNT.labels(endpoint="/api/markets", method="GET").inc()
    
    markets = []
    for symbol in market_generator.symbols.keys():
        if redis_client:
            try:
                cached = await redis_client.get(f"market:{symbol}")
                if cached:
                    markets.append(json.loads(cached))
                    continue
            except Exception as e:
                logger.error(f"Redis error: {e}")
        
        # Fallback to current price
        markets.append({
            "symbol": symbol,
            "price": market_generator.symbols[symbol],
            "change_24h": 0.0,
            "volume_24h": 0.0,
            "high_24h": market_generator.symbols[symbol],
            "low_24h": market_generator.symbols[symbol],
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return markets

@app.get("/api/market/{symbol}", response_model=MarketData)
async def get_market_data(symbol: str):
    """Get current data for specific market"""
    REQUEST_COUNT.labels(endpoint="/api/market/{symbol}", method="GET").inc()
    
    symbol = symbol.upper()
    
    if symbol not in market_generator.symbols:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    # Try Redis cache first
    if redis_client:
        try:
            cached = await redis_client.get(f"market:{symbol}")
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Redis error: {e}")
    
    # Fallback
    return {
        "symbol": symbol,
        "price": market_generator.symbols[symbol],
        "change_24h": 0.0,
        "volume_24h": 0.0,
        "high_24h": market_generator.symbols[symbol],
        "low_24h": market_generator.symbols[symbol],
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/symbols")
async def get_symbols():
    """Get list of available symbols"""
    REQUEST_COUNT.labels(endpoint="/api/symbols", method="GET").inc()
    return {"symbols": list(market_generator.symbols.keys())}

# WebSocket endpoint
@app.websocket("/ws/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    """WebSocket for real-time market data"""
    symbol = symbol.upper()
    
    if symbol not in market_generator.symbols:
        await websocket.close(code=1008, reason=f"Symbol {symbol} not found")
        return
    
    await manager.connect(websocket, symbol)
    
    try:
        # Send initial data
        current_data = await get_market_data(symbol)
        await websocket.send_json(current_data.dict())
        
        # Keep connection alive and handle client messages
        while True:
            data = await websocket.receive_text()
            # Echo back or handle commands
            await websocket.send_json({"status": "received", "message": data})
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, symbol)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, symbol)

# Run with: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload