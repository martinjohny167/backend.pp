const express = require('express');
const router = express.Router();
const { getJobs } = require('../controllers/jobselector');
const { verifyUser } = require('../middleware/authMiddleware');

// Public route for shortcuts
router.get('/list', getJobs);

// Apply auth middleware to all other routes
router.use(verifyUser);

// Other protected routes if any

module.exports = router; 