const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics/analytics.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Platform Analytics (Super Admin only)
router.get('/platform/overview', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    analyticsController.getPlatformOverview
);

router.get('/platform/users', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    analyticsController.getPlatformUserStats
);

router.get('/platform/colleges', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    analyticsController.getPlatformCollegeStats
);

router.get('/platform/engagement', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    analyticsController.getPlatformEngagement
);

// College Analytics (College Admin)
router.get('/college/:collegeId/overview', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeOverview
);

router.get('/college/:collegeId/users', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeUserStats
);

router.get('/college/:collegeId/content', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeContentStats
);

router.get('/college/:collegeId/engagement', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeEngagement
);

router.get('/college/:collegeId/departments', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getCollegeDepartmentStats
);

// Real-time Analytics
router.get('/realtime/:collegeId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getRealtimeStats
);

router.get('/realtime/:collegeId/active-users', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getActiveUsers
);

// User Analytics
router.get('/user/:userId/overview', 
    authMiddleware.authenticate,
    analyticsController.getUserOverview
);

router.get('/user/:userId/activity', 
    authMiddleware.authenticate,
    analyticsController.getUserActivity
);

router.get('/user/:userId/engagement', 
    authMiddleware.authenticate,
    analyticsController.getUserEngagement
);

router.get('/user/:userId/trends', 
    authMiddleware.authenticate,
    analyticsController.getUserTrends
);

// Content Analytics
router.get('/content/:contentId', 
    authMiddleware.authenticate,
    analyticsController.getContentAnalytics
);

router.get('/content/popular', 
    authMiddleware.authenticate,
    analyticsController.getPopularContent
);

router.get('/content/trending', 
    authMiddleware.authenticate,
    analyticsController.getTrendingContent
);

// Predictive Analytics
router.get('/predictions/:collegeId/churn', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getChurnPredictions
);

router.get('/predictions/:collegeId/growth', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getGrowthPredictions
);

router.get('/predictions/content/:contentId', 
    authMiddleware.authenticate,
    analyticsController.getContentPredictions
);

// Department Analytics
router.get('/department/:departmentId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin', 'hod']),
    analyticsController.getDepartmentAnalytics
);

// Leaderboards
router.get('/leaderboards/:collegeId/users', 
    authMiddleware.authenticate,
    analyticsController.getUserLeaderboard
);

router.get('/leaderboards/:collegeId/departments', 
    authMiddleware.authenticate,
    analyticsController.getDepartmentLeaderboard
);

// Export Analytics
router.post('/export/:collegeId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.exportAnalytics
);

// Custom Reports
router.post('/reports/custom', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.createCustomReport
);

router.get('/reports/:reportId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    analyticsController.getReport
);

module.exports = router;