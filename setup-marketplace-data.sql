-- Create ownership for seller (user-123)
INSERT INTO ownerships (id, assetId, custodyRecordId, ownerId, quantity, createdAt, updatedAt)
VALUES (
  UUID(),
  'ROLEX-2025-001',
  '1d71526d-9634-4539-8ae5-916ba5e463de',
  'user-123',
  '1',
  NOW(),
  NOW()
);

-- Create user balance for seller
INSERT INTO user_balances (id, userId, balance, currency, createdAt, updatedAt)
VALUES (
  UUID(),
  'user-123',
  '0',
  'USD',
  NOW(),
  NOW()
);

-- Create user balance for buyer (user-456)
INSERT INTO user_balances (id, userId, balance, currency, createdAt, updatedAt)
VALUES (
  UUID(),
  'user-456',
  '20000',
  'USD',
  NOW(),
  NOW()
);
