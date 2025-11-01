// Test setup file - runs before all tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars-required-for-testing';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32chars!!';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/tokenstocks_test';
process.env.SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Increase timeout for integration tests
jest.setTimeout(10000);
