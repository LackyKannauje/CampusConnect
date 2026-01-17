const express = require('express');
const router = express.Router();


// Import all route files
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const contentRoutes = require('./content.routes');
const collegeRoutes = require('./college.routes');
const aiRoutes = require('./ai.routes');
const analyticsRoutes = require('./analytics.routes');

// API version prefix
const API_PREFIX = '/api/v1';

// Mount routes
router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/users`, userRoutes);
router.use(`${API_PREFIX}/content`, contentRoutes);
router.use(`${API_PREFIX}/college`, collegeRoutes);
router.use(`${API_PREFIX}/ai`, aiRoutes);
router.use(`${API_PREFIX}/analytics`, analyticsRoutes);

// Health check
router.get(`${API_PREFIX}/health`, (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// 404 handler for API routes

router.use(API_PREFIX, (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.originalUrl
    });
});

module.exports = router;