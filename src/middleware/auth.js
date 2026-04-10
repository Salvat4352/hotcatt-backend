/**
 * AUTHENTICATION MIDDLEWARE
 * 
 * These functions verify JWT tokens and check user roles
 * before allowing access to protected routes.
 */

const jwt = require('jsonwebtoken');

// ========== VERIFY TOKEN ==========
// Checks if the request has a valid JWT token
// Used for routes that require any authenticated user
const verifyToken = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Attach user data to request
        next();  // Continue to the route handler
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// ========== VERIFY ADMIN ==========
// Checks if the authenticated user is an admin
// Used for admin-only routes
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

// ========== VERIFY INSTRUCTOR ==========
// Checks if the authenticated user is an admin OR instructor
// Used for routes that instructors can access
const verifyInstructor = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ error: 'Access denied. Instructor or Admin only.' });
    }
    next();
};

module.exports = { verifyToken, verifyAdmin, verifyInstructor };