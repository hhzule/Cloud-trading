```bash
# Build
docker build -t cloudtrade-frontend .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_TRADING_API=http://api:3000 \
  -e NEXT_PUBLIC_MARKET_DATA_API=http://market-data:8000 \
  -e NEXT_PUBLIC_MARKET_DATA_WS=ws://market-data:8000 \
  cloudtrade-frontend
```