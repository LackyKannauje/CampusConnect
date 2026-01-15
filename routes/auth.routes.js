const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');
const verificationController = require('../controllers/auth/verification.controller');
const validation = require('../utils/validation');
const authMiddleware = require('../middleware/auth.middleware');

// Public Routes
router.post('/register', 
    validation.validate(validation.user.register), 
    authController.register
);

router.post('/login', 
    validation.validate(validation.user.login), 
    authController.login
);

router.post('/forgot-password', 
    validation.validate({ email: validation.user.login.extract('email') }), 
    authController.forgotPassword
);

router.post('/reset-password/:token', 
    validation.validate({ password: validation.user.register.extract('password') }), 
    authController.resetPassword
);

router.get('/verify-email/:token', verificationController.verifyEmail);

// Social Auth
router.post('/google', authController.googleAuth);
router.post('/github', authController.githubAuth);

// Protected Routes (require authentication)
router.post('/logout', 
    authMiddleware.authenticate, 
    authController.logout
);

router.post('/refresh-token', 
    authMiddleware.authenticate, 
    authController.refreshToken
);

router.post('/change-password', 
    authMiddleware.authenticate,
    validation.validate({
        currentPassword: validation.user.login.extract('password'),
        newPassword: validation.user.register.extract('password')
    }),
    authController.changePassword
);

router.post('/enable-2fa', 
    authMiddleware.authenticate, 
    verificationController.enable2FA
);

router.post('/verify-2fa', 
    authMiddleware.authenticate, 
    verificationController.verify2FA
);

router.get('/sessions', 
    authMiddleware.authenticate, 
    authController.getSessions
);

router.delete('/sessions/:sessionId', 
    authMiddleware.authenticate, 
    authController.revokeSession
);

module.exports = router;