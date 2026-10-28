"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/health', async (_req, res) => {
    const dbHealth = await (0, database_1.checkDatabaseHealth)();
    const responseBody = {
        status: dbHealth.connected ? 'ok' : 'degraded',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        service: 'university-event-platform-backend',
        version: '1.0.0',
        database: dbHealth,
    };
    const httpStatus = dbHealth.connected ? 200 : 503;
    res.status(httpStatus).json(responseBody);
});
