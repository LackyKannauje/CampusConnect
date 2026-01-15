const User = require('../../models/user/User.model');
const Content = require('../../models/content/Content.model');
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
        } else if (user.social.followers.includes(requestingUser._id)) {
            // Follower view - more data
            profile.isFollowing = user.social.following.includes(requestingUser._id);
        }

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

        // TODO: Implement detailed analytics from UserAnalytics model
        const analytics = {
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
        };

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

module.exports = userController;