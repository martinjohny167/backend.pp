const express = require('express');
const router = express.Router();
const { generateShortcut } = require('../controllers/shortcuts');

// Shortcut routes
router.post('/generate', generateShortcut);

module.exports = router; 