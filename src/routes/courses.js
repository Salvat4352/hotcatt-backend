const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { verifyToken } = require('../middleware/auth');

// Get all courses
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('course_id');
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({ success: true, courses: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get courses by type (core or elective)
router.get('/type/:type', async (req, res) => {
    const { type } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('course_type', type);
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({ success: true, courses: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;