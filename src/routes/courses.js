/**
 * COURSES ROUTES
 * 
 * Handles:
 * - Getting all courses (9 total)
 * - Getting courses by type (core or elective)
 */

const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// ========== GET ALL COURSES ==========
// GET /api/courses
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('course_id');
        
        if (error) {
            console.error('Fetch courses error:', error);
            return res.status(500).json({ error: 'Failed to fetch courses' });
        }
        
        res.json({ success: true, courses: data });
    } catch (err) {
        console.error('Get courses error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET COURSES BY TYPE ==========
// GET /api/courses/type/:type
// Type can be 'core' or 'elective'
router.get('/type/:type', async (req, res) => {
    const { type } = req.params;
    
    // Validate type
    if (type !== 'core' && type !== 'elective') {
        return res.status(400).json({ error: 'Type must be "core" or "elective"' });
    }
    
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('course_type', type)
            .order('course_id');
        
        if (error) {
            console.error('Fetch courses by type error:', error);
            return res.status(500).json({ error: 'Failed to fetch courses' });
        }
        
        res.json({ success: true, courses: data });
    } catch (err) {
        console.error('Get courses by type error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;