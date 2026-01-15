const User = require('../../models/user/User.model');
const crypto = require('crypto');
const errorMiddleware  = require('../../middleware/error.middleware');

const verificationController = {
    // Verify email
    verifyEmail: errorMiddleware.catchAsync(async (req, res) => {
        const { token } = req.params;

        // Hash the token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid verification token
        const user = await User.findOne({
            'auth.emailVerificationToken': hashedToken,
            'auth.emailVerificationExpires': { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Mark email as verified
        user.auth.emailVerified = true;
        user.auth.emailVerificationToken = undefined;
        user.auth.emailVerificationExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    }),

    // Resend verification email
    resendVerification: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        if (user.auth.emailVerified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Check if recent verification was sent (prevent spam)
        const lastSent = user.auth.emailVerificationExpires;
        if (lastSent && lastSent > Date.now() - 5 * 60 * 1000) {
            return res.status(429).json({ error: 'Verification email already sent. Please wait 5 minutes.' });
        }

        // Generate new verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // TODO: Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

        console.log(`Verification URL: ${verificationUrl}`); // In production, send email

        res.json({ message: 'Verification email sent' });
    }),

    // Verify phone number
    verifyPhone: errorMiddleware.catchAsync(async (req, res) => {
        const { code } = req.body;
        const user = req.user;

        // TODO: Implement phone verification with SMS service
        // For now, simulate verification
        if (code === '123456') { // Demo code
            user.auth.phoneVerified = true;
            await user.save();
            return res.json({ message: 'Phone number verified' });
        }

        res.status(400).json({ error: 'Invalid verification code' });
    }),

    // Enable 2FA
    enable2FA: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        if (user.auth.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA already enabled' });
        }

        // TODO: Generate 2FA secret and QR code
        // For now, simulate
        user.auth.twoFactorEnabled = true;
        user.auth.twoFactorSecret = 'demo-secret'; // In production, generate real secret
        await user.save();

        res.json({ 
            message: '2FA enabled',
            secret: user.auth.twoFactorSecret // Only for demo, remove in production
        });
    }),

    // Verify 2FA
    verify2FA: errorMiddleware.catchAsync(async (req, res) => {
        const { code } = req.body;
        const user = req.user;

        if (!user.auth.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA not enabled' });
        }

        // TODO: Verify TOTP code
        // For demo, accept any 6-digit code
        if (/^\d{6}$/.test(code)) {
            // Mark 2FA as verified for this session
            req.session.security.mfaVerified = true;
            await req.session.save();
            
            return res.json({ message: '2FA verified' });
        }

        res.status(400).json({ error: 'Invalid 2FA code' });
    }),

    // Disable 2FA
    disable2FA: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        if (!user.auth.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA not enabled' });
        }

        user.auth.twoFactorEnabled = false;
        user.auth.twoFactorSecret = undefined;
        await user.save();

        res.json({ message: '2FA disabled' });
    }),

    // Check verification status
    getVerificationStatus: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        res.json({
            emailVerified: user.auth.emailVerified,
            phoneVerified: user.auth.phoneVerified,
            twoFactorEnabled: user.auth.twoFactorEnabled,
            needsVerification: !user.auth.emailVerified
        });
    })
};

module.exports = verificationController;