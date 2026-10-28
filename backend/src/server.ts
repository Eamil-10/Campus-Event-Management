import { app } from './app';
import { env } from './config/env';
import { pool, checkDatabaseHealth } from './config/database';
import { schedulerService } from './services/schedulerService';

const server = app.listen(env.PORT, async () => {
  console.log(`====================================================`);
  console.log(` University Event & Attendance Management Backend `);
  console.log(`====================================================`);
  console.log(` Environment: ${env.NODE_ENV}`);
  console.log(` Server Port: ${env.PORT}`);
  console.log(` Health URL:  http://localhost:${env.PORT}/api/health`);
  console.log(` CORS Origin: ${env.CORS_ORIGIN}`);
  console.log(`====================================================`);

  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.connected) {
    console.log(`[Database] Connected to PostgreSQL successfully (Latency: ${dbHealth.latencyMs}ms)`);
  } else {
    console.warn(`[Database] PostgreSQL connection warning: ${dbHealth.error}`);
    console.warn(`[Database] Server running. Please ensure PostgreSQL is running for full functionality.`);
  }
  // Start scheduler service
  schedulerService.start();
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('PostgreSQL connection pool drained.');
      schedulerService.stop();
      process.exit(0);
    } catch (err) {
      console.error('Error closing database pool:', err);
      process.exit(1);
    }
  });

  // Force exit if shutdown takes longer than 10 seconds
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { server };
