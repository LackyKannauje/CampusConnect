// const User = require('../../models/user/User.model');
// const Content = require('../../models/content/Content.model');
// const Pagination = require('../../utils/pagination');
// const errorMiddleware  = require('../../middleware/error.middleware');

// const userController = {
//     // Get all users (admin only)
//     getAllUsers: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.user.academic;
//         const { role, departmentId, search } = req.query;

//         let query = { 
//             'academic.collegeId': collegeId,
//             isActive: true 
//         };

//         // Filters
//         if (role) query['academic.role'] = role;
//         if (departmentId) query['academic.departmentId'] = departmentId;
//         if (search) {
//             query.$or = [
//                 { 'profile.firstName': new RegExp(search, 'i') },
//                 { 'profile.lastName': new RegExp(search, 'i') },
//                 { email: new RegExp(search, 'i') }
//             ];
//         }

//         const result = await Pagination.paginate(User, query, {
//             page: req.pagination.page,
//             limit: req.pagination.limit,
//             select: '-auth.passwordHash -auth.twoFactorSecret',
//             populate: [
//                 { path: 'academic.collegeId', select: 'name code' },
//                 { path: 'academic.departmentId', select: 'name code' }
//             ]
//         });

//         res.json(result);
//     }),

//     // Get user by ID
//     getUserById: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const requestingUser = req.user;

//         const user = await User.findById(userId)
//             .select('-auth.passwordHash -auth.twoFactorSecret')
//             .populate('academic.collegeId', 'name code')
//             .populate('academic.departmentId', 'name code');

//         if (!user || !user.isActive) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Check privacy settings
//         if (!canViewProfile(user, requestingUser)) {
//             return res.status(403).json({ error: 'Access denied' });
//         }

//         // Basic profile info (public)
//         const profile = {
//             id: user._id,
//             name: user.profile.fullName,
//             avatar: user.profile.avatar,
//             bio: user.profile.bio,
//             role: user.academic.role,
//             department: user.academic.departmentName,
//             college: user.academic.collegeId?.name,
//             stats: {
//                 followers: user.social.followers.length,
//                 following: user.social.following.length,
//                 posts: user.stats.content.posts
//             },
//             joinedAt: user.createdAt
//         };

//         // Add additional info based on relationship
//         if (requestingUser._id.equals(userId)) {
//             // Self view - full data
//             profile.email = user.email;
//             profile.settings = user.settings;
//             profile.privacy = user.privacy;
//             profile.connections = user.social;
//         } else if (user.social.followers.includes(requestingUser._id)) {
//             // Follower view - more data
//             profile.isFollowing = user.social.following.includes(requestingUser._id);
//         }

//         res.json(profile);
//     }),

//     // Search users
//     searchUsers: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.user.academic;
//         const { q: searchTerm, role, department } = req.query;

//         if (!searchTerm || searchTerm.length < 2) {
//             return res.status(400).json({ error: 'Search term must be at least 2 characters' });
//         }

//         const query = {
//             'academic.collegeId': collegeId,
//             isActive: true,
//             $text: { $search: searchTerm }
//         };

//         if (role) query['academic.role'] = role;
//         if (department) query['academic.departmentName'] = new RegExp(department, 'i');

//         const users = await User.find(query)
//             .select('profile.firstName profile.lastName profile.avatar academic.role academic.departmentName')
//             .limit(20);

//         res.json({
//             results: users.map(user => ({
//                 id: user._id,
//                 name: user.profile.fullName,
//                 avatar: user.profile.avatar?.url,
//                 role: user.academic.role,
//                 department: user.academic.departmentName
//             }))
//         });
//     }),

//     // Update user (admin only)
//     updateUser: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const { role, departmentId, isActive } = req.body;
//         const requestingUser = req.user;

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Check permissions
//         if (!canModifyUser(requestingUser, user)) {
//             return res.status(403).json({ error: 'Insufficient permissions' });
//         }

//         // Update fields
//         if (role && requestingUser.academic.role === 'admin') {
//             user.academic.role = role;
//         }

//         if (departmentId) {
//             user.academic.departmentId = departmentId;
//         }

