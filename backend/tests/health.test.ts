import request from 'supertest';
import { app } from '../src/app';

describe('API Health & System Endpoints', () => {
  it('GET /api/health returns a structured health response', async () => {
    const res = await request(app).get('/api/health');

    // Either 200 (database online) or 503 (database offline/unreachable in local test environment)
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('service', 'university-event-platform-backend');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('connected');
    expect(typeof res.body.database.connected).toBe('boolean');
  });

  it('GET /api/v1/health returns matching structured health response', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('database');
  });

  it('GET /api/nonexistent returns structured 404 JSON', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
