const express = require('express');
const router = express.Router();
const { getRecentActivities, getAllJobsRecentActivities } = require('../controllers/recentactivities');
const { verifyUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyUser);

// Get recent activities for all jobs
router.get('/all', getAllJobsRecentActivities);

// Get recent activities (works for both single and multiple jobs)
router.get('/', getRecentActivities);

// Get recent activities for a specific job
router.get('/:jobId', getRecentActivities);

module.exports = router; 