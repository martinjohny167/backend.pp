const db = require('../config/db');

const getAllJobsRecentActivities = async (req, res) => {
    try {
        const userId = req.userId;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

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

        // Get last 7 activities for each job
        const jobPromises = jobs.map(async (job) => {
            let query = `
                SELECT 
                    shift_id,
                    DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') as start_time,
                    DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') as end_time,
                    total_hours,
                    total_earnings
                FROM SHIFTS 
                WHERE user_id = ? AND job_id = ?
            `;
            let queryParams = [userId, job.job_id];

            // Add date range if provided
            if (startDate && endDate) {
                query += ' AND start_time >= ? AND start_time <= ?';
                queryParams.push(startDate, endDate);
            } else {
                // Default to last 7 days if no date range provided
                query += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
            }

            query += ' ORDER BY start_time DESC LIMIT 7';

            const [activities] = await db.query(query, queryParams);

            // Calculate summary totals for this job
            const totalHours = activities.reduce((sum, activity) => sum + parseFloat(activity.total_hours || 0), 0);
            const totalEarnings = activities.reduce((sum, activity) => sum + parseFloat(activity.total_earnings || 0), 0);

            return {
                job_id: job.job_id,
                job_title: job.job_title,
                is_active: job.is_current === 1,
                summary: {
                    total_hours: parseFloat(totalHours.toFixed(2)),
                    total_earnings: parseFloat(totalEarnings.toFixed(2)),
                    total_shifts: activities.length
                },
                activities: activities.map(activity => ({
                    shift_id: activity.shift_id,
                    start_time: activity.start_time,
                    end_time: activity.end_time,
                    total_hours: parseFloat(activity.total_hours || 0),
                    total_earnings: parseFloat(activity.total_earnings || 0)
                }))
            };
        });

        const jobsActivities = await Promise.all(jobPromises);

        // Calculate overall totals
        const overallTotals = jobsActivities.reduce((acc, job) => {
            acc.total_hours += job.summary.total_hours;
            acc.total_earnings += job.summary.total_earnings;
            acc.total_shifts += job.summary.total_shifts;
            return acc;
        }, { total_hours: 0, total_earnings: 0, total_shifts: 0 });

        res.json({
            success: true,
            data: {
                jobs: jobsActivities,
                overall_summary: {
                    total_jobs: jobs.length,
                    total_hours: parseFloat(overallTotals.total_hours.toFixed(2)),
                    total_earnings: parseFloat(overallTotals.total_earnings.toFixed(2)),
                    total_shifts: overallTotals.total_shifts
                }
            }
        });
    } catch (error) {
        console.error('Error fetching all jobs recent activities:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getRecentActivities = async (req, res) => {
    try {
        const userId = req.userId;
        let jobId = req.params.jobId;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

        // If no job ID provided, check if user has only one job
        if (!jobId) {
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

            if (jobs.length === 1) {
                jobId = jobs[0].job_id;
                req.singleJobUser = true; // Flag to indicate this is a single-job user
                req.jobDetails = jobs[0]; // Store job details to avoid another query
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Job ID is required as you have multiple jobs'
                });
            }
        }

        // Get job details if not already fetched
        let jobDetails;
        if (req.singleJobUser) {
            jobDetails = req.jobDetails;
        } else {
            const [details] = await db.query(
                'SELECT job_title, is_current FROM JOBS WHERE job_id = ? AND user_id = ?',
                [jobId, userId]
            );
            jobDetails = details[0];
        }

        // Get last 7 activities
        let query = `
            SELECT 
                shift_id,
                DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') as start_time,
                DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') as end_time,
                total_hours,
                total_earnings
            FROM SHIFTS 
            WHERE user_id = ? AND job_id = ?
        `;
        let queryParams = [userId, jobId];

        // Add date range if provided
        if (startDate && endDate) {
            query += ' AND start_time >= ? AND start_time <= ?';
            queryParams.push(startDate, endDate);
        } else {
            // Default to last 7 days if no date range provided
            query += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        }

        query += ' ORDER BY start_time DESC LIMIT 7';

        const [activities] = await db.query(query, queryParams);

        // Calculate summary totals
        const totalHours = activities.reduce((sum, activity) => sum + parseFloat(activity.total_hours || 0), 0);
        const totalEarnings = activities.reduce((sum, activity) => sum + parseFloat(activity.total_earnings || 0), 0);

        res.json({
            success: true,
            data: {
                job_id: parseInt(jobId),
                job_title: jobDetails.job_title,
                is_active: jobDetails.is_current === 1,
                period_start: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                period_end: endDate || new Date().toISOString().split('T')[0],
                summary: {
                    total_hours: parseFloat(totalHours.toFixed(2)),
                    total_earnings: parseFloat(totalEarnings.toFixed(2)),
                    total_shifts: activities.length
                },
                activities: activities.map(activity => ({
                    shift_id: activity.shift_id,
                    start_time: activity.start_time,
                    end_time: activity.end_time,
                    total_hours: parseFloat(activity.total_hours || 0),
                    total_earnings: parseFloat(activity.total_earnings || 0)
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching recent activities:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllJobsRecentActivities,
    getRecentActivities
}; 