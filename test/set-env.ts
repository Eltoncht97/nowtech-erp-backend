process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5433/nowtech_erp_test?schema=public';

// Isolated test signing key; never used as an application default.
process.env.JWT_SECRET = 'nowtech-test-only-jwt-signing-secret';
