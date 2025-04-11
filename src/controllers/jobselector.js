const db = require('../config/db');

const getJobs = async (req, res) => {
    try {
        // Get userId either from middleware or from query parameter
        let userId = req.userId; // From middleware
        
        // If not set by middleware, try to get from query
        if (!userId && req.query.userId) {
            userId = parseInt(req.query.userId);
        }
        
        // If still no userId, return error
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get all active jobs for the user
        const [jobs] = await db.query(
            'SELECT job_id, job_title FROM JOBS WHERE user_id = ? AND is_current = 1',
            [userId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active jobs found'
            });
        }

        // Simplify response to only include job_id and job_title
        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getJobs
}; 