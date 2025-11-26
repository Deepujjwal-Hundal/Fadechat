/**
 * Vercel Serverless Function Entry Point
 * This replaces the traditional Express server for Vercel deployment
 */

const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import route handlers
const registerHandler = require('./register');
const verifyHandler = require('./verify');
const loginHandler = require('./login');
const logoutHandler = require('./logout');
const userHandler = require('./user');
const messagesHandler = require('./messages');

// API Routes
app.post('/api/register', registerHandler);
app.post('/api/verify', verifyHandler);
app.post('/api/login', loginHandler);
app.post('/api/logout', logoutHandler);
app.get('/api/user', userHandler);
app.get('/api/messages', messagesHandler);

// Export for Vercel
module.exports = app;

