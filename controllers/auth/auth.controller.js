const User = require('../../models/user/User.model');
const UserSession = require('../../models/user/UserSession.model');
const College = require('../../models/college/College.model');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const errorMiddleware  = require('../../middleware/error.middleware');

const authController = {
    // Register new user
    register: errorMiddleware.catchAsync(async (req, res) => {
        const { email, password, firstName, lastName, collegeCode, role } = req.body;

        // Check if college exists
        const college = await College.findOne({ code: collegeCode });
        if (!college) {
            return res.status(400).json({ error: 'College not found' });
        }

        // Check if email domain matches college
        const emailDomain = email.split('@')[1];
        const collegeDomain = college.domains.find(d => d.domain === emailDomain);
        if (!collegeDomain || !collegeDomain.isVerified) {
            return res.status(400).json({ error: 'Invalid college email domain' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create user
        const user = new User({
            email,
            auth: {
                passwordHash: await bcrypt.hash(password, 12)
            },
            profile: {
                firstName,
                lastName
            },
            academic: {
                collegeId: college._id,
                role: role || 'student'
            }
        });

        await user.save();

        // Generate tokens
        const { accessToken, refreshToken, session } = await generateTokens(user);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: user._id,
                email: user.email,
                name: user.profile.fullName,
                role: user.academic.role,
                college: college.name
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 3600
            }
        });
    }),

    // Login user
    login: errorMiddleware.catchAsync(async (req, res) => {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email }).select('+auth.passwordHash');
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await user.verifyPassword(password);
        console.log(isValidPassword);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.isActive || user.moderation.isBanned) {
            return res.status(403).json({ error: 'Account is suspended or banned' });
        }

        // Update user activity
        user.stats.activity.lastActive = new Date();
        user.stats.activity.loginCount += 1;
        user.incrementStreak();
        await user.save();
        // Generate tokens
        const { accessToken, refreshToken, session } = await generateTokens(user);
        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                name: user.profile.fullName,
                role: user.academic.role,
                avatar: user.profile.avatar?.url
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 3600
            }
        });
    }),

    // Logout user
    logout: errorMiddleware.catchAsync(async (req, res) => {
        const { sessionId } = req.session;
        
        // Revoke current session
        await UserSession.findOneAndUpdate(
            { sessionId },
            { 
                isActive: false,
                logoutAt: new Date(),
                logoutReason: 'user'
            }
        );

        res.json({ message: 'Logged out successfully' });
    }),

    // Refresh token
    refreshToken: errorMiddleware.catchAsync(async (req, res) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
            
            // Find session
            const session = await UserSession.findOne({
                sessionId: decoded.sessionId,
                isActive: true
            });

            if (!session) {
                return res.status(401).json({ error: 'Invalid session' });
            }

            // Find user
            const user = await User.findById(decoded.userId);
            if (!user || !user.isActive) {
                return res.status(401).json({ error: 'User not found' });
            }

            // Generate new access token
            const accessToken = jwt.sign(
                {
                    userId: user._id,
                    sessionId: session.sessionId,
                    role: user.academic.role
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.json({
                accessToken,
                expiresIn: 3600
            });

        } catch (error) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
    }),

    // Forgot password
    forgotPassword: errorMiddleware.catchAsync(async (req, res) => {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists for security
            return res.json({ message: 'If email exists, password reset link sent' });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // TODO: Send email with reset link
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        console.log(`Password reset URL: ${resetUrl}`); // In production, send email

        res.json({ message: 'Password reset instructions sent to email' });
    }),

    // Reset password
    resetPassword: errorMiddleware.catchAsync(async (req, res) => {
        const { token } = req.params;
        const { password } = req.body;

        // Hash the token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid reset token
        const user = await User.findOne({
            'auth.passwordResetToken': hashedToken,
            'auth.passwordResetExpires': { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Update password
        user.auth.passwordHash = await bcrypt.hash(password, 12);
        user.auth.passwordResetToken = undefined;
        user.auth.passwordResetExpires = undefined;
        user.auth.lastPasswordChange = new Date();
        await user.save();

        // Revoke all sessions
        await UserSession.updateMany(
            { userId: user._id, isActive: true },
            { 
                isActive: false,
                logoutAt: new Date(),
                logoutReason: 'password_reset'
            }
        );

        res.json({ message: 'Password reset successful' });
    }),

    // Change password (authenticated)
    changePassword: errorMiddleware.catchAsync(async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;

        // Verify current password
        const isValid = await user.verifyPassword(currentPassword);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.auth.passwordHash = await bcrypt.hash(newPassword, 12);
        user.auth.lastPasswordChange = new Date();
        await user.save();

        // Revoke all other sessions
        await UserSession.updateMany(
            { 
                userId: user._id, 
                isActive: true,
                sessionId: { $ne: req.session.sessionId }
            },
            { 
                isActive: false,
                logoutAt: new Date(),
                logoutReason: 'password_changed'
            }
        );

        res.json({ message: 'Password changed successfully' });
    }),

    // Get active sessions
    getSessions: errorMiddleware.catchAsync(async (req, res) => {
        const sessions = await UserSession.find({
            userId: req.user._id,
            isActive: true
        }).sort({ 'activity.lastActive': -1 });

        res.json({
            sessions: sessions.map(session => ({
                id: session.sessionId,
                device: session.device,
                location: session.location,
                lastActive: session.activity.lastActive,
                isCurrent: session.sessionId === req.session.sessionId
            }))
        });
    }),

    // Revoke specific session
    revokeSession: errorMiddleware.catchAsync(async (req, res) => {
        const { sessionId } = req.params;
        const userId = req.user._id;

        const session = await UserSession.findOne({
            sessionId,
            userId,
            isActive: true
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        session.logout('revoked');
        await session.save();

        res.json({ message: 'Session revoked' });
    }),

    // Social auth (Google)
    googleAuth: errorMiddleware.catchAsync(async (req, res) => {
        // TODO: Implement Google OAuth
        res.status(501).json({ error: 'Google auth not implemented' });
    }),

    // Social auth (GitHub)
    githubAuth: errorMiddleware.catchAsync(async (req, res) => {
        // TODO: Implement GitHub OAuth
        res.status(501).json({ error: 'GitHub auth not implemented' });
    })
};

// Helper function to generate tokens
async function generateTokens(user) {
    // First generate session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Generate tokens WITH sessionId
    const accessToken = jwt.sign(
        {
            userId: user._id,
            sessionId: sessionId, // Use the generated sessionId
            role: user.academic.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
        {
            userId: user._id,
            sessionId: sessionId // Use the same sessionId
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    // Create session AFTER token generation
    const session = new UserSession({
        userId: user._id,
        sessionId: sessionId, // Same ID used in tokens
        token: accessToken, // Store the access token
        refreshToken: refreshToken, // Store refresh token
        device: {
            type: 'web',
            browser: 'unknown'
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        activity: {
            lastActive: new Date(),
            totalRequests: 0
        }
    });

    await session.save();

    return { accessToken, refreshToken, session };
}

module.exports = authController;