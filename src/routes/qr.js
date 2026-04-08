const express = require('express');
const router = express.Router();

router.get('/generate/:courseId', (req, res) => {
    res.json({ message: 'Generate QR code - to be implemented' });
});

module.exports = router;