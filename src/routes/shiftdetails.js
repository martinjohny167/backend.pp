const express = require('express');
const router = express.Router();
const { getShiftDetails, getAllJobsShiftDetails } = require('../controllers/shiftdetails');
const { verifyUser } = require('../middleware/authMiddleware');

// Apply verifyUser middleware to all routes
router.use(verifyUser);

// Get shift details for all jobs (redirects to single job endpoint if user has only one job)
router.get('/all', getAllJobsShiftDetails);

// Get shift details for a specific job (or single job if user has only one)
router.get('/:jobId?', getShiftDetails);

module.exports = router; 