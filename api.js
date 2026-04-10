/**
 * HOTCATT ATTENDANCE SYSTEM - BACKEND API (Vercel Serverless Entry Point)
 * 
 * This file is the main entry point for Vercel serverless deployment.
 * It exports the Express app as a serverless function.
 */

// Load environment variables from .env file
require('dotenv').config();

// Import required packages
const express = require('express');      // Web framework for Node.js
const cors = require('cors');            // Enables Cross-Origin Resource Sharing

// Import route handlers
const authRoutes = require('./src/routes/auth');
const attendanceRoutes = require('./src/routes/attendance');
const courseRoutes = require('./src/routes/courses');

// Create Express application
const app = express();

// ========== MIDDLEWARE ==========
// Middleware functions run before every request
app.use(cors());                    // Allows frontend to call this API from different domains
app.use(express.json());            // Automatically parses JSON request bodies

// ========== ROUTES ==========
// Each route handles different API endpoints
app.use('/api/auth', authRoutes);           // Login endpoints (student, instructor, admin)
app.use('/api/attendance', attendanceRoutes); // Mark attendance, view history
app.use('/api/courses', courseRoutes);       // Get course list

// ========== TEST ROUTE ==========
// Simple endpoint to check if API is running
app.get('/', (req, res) => {
    res.json({ message: 'HOTCATT Attendance API is running!' });
});

// ========== 404 HANDLER ==========
// Catches any requests to undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ========== EXPORT FOR VERCEL ==========
// This is the key line for Vercel serverless deployment
module.exports = app;