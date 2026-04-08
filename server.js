require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes (using correct paths)
const authRoutes = require('./src/routes/auth');
const attendanceRoutes = require('./src/routes/attendance');
const courseRoutes = require('./src/routes/courses');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes - MUST be before the catch-all
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/courses', courseRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'HOTCATT Attendance API is running!' });
});

// Catch-all for debugging - shows what route was requested
app.use('*', (req, res) => {
    console.log(`Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ HOTCATT Server running on http://localhost:${PORT}`);
    console.log(`📋 Available routes:`);
    console.log(`   POST /api/auth/student-login`);
    console.log(`   POST /api/auth/instructor-login`);
    console.log(`   POST /api/auth/admin-login`);
    console.log(`   POST /api/attendance/mark`);
    console.log(`   GET  /api/attendance/my-attendance`);
    console.log(`   GET  /api/courses`);
});

console.log("Server loaded successfully");