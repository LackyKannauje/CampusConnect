const express = require('express');
const router = express.Router();
const collegeController = require('../controllers/college/college.controller');
const departmentController = require('../controllers/college/department.controller');
const validation = require('../utils/validation');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');
const paginationMiddleware = require('../middleware/pagination.middleware');

// College Public Routes
router.get('/colleges', 
    paginationMiddleware,
    collegeController.getAllColleges
);

router.get('/colleges/search', 
    paginationMiddleware,
    collegeController.searchColleges
);

router.get('/colleges/:collegeCode', 
    collegeController.getCollegeByCode
);

// College Management (Admin only)
router.post('/colleges', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    uploadMiddleware.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'banner', maxCount: 1 }
    ]),
    validation.validate(validation.college.create),
    collegeController.createCollege
);

router.put('/colleges/:collegeId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin', 'college_admin']),
    collegeController.updateCollege
);

router.delete('/colleges/:collegeId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    collegeController.deleteCollege
);

// College Invitations
router.post('/colleges/:collegeId/invite', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.inviteToCollege
);

router.get('/invitations/:token', 
    collegeController.getInvitation
);

router.post('/invitations/:token/accept', 
    authMiddleware.authenticate,
    collegeController.acceptInvitation
);

router.post('/invitations/:token/reject', 
    authMiddleware.authenticate,
    collegeController.rejectInvitation
);

// Department Routes
router.get('/colleges/:collegeId/departments', 
    authMiddleware.authenticate,
    paginationMiddleware,
    departmentController.getCollegeDepartments
);

router.post('/colleges/:collegeId/departments', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    departmentController.createDepartment
);

router.get('/departments/:departmentId', 
    authMiddleware.authenticate,
    departmentController.getDepartmentById
);

router.put('/departments/:departmentId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin', 'hod']),
    departmentController.updateDepartment
);

router.delete('/departments/:departmentId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    departmentController.deleteDepartment
);

// Department Members
router.get('/departments/:departmentId/members', 
    authMiddleware.authenticate,
    paginationMiddleware,
    departmentController.getDepartmentMembers
);

router.post('/departments/:departmentId/members/:userId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin', 'hod']),
    departmentController.addDepartmentMember
);

router.delete('/departments/:departmentId/members/:userId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin', 'hod']),
    departmentController.removeDepartmentMember
);

// College Stats
router.get('/colleges/:collegeId/stats', 
    authMiddleware.authenticate,
    collegeController.getCollegeStats
);

router.get('/colleges/:collegeId/analytics', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.getCollegeAnalytics
);

// College Settings
router.get('/colleges/:collegeId/settings', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.getCollegeSettings
);

router.put('/colleges/:collegeId/settings', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.updateCollegeSettings
);

// College Subscription
router.get('/colleges/:collegeId/subscription', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.getSubscription
);

router.post('/colleges/:collegeId/subscription/upgrade', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.upgradeSubscription
);

router.post('/colleges/:collegeId/subscription/cancel', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.cancelSubscription
);

module.exports = router;