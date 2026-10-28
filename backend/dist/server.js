"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const app_1 = require("./app");
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const server = app_1.app.listen(env_1.env.PORT, async () => {
    console.log(`====================================================`);
    console.log(` University Event & Attendance Management Backend `);
    console.log(`====================================================`);
    console.log(` Environment: ${env_1.env.NODE_ENV}`);
    console.log(` Server Port: ${env_1.env.PORT}`);
    console.log(` Health URL:  http://localhost:${env_1.env.PORT}/api/health`);
    console.log(` CORS Origin: ${env_1.env.CORS_ORIGIN}`);
    console.log(`====================================================`);
    const dbHealth = await (0, database_1.checkDatabaseHealth)();
    if (dbHealth.connected) {
        console.log(`[Database] Connected to PostgreSQL successfully (Latency: ${dbHealth.latencyMs}ms)`);
    }
    else {
        console.warn(`[Database] PostgreSQL connection warning: ${dbHealth.error}`);
        console.warn(`[Database] Server running. Please ensure PostgreSQL is running for full functionality.`);
    }
});
exports.server = server;
// Graceful shutdown handling
const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
        console.log('HTTP server closed.');
        try {
            await database_1.pool.end();
            console.log('PostgreSQL connection pool drained.');
            process.exit(0);
        }
        catch (err) {
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
