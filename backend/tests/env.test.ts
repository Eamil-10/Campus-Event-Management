import { env } from '../src/config/env';

describe('Environment Configuration Module', () => {
  it('loads valid environment defaults', () => {
    expect(env).toBeDefined();
    expect(typeof env.PORT).toBe('number');
    expect(env.PORT).toBeGreaterThan(0);
    expect(env.PORT).toBeLessThan(65536);
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
    expect(env.API_PREFIX).toBe('/api/v1');
    expect(env.CORS_ORIGIN).toBeDefined();
  });

  it('provides safe database connection parameters', () => {
    expect(env.DB_HOST).toBeDefined();
    expect(typeof env.DB_PORT).toBe('number');
    expect(env.DB_USER).toBeDefined();
    expect(env.DB_NAME).toBeDefined();
    expect(typeof env.DB_SSL).toBe('boolean');
    expect(typeof env.DB_POOL_MAX).toBe('number');
  });

  it('enforces secure minimum session secret length', () => {
    expect(env.SESSION_SECRET.length).toBeGreaterThanOrEqual(16);
  });
});
