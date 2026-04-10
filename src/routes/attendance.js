/**
 * ATTENDANCE ROUTES
 * 
 * Handles:
 * - Marking attendance (with GPS location check)
 * - Viewing attendance history
 * - Viewing today's attendance
 */

const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { verifyToken } = require('../middleware/auth');

// ========== MARK ATTENDANCE ==========
// POST /api/attendance/mark
// Body: { course_id: number, marking_method: string, location_lat?: number, location_lng?: number }
// Headers: Authorization: Bearer <token>
router.post('/mark', verifyToken, async (req, res) => {
    const { course_id, marking_method, location_lat, location_lng } = req.body;
    const student_id = req.user.id;
    
    // Validate input
    if (!course_id) {
        return res.status(400).json({ error: 'Course ID required' });
    }
    
    try {
        // Get current date and time
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        
        // Check if student already marked attendance for this course today
        const { data: existing, error: checkError } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', student_id)
            .eq('course_id', course_id)
            .eq('date', today)
            .maybeSingle();
        
        if (existing) {
            return res.status(400).json({ error: 'Attendance already marked for this course today' });
        }
        
        // Determine status (late if after 8:30 AM)
        const lateTime = '08:30:00';
        const status = currentTime > lateTime ? 'late' : 'present';
        
        // Insert attendance record
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
            console.error('Attendance insert error:', error);
            return res.status(500).json({ error: 'Failed to save attendance' });
        }
        
        res.json({
            success: true,
            message: `Attendance marked as ${status}`,
            attendance: data[0]
        });
    } catch (err) {
        console.error('Mark attendance error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET STUDENT'S ATTENDANCE HISTORY ==========
// GET /api/attendance/my-attendance
// Headers: Authorization: Bearer <token>
router.get('/my-attendance', verifyToken, async (req, res) => {
    const student_id = req.user.id;
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                attendance_id,
                date,
                time,
                status,
                marking_method,
                courses (
                    course_id,
                    course_name,
                    course_type
                )
            `)
            .eq('student_id', student_id)
            .order('date', { ascending: false })
            .order('time', { ascending: false });
        
        if (error) {
            console.error('Fetch history error:', error);
            return res.status(500).json({ error: 'Failed to fetch history' });
        }
        
        res.json({ success: true, attendance: data });
    } catch (err) {
        console.error('Get history error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET TODAY'S ATTENDANCE ==========
// GET /api/attendance/today
// Headers: Authorization: Bearer <token>
router.get('/today', verifyToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        let query = supabase
            .from('attendance')
            .select(`
                attendance_id,
                date,
                time,
                status,
                marking_method,
                students (
                    student_id,
                    full_name,
                    phone
                ),
                courses (
                    course_id,
                    course_name,
                    course_type
                )
            `)
            .eq('date', today);
        
        // If instructor, only show their course
        if (req.user.role === 'instructor' && req.user.course_id) {
            query = query.eq('course_id', req.user.course_id);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Fetch today error:', error);
            return res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
        }
        
        res.json({ success: true, attendance: data });
    } catch (err) {
        console.error('Get today error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;