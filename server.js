// SIMPLE WORKING BACKEND - NO ADMIN ENDPOINTS YET
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'HOTCATT API is working!' });
});

// Student login
app.post('/api/auth/student-login', async (req, res) => {
    const { student_id, pin } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('student_id', student_id)
            .single();
        
        if (error || !data) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        if (data.pin_hash !== pin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: data.student_id, role: 'student' },
            process.env.JWT_SECRET
        );
        
        res.json({ success: true, token, user: { id: data.student_id, name: data.full_name } });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin login
app.post('/api/auth/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
        res.json({ success: true, token, user: { name: 'Admin', role: 'admin' } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Get courses
app.get('/api/courses', async (req, res) => {
    const { data, error } = await supabase.from('courses').select('*');
    res.json({ courses: data });
});

// Mark attendance
app.post('/api/attendance/mark', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { course_id, marking_method } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        const status = currentTime > '08:30:00' ? 'late' : 'present';
        
        await supabase.from('attendance').insert([{
            student_id: decoded.id,
            course_id: course_id,
            date: today,
            time: currentTime,
            status: status,
            marking_method: marking_method || 'button'
        }]);
        
        res.json({ success: true, message: `Marked as ${status}` });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Get today's attendance
app.get('/api/attendance/today', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('attendance')
            .select(`*, students(full_name), courses(course_name)`)
            .eq('date', today);
        
        res.json({ attendance: data });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});