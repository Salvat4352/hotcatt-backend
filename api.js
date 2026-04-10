// Simple working backend for Vercel
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'HOTCATT API is working!' });
});

// Student login (temporary test version)
app.post('/api/auth/student-login', (req, res) => {
    const { student_id, pin } = req.body;
    
    // Simple test login - accepts any ID with pin 1234
    if (pin === '1234') {
        res.json({
            success: true,
            token: 'test-token-123',
            user: {
                id: student_id || 1,
                name: 'Test Student',
                role: 'student'
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Get courses (temporary test version)
app.get('/api/courses', (req, res) => {
    res.json({
        success: true,
        courses: [
            { course_id: 1, course_name: 'Occupational Health and Safety', course_type: 'core' },
            { course_id: 2, course_name: 'French', course_type: 'core' },
            { course_id: 3, course_name: 'Kitchen Operations', course_type: 'elective' }
        ]
    });
});

// Export for Vercel
module.exports = app;