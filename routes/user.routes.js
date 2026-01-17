const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/user.controller');
const profileController = require('../controllers/user/profile.controller');
const validation = require('../utils/validation');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');

// Profile Routes
/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/profile',
    authMiddleware.authenticate,
    profileController.getProfile
);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile',
    authMiddleware.authenticate,
    validation.validate(validation.user.update),
    profileController.updateProfile
);

/**
 * @swagger
 * /users/profile/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 */
router.post('/profile/avatar',
    authMiddleware.authenticate,
    uploadMiddleware.single('avatar'),
    validation.validateFile,
    profileController.uploadAvatar
);

/**
 * @swagger
 * /users/profile/{userId}:
 *   get:
 *     summary: Get public profile by ID
 *     tags: [Users]
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
 *         description: Public profile data
 */
router.get('/profile/:userId',
    authMiddleware.authenticate,
    profileController.getPublicProfile
);

// User Management Routes
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin/College Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    userController.getAllUsers
);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search',
    authMiddleware.authenticate,
    userController.searchUsers
);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User details
 */
router.get('/:userId',
    authMiddleware.authenticate,
    userController.getUserById
);

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: User updated
 */
router.put('/:userId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    validation.validate(validation.user.update),
    userController.updateUser
);

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Delete user (Admin)
 *     tags: [Users]
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
 *         description: User deleted
 */
router.delete('/:userId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin']),
    userController.deleteUser
);

/**
 * @swagger
 * /users/{userId}/ban:
 *   post:
 *     summary: Ban user
 *     tags: [Users]
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
 *         description: User banned
 */
router.post('/:userId/ban',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin', 'moderator']),
    userController.banUser
);

/**
 * @swagger
 * /users/{userId}/unban:
 *   post:
 *     summary: Unban user
 *     tags: [Users]
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
 *         description: User unbanned
 */
router.post('/:userId/unban',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin', 'moderator']),
    userController.unbanUser
);

// Social Features
/**
 * @swagger
 * /users/{userId}/follow:
 *   post:
 *     summary: Follow user
 *     tags: [Users]
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
 *         description: User followed
 */
router.post('/:userId/follow',
    authMiddleware.authenticate,
    userController.followUser
);

/**
 * @swagger
 * /users/{userId}/unfollow:
 *   delete:
 *     summary: Unfollow user
 *     tags: [Users]
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
 *         description: User unfollowed
 */
router.delete('/:userId/unfollow',
    authMiddleware.authenticate,
    userController.unfollowUser
);

/**
 * @swagger
 * /users/{userId}/followers:
 *   get:
 *     summary: Get followers
 *     tags: [Users]
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
 *         description: List of followers
 */
router.get('/:userId/followers',
    authMiddleware.authenticate,
    userController.getFollowers
);

/**
 * @swagger
 * /users/{userId}/following:
 *   get:
 *     summary: Get following
 *     tags: [Users]
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
 *         description: List of following
 */
router.get('/:userId/following',
    authMiddleware.authenticate,
    userController.getFollowing
);

// User Analytics
/**
 * @swagger
 * /users/{userId}/analytics:
 *   get:
 *     summary: Get user analytics
 *     tags: [Users]
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
 *         description: User analytics
 */
router.get('/:userId/analytics',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    userController.getUserAnalytics
);

/**
 * @swagger
 * /users/{userId}/activity:
 *   get:
 *     summary: Get user activity
 *     tags: [Users]
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
 *         description: User activity log
 */
router.get('/:userId/activity',
    authMiddleware.authenticate,
    userController.getUserActivity
);

// Settings
/**
 * @swagger
 * /users/settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings
 */
router.get('/settings',
    authMiddleware.authenticate,
    profileController.getSettings
);

/**
 * @swagger
 * /users/settings:
 *   put:
 *     summary: Update user settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
router.put('/settings',
    authMiddleware.authenticate,
    profileController.updateSettings
);

module.exports = router;