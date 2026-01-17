const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');
const verificationController = require('../controllers/auth/verification.controller');
const validation = require('../utils/validation');
const authMiddleware = require('../middleware/auth.middleware');

// Public Routes
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/register',
    validation.validate(validation.user.register),
    authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login',
    validation.validate(validation.user.login),
    authController.login
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
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
 *         description: Password reset email sent
 */
router.post('/forgot-password',
    validation.validate({ email: validation.user.login.extract('email') }),
    authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
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
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/reset-password/:token',
    validation.validate({ password: validation.user.register.extract('password') }),
    authController.resetPassword
);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify email address
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.get('/verify-email/:token', verificationController.verifyEmail);

// Social Auth
/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Google OAuth
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Google auth initiated
 */
router.post('/google', authController.googleAuth);
/**
 * @swagger
 * /auth/github:
 *   post:
 *     summary: GitHub OAuth
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: GitHub auth initiated
 */
router.post('/github', authController.githubAuth);

// Protected Routes (require authentication)
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout',
    authMiddleware.authenticate,
    authController.logout
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post('/refresh-token',
    authMiddleware.authenticate,
    authController.refreshToken
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post('/change-password',
    authMiddleware.authenticate,
    validation.validate({
        currentPassword: validation.user.login.extract('password'),
        newPassword: validation.user.register.extract('password')
    }),
    authController.changePassword
);

/**
 * @swagger
 * /auth/enable-2fa:
 *   post:
 *     summary: Enable Two-Factor Authentication
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA enabled, QR code returned
 */
router.post('/enable-2fa',
    authMiddleware.authenticate,
    verificationController.enable2FA
);

/**
 * @swagger
 * /auth/verify-2fa:
 *   post:
 *     summary: Verify Two-Factor Authentication
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA verified
 */
router.post('/verify-2fa',
    authMiddleware.authenticate,
    verificationController.verify2FA
);

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Get active sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 */
router.get('/sessions',
    authMiddleware.authenticate,
    authController.getSessions
);

/**
 * @swagger
 * /auth/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 */
router.delete('/sessions/:sessionId',
    authMiddleware.authenticate,
    authController.revokeSession
);

module.exports = router;