//         if (isActive !== undefined) {
//             user.isActive = isActive;
//         }

//         await user.save();

//         res.json({
//             message: 'User updated successfully',
//             user: {
//                 id: user._id,
//                 email: user.email,
//                 role: user.academic.role,
//                 isActive: user.isActive
//             }
//         });
//     }),

//     // Delete user (admin only)
//     deleteUser: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;

//         // Prevent self-deletion
//         if (req.user._id.equals(userId)) {
//             return res.status(400).json({ error: 'Cannot delete your own account' });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Soft delete
//         user.isActive = false;
//         user.email = `deleted_${Date.now()}_${user.email}`;
//         await user.save();

//         res.json({ message: 'User deactivated successfully' });
//     }),

//     // Ban user
//     banUser: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const { reason } = req.body;

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Check permissions
//         if (!canModerateUser(req.user, user)) {
//             return res.status(403).json({ error: 'Insufficient permissions' });
//         }

//         user.moderation.isBanned = true;
//         user.moderation.banReason = reason;
//         user.moderation.bannedAt = new Date();
//         user.moderation.reviewedBy = req.user._id;
//         await user.save();

//         res.json({ message: 'User banned successfully' });
//     }),

//     // Unban user
//     unbanUser: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         if (!user.moderation.isBanned) {
//             return res.status(400).json({ error: 'User is not banned' });
//         }

//         user.moderation.isBanned = false;
//         user.moderation.banReason = undefined;
//         user.moderation.reviewedBy = req.user._id;
//         await user.save();

//         res.json({ message: 'User unbanned successfully' });
//     }),

//     // Follow user
//     followUser: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const follower = req.user;

//         if (follower._id.equals(userId)) {
//             return res.status(400).json({ error: 'Cannot follow yourself' });
//         }

//         const userToFollow = await User.findById(userId);
//         if (!userToFollow || !userToFollow.isActive) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Check if already following
//         if (follower.social.following.includes(userId)) {
//             return res.status(400).json({ error: 'Already following this user' });
//         }

//         // Add to following list
//         follower.social.following.push(userId);
//         await follower.save();

//         // Add to user's followers list
//         userToFollow.social.followers.push(follower._id);
//         await userToFollow.save();

//         // TODO: Send notification

//         res.json({ 
//             message: 'Successfully followed user',
//             following: true,
//             followerCount: userToFollow.social.followers.length
//         });
//     }),

//     // Unfollow user
//     unfollowUser: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const follower = req.user;

//         const userToUnfollow = await User.findById(userId);
//         if (!userToUnfollow) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Remove from following list
//         follower.social.following = follower.social.following.filter(
//             id => !id.equals(userId)
//         );
//         await follower.save();

//         // Remove from user's followers list
//         userToUnfollow.social.followers = userToUnfollow.social.followers.filter(
//             id => !id.equals(follower._id)
//         );
//         await userToUnfollow.save();

//         res.json({ 
//             message: 'Successfully unfollowed user',
//             following: false,
//             followerCount: userToUnfollow.social.followers.length
//         });
//     }),

//     // Get user followers
//     getFollowers: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;

//         const user = await User.findById(userId)
//             .select('social.followers')
//             .populate('social.followers', 'profile.firstName profile.lastName profile.avatar academic.role');

//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         res.json({
//             followers: user.social.followers.map(follower => ({
//                 id: follower._id,
//                 name: follower.profile.fullName,
//                 avatar: follower.profile.avatar?.url,
//                 role: follower.academic.role
//             }))
//         });
//     }),

//     // Get user following
//     getFollowing: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;

//         const user = await User.findById(userId)
//             .select('social.following')
//             .populate('social.following', 'profile.firstName profile.lastName profile.avatar academic.role');

//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         res.json({
//             following: user.social.following.map(following => ({
//                 id: following._id,
//                 name: following.profile.fullName,
//                 avatar: following.profile.avatar?.url,
//                 role: following.academic.role
//             }))
//         });
//     }),

