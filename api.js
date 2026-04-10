/**
 * HOTCATT ATTENDANCE SYSTEM - COMPLETE BACKEND FOR VERCEL
 * All code is in one file to avoid path resolution issues
 */

// Load environment variables
require('dotenv').config();

// Import required packages
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// ========== SUPABASE CONNECTION ==========
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ========== CREATE EXPRESS APP ==========
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ========== JWT VERIFICATION MIDDLEWARE ==========
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

// ========== ROUTES ==========

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'HOTCATT Attendance API is running!' });
});

// ========== STUDENT LOGIN ==========
app.post('/api/auth/student-login', async (req, res) => {
    const { student_id, pin } = req.body;
    
    if (!student_id || !pin) {
        return res.status(400).json({ error: 'Student ID and PIN required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('student_id', parseInt(student_id))
            .maybeSingle();
        
        if (error || !data) {
            return res.status(401).json({ error: 'Invalid student ID or PIN' });
        }
        
        // Check PIN (plain text for test students)
        if (data.pin_hash !== pin) {
            return res.status(401).json({ error: 'Invalid student ID or PIN' });
        }
        
        const token = jwt.sign(
            { id: data.student_id, role: 'student', name: data.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: data.student_id,
                name: data.full_name,
                phone: data.phone,
                role: 'student',
                elective_id: data.elective_id
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== ADMIN LOGIN ==========
app.post('/api/auth/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign(
            { role: 'admin', name: 'Administrator' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: { name: 'Administrator', role: 'admin' }
        });
    } else {
        res.status(401).json({ error: 'Invalid admin credentials' });
    }
});

// ========== GET ALL COURSES ==========
app.get('/api/courses', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('course_id');
        
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch courses' });
        }
        
        res.json({ success: true, courses: data });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== MARK ATTENDANCE ==========
app.post('/api/attendance/mark', verifyToken, async (req, res) => {
    const { course_id, marking_method } = req.body;
    const student_id = req.user.id;
    
    if (!course_id) {
        return res.status(400).json({ error: 'Course ID required' });
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        
        // Check if already marked
        const { data: existing } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', student_id)
            .eq('course_id', course_id)
            .eq('date', today)
            .maybeSingle();
        
        if (existing) {
            return res.status(400).json({ error: 'Attendance already marked for this course today' });
        }
        
        // Determine status (late after 8:30 AM)
        const lateTime = '08:30:00';
        const status = currentTime > lateTime ? 'late' : 'present';
        
        const { data, error } = await supabase
            .from('attendance')
            .insert([{
                student_id: student_id,
                course_id: course_id,
                date: today,
                time: currentTime,
                status: status,
                marking_method: marking_method || 'button',
                synced: true
            }])
            .select();
        
        if (error) {
            return res.status(500).json({ error: 'Failed to save attendance' });
        }
        
        res.json({
            success: true,
            message: `Attendance marked as ${status}`,
            attendance: data[0]
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET MY ATTENDANCE HISTORY ==========
app.get('/api/attendance/my-attendance', verifyToken, async (req, res) => {
    const student_id = req.user.id;
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                attendance_id,
                date,
                time,
                status,
                courses (course_id, course_name, course_type)
            `)
            .eq('student_id', student_id)
            .order('date', { ascending: false });
        
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch history' });
        }
        
        res.json({ success: true, attendance: data });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET TODAY'S ATTENDANCE ==========
app.get('/api/attendance/today', verifyToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                attendance_id,
                date,
                time,
                status,
                students (student_id, full_name),
                courses (course_id, course_name, course_type)
            `)
            .eq('date', today);
        
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch attendance' });
        }
        
        res.json({ success: true, attendance: data });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Export for Vercel
module.exports = app;