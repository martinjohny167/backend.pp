const db = require('../config/db');

const verifyUser = async (req, res, next) => {
    try {
        // Get user ID from request headers
        const userId = req.header('X-User-Id');

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Validate if user ID is a number
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        // Verify user exists in database
        const [users] = await db.query(
            'SELECT user_id FROM USERS WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Store userId in request for later use
        req.userId = parseInt(userId);

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

module.exports = {
    verifyUser
}; 