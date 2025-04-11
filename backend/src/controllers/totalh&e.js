const db = require('../config/db');

const getAllJobsStats = async (req, res) => {
    try {
        const userId = req.userId;

        // Get all active jobs for the user
        const [jobs] = await db.query(
            'SELECT job_id, job_title, is_current FROM JOBS WHERE user_id = ? AND is_current = 1',
            [userId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active jobs found'
            });
        }

        // Get user's lifetime stats (not job-specific)
        const [stats] = await db.query(
            `SELECT 
                total_hours,
                total_earnings,
                last_updated
            FROM USER_STATS 
            WHERE user_id = ?`,
            [userId]
        );

        // Ensure numeric values
        const totalHours = stats[0]?.total_hours ? Number(stats[0].total_hours) : 0;
        const totalEarnings = stats[0]?.total_earnings ? Number(stats[0].total_earnings) : 0;
        const lastUpdated = stats[0]?.last_updated || null;

        // If user has only one job, return a simplified response
        if (jobs.length === 1) {
            return res.json({
                success: true,
                data: {
                    job_id: jobs[0].job_id,
                    job_title: jobs[0].job_title,
                    is_active: jobs[0].is_current === 1,
                    stats: {
                        total_hours: parseFloat(totalHours.toFixed(2)),
                        total_earnings: parseFloat(totalEarnings.toFixed(2)),
                        last_updated: lastUpdated
                    }
                }
            });
        }

        // For multiple jobs, add the job info but keep the same stats
        const jobsStats = jobs.map(job => ({
            job_id: job.job_id,
            job_title: job.job_title,
            is_active: job.is_current === 1
        }));

        res.json({
            success: true,
            data: {
                jobs: jobsStats,
                overall_summary: {
                    total_jobs: jobs.length,
                    total_hours: parseFloat(totalHours.toFixed(2)),
                    total_earnings: parseFloat(totalEarnings.toFixed(2)),
                    last_updated: lastUpdated
                }
            }
        });
    } catch (error) {
        console.error('Error fetching all jobs stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getUserStats = async (req, res) => {
    try {
        const userId = req.userId;
        let jobId = req.params.jobId;

        // Get job details
        const [jobDetails] = await db.query(
            'SELECT job_id, job_title, is_current FROM JOBS WHERE user_id = ? AND is_current = 1',
            [userId]
        );

        if (jobDetails.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active jobs found'
            });
        }

        // Get user's lifetime stats
        const [stats] = await db.query(
            `SELECT 
                total_hours,
                total_earnings,
                last_updated
            FROM USER_STATS 
            WHERE user_id = ?`,
            [userId]
        );

        // Even if no stats are found, return zeros instead of error
        const totalHours = stats[0]?.total_hours ? Number(stats[0].total_hours) : 0;
        const totalEarnings = stats[0]?.total_earnings ? Number(stats[0].total_earnings) : 0;
        const lastUpdated = stats[0]?.last_updated || null;

        // If jobId is specified, find that specific job
        let selectedJob = null;
        if (jobId) {
            selectedJob = jobDetails.find(job => job.job_id == jobId);
            if (!selectedJob) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }
        } else if (jobDetails.length === 1) {
            // If no jobId specified and user has only one job, use that
            selectedJob = jobDetails[0];
        } else {
            // If multiple jobs and no jobId specified, return error
            return res.status(400).json({
                success: false,
                message: 'Job ID is required as you have multiple jobs'
            });
        }

        res.json({
            success: true,
            data: {
                job_id: selectedJob.job_id,
                job_title: selectedJob.job_title,
                is_active: selectedJob.is_current === 1,
                stats: {
                    total_hours: parseFloat(totalHours.toFixed(2)),
                    total_earnings: parseFloat(totalEarnings.toFixed(2)),
                    last_updated: lastUpdated
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getUserStats,
    getAllJobsStats
}; 