
#!/bin/bash

# Run load tests against the platform

set -e

TARGET_URL=${1:-http://localhost}
DURATION=${2:-30s}
VUS=${3:-100}

echo "🔥 Running load test"
echo "Target: $TARGET_URL"
echo "Duration: $DURATION"
echo "Virtual Users: $VUS"

# Install k6 if not present
if ! command -v k6 &> /dev/null; then
    echo "Installing k6..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    else
        sudo apt-get update
        sudo apt-get install -y k6
    fi
fi

# Create load test script
cat > /tmp/load-test.js <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: __ENV.VUS || 10,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
  },
};

export default function() {
  // Test frontend
  let frontendRes = http.get(`${__ENV.TARGET_URL}`);
  check(frontendRes, {
    'frontend status 200': (r) => r.status === 200,
  });

  // Test trading API
  let apiRes = http.get(`${__ENV.TARGET_URL}/api/trades`);
  check(apiRes, {
    'api status 200': (r) => r.status === 200,
  });

  // Test market data
  let marketRes = http.get(`${__ENV.TARGET_URL}/market-data/api/markets`);
  check(marketRes, {
    'market data status 200': (r) => r.status === 200,
  });

  sleep(1);
}
EOF

# Run test
k6 run /tmp/load-test.js \
  --env TARGET_URL=$TARGET_URL \
  --env DURATION=$DURATION \
  --env VUS=$VUS

echo "✅ Load test complete"