//     // Get user analytics
//     getUserAnalytics: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const { period = 'weekly' } = req.query;

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // TODO: Implement detailed analytics from UserAnalytics model
//         const analytics = {
//             engagement: {
//                 posts: user.stats.content.posts,
//                 likesGiven: user.stats.content.likesGiven,
//                 likesReceived: user.stats.content.likesReceived,
//                 comments: user.stats.content.commentCount
//             },
//             activity: {
//                 lastActive: user.stats.activity.lastActive,
//                 streak: user.stats.activity.currentStreak,
//                 totalSessions: user.stats.activity.totalSessions
//             },
//             social: {
//                 followers: user.social.followers.length,
//                 following: user.social.following.length
//             }
//         };

//         res.json(analytics);
//     }),

//     // Get user activity
//     getUserActivity: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const { limit = 20 } = req.query;

//         const activities = await Content.find({
//             authorId: userId,
//             'moderation.status': 'approved'
//         })
//         .select('title type category createdAt engagement.likes engagement.comments')
//         .sort({ createdAt: -1 })
//         .limit(parseInt(limit));

//         res.json({
//             activities: activities.map(activity => ({
//                 id: activity._id,
//                 title: activity.title,
//                 type: activity.type,
//                 category: activity.category,
//                 createdAt: activity.createdAt,
//                 likes: activity.engagement.likes.length,
//                 comments: activity.engagement.comments.length
//             }))
//         });
//     })
// };

// // Helper functions
// function canViewProfile(targetUser, requestingUser) {
//     const { privacy } = targetUser.settings;
    
//     switch (privacy.profileVisibility) {
//         case 'public':
//             return true;
//         case 'college':
//             return targetUser.academic.collegeId.equals(requestingUser.academic.collegeId);
//         case 'followers':
//             return targetUser.social.followers.includes(requestingUser._id);
//         case 'private':
//             return targetUser._id.equals(requestingUser._id);
//         default:
//             return false;
//     }
// }

// function canModifyUser(admin, targetUser) {
//     // Super admin can modify anyone
//     if (admin.academic.role === 'super_admin') return true;
    
//     // College admin can modify users in their college
//     if (admin.academic.role === 'college_admin' && 
//         admin.academic.collegeId.equals(targetUser.academic.collegeId)) {
//         return true;
//     }
    
//     // Admin can modify users in their college
//     if (admin.academic.role === 'admin' && 
//         admin.academic.collegeId.equals(targetUser.academic.collegeId)) {
//         // Cannot modify other admins or college admin
//         return targetUser.academic.role !== 'admin' && 
//                targetUser.academic.role !== 'college_admin';
//     }
    
//     return false;
// }

// function canModerateUser(moderator, targetUser) {
//     // Cannot moderate users with higher or equal role
//     const roleHierarchy = {
//         'super_admin': 4,
//         'college_admin': 3,
//         'admin': 2,
//         'moderator': 1,
//         'faculty': 0,
//         'student': 0
//     };

//     const moderatorLevel = roleHierarchy[moderator.academic.role] || 0;
//     const targetLevel = roleHierarchy[targetUser.academic.role] || 0;

//     return moderatorLevel > targetLevel && 
//            moderator.academic.collegeId.equals(targetUser.academic.collegeId);
// }

// module.exports = userController;


const User = require('../../models/user/User.model');
const Content = require('../../models/content/Content.model');
const Analytics = require('../../models/analytics/Analytics.model');
const UserAnalytics = require('../../models/analytics/UserAnalytics.model');
const Pagination = require('../../utils/pagination');
const errorMiddleware  = require('../../middleware/error.middleware');

