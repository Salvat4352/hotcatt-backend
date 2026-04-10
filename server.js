// HOTCATT Attendance System - Complete Backend for Render
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// ========== INITIALIZE EXPRESS APP ==========
const app = express();

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json());

// ========== SUPABASE CONNECTION ==========
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ========== JWT VERIFICATION ==========
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

// ========== TEST ROUTE ==========
app.get('/', (req, res) => {
    res.json({ message: 'HOTCATT Attendance API is running on Render!' });
});

// ========== STUDENT LOGIN ==========
app.post('/api/auth/student-login', async (req, res) => {
    const { student_id, pin } = req.body;
    
    console.log('Student login attempt:', student_id);
    
    if (!student_id || !pin) {
        return res.status(400).json({ error: 'Student ID and PIN required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('student_id', parseInt(student_id))
            .single();
        
        if (error || !data) {
            console.log('Student not found:', student_id);
            return res.status(401).json({ error: 'Invalid student ID or PIN' });
        }
        
        if (data.pin_hash !== pin) {
            console.log('PIN mismatch for student:', student_id);
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
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== ADMIN LOGIN ==========
app.post('/api/auth/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('Admin login attempt:', username);
    
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
        
        if (error) throw error;
        
        res.json({ success: true, courses: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch courses' });
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
        
        const { data: existing } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', student_id)
            .eq('course_id', course_id)
            .eq('date', today)
            .maybeSingle();
        
        if (existing) {
            return res.status(400).json({ error: 'Already marked for this course today' });
        }
        
        const lateTime = '08:30:00';
        const status = currentTime > lateTime ? 'late' : 'present';
        
        const { error } = await supabase
            .from('attendance')
            .insert([{
                student_id: student_id,
                course_id: course_id,
                date: today,
                time: currentTime,
                status: status,
                marking_method: marking_method || 'button'
            }]);
        
        if (error) throw error;
        
        res.json({ success: true, message: `Marked as ${status}` });
    } catch (err) {
        console.error('Mark attendance error:', err);
        res.status(500).json({ error: 'Failed to save attendance' });
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
        
        if (error) throw error;
        
        res.json({ success: true, attendance: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch attendance' });
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
        
        if (error) throw error;
        
        res.json({ success: true, attendance: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ========== ADMIN: GET ALL STUDENTS ==========
app.get('/api/admin/students', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('student_id');
        
        if (error) throw error;
        res.json({ students: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// ========== ADMIN: ADD STUDENT ==========
app.post('/api/admin/students', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { student_id, full_name, phone, pin, elective_id } = req.body;
    
    try {
        const { error } = await supabase
            .from('students')
            .insert([{ 
                student_id: parseInt(student_id), 
                full_name, 
                phone: phone || null, 
                pin_hash: pin || '1234', 
                elective_id: parseInt(elective_id) 
            }]);
        
        if (error) throw error;
        res.json({ success: true, message: 'Student added' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add student' });
    }
});

// ========== ADMIN: UPDATE STUDENT ==========
app.put('/api/admin/students/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { full_name, phone, pin, elective_id } = req.body;
    
    const updateData = { full_name, phone, elective_id: parseInt(elective_id) };
    if (pin) updateData.pin_hash = pin;
    
    try {
        const { error } = await supabase
            .from('students')
            .update(updateData)
            .eq('student_id', parseInt(id));
        
        if (error) throw error;
        res.json({ success: true, message: 'Student updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update student' });
    }
});

// ========== ADMIN: DELETE STUDENT ==========
app.delete('/api/admin/students/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('student_id', parseInt(id));
        
        if (error) throw error;
        res.json({ success: true, message: 'Student deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

// ========== ADMIN: RESET PIN ==========
app.post('/api/admin/students/:id/reset-pin', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    try {
        const { error } = await supabase
            .from('students')
            .update({ pin_hash: '1234' })
            .eq('student_id', parseInt(id));
        
        if (error) throw error;
        res.json({ success: true, message: 'PIN reset to 1234' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset PIN' });
    }
});

// ========== ADMIN: GET STUDENT ATTENDANCE HISTORY ==========
app.get('/api/admin/students/:id/attendance', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', parseInt(id))
            .order('date', { ascending: false });
        
        if (error) throw error;
        res.json({ attendance: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// ========== 404 HANDLER ==========
app.use('*', (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HOTCATT Server running on port ${PORT}`);
    console.log(`📍 API available at http://localhost:${PORT}`);
});

module.exports = app;