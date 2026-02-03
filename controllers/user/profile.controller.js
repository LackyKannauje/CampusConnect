// const User = require('../../models/user/User.model');
// const cloudinary = require('cloudinary').v2;
// const errorMiddleware  = require('../../middleware/error.middleware');

// const profileController = {
//     // Get current user profile
//     getProfile: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;

//         const profile = {
//             id: user._id,
//             email: user.email,
//             profile: {
//                 firstName: user.profile.firstName,
//                 lastName: user.profile.lastName,
//                 fullName: user.profile.fullName,
//                 avatar: user.profile.avatar,
//                 bio: user.profile.bio,
//                 pronouns: user.profile.pronouns,
//                 skills: user.profile.skills,
//                 interests: user.profile.interests,
//                 links: user.profile.links
//             },
//             academic: {
//                 college: user.academic.collegeId?.name,
//                 role: user.academic.role,
//                 department: user.academic.departmentName,
//                 batch: user.academic.batch?.name,
//                 rollNumber: user.academic.rollNumber,
//                 studentId: user.academic.studentId,
//                 isCurrentStudent: user.academic.isCurrentStudent
//             },
//             stats: {
//                 posts: user.stats.content.posts,
//                 followers: user.social.followers.length,
//                 following: user.social.following.length,
//                 streak: user.stats.activity.currentStreak
//             },
//             settings: user.settings,
//             privacy: user.privacy,
//             achievements: user.achievements,
//             joinedAt: user.createdAt
//         };

//         res.json(profile);
//     }),

//     // Update profile
//     updateProfile: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;
//         const updates = req.body;

//         // Update profile fields
//         if (updates.firstName) user.profile.firstName = updates.firstName;
//         if (updates.lastName) user.profile.lastName = updates.lastName;
//         if (updates.bio !== undefined) user.profile.bio = updates.bio;
//         if (updates.pronouns !== undefined) user.profile.pronouns = updates.pronouns;
//         if (updates.skills !== undefined) user.profile.skills = updates.skills;
//         if (updates.interests !== undefined) user.profile.interests = updates.interests;
//         if (updates.links !== undefined) user.profile.links = updates.links;

//         // Update academic info (limited)
//         if (updates.rollNumber && user.academic.role === 'student') {
//             user.academic.rollNumber = updates.rollNumber;
//         }

//         await user.save();

//         res.json({
//             message: 'Profile updated successfully',
//             profile: {
//                 firstName: user.profile.firstName,
//                 lastName: user.profile.lastName,
//                 bio: user.profile.bio,
//                 avatar: user.profile.avatar
//             }
//         });
//     }),

//     // Upload avatar
//     uploadAvatar: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;
        
//         if (!req.file) {
//             return res.status(400).json({ error: 'No file uploaded' });
//         }

//         try {
//             // Upload to Cloudinary
//             const result = await cloudinary.uploader.upload(req.file.path, {
//                 folder: `college_updates/avatars/${user._id}`,
//                 width: 300,
//                 height: 300,
//                 crop: 'fill',
//                 gravity: 'face',
//                 quality: 'auto'
//             });

//             // Update user avatar
//             user.profile.avatar = {
//                 url: result.secure_url,
//                 thumbnail: cloudinary.url(result.public_id, {
//                     width: 100,
//                     height: 100,
//                     crop: 'fill',
//                     quality: 'auto'
//                 }),
//                 provider: 'cloudinary',
//                 publicId: result.public_id
//             };

//             await user.save();

//             res.json({
//                 message: 'Avatar uploaded successfully',
//                 avatar: user.profile.avatar
//             });

//         } catch (error) {
//             console.error('Avatar upload error:', error);
//             res.status(500).json({ error: 'Failed to upload avatar' });
//         }
//     }),

//     // Get public profile
//     getPublicProfile: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const requestingUser = req.user;

//         const user = await User.findById(userId)
//             .select('-auth.passwordHash -auth.twoFactorSecret')
//             .populate('academic.collegeId', 'name code');

//         if (!user || !user.isActive) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Check if requesting user can view this profile
//         let canView = false;
//         const privacy = user.settings.privacy.profileVisibility;

//         if (privacy === 'public') canView = true;
//         else if (privacy === 'college' && 
//                  requestingUser.academic.collegeId.equals(user.academic.collegeId)) {
//             canView = true;
//         }
//         else if (privacy === 'followers' && 
//                  user.social.followers.includes(requestingUser._id)) {
//             canView = true;
//         }
//         else if (requestingUser._id.equals(userId)) {
//             canView = true;
//         }

//         if (!canView) {
//             return res.status(403).json({ error: 'Profile is private' });
//         }

//         const profile = {
//             id: user._id,
//             name: user.profile.fullName,
//             avatar: user.profile.avatar,
//             bio: user.profile.bio,
//             role: user.academic.role,
//             department: user.academic.departmentName,
//             college: user.academic.collegeId?.name,
//             stats: {
//                 posts: user.stats.content.posts,
//                 followers: user.social.followers.length,
//                 following: user.social.following.length
//             },
//             joinedAt: user.createdAt,
//             isFollowing: user.social.followers.includes(requestingUser._id)
//         };

