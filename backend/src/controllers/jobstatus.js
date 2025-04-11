const db = require('../config/db');

const getAllJobsStatus = async (req, res) => {
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

        // If user has only one job, redirect to single job endpoint
        if (jobs.length === 1) {
            req.jobDetails = jobs[0]; // Store job details to avoid another query
            return getJobStatus(req, res);
        }

        // Get status for each job
        const jobPromises = jobs.map(async (job) => {
            // Get latest shift
            let latestShiftQuery = `
                SELECT 
                    shift_id,
                    start_time,
                    end_time,
                    total_hours,
                    total_earnings
                FROM SHIFTS 
                WHERE user_id = ? AND job_id = ?
            `;
            let latestShiftParams = [userId, job.job_id];

            // Add date range if provided
            if (startDate && endDate) {
                latestShiftQuery += ' AND start_time >= ? AND start_time <= ?';
                latestShiftParams.push(startDate, endDate);
            }

            latestShiftQuery += ' ORDER BY start_time DESC LIMIT 1';

            const [latestShift] = await db.query(latestShiftQuery, latestShiftParams);

            // Get current week totals
            let weeklyTotalsQuery = `
                SELECT 
                    COALESCE(SUM(total_hours), 0) as weekly_hours,
                    COALESCE(SUM(total_earnings), 0) as weekly_earnings,
                    COUNT(*) as weekly_shifts
                FROM SHIFTS 
                WHERE user_id = ? AND job_id = ?
            `;
            let weeklyTotalsParams = [userId, job.job_id];

            // Add date range if provided
            if (startDate && endDate) {
                weeklyTotalsQuery += ' AND start_time >= ? AND start_time <= ?';
                weeklyTotalsParams.push(startDate, endDate);
            } else {
                // Default to current week if no date range provided
                weeklyTotalsQuery += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)';
            }

            const [weeklyTotals] = await db.query(weeklyTotalsQuery, weeklyTotalsParams);

            // Ensure numeric values and format them
            const weeklyHours = Number(weeklyTotals[0].weekly_hours);
            const weeklyEarnings = Number(weeklyTotals[0].weekly_earnings);
            const weeklyShifts = Number(weeklyTotals[0].weekly_shifts);

            return {
                job_id: job.job_id,
                job_title: job.job_title,
                is_active: job.is_current === 1,
                latest_shift: latestShift[0] ? {
                    shift_id: latestShift[0].shift_id,
                    start_time: latestShift[0].start_time,
                    end_time: latestShift[0].end_time,
                    total_hours: parseFloat(latestShift[0].total_hours || 0),
                    total_earnings: parseFloat(latestShift[0].total_earnings || 0)
                } : null,
                weekly_summary: {
                    total_hours: parseFloat(weeklyHours.toFixed(2)),
                    total_earnings: parseFloat(weeklyEarnings.toFixed(2)),
                    total_shifts: weeklyShifts
                }
            };
        });

        const jobsStatus = await Promise.all(jobPromises);

        // Calculate overall weekly totals
        const overallTotals = jobsStatus.reduce((acc, job) => {
            acc.total_hours += job.weekly_summary.total_hours;
            acc.total_earnings += job.weekly_summary.total_earnings;
            acc.total_shifts += job.weekly_summary.total_shifts;
            return acc;
        }, { total_hours: 0, total_earnings: 0, total_shifts: 0 });

        res.json({
            success: true,
            data: {
                jobs: jobsStatus,
                overall_summary: {
                    total_jobs: jobs.length,
                    weekly_hours: parseFloat(overallTotals.total_hours.toFixed(2)),
                    weekly_earnings: parseFloat(overallTotals.total_earnings.toFixed(2)),
                    weekly_shifts: overallTotals.total_shifts
                }
            }
        });
    } catch (error) {
        console.error('Error fetching all jobs status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getJobStatus = async (req, res) => {
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

        // Get latest shift
        let latestShiftQuery = `
            SELECT 
                shift_id,
                start_time,
                end_time,
                total_hours,
                total_earnings
            FROM SHIFTS 
            WHERE user_id = ? AND job_id = ?
        `;
        let latestShiftParams = [userId, jobId];

        // Add date range if provided
        if (startDate && endDate) {
            latestShiftQuery += ' AND start_time >= ? AND start_time <= ?';
            latestShiftParams.push(startDate, endDate);
        }

        latestShiftQuery += ' ORDER BY start_time DESC LIMIT 1';

        const [latestShift] = await db.query(latestShiftQuery, latestShiftParams);

        // Get current week totals
        let weeklyTotalsQuery = `
            SELECT 
                COALESCE(SUM(total_hours), 0) as weekly_hours,
                COALESCE(SUM(total_earnings), 0) as weekly_earnings,
                COUNT(*) as weekly_shifts
            FROM SHIFTS 
            WHERE user_id = ? AND job_id = ?
        `;
        let weeklyTotalsParams = [userId, jobId];

        // Add date range if provided
        if (startDate && endDate) {
            weeklyTotalsQuery += ' AND start_time >= ? AND start_time <= ?';
            weeklyTotalsParams.push(startDate, endDate);
        } else {
            // Default to current week if no date range provided
            weeklyTotalsQuery += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)';
        }

        const [weeklyTotals] = await db.query(weeklyTotalsQuery, weeklyTotalsParams);

        // Ensure numeric values and format them
        const weeklyHours = Number(weeklyTotals[0].weekly_hours);
        const weeklyEarnings = Number(weeklyTotals[0].weekly_earnings);
        const weeklyShifts = Number(weeklyTotals[0].weekly_shifts);

        res.json({
            success: true,
            data: {
                job_id: parseInt(jobId),
                job_title: jobDetails.job_title,
                is_active: jobDetails.is_current === 1,
                latest_shift: latestShift[0] ? {
                    shift_id: latestShift[0].shift_id,
                    start_time: latestShift[0].start_time,
                    end_time: latestShift[0].end_time,
                    total_hours: parseFloat(latestShift[0].total_hours || 0),
                    total_earnings: parseFloat(latestShift[0].total_earnings || 0)
                } : null,
                weekly_summary: {
                    total_hours: parseFloat(weeklyHours.toFixed(2)),
                    total_earnings: parseFloat(weeklyEarnings.toFixed(2)),
                    total_shifts: weeklyShifts
                }
            }
        });
    } catch (error) {
        console.error('Error fetching job status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllJobsStatus,
    getJobStatus
}; 