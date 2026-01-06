CREATE TABLE IF NOT EXISTS portfolios (
  user_id TEXT PRIMARY KEY,
  balance NUMERIC,
  positions JSONB
);

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  symbol TEXT,
  quantity NUMERIC,
  price NUMERIC,
  side TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

INSERT INTO portfolios (user_id, balance, positions)
VALUES
  ('user1', 10000, '[{"symbol":"AAPL","qty":10},{"symbol":"TSLA","qty":5}]'),
  ('user2', 25000, '[{"symbol":"GOOG","qty":3}]')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO trades (user_id, symbol, quantity, price, side)
VALUES
  ('user1','AAPL',10,175,'BUY'),
  ('user1','TSLA',5,720,'BUY'),
  ('user2','GOOG',3,2800,'BUY');
