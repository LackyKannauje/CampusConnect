const express = require('express');
const router = express.Router();
const collegeController = require('../controllers/college/college.controller');
const departmentController = require('../controllers/college/department.controller');
const validation = require('../utils/validation');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');
const paginationMiddleware = require('../middleware/pagination.middleware');

// College Public Routes
/**
 * @swagger
 * /college/colleges:
 *   get:
 *     summary: Get all colleges
 *     tags: [Colleges]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of colleges
 */
router.get('/colleges',
    paginationMiddleware,
    collegeController.getAllColleges
);

/**
 * @swagger
 * /college/colleges/search:
 *   get:
 *     summary: Search colleges
 *     tags: [Colleges]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/colleges/search',
    paginationMiddleware,
    collegeController.searchColleges
);

/**
 * @swagger
 * /college/colleges/{collegeCode}:
 *   get:
 *     summary: Get college by code
 *     tags: [Colleges]
 *     parameters:
 *       - in: path
 *         name: collegeCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: College details
 */
router.get('/colleges/:collegeCode',
    collegeController.getCollegeByCode
);

// College Management (Admin only)
/**
 * @swagger
 * /college/create:
 *   post:
 *     summary: Create college
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               emailDomain:
 *                 type: string
 *               logo:
 *                 type: file
 *               banner:
 *                 type: file
 *     responses:
 *       201:
 *         description: College created
 */
router.post('/create',
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    uploadMiddleware.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'banner', maxCount: 1 }
    ]),
    validation.validate(validation.college.create),
    collegeController.createCollege
);

/**
 * @swagger
 * /college/colleges/{collegeId}:
 *   put:
 *     summary: Update college
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: College updated
 */
router.put('/colleges/:collegeId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin', 'college_admin']),
    collegeController.updateCollege
);

/**
 * @swagger
 * /college/colleges/{collegeId}:
 *   delete:
 *     summary: Delete college
 *     tags: [Colleges]
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
 *         description: College deleted
 */
router.delete('/colleges/:collegeId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    collegeController.deleteCollege
);

// College Invitations
/**
 * @swagger
 * /college/colleges/{collegeId}/invite:
 *   post:
 *     summary: Invite user to college
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation sent
 */
router.post('/colleges/:collegeId/invite',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.inviteToCollege
);

/**
 * @swagger
 * /colleges/invitations/{token}:
 *   get:
 *     summary: Get invitation details
 *     tags: [Colleges]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation details
 */
router.get('/invitations/:token',
    collegeController.getInvitation
);

/**
 * @swagger
 * /colleges/invitations/{token}/accept:
 *   post:
 *     summary: Accept invitation
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation accepted
 */
router.post('/invitations/:token/accept',
    authMiddleware.authenticate,
    collegeController.acceptInvitation
);

/**
 * @swagger
 * /colleges/invitations/{token}/reject:
 *   post:
 *     summary: Reject invitation
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation rejected
 */
router.post('/invitations/:token/reject',
    authMiddleware.authenticate,
    collegeController.rejectInvitation
);

// Department Routes
/**
 * @swagger
 * /college/colleges/{collegeId}/departments:
 *   get:
 *     summary: Get college departments
 *     tags: [Colleges]
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
 *         description: List of departments
 */
router.get('/colleges/:collegeId/departments',
    authMiddleware.authenticate,
    paginationMiddleware,
    departmentController.getCollegeDepartments
);

/**
 * @swagger
 * /college/colleges/{collegeId}/departments:
 *   post:
 *     summary: Create department
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Department created
 */
router.post('/colleges/:collegeId/departments',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    departmentController.createDepartment
);

/**
 * @swagger
 * /colleges/departments/{departmentId}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Colleges]
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
 *         description: Department details
 */
router.get('/departments/:departmentId',
    authMiddleware.authenticate,
    departmentController.getDepartmentById
);

/**
 * @swagger
 * /colleges/departments/{departmentId}:
 *   put:
 *     summary: Update department
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Department updated
 */
router.put('/departments/:departmentId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin', 'hod']),
    departmentController.updateDepartment
);

/**
 * @swagger
 * /colleges/departments/{departmentId}:
 *   delete:
 *     summary: Delete department
 *     tags: [Colleges]
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
 *         description: Department deleted
 */
router.delete('/departments/:departmentId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    departmentController.deleteDepartment
);

// Department Members
/**
 * @swagger
 * /colleges/departments/{departmentId}/members:
 *   get:
 *     summary: Get department members
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of members
 */
router.get('/departments/:departmentId/members',
    authMiddleware.authenticate,
    paginationMiddleware,
    departmentController.getDepartmentMembers
);

/**
 * @swagger
 * /colleges/departments/{departmentId}/members/{userId}:
 *   post:
 *     summary: Add member to department
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member added
 */
router.post('/departments/:departmentId/members/:userId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin', 'hod']),
    departmentController.addDepartmentMember
);

/**
 * @swagger
 * /colleges/departments/{departmentId}/members/{userId}:
 *   delete:
 *     summary: Remove member from department
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete('/departments/:departmentId/members/:userId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin', 'hod']),
    departmentController.removeDepartmentMember
);

// College Stats
/**
 * @swagger
 * /college/colleges/{collegeId}/stats:
 *   get:
 *     summary: Get college stats
 *     tags: [Colleges]
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
 *         description: College stats
 */
router.get('/colleges/:collegeId/stats',
    authMiddleware.authenticate,
    collegeController.getCollegeStats
);

/**
 * @swagger
 * /college/colleges/{collegeId}/analytics:
 *   get:
 *     summary: Get college analytics
 *     tags: [Colleges]
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
 *         description: College analytics
 */
router.get('/colleges/:collegeId/analytics',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.getCollegeAnalytics
);

// College Settings
/**
 * @swagger
 * /college/colleges/{collegeId}/settings:
 *   get:
 *     summary: Get college settings
 *     tags: [Colleges]
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
 *         description: College settings
 */
router.get('/colleges/:collegeId/settings',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.getCollegeSettings
);

/**
 * @swagger
 * /college/colleges/{collegeId}/settings:
 *   put:
 *     summary: Update college settings
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.put('/colleges/:collegeId/settings',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.updateCollegeSettings
);

// College Subscription
/**
 * @swagger
 * /college/colleges/{collegeId}/subscription:
 *   get:
 *     summary: Get college subscription
 *     tags: [Colleges]
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
 *         description: Subscription details
 */
router.get('/colleges/:collegeId/subscription',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.getSubscription
);

/**
 * @swagger
 * /college/colleges/{collegeId}/subscription/upgrade:
 *   post:
 *     summary: Upgrade subscription
 *     tags: [Colleges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Subscription upgraded
 */
router.post('/colleges/:collegeId/subscription/upgrade',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.upgradeSubscription
);

/**
 * @swagger
 * /college/colleges/{collegeId}/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Colleges]
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
 *         description: Subscription cancelled
 */
router.post('/colleges/:collegeId/subscription/cancel',
    authMiddleware.authenticate,
    authMiddleware.authorize(['college_admin', 'admin']),
    collegeController.cancelSubscription
);

module.exports = router;