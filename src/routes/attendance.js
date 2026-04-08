const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { verifyToken } = require('../middleware/auth');

// Mark attendance (Student)
router.post('/mark', verifyToken, async (req, res) => {
    const { course_id, marking_method } = req.body;
    const student_id = req.user.id;
    
    if (!course_id) {
        return res.status(400).json({ error: 'Course ID required' });
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        
        // Check if already marked today for this course
        const { data: existing, error: checkError } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', student_id)
            .eq('course_id', course_id)
            .eq('date', today)
            .single();
        
        if (existing) {
            return res.status(400).json({ error: 'Attendance already marked for this course today' });
        }
        
        // Determine status (late if after 8:30 AM - you can change this)
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
            return res.status(500).json({ error: error.message });
        }
        
        res.json({
            success: true,
            message: `Attendance marked as ${status}`,
            attendance: data[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get student's attendance history
router.get('/my-attendance', verifyToken, async (req, res) => {
    const student_id = req.user.id;
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                *,
                courses (course_name, course_type)
            `)
            .eq('student_id', student_id)
            .order('date', { ascending: false });
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({ success: true, attendance: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get today's attendance (for instructor/admin)
router.get('/today', verifyToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        let query = supabase
            .from('attendance')
            .select(`
                *,
                students (student_id, full_name),
                courses (course_name, course_type)
            `)
            .eq('date', today);
        
        // If instructor, only show their course
        if (req.user.role === 'instructor') {
            // You'll need to add course_id to instructor's token
            // For now, return all
        }
        
        const { data, error } = await query;
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({ success: true, attendance: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;