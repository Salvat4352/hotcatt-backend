// Admin login - simplified version
app.post('/api/auth/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('Admin login attempt:', username, password);
    
    // Simple hardcoded check
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