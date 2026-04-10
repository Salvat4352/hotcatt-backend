/**
 * AUTHENTICATION ROUTES
 * 
 * Handles login for:
 * - Students (using student_id and PIN)
 * - Instructors (using email and PIN)
 * - Admin (using username and password)
 */

const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ========== STUDENT LOGIN ==========
// POST /api/auth/student-login
// Body: { student_id: number, pin: string }
router.post('/student-login', async (req, res) => {
    const { student_id, pin } = req.body;
    
    // Validate input
    if (!student_id || !pin) {
        return res.status(400).json({ error: 'Student ID and PIN required' });
    }
    
    try {
        // Query database for student
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('student_id', parseInt(student_id))
            .single();
        
        // Check if student exists
        if (error || !data) {
            return res.status(401).json({ error: 'Invalid student ID or PIN' });
        }
        
        // Verify PIN (supports both plain text and hashed)
        let isValid = false;
        
        // For test students with plain text PIN (1234)
        if (data.pin_hash === '1234' || data.pin_hash === 'temp123') {
            isValid = (pin === data.pin_hash);
        } else {
            // For production with hashed PINs
            isValid = await bcrypt.compare(pin, data.pin_hash);
        }
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid student ID or PIN' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: data.student_id, 
                role: 'student', 
                name: data.full_name,
                type: 'student' 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Return success response
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
        console.error('Student login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== INSTRUCTOR LOGIN ==========
// POST /api/auth/instructor-login
// Body: { email: string, pin: string }
router.post('/instructor-login', async (req, res) => {
    const { email, pin } = req.body;
    
    if (!email || !pin) {
        return res.status(400).json({ error: 'Email and PIN required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('instructors')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !data) {
            return res.status(401).json({ error: 'Invalid email or PIN' });
        }
        
        // Verify PIN
        let isValid = false;
        if (data.pin_hash === 'temp123') {
            isValid = (pin === data.pin_hash);
        } else {
            isValid = await bcrypt.compare(pin, data.pin_hash);
        }
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or PIN' });
        }
        
        // Get the course assigned to this instructor
        const { data: courseData } = await supabase
            .from('courses')
            .select('course_id, course_name')
            .eq('instructor_id', data.instructor_id)
            .single();
        
        const token = jwt.sign(
            { 
                id: data.instructor_id, 
                role: 'instructor', 
                name: data.full_name,
                email: data.email,
                course_id: courseData?.course_id,
                type: 'instructor' 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: data.instructor_id,
                name: data.full_name,
                email: data.email,
                role: 'instructor',
                course_id: courseData?.course_id,
                course_name: courseData?.course_name
            }
        });
    } catch (err) {
        console.error('Instructor login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== ADMIN LOGIN ==========
// POST /api/auth/admin-login
// Body: { username: string, password: string }
router.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple hardcoded admin check (change these credentials)
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign(
            { role: 'admin', name: 'Administrator', type: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: { 
                name: 'Administrator', 
                role: 'admin' 
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid admin credentials' });
    }
});

module.exports = router;