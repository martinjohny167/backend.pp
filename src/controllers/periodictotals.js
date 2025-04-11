const db = require('../config/db');

const getAllJobsPeriodicTotals = async (req, res) => {
    try {
        const userId = req.userId;
        let period = req.query.period || 'week'; // Default to weekly
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

        // Normalize period parameter
        if (period === 'biweekly') {
            period = 'bi-weekly';
        }

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
            return getPeriodicTotals(req, res);
        }

        // Get periodic totals for each job
        const jobPromises = jobs.map(async (job) => {
            let query = '';
            let queryParams = [userId, job.job_id];
            
            // Base WHERE clause
            let whereClause = 'WHERE user_id = ? AND job_id = ?';
            
            // Add date range if provided
            if (startDate && endDate) {
                whereClause += ' AND start_time >= ? AND start_time <= ?';
                queryParams.push(startDate, endDate);
            } else {
                // Use existing period logic if no date range provided
                if (period === 'day') {
                    whereClause += ' AND DATE(start_time) = CURDATE()';
                } else if (period === 'week') {
                    whereClause += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND start_time < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)';
                } else if (period === 'bi-weekly') {
                    whereClause += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND start_time < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 14 DAY)';
                } else if (period === 'month') {
                    whereClause += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY) AND start_time < LAST_DAY(CURDATE())';
                } else if (period === 'year') {
                    whereClause += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL 5 YEAR)';
                }
            }
            
            if (period === 'day') {
                query = `
                    SELECT 
                        DATE_FORMAT(DATE(start_time), '%Y-%m-%d') as period,
                        SUM(total_hours) as total_hours,
                        SUM(total_earnings) as total_earnings,
                        COUNT(*) as total_shifts
                    FROM SHIFTS 
                    ${whereClause}
                    GROUP BY DATE(start_time)
                    ORDER BY period DESC
                `;
            } else if (period === 'week') {
                query = `
                    SELECT 
                        CONCAT(YEAR(start_time), '-W', WEEK(start_time, 1)) as period,
                        SUM(total_hours) as total_hours,
                        SUM(total_earnings) as total_earnings,
                        COUNT(*) as total_shifts,
                        MIN(DATE(start_time)) as week_start,
                        MAX(DATE(start_time)) as week_end
                    FROM SHIFTS 
                    ${whereClause}
                    GROUP BY YEAR(start_time), WEEK(start_time, 1)
                    ORDER BY YEAR(start_time) DESC, WEEK(start_time, 1) DESC
                `;
            } else if (period === 'bi-weekly') {
                query = `
                    SELECT 
                        CONCAT(YEAR(start_time), '-W', FLOOR((WEEK(start_time, 1) + 1) / 2)) as period,
                        SUM(total_hours) as total_hours,
                        SUM(total_earnings) as total_earnings,
                        COUNT(*) as total_shifts,
                        MIN(DATE(start_time)) as period_start,
                        MAX(DATE(start_time)) as period_end
                    FROM SHIFTS 
                    ${whereClause}
                    GROUP BY YEAR(start_time), FLOOR((WEEK(start_time, 1) + 1) / 2)
                    ORDER BY YEAR(start_time) DESC, FLOOR((WEEK(start_time, 1) + 1) / 2) DESC
                `;
            } else if (period === 'month') {
                query = `
                    SELECT 
                        DATE_FORMAT(DATE(start_time), '%Y-%m') as period,
                        SUM(total_hours) as total_hours,
                        SUM(total_earnings) as total_earnings,
                        COUNT(*) as total_shifts,
                        MIN(DATE(start_time)) as month_start,
                        MAX(DATE(start_time)) as month_end
                    FROM SHIFTS 
                    ${whereClause}
                    GROUP BY YEAR(start_time), MONTH(start_time)
                    ORDER BY YEAR(start_time) DESC, MONTH(start_time) DESC
                `;
            } else if (period === 'year') {
                query = `
                    SELECT 
                        YEAR(start_time) as period,
                        SUM(total_hours) as total_hours,
                        SUM(total_earnings) as total_earnings,
                        COUNT(*) as total_shifts,
                        MIN(DATE(start_time)) as year_start,
                        MAX(DATE(start_time)) as year_end
                    FROM SHIFTS 
                    ${whereClause}
                    GROUP BY YEAR(start_time)
                    ORDER BY period DESC
                `;
            }

            const [totals] = await db.query(query, queryParams);
            return {
                job_id: job.job_id,
                job_title: job.job_title,
                is_active: job.is_current === 1,
                totals: totals.map(total => ({
                    period: total.period,
                    total_hours: parseFloat(total.total_hours || 0),
                    total_earnings: parseFloat(total.total_earnings || 0),
                    total_shifts: parseInt(total.total_shifts || 0),
                    period_start: total.week_start || total.period_start || total.month_start || total.year_start,
                    period_end: total.week_end || total.period_end || total.month_end || total.year_end
                }))
            };
        });

        const jobsTotals = await Promise.all(jobPromises);

        // Calculate overall totals
        const overallTotals = jobsTotals.reduce((acc, job) => {
            job.totals.forEach(total => {
                acc.total_hours += total.total_hours;
                acc.total_earnings += total.total_earnings;
                acc.total_shifts += total.total_shifts;
            });
            return acc;
        }, { total_hours: 0, total_earnings: 0, total_shifts: 0 });

        res.json({
            success: true,
            data: {
                jobs: jobsTotals,
                overall_summary: {
                    total_jobs: jobs.length,
                    total_hours: parseFloat(overallTotals.total_hours.toFixed(2)),
                    total_earnings: parseFloat(overallTotals.total_earnings.toFixed(2)),
                    total_shifts: overallTotals.total_shifts
                }
            }
        });
    } catch (error) {
        console.error('Error fetching all jobs periodic totals:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getPeriodicTotals = async (req, res) => {
    try {
        const userId = req.userId;
        let period = req.query.period || 'week'; // Default to weekly
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        let jobId = req.params.jobId;

        // Normalize period parameter
        if (period === 'biweekly') {
            period = 'bi-weekly';
        }

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

        let query = '';
        let queryParams = [userId, jobId];
        
        // Base WHERE clause
        let whereClause = 'WHERE user_id = ? AND job_id = ?';
        
        // Add date range if provided
        if (startDate && endDate) {
            whereClause += ' AND start_time >= ? AND start_time <= ?';
            queryParams.push(startDate, endDate);
        } else {
            // Use existing period logic if no date range provided
            if (period === 'day') {
                whereClause += ' AND DATE(start_time) = CURDATE()';
            } else if (period === 'week') {
                whereClause += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND start_time < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)';
            } else if (period === 'bi-weekly') {
                whereClause += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND start_time < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 14 DAY)';
            } else if (period === 'month') {
                whereClause += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY) AND start_time < LAST_DAY(CURDATE())';
            } else if (period === 'year') {
                whereClause += ' AND start_time >= DATE_SUB(CURDATE(), INTERVAL 5 YEAR)';
            }
        }

        if (period === 'day') {
            query = `
                SELECT 
                    DATE_FORMAT(DATE(start_time), '%Y-%m-%d') as period,
                    SUM(total_hours) as total_hours,
                    SUM(total_earnings) as total_earnings,
                    COUNT(*) as total_shifts
                FROM SHIFTS 
                ${whereClause}
                GROUP BY DATE(start_time)
                ORDER BY period DESC
            `;
        } else if (period === 'week') {
            query = `
                SELECT 
                    CONCAT(YEAR(start_time), '-W', WEEK(start_time, 1)) as period,
                    SUM(total_hours) as total_hours,
                    SUM(total_earnings) as total_earnings,
                    COUNT(*) as total_shifts,
                    MIN(DATE(start_time)) as week_start,
                    MAX(DATE(start_time)) as week_end
                FROM SHIFTS 
                ${whereClause}
                GROUP BY YEAR(start_time), WEEK(start_time, 1)
                ORDER BY YEAR(start_time) DESC, WEEK(start_time, 1) DESC
            `;
        } else if (period === 'bi-weekly') {
            query = `
                SELECT 
                    CONCAT(YEAR(start_time), '-W', FLOOR((WEEK(start_time, 1) + 1) / 2)) as period,
                    SUM(total_hours) as total_hours,
                    SUM(total_earnings) as total_earnings,
                    COUNT(*) as total_shifts,
                    MIN(DATE(start_time)) as period_start,
                    MAX(DATE(start_time)) as period_end
                FROM SHIFTS 
                ${whereClause}
                GROUP BY YEAR(start_time), FLOOR((WEEK(start_time, 1) + 1) / 2)
                ORDER BY YEAR(start_time) DESC, FLOOR((WEEK(start_time, 1) + 1) / 2) DESC
            `;
        } else if (period === 'month') {
            query = `
                SELECT 
                    DATE_FORMAT(DATE(start_time), '%Y-%m') as period,
                    SUM(total_hours) as total_hours,
                    SUM(total_earnings) as total_earnings,
                    COUNT(*) as total_shifts,
                    MIN(DATE(start_time)) as month_start,
                    MAX(DATE(start_time)) as month_end
                FROM SHIFTS 
                ${whereClause}
                GROUP BY YEAR(start_time), MONTH(start_time)
                ORDER BY YEAR(start_time) DESC, MONTH(start_time) DESC
            `;
        } else if (period === 'year') {
            query = `
                SELECT 
                    YEAR(start_time) as period,
                    SUM(total_hours) as total_hours,
                    SUM(total_earnings) as total_earnings,
                    COUNT(*) as total_shifts,
                    MIN(DATE(start_time)) as year_start,
                    MAX(DATE(start_time)) as year_end
                FROM SHIFTS 
                ${whereClause}
                GROUP BY YEAR(start_time)
                ORDER BY period DESC
            `;
        }

        const [totals] = await db.query(query, queryParams);

        // Calculate summary totals
        const totalStats = totals.reduce((acc, entry) => {
            acc.total_hours += parseFloat(entry.total_hours || 0);
            acc.total_earnings += parseFloat(entry.total_earnings || 0);
            acc.total_shifts += parseInt(entry.total_shifts || 0);
            return acc;
        }, { total_hours: 0, total_earnings: 0, total_shifts: 0 });

        res.json({
            success: true,
            data: {
                job_id: parseInt(jobId),
                job_title: jobDetails.job_title,
                is_active: jobDetails.is_current === 1,
                totals: totals.map(total => ({
                    period: total.period,
                    total_hours: parseFloat(total.total_hours || 0),
                    total_earnings: parseFloat(total.total_earnings || 0),
                    total_shifts: parseInt(total.total_shifts || 0),
                    period_start: total.week_start || total.period_start || total.month_start || total.year_start,
                    period_end: total.week_end || total.period_end || total.month_end || total.year_end
                })),
                summary: {
                    total_hours: parseFloat(totalStats.total_hours.toFixed(2)),
                    total_earnings: parseFloat(totalStats.total_earnings.toFixed(2)),
                    total_shifts: totalStats.total_shifts
                }
            }
        });
    } catch (error) {
        console.error('Error fetching periodic totals:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllJobsPeriodicTotals,
    getPeriodicTotals
}; 