const db = require('../config/db');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Get user from database using email
        const [users] = await db.query(
            'SELECT user_id, username, email FROM USERS WHERE email = ? AND password_hash = ?',
            [email, password]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Return user data
        res.json({
            success: true,
            data: {
                user_id: user.user_id,
                username: user.username,
                email: user.email
            },
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const signup = async (req, res) => {
    try {
        const { name, email, password, defaultCurrency, timezone, jobs } = req.body;

        // Validate required fields
        if (!name || !email || !password || !timezone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, and timezone are required'
            });
        }

        if (!jobs || !jobs.length) {
            return res.status(400).json({
                success: false,
                message: 'At least one job is required'
            });
        }

        // Check if email already exists
        const [existingUsers] = await db.query(
            'SELECT email FROM USERS WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already in use'
            });
        }

        // Begin a transaction for the multi-table insertion
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Insert user
            const [userResult] = await connection.query(
                'INSERT INTO USERS (username, email, password_hash, currency, timezone) VALUES (?, ?, ?, ?, ?)',
                [name, email, password, defaultCurrency || 'USD', timezone]
            );

            const userId = userResult.insertId;

            // Insert jobs
            for (const job of jobs) {
                await connection.query(
                    'INSERT INTO JOBS (user_id, job_title, hourly_rate, break_hours, is_current) VALUES (?, ?, ?, ?, 1)',
                    [userId, job.title, job.hourlyRate, job.breakTime]
                );
            }

            // Initialize user stats
            await connection.query(
                'INSERT INTO USER_STATS (user_id, total_hours, total_earnings, last_updated) VALUES (?, 0, 0, NOW())',
                [userId]
            );

            // Commit the transaction
            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user_id: userId,
                    email
                }
            });
        } catch (error) {
            // Rollback transaction in case of error
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    login,
    signup
}; 