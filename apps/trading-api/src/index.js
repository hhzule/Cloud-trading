// apps/trading-api/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const redis = require('redis');
const { Pool } = require('pg');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Database connection
const db = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'trading',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.connect();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request timing middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    await redisClient.ping();
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API Routes
app.get('/api/portfolio/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Try cache first
    const cached = await redisClient.get(`portfolio:${userId}`);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Query database
    const result = await db.query(
      'SELECT * FROM portfolios WHERE user_id = $1',
      [userId]
    );

    const portfolio = result.rows[0] || { user_id: userId, balance: 0, positions: [] };

    // Cache for 30 seconds
    await redisClient.setEx(`portfolio:${userId}`, 30, JSON.stringify(portfolio));

    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/trades', async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  
  try {
    const result = await db.query(
      'SELECT * FROM trades ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      trades: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/trade', async (req, res) => {
  const { user_id, symbol, quantity, price, side } = req.body;

  if (!user_id || !symbol || !quantity || !price || !side) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO trades (user_id, symbol, quantity, price, side, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [user_id, symbol, quantity, price, side]
    );

    // Invalidate cache
    await redisClient.del(`portfolio:${user_id}`);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating trade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await db.end();
  await redisClient.quit();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Trading API listening on port ${PORT}`);
});