//         res.json(profile);
//     }),

//     // Get user settings
//     getSettings: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;

//         res.json({
//             privacy: user.settings.privacy,
//             notifications: user.settings.notifications,
//             preferences: user.settings.preferences
//         });
//     }),

//     // Update settings
//     updateSettings: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;
//         const { privacy, notifications, preferences } = req.body;

//         // Update privacy settings
//         if (privacy) {
//             user.settings.privacy = {
//                 ...user.settings.privacy,
//                 ...privacy
//             };
//         }

//         // Update notification settings
//         if (notifications) {
//             user.settings.notifications = {
//                 ...user.settings.notifications,
//                 ...notifications
//             };
//         }

//         // Update preferences
//         if (preferences) {
//             user.settings.preferences = {
//                 ...user.settings.preferences,
//                 ...preferences
//             };
//         }

//         await user.save();

//         res.json({
//             message: 'Settings updated successfully',
//             settings: user.settings
//         });
//     }),

//     // Delete account
//     deleteAccount: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;
//         const { password } = req.body;

//         // Verify password
//         const isValid = await user.verifyPassword(password);
//         if (!isValid) {
//             return res.status(401).json({ error: 'Invalid password' });
//         }

//         // Soft delete account
//         user.isActive = false;
//         user.email = `deleted_${Date.now()}_${user.email}`;
//         user.profile.firstName = 'Deleted';
//         user.profile.lastName = 'User';
//         user.profile.bio = '';
//         user.profile.avatar = {};
        
//         // Remove sensitive data
//         user.auth.passwordHash = '';
//         user.auth.twoFactorSecret = undefined;
//         user.social.followers = [];
//         user.social.following = [];

//         await user.save();

//         res.json({ message: 'Account deleted successfully' });
//     })
// };

// module.exports = profileController;

const User = require('../../models/user/User.model');
const UserAnalytics = require('../../models/analytics/UserAnalytics.model');
const Analytics = require('../../models/analytics/Analytics.model');
const cloudinary = require('cloudinary').v2;
const errorMiddleware  = require('../../middleware/error.middleware');

const profileController = {
    // Get current user profile
    getProfile: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        // Track profile view in analytics
        await updateUserAnalytics(user._id, {
            activity: {
                sessions: {
                    count: 1
                },
                lastActive: new Date()
            }
        });

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

        // Track changes for analytics
        const changes = {};
        if (updates.firstName && updates.firstName !== user.profile.firstName) {
            changes.firstName = true;
        }
        if (updates.lastName && updates.lastName !== user.profile.lastName) {
            changes.lastName = true;
        }
        if (updates.bio !== undefined && updates.bio !== user.profile.bio) {
            changes.bio = true;
        }
        if (updates.pronouns !== undefined && updates.pronouns !== user.profile.pronouns) {
            changes.pronouns = true;
        }
        if (updates.skills !== undefined && JSON.stringify(updates.skills) !== JSON.stringify(user.profile.skills)) {
            changes.skills = true;
        }
        if (updates.interests !== undefined && JSON.stringify(updates.interests) !== JSON.stringify(user.profile.interests)) {
            changes.interests = true;
        }
        if (updates.links !== undefined && JSON.stringify(updates.links) !== JSON.stringify(user.profile.links)) {
            changes.links = true;
        }

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
            if (updates.rollNumber !== user.academic.rollNumber) {
                changes.rollNumber = true;
            }
            user.academic.rollNumber = updates.rollNumber;
        }

        await user.save();

        // Track profile update in analytics
        if (Object.keys(changes).length > 0) {
            await updateUserAnalytics(user._id, {
                activity: {
                    lastActive: new Date(),
                    sessions: {
                        count: 1
                    }
                },
                patterns: {
                    profileUpdates: Object.keys(changes).length
                }
            });

            // Update college analytics for profile updates
            await updateAnalytics({
                collegeId: user.academic.collegeId,
                departmentId: user.academic.departmentId,
                metric: 'profile_updates',
                increment: 1,
                period: 'realtime'
            });
        }

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

            // Track avatar upload in analytics
            await updateUserAnalytics(user._id, {
                activity: {
                    lastActive: new Date(),
                    sessions: {
                        count: 1
                    }
                },
                content: {
                    media: 1
                }
            });

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

        // Track profile view in analytics for both users
        await Promise.all([
            // Track for profile owner (views received)
            updateUserAnalytics(userId, {
                activity: {
                    lastActive: new Date()
                },
                content: {
                    views: {
                        received: 1
                    }
                }
            }),
            
            // Track for viewer (profile views given)
            updateUserAnalytics(requestingUser._id, {
                activity: {
                    lastActive: new Date(),
                    sessions: {
                        count: 1
                    }
                },
                content: {
                    views: {
                        given: 1
                    }
                }
            }),
            
            // Update college analytics for profile views
            updateAnalytics({
                collegeId: user.academic.collegeId,
                departmentId: user.academic.departmentId,
                metric: 'profile_views',
                increment: 1,
                period: 'realtime'
            })
        ]);

        res.json(profile);
    }),

    // Get user settings
    getSettings: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        // Track settings view in analytics
        await updateUserAnalytics(user._id, {
            activity: {
                lastActive: new Date(),
                sessions: {
                    count: 1
                }
            }
        });

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

        // Track changes for analytics
        const changes = {};
        if (privacy) changes.privacy = Object.keys(privacy).length;
        if (notifications) changes.notifications = Object.keys(notifications).length;
        if (preferences) changes.preferences = Object.keys(preferences).length;

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

        // Track settings update in analytics
        if (Object.keys(changes).length > 0) {
            await updateUserAnalytics(user._id, {
                activity: {
                    lastActive: new Date(),
                    sessions: {
                        count: 1
                    }
                },
                patterns: {
                    settingsUpdates: Object.values(changes).reduce((a, b) => a + b, 0)
                }
            });
        }

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

        // Track account deletion in analytics
        await Promise.all([
            updateAnalytics({
                collegeId: user.academic.collegeId,
                departmentId: user.academic.departmentId,
                metric: 'account_deletions',
                increment: 1,
                period: 'realtime',
                details: {
                    userId: user._id,
                    role: user.academic.role,
                    joinDate: user.createdAt
                }
            }),
            
            updateUserAnalytics(user._id, {
                retention: {
                    isRetained: false,
                    churnRisk: 100,
                    churnDate: new Date()
                },
                activity: {
                    lastActive: new Date()
                }
            })
        ]);

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

