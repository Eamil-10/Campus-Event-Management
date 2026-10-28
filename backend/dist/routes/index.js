"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const health_1 = require("./health");
const auth_1 = require("./auth");
const events_1 = require("./events");
exports.apiRouter = (0, express_1.Router)();
// Root health check endpoint directly at /api/health
exports.apiRouter.use('/', health_1.healthRouter);
// Versioned API v1 router
const v1Router = (0, express_1.Router)();
v1Router.use('/', health_1.healthRouter);
v1Router.use('/auth', auth_1.authRouter);
v1Router.use('/events', events_1.eventsRouter);
// Mount versioned router
exports.apiRouter.use('/v1', v1Router);
