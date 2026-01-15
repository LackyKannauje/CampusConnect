const User = require('../../models/user/User.model');
const cloudinary = require('cloudinary').v2;
const errorMiddleware  = require('../../middleware/error.middleware');

const profileController = {
    // Get current user profile
    getProfile: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        const profile = {
            id: user._id,
            email: user.email,
            profile: {
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                fullName: user.profile.fullName,
                avatar: user.profile.avatar,
                bio: user.profile.bio,
                pronouns: user.profile.pronouns,
                skills: user.profile.skills,
                interests: user.profile.interests,
                links: user.profile.links
            },
            academic: {
                college: user.academic.collegeId?.name,
                role: user.academic.role,
                department: user.academic.departmentName,
                batch: user.academic.batch?.name,
                rollNumber: user.academic.rollNumber,
                studentId: user.academic.studentId,
                isCurrentStudent: user.academic.isCurrentStudent
            },
            stats: {
                posts: user.stats.content.posts,
                followers: user.social.followers.length,
                following: user.social.following.length,
                streak: user.stats.activity.currentStreak
            },
            settings: user.settings,
            privacy: user.privacy,
            achievements: user.achievements,
            joinedAt: user.createdAt
        };

        res.json(profile);
    }),

    // Update profile
    updateProfile: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const updates = req.body;

        // Update profile fields
        if (updates.firstName) user.profile.firstName = updates.firstName;
        if (updates.lastName) user.profile.lastName = updates.lastName;
        if (updates.bio !== undefined) user.profile.bio = updates.bio;
        if (updates.pronouns !== undefined) user.profile.pronouns = updates.pronouns;
        if (updates.skills !== undefined) user.profile.skills = updates.skills;
        if (updates.interests !== undefined) user.profile.interests = updates.interests;
        if (updates.links !== undefined) user.profile.links = updates.links;

        // Update academic info (limited)
        if (updates.rollNumber && user.academic.role === 'student') {
            user.academic.rollNumber = updates.rollNumber;
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            profile: {
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                bio: user.profile.bio,
                avatar: user.profile.avatar
            }
        });
    }),

    // Upload avatar
    uploadAvatar: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: `college_updates/avatars/${user._id}`,
                width: 300,
                height: 300,
                crop: 'fill',
                gravity: 'face',
                quality: 'auto'
            });

            // Update user avatar
            user.profile.avatar = {
                url: result.secure_url,
                thumbnail: cloudinary.url(result.public_id, {
                    width: 100,
                    height: 100,
                    crop: 'fill',
                    quality: 'auto'
                }),
                provider: 'cloudinary',
                publicId: result.public_id
            };

            await user.save();

            res.json({
                message: 'Avatar uploaded successfully',
                avatar: user.profile.avatar
            });

        } catch (error) {
            console.error('Avatar upload error:', error);
            res.status(500).json({ error: 'Failed to upload avatar' });
        }
    }),

    // Get public profile
    getPublicProfile: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const requestingUser = req.user;

        const user = await User.findById(userId)
            .select('-auth.passwordHash -auth.twoFactorSecret')
            .populate('academic.collegeId', 'name code');

        if (!user || !user.isActive) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if requesting user can view this profile
        let canView = false;
        const privacy = user.settings.privacy.profileVisibility;

        if (privacy === 'public') canView = true;
        else if (privacy === 'college' && 
                 requestingUser.academic.collegeId.equals(user.academic.collegeId)) {
            canView = true;
        }
        else if (privacy === 'followers' && 
                 user.social.followers.includes(requestingUser._id)) {
            canView = true;
        }
        else if (requestingUser._id.equals(userId)) {
            canView = true;
        }

        if (!canView) {
            return res.status(403).json({ error: 'Profile is private' });
        }

        const profile = {
            id: user._id,
            name: user.profile.fullName,
            avatar: user.profile.avatar,
            bio: user.profile.bio,
            role: user.academic.role,
            department: user.academic.departmentName,
            college: user.academic.collegeId?.name,
            stats: {
                posts: user.stats.content.posts,
                followers: user.social.followers.length,
                following: user.social.following.length
            },
            joinedAt: user.createdAt,
            isFollowing: user.social.followers.includes(requestingUser._id)
        };

        res.json(profile);
    }),

    // Get user settings
    getSettings: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        res.json({
            privacy: user.settings.privacy,
            notifications: user.settings.notifications,
            preferences: user.settings.preferences
        });
    }),

    // Update settings
    updateSettings: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { privacy, notifications, preferences } = req.body;

        // Update privacy settings
        if (privacy) {
            user.settings.privacy = {
                ...user.settings.privacy,
                ...privacy
            };
        }

        // Update notification settings
        if (notifications) {
            user.settings.notifications = {
                ...user.settings.notifications,
                ...notifications
            };
        }

        // Update preferences
        if (preferences) {
            user.settings.preferences = {
                ...user.settings.preferences,
                ...preferences
            };
        }

        await user.save();

        res.json({
            message: 'Settings updated successfully',
            settings: user.settings
        });
    }),

    // Delete account
    deleteAccount: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { password } = req.body;

        // Verify password
        const isValid = await user.verifyPassword(password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Soft delete account
        user.isActive = false;
        user.email = `deleted_${Date.now()}_${user.email}`;
        user.profile.firstName = 'Deleted';
        user.profile.lastName = 'User';
        user.profile.bio = '';
        user.profile.avatar = {};
        
        // Remove sensitive data
        user.auth.passwordHash = '';
        user.auth.twoFactorSecret = undefined;
        user.social.followers = [];
        user.social.following = [];

        await user.save();

        res.json({ message: 'Account deleted successfully' });
    })
};

module.exports = profileController;