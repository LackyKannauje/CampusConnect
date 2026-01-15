const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/user.controller');
const profileController = require('../controllers/user/profile.controller');
const validation = require('../utils/validation');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');

// Profile Routes
router.get('/profile', 
    authMiddleware.authenticate, 
    profileController.getProfile
);

router.put('/profile', 
    authMiddleware.authenticate,
    validation.validate(validation.user.update),
    profileController.updateProfile
);

router.post('/profile/avatar', 
    authMiddleware.authenticate,
    uploadMiddleware.single('avatar'),
    validation.validateFile,
    profileController.uploadAvatar
);

router.get('/profile/:userId', 
    authMiddleware.authenticate, 
    profileController.getPublicProfile
);

// User Management Routes
router.get('/', 
    authMiddleware.authenticate, 
    authMiddleware.authorize(['admin', 'college_admin']),
    userController.getAllUsers
);

router.get('/search', 
    authMiddleware.authenticate, 
    userController.searchUsers
);

router.get('/:userId', 
    authMiddleware.authenticate, 
    userController.getUserById
);

router.put('/:userId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    validation.validate(validation.user.update),
    userController.updateUser
);

router.delete('/:userId', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin']),
    userController.deleteUser
);

router.post('/:userId/ban', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin', 'moderator']),
    userController.banUser
);

router.post('/:userId/unban', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin', 'moderator']),
    userController.unbanUser
);

// Social Features
router.post('/:userId/follow', 
    authMiddleware.authenticate, 
    userController.followUser
);

router.delete('/:userId/unfollow', 
    authMiddleware.authenticate, 
    userController.unfollowUser
);

router.get('/:userId/followers', 
    authMiddleware.authenticate, 
    userController.getFollowers
);

router.get('/:userId/following', 
    authMiddleware.authenticate, 
    userController.getFollowing
);

// User Analytics
router.get('/:userId/analytics', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    userController.getUserAnalytics
);

router.get('/:userId/activity', 
    authMiddleware.authenticate, 
    userController.getUserActivity
);

// Settings
router.get('/settings', 
    authMiddleware.authenticate, 
    profileController.getSettings
);

router.put('/settings', 
    authMiddleware.authenticate,
    profileController.updateSettings
);

module.exports = router;