// Analytics Helper Functions (same as in userController)
async function updateAnalytics({ collegeId, departmentId, metric, increment = 1, period = 'daily', details = {} }) {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Find or create analytics record
        const query = {
            collegeId,
            period,
            timestamp: { 
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        };

        if (departmentId) {
            query.departmentId = departmentId;
        }

        let analyticsRecord = await Analytics.findOne(query);

        if (!analyticsRecord) {
            analyticsRecord = new Analytics({
                collegeId,
                departmentId,
                period,
                timestamp: today,
                users: { total: 0, active: 0, new: 0 },
                content: { total: 0 },
                engagement: { totalInteractions: 0 }
            });
        }

        // Update metrics based on the metric type
        switch (metric) {
            case 'profile_updates':
                analyticsRecord.users.profileUpdates = (analyticsRecord.users.profileUpdates || 0) + increment;
                break;
            case 'profile_views':
                analyticsRecord.users.profileViews = (analyticsRecord.users.profileViews || 0) + increment;
                break;
            case 'account_deletions':
                analyticsRecord.users.deletions = (analyticsRecord.users.deletions || 0) + increment;
                break;
        }

        await analyticsRecord.save();
        
        // Recalculate insights if enough data
        if (analyticsRecord.users.total > 10) {
            await analyticsRecord.calculateInsights();
            await analyticsRecord.save();
        }
    } catch (error) {
        console.error('Error updating analytics:', error);
        // Don't throw error to avoid breaking main functionality
    }
}

async function updateUserAnalytics(userId, updates) {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Find or create user analytics record
        let userAnalytics = await UserAnalytics.findOne({
            userId,
            period: 'daily',
            date: { 
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!userAnalytics) {
            userAnalytics = new UserAnalytics({
                userId,
                collegeId: user.academic.collegeId,
                period: 'daily',
                date: today,
                activity: {
                    sessions: { count: 0 },
                    logins: 0
                },
                content: {
                    created: { posts: 0, comments: 0, media: 0 },
                    engagement: { likesGiven: 0, likesReceived: 0 }
                },
                social: {
                    followers: { count: 0, new: 0 },
                    following: { count: 0, new: 0 }
                }
            });
        }

        // Apply updates
        if (updates.activity) {
            if (updates.activity.logins) {
                userAnalytics.activity.logins += updates.activity.logins;
            }
            if (updates.activity.lastActive) {
                userAnalytics.activity.lastActive = updates.activity.lastActive;
            }
            if (updates.activity.sessions?.count) {
                userAnalytics.activity.sessions.count += updates.activity.sessions.count;
            }
        }

        if (updates.content) {
            userAnalytics.content = {
                ...userAnalytics.content,
                ...updates.content
            };
        }

        if (updates.social) {
            if (updates.social.followers) {
                userAnalytics.social.followers = {
                    ...userAnalytics.social.followers,
                    ...updates.social.followers
                };
            }
            if (updates.social.following) {
                userAnalytics.social.following = {
                    ...userAnalytics.social.following,
                    ...updates.social.following
                };
            }
        }

        if (updates.retention) {
            userAnalytics.retention = {
                ...userAnalytics.retention,
                ...updates.retention
            };
        }

        if (updates.patterns) {
            userAnalytics.patterns = {
                ...userAnalytics.patterns,
                ...updates.patterns
            };
        }

        // Calculate scores
        await userAnalytics.calculateScores();
        await userAnalytics.save();
    } catch (error) {
        console.error('Error updating user analytics:', error);
        // Don't throw error to avoid breaking main functionality
    }
}

module.exports = profileController;