const userController = {
    // Get all users (admin only)
    getAllUsers: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { role, departmentId, search } = req.query;

        let query = { 
            'academic.collegeId': collegeId,
            isActive: true 
        };

        // Filters
        if (role) query['academic.role'] = role;
        if (departmentId) query['academic.departmentId'] = departmentId;
        if (search) {
            query.$or = [
                { 'profile.firstName': new RegExp(search, 'i') },
                { 'profile.lastName': new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') }
            ];
        }

        const result = await Pagination.paginate(User, query, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            select: '-auth.passwordHash -auth.twoFactorSecret',
            populate: [
                { path: 'academic.collegeId', select: 'name code' },
                { path: 'academic.departmentId', select: 'name code' }
            ]
        });

        // Track analytics for admin user search
        await updateAnalytics({
            collegeId,
            departmentId: req.user.academic.departmentId,
            metric: 'admin_users_viewed',
            increment: result.data.length,
            period: 'realtime'
        });

        res.json(result);
    }),

    // Get user by ID
    getUserById: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const requestingUser = req.user;

        const user = await User.findById(userId)
            .select('-auth.passwordHash -auth.twoFactorSecret')
            .populate('academic.collegeId', 'name code')
            .populate('academic.departmentId', 'name code');

        if (!user || !user.isActive) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check privacy settings
        if (!canViewProfile(user, requestingUser)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Basic profile info (public)
        const profile = {
            id: user._id,
            name: user.profile.fullName,
            avatar: user.profile.avatar,
            bio: user.profile.bio,
            role: user.academic.role,
            department: user.academic.departmentName,
            college: user.academic.collegeId?.name,
            stats: {
                followers: user.social.followers.length,
                following: user.social.following.length,
                posts: user.stats.content.posts
            },
            joinedAt: user.createdAt
        };

        // Add additional info based on relationship
        if (requestingUser._id.equals(userId)) {
            // Self view - full data
            profile.email = user.email;
            profile.settings = user.settings;
            profile.privacy = user.privacy;
            profile.connections = user.social;
            
            // Update user activity for self-view
            await updateUserActivityAnalytics(userId, 'profile_view', {
                profileViewType: 'self'
            });
        } else if (user.social.followers.includes(requestingUser._id)) {
            // Follower view - more data
            profile.isFollowing = user.social.following.includes(requestingUser._id);
            
            // Track follower viewing profile
            await updateUserActivityAnalytics(requestingUser._id, 'profile_view', {
                targetUserId: userId,
                profileViewType: 'followed_user'
            });
        } else {
            // Public view
            await updateUserActivityAnalytics(requestingUser._id, 'profile_view', {
                targetUserId: userId,
                profileViewType: 'public'
            });
        }

        // Update user profile views analytics
        await updateUserAnalytics(userId, {
            activity: {
                logins: 1, // Count this as a session/activity
                lastActive: new Date()
            },
            content: {
                views: {
                    received: 1
                }
            }
        });

        res.json(profile);
    }),

    // Search users
    searchUsers: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.user.academic;
        const { q: searchTerm, role, department } = req.query;

        if (!searchTerm || searchTerm.length < 2) {
            return res.status(400).json({ error: 'Search term must be at least 2 characters' });
        }

        const query = {
            'academic.collegeId': collegeId,
            isActive: true,
            $text: { $search: searchTerm }
        };

        if (role) query['academic.role'] = role;
        if (department) query['academic.departmentName'] = new RegExp(department, 'i');

        const users = await User.find(query)
            .select('profile.firstName profile.lastName profile.avatar academic.role academic.departmentName')
            .limit(20);

        // Track search analytics
        await updateAnalytics({
            collegeId,
            metric: 'user_searches',
            increment: 1,
            period: 'realtime'
        });

        res.json({
            results: users.map(user => ({
                id: user._id,
                name: user.profile.fullName,
                avatar: user.profile.avatar?.url,
                role: user.academic.role,
                department: user.academic.departmentName
            }))
        });
    }),

    // Update user (admin only)
    updateUser: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const { role, departmentId, isActive } = req.body;
        const requestingUser = req.user;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check permissions
        if (!canModifyUser(requestingUser, user)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const oldRole = user.academic.role;
        const oldStatus = user.isActive;

        // Update fields
        if (role && requestingUser.academic.role === 'admin') {
            user.academic.role = role;
        }

        if (departmentId) {
            user.academic.departmentId = departmentId;
        }

        if (isActive !== undefined) {
            user.isActive = isActive;
        }

        await user.save();

        // Track admin actions in analytics
        await updateAnalytics({
            collegeId: user.academic.collegeId,
            metric: 'admin_updates',
            increment: 1,
            period: 'realtime',
            details: {
                adminId: requestingUser._id,
                targetUserId: userId,
                roleChanged: role !== oldRole,
                statusChanged: isActive !== oldStatus
            }
        });

        res.json({
            message: 'User updated successfully',
            user: {
                id: user._id,
                email: user.email,
                role: user.academic.role,
                isActive: user.isActive
            }
        });
    }),

    // Delete user (admin only)
    deleteUser: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;

        // Prevent self-deletion
        if (req.user._id.equals(userId)) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Track before deletion
        await updateAnalytics({
            collegeId: user.academic.collegeId,
            metric: 'user_deletions',
            increment: 1,
            period: 'realtime',
            details: {
                adminId: req.user._id,
                targetUserId: userId,
                targetRole: user.academic.role
            }
        });

        // Update user analytics for churn
        await updateUserAnalytics(userId, {
            retention: {
                isRetained: false,
                churnRisk: 100,
                churnDate: new Date()
            }
        });

        // Soft delete
        user.isActive = false;
        user.email = `deleted_${Date.now()}_${user.email}`;
        await user.save();

        res.json({ message: 'User deactivated successfully' });
    }),

    // Ban user
    banUser: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check permissions
        if (!canModerateUser(req.user, user)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        user.moderation.isBanned = true;
        user.moderation.banReason = reason;
        user.moderation.bannedAt = new Date();
        user.moderation.reviewedBy = req.user._id;
        await user.save();

        // Track moderation action
        await updateAnalytics({
            collegeId: user.academic.collegeId,
            metric: 'user_bans',
            increment: 1,
            period: 'realtime',
            details: {
                moderatorId: req.user._id,
                targetUserId: userId,
                reason: reason
            }
        });

        res.json({ message: 'User banned successfully' });
    }),

    // Unban user
    unbanUser: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.moderation.isBanned) {
            return res.status(400).json({ error: 'User is not banned' });
        }

        user.moderation.isBanned = false;
        user.moderation.banReason = undefined;
        user.moderation.reviewedBy = req.user._id;
        await user.save();

        // Track unban action
        await updateAnalytics({
            collegeId: user.academic.collegeId,
            metric: 'user_unbans',
            increment: 1,
            period: 'realtime',
            details: {
                moderatorId: req.user._id,
                targetUserId: userId
            }
        });

        res.json({ message: 'User unbanned successfully' });
    }),

    // Follow user
    followUser: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const follower = req.user;

        if (follower._id.equals(userId)) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const userToFollow = await User.findById(userId);
        if (!userToFollow || !userToFollow.isActive) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already following
        if (follower.social.following.includes(userId)) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        // Add to following list
        follower.social.following.push(userId);
        await follower.save();

        // Add to user's followers list
        userToFollow.social.followers.push(follower._id);
        await userToFollow.save();

        // Update analytics for both users
        await Promise.all([
            // Update follower's analytics
            updateUserAnalytics(follower._id, {
                social: {
                    following: {
                        count: follower.social.following.length,
                        new: 1
                    }
                },
                activity: {
                    lastActive: new Date()
                }
            }),
            
            // Update followed user's analytics
            updateUserAnalytics(userId, {
                social: {
                    followers: {
                        count: userToFollow.social.followers.length,
                        new: 1
                    }
                },
                content: {
                    engagement: {
                        followersGained: 1
                    }
                }
            }),
            
            // Update college-level analytics
            updateAnalytics({
                collegeId: follower.academic.collegeId,
                metric: 'follow_actions',
                increment: 1,
                period: 'realtime'
            })
        ]);

        // TODO: Send notification

        res.json({ 
            message: 'Successfully followed user',
            following: true,
            followerCount: userToFollow.social.followers.length
        });
    }),

    // Unfollow user
    unfollowUser: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const follower = req.user;

        const userToUnfollow = await User.findById(userId);
        if (!userToUnfollow) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove from following list
        follower.social.following = follower.social.following.filter(
            id => !id.equals(userId)
        );
        await follower.save();

        // Remove from user's followers list
        userToUnfollow.social.followers = userToUnfollow.social.followers.filter(
            id => !id.equals(follower._id)
        );
        await userToUnfollow.save();

        // Update analytics
        await Promise.all([
            updateUserAnalytics(follower._id, {
                social: {
                    following: {
                        count: follower.social.following.length,
                        unfollowed: 1
                    }
                }
            }),
            
            updateUserAnalytics(userId, {
                social: {
                    followers: {
                        count: userToUnfollow.social.followers.length,
                        lost: 1
                    }
                }
            })
        ]);

        res.json({ 
            message: 'Successfully unfollowed user',
            following: false,
            followerCount: userToUnfollow.social.followers.length
        });
    }),

    // Get user followers
    getFollowers: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .select('social.followers')
            .populate('social.followers', 'profile.firstName profile.lastName profile.avatar academic.role');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Track follower list view
        await updateUserAnalytics(userId, {
            activity: {
                sessions: {
                    count: 1
                },
                lastActive: new Date()
            }
        });

        res.json({
            followers: user.social.followers.map(follower => ({
                id: follower._id,
                name: follower.profile.fullName,
                avatar: follower.profile.avatar?.url,
                role: follower.academic.role
            }))
        });
    }),

    // Get user following
    getFollowing: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .select('social.following')
            .populate('social.following', 'profile.firstName profile.lastName profile.avatar academic.role');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Track following list view
        await updateUserAnalytics(userId, {
            activity: {
                sessions: {
                    count: 1
                },
                lastActive: new Date()
            }
        });

        res.json({
            following: user.social.following.map(following => ({
                id: following._id,
                name: following.profile.fullName,
                avatar: following.profile.avatar?.url,
                role: following.academic.role
            }))
        });
    }),

    // Get user analytics
    getUserAnalytics: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const { period = 'weekly' } = req.query;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get detailed analytics from UserAnalytics model
        const userAnalytics = await UserAnalytics.findOne({
            userId: userId,
            period: period,
            date: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 7))
            }
        }).sort({ date: -1 });

        // Get historical data for trends
        const historicalAnalytics = await UserAnalytics.find({
            userId: userId,
            period: 'daily',
            date: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
        }).sort({ date: 1 });

        // Calculate engagement trends
        const engagementTrend = historicalAnalytics.length > 0 ? {
            trend: historicalAnalytics[historicalAnalytics.length - 1].scores?.engagement || 0,
            change: historicalAnalytics.length > 1 ? 
                ((historicalAnalytics[historicalAnalytics.length - 1].scores?.engagement || 0) - 
                 (historicalAnalytics[0].scores?.engagement || 0)) / 
                 Math.max(historicalAnalytics[0].scores?.engagement || 1, 1) * 100 : 0
        } : null;

        const analytics = {
            overview: {
                engagement: {
                    posts: user.stats.content.posts,
                    likesGiven: user.stats.content.likesGiven,
                    likesReceived: user.stats.content.likesReceived,
                    comments: user.stats.content.commentCount
                },
                activity: {
                    lastActive: user.stats.activity.lastActive,
                    streak: user.stats.activity.currentStreak,
                    totalSessions: user.stats.activity.totalSessions
                },
                social: {
                    followers: user.social.followers.length,
                    following: user.social.following.length
                }
            },
            detailed: userAnalytics ? {
                scores: userAnalytics.scores,
                activity: userAnalytics.activity,
                content: userAnalytics.content,
                social: userAnalytics.social,
                retention: userAnalytics.retention,
                insights: userAnalytics.insights
            } : null,
            trends: {
                engagement: engagementTrend,
                historicalData: historicalAnalytics.length
            }
        };

        // Track analytics view
        await updateUserAnalytics(userId, {
            activity: {
                sessions: {
                    count: 1
                },
                lastActive: new Date()
            }
        });

        res.json(analytics);
    }),

    // Get user activity
    getUserActivity: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const { limit = 20 } = req.query;

        const activities = await Content.find({
            authorId: userId,
            'moderation.status': 'approved'
        })
        .select('title type category createdAt engagement.likes engagement.comments')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

        // Track activity feed view
        await updateUserAnalytics(userId, {
            activity: {
                sessions: {
                    count: 1
                },
                lastActive: new Date()
            }
        });

        res.json({
            activities: activities.map(activity => ({
                id: activity._id,
                title: activity.title,
                type: activity.type,
                category: activity.category,
                createdAt: activity.createdAt,
                likes: activity.engagement.likes.length,
                comments: activity.engagement.comments.length
            }))
        });
    })
};

