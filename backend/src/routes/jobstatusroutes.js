const express = require('express');
const router = express.Router();
const { getJobStatus, getAllJobsStatus } = require('../controllers/jobstatus');
const { verifyUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyUser);

// Get status for all jobs
router.get('/all', getAllJobsStatus);

// Get job status (works for both single and multiple jobs)
router.get('/', getJobStatus);

// Get job status for a specific job
router.get('/:jobId', getJobStatus);

module.exports = router; 