const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics/analytics.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Platform Analytics (Super Admin only)
/**
 * @swagger
 * /analytics/platform/overview:
 *   get:
 *     summary: Get platform overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform overview
 */
router.get('/platform/overview',
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    analyticsController.getPlatformOverview
);

/**
 * @swagger
 * /analytics/platform/users:
 *   get:
 *     summary: Get platform user stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform user stats
 */
router.get('/platform/users',
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    analyticsController.getPlatformUserStats
);

/**
 * @swagger
 * /analytics/platform/colleges:
 *   get:
 *     summary: Get platform college stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform college stats
 */
router.get('/platform/colleges',
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    analyticsController.getPlatformCollegeStats
);

/**
 * @swagger
 * /analytics/platform/engagement:
 *   get:
 *     summary: Get platform engagement
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform engagement
 */
router.get('/platform/engagement',
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    analyticsController.getPlatformEngagement
);

// College Analytics (College Admin)
/**
 * @swagger
 * /analytics/college/{collegeId}/overview:
 *   get:
 *     summary: Get college overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: College overview
 */
router.get('/college/:collegeId/overview',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeOverview
);

/**
 * @swagger
 * /analytics/college/{collegeId}/users:
 *   get:
 *     summary: Get college user stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: College user stats
 */
router.get('/college/:collegeId/users',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeUserStats
);

/**
 * @swagger
 * /analytics/college/{collegeId}/content:
 *   get:
 *     summary: Get college content stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: College content stats
 */
router.get('/college/:collegeId/content',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeContentStats
);

/**
 * @swagger
 * /analytics/college/{collegeId}/engagement:
 *   get:
 *     summary: Get college engagement
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: College engagement
 */
router.get('/college/:collegeId/engagement',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeEngagement
);

/**
 * @swagger
 * /analytics/college/{collegeId}/departments:
 *   get:
 *     summary: Get college department stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: College department stats
 */
router.get('/college/:collegeId/departments',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeDepartmentStats
);

// Real-time Analytics
/**
 * @swagger
 * /analytics/realtime/{collegeId}:
 *   get:
 *     summary: Get real-time stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Real-time stats
 */
router.get('/realtime/:collegeId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getRealtimeStats
);

/**
 * @swagger
 * /analytics/realtime/{collegeId}/active-users:
 *   get:
 *     summary: Get active users
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active users list
 */
router.get('/realtime/:collegeId/active-users',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getActiveUsers
);

// User Analytics
/**
 * @swagger
 * /analytics/user/{userId}/overview:
 *   get:
 *     summary: Get user overview stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User overview stats
 */
router.get('/user/:userId/overview',
    authMiddleware.authenticate,
    analyticsController.getUserOverview
);

/**
 * @swagger
 * /analytics/user/{userId}/activity:
 *   get:
 *     summary: Get user activity stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activity stats
 */
router.get('/user/:userId/activity',
    authMiddleware.authenticate,
    analyticsController.getUserActivity
);

/**
 * @swagger
 * /analytics/user/{userId}/engagement:
 *   get:
 *     summary: Get user engagement stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User engagement stats
 */
router.get('/user/:userId/engagement',
    authMiddleware.authenticate,
    analyticsController.getUserEngagement
);

/**
 * @swagger
 * /analytics/user/{userId}/trends:
 *   get:
 *     summary: Get user trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User trends
 */
router.get('/user/:userId/trends',
    authMiddleware.authenticate,
    analyticsController.getUserTrends
);


/**
 * @swagger
 * /analytics/content/popular:
 *   get:
 *     summary: Get popular content
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Popular content
 */
router.get('/content/popular',
    authMiddleware.authenticate,
    analyticsController.getPopularContent
);

/**
 * @swagger
 * /analytics/content/trending:
 *   get:
 *     summary: Get trending content
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trending content
 */
router.get('/content/trending',
    authMiddleware.authenticate,
    analyticsController.getTrendingContent
);


// Content Analytics
/**
 * @swagger
 * /analytics/content/{contentId}:
 *   get:
 *     summary: Get content analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content analytics
 */
router.get('/content/:contentId',
    authMiddleware.authenticate,
    analyticsController.getContentAnalytics
);

// Predictive Analytics
/**
 * @swagger
 * /analytics/predictions/{collegeId}/churn:
 *   get:
 *     summary: Predict churn
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Churn predictions
 */
router.get('/predictions/:collegeId/churn',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getChurnPredictions
);

/**
 * @swagger
 * /analytics/predictions/{collegeId}/growth:
 *   get:
 *     summary: Predict growth
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Growth predictions
 */
router.get('/predictions/:collegeId/growth',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getGrowthPredictions
);

/**
 * @swagger
 * /analytics/predictions/content/{contentId}:
 *   get:
 *     summary: Predict content performance
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content predictions
 */
router.get('/predictions/content/:contentId',
    authMiddleware.authenticate,
    analyticsController.getContentPredictions
);

// Department Analytics
/**
 * @swagger
 * /analytics/department/{departmentId}:
 *   get:
 *     summary: Get department analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department analytics
 */
router.get('/department/:departmentId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin', 'hod']),
    analyticsController.getDepartmentAnalytics
);

// Leaderboards
/**
 * @swagger
 * /analytics/leaderboards/{collegeId}/users:
 *   get:
 *     summary: User leaderboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User leaderboard
 */
router.get('/leaderboards/:collegeId/users',
    authMiddleware.authenticate,
    analyticsController.getUserLeaderboard
);

/**
 * @swagger
 * /analytics/leaderboards/{collegeId}/departments:
 *   get:
 *     summary: Department leaderboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department leaderboard
 */
router.get('/leaderboards/:collegeId/departments',
    authMiddleware.authenticate,
    analyticsController.getDepartmentLeaderboard
);

// Export Analytics
/**
 * @swagger
 * /analytics/export/{collegeId}:
 *   post:
 *     summary: Export analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics exported
 */
router.post('/export/:collegeId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.exportAnalytics
);

// Custom Reports
/**
 * @swagger
 * /analytics/reports/custom:
 *   post:
 *     summary: Create custom report
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parameters
 *             properties:
 *               parameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Report created
 */
router.post('/reports/custom',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.createCustomReport
);

/**
 * @swagger
 * /analytics/reports/{reportId}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report details
 */
// router.get('/reports/:reportId',
//     authMiddleware.authenticate,
//     authMiddleware.authorize(['college_admin', 'admin']),
//     analyticsController.getReport
// );

module.exports = router;