// Helper functions
function canViewProfile(targetUser, requestingUser) {
    const { privacy } = targetUser.settings;
    
    switch (privacy.profileVisibility) {
        case 'public':
            return true;
        case 'college':
            return targetUser.academic.collegeId.equals(requestingUser.academic.collegeId);
        case 'followers':
            return targetUser.social.followers.includes(requestingUser._id);
        case 'private':
            return targetUser._id.equals(requestingUser._id);
        default:
            return false;
    }
}

function canModifyUser(admin, targetUser) {
    // Super admin can modify anyone
    if (admin.academic.role === 'super_admin') return true;
    
    // College admin can modify users in their college
    if (admin.academic.role === 'college_admin' && 
        admin.academic.collegeId.equals(targetUser.academic.collegeId)) {
        return true;
    }
    
    // Admin can modify users in their college
    if (admin.academic.role === 'admin' && 
        admin.academic.collegeId.equals(targetUser.academic.collegeId)) {
        // Cannot modify other admins or college admin
        return targetUser.academic.role !== 'admin' && 
               targetUser.academic.role !== 'college_admin';
    }
    
    return false;
}

function canModerateUser(moderator, targetUser) {
    // Cannot moderate users with higher or equal role
    const roleHierarchy = {
        'super_admin': 4,
        'college_admin': 3,
        'admin': 2,
        'moderator': 1,
        'faculty': 0,
        'student': 0
    };

    const moderatorLevel = roleHierarchy[moderator.academic.role] || 0;
    const targetLevel = roleHierarchy[targetUser.academic.role] || 0;

    return moderatorLevel > targetLevel && 
           moderator.academic.collegeId.equals(targetUser.academic.collegeId);
}

