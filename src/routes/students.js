const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Get all students - to be implemented' });
});

router.post('/', (req, res) => {
    res.json({ message: 'Add student - to be implemented' });
});

module.exports = router;