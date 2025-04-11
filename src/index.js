require('dotenv').config();
const express = require('express');
const cors = require('cors');
const totalHeRoutes = require('./routes/totalh&e');
const jobSelectorRoutes = require('./routes/jobselector');
const shiftDetailsRoutes = require('./routes/shiftdetails');
const periodicTotalsRoutes = require('./routes/periodictotals');
const recentActivitiesRoutes = require('./routes/recentactivities');
const jobStatusRoutes = require('./routes/jobstatusroutes');
const authRoutes = require('./routes/auth');
const shortcutsRoutes = require('./routes/shortcuts');

const app = express();

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Middleware
app.use(cors({
    origin:'https://sweet-faun-720cb9.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-User-Id', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stats', totalHeRoutes);
app.use('/api/jobs', jobSelectorRoutes);
app.use('/api/shifts', shiftDetailsRoutes);
app.use('/api/periodic', periodicTotalsRoutes);
app.use('/api/activities', recentActivitiesRoutes);
app.use('/api/job-status', jobStatusRoutes);
app.use('/api/shortcuts', shortcutsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API server is running',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint for debugging
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Test endpoint',
        request: {
            query: req.query,
            headers: req.headers
        },
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong!'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 