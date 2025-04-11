const express = require('express');
const router = express.Router();
const { getPeriodicTotals, getAllJobsPeriodicTotals } = require('../controllers/periodictotals');
const { verifyUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyUser);

// Get periodic totals for all jobs
router.get('/all', getAllJobsPeriodicTotals);

// Get periodic totals (works for both single and multiple jobs)
router.get('/', getPeriodicTotals);

// Get periodic totals for a specific job
router.get('/:jobId', getPeriodicTotals);

module.exports = router; 