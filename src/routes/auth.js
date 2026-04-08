const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const jwt = require('jsonwebtoken');

console.log("✅ auth.js route file loaded");

// Student login
router.post('/student-login', async (req, res) => {
    const { student_id, pin } = req.body;
    
    console.log(`Login attempt: student_id=${student_id}, pin=${pin}`);
    
    if (!student_id || !pin) {
        return res.status(400).json({ error: 'Student ID and PIN required' });
    }
    
    try {
        // Query the student by student_id
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('student_id', parseInt(student_id))
            .maybeSingle();
        
        console.log('Query result:', data ? 'Student found' : 'Student not found');
        
        if (error) {
            console.log('Database error:', error);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!data) {
            return res.status(401).json({ error: 'Invalid student ID or PIN' });
        }
        
        // Compare PIN (plain text for now)
        if (data.pin_hash !== pin) {
            console.log(`PIN mismatch: provided=${pin}, stored=${data.pin_hash}`);
            return res.status(401).json({ error: 'Invalid student ID or PIN' });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { id: data.student_id, role: 'student', name: data.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token: token,
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
        res.status(500).json({ error: err.message });
    }
});

// Instructor login
router.post('/instructor-login', async (req, res) => {
    const { email, pin } = req.body;
    
    console.log(`Instructor login attempt: email=${email}`);
    
    if (!email || !pin) {
        return res.status(400).json({ error: 'Email and PIN required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('instructors')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        
        if (error || !data) {
            return res.status(401).json({ error: 'Invalid email or PIN' });
        }
        
        if (data.pin_hash !== pin) {
            return res.status(401).json({ error: 'Invalid email or PIN' });
        }
        
        const token = jwt.sign(
            { id: data.instructor_id, role: 'instructor', name: data.full_name, email: data.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token: token,
            user: {
                id: data.instructor_id,
                name: data.full_name,
                email: data.email,
                role: 'instructor'
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin login
router.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    console.log(`Admin login attempt: username=${username}`);
    
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign(
            { role: 'admin', name: 'Administrator' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token: token,
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