// Analytics Helper Functions
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
            case 'user_searches':
                analyticsRecord.users.searchCount = (analyticsRecord.users.searchCount || 0) + increment;
                break;
            case 'admin_users_viewed':
                analyticsRecord.users.adminViews = (analyticsRecord.users.adminViews || 0) + increment;
                break;
            case 'admin_updates':
                analyticsRecord.users.adminUpdates = (analyticsRecord.users.adminUpdates || 0) + increment;
                break;
            case 'user_deletions':
                analyticsRecord.users.deletions = (analyticsRecord.users.deletions || 0) + increment;
                break;
            case 'user_bans':
                analyticsRecord.users.bans = (analyticsRecord.users.bans || 0) + increment;
                break;
            case 'user_unbans':
                analyticsRecord.users.unbans = (analyticsRecord.users.unbans || 0) + increment;
                break;
            case 'follow_actions':
                analyticsRecord.engagement.totalInteractions = (analyticsRecord.engagement.totalInteractions || 0) + increment;
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

        if (updates.content) {
            userAnalytics.content = {
                ...userAnalytics.content,
                ...updates.content
            };
        }

        if (updates.retention) {
            userAnalytics.retention = {
                ...userAnalytics.retention,
                ...updates.retention
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

async function updateUserActivityAnalytics(userId, action, metadata = {}) {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Update main analytics for user activity
        const user = await User.findById(userId);
        if (!user) return;

        await updateAnalytics({
            collegeId: user.academic.collegeId,
            departmentId: user.academic.departmentId,
            metric: 'user_activity',
            increment: 1,
            period: 'realtime',
            details: {
                userId,
                action,
                ...metadata
            }
        });

        // Also update user's own analytics
        await updateUserAnalytics(userId, {
            activity: {
                lastActive: now
            }
        });
    } catch (error) {
        console.error('Error updating user activity analytics:', error);
    }
}

module.exports = userController;