const express = require('express');
const router = express.Router();
const { getUserStats, getAllJobsStats } = require('../controllers/totalh&e');
const { verifyUser } = require('../middleware/authMiddleware');

// Apply verifyUser middleware to all routes
router.use(verifyUser);

// Get stats for all jobs (redirects to single job endpoint if user has only one job)
router.get('/all', getAllJobsStats);

// Get stats for a specific job (or single job if user has only one)
router.get('/:jobId?', getUserStats);

module.exports = router; 