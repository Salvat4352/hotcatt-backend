const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Get all instructors - to be implemented' });
});

router.post('/', (req, res) => {
    res.json({ message: 'Add instructor - to be implemented' });
});

module.exports = router;