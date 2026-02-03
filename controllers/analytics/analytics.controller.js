// const Analytics = require('../../models/analytics/Analytics.model');
// const UserAnalytics = require('../../models/analytics/UserAnalytics.model');
// const College = require('../../models/college/College.model');
// const User = require('../../models/user/User.model');
// const Content = require('../../models/content/Content.model');
// const RealTimeAnalytics = require('../../services/analytics/RealTimeAnalytics');
// const PredictiveAnalytics = require('../../services/analytics/PredictiveAnalytics');
// const Department = require('../../models/college/Department.model');
// const errorMiddleware  = require('../../middleware/error.middleware');

// const realTimeAnalytics = new RealTimeAnalytics();
// const predictiveAnalytics = new PredictiveAnalytics();

// const analyticsController = {
//     // Platform overview (super admin only)
//     getPlatformOverview: errorMiddleware.catchAsync(async (req, res) => {
//         // Get total colleges
//         const totalColleges = await College.countDocuments({ 'status.isActive': true });
        
//         // Get total users
//         const totalUsers = await User.countDocuments({ isActive: true });
        
//         // Get total content
//         const totalContent = await Content.countDocuments({ 'moderation.status': 'approved' });
        
//         // Get recent growth
//         const thirtyDaysAgo = new Date();
//         thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
//         const newColleges = await College.countDocuments({
//             'status.isActive': true,
//             createdAt: { $gte: thirtyDaysAgo }
//         });
        
//         const newUsers = await User.countDocuments({
//             isActive: true,
//             createdAt: { $gte: thirtyDaysAgo }
//         });

//         res.json({
//             overview: {
//                 colleges: totalColleges,
//                 users: totalUsers,
//                 content: totalContent,
//                 growth: {
//                     colleges: newColleges,
//                     users: newUsers,
//                     collegeGrowthRate: totalColleges > 0 ? (newColleges / totalColleges * 100).toFixed(1) : '0.0',
//                     userGrowthRate: totalUsers > 0 ? (newUsers / totalUsers * 100).toFixed(1) : '0.0'
//                 }
//             },
//             timestamp: new Date()
//         });
//     }),

//     // Platform user stats
//     getPlatformUserStats: errorMiddleware.catchAsync(async (req, res) => {
//         const userStats = await User.aggregate([
//             { $match: { isActive: true } },
//             { $group: {
//                 _id: '$academic.role',
//                 count: { $sum: 1 },
//                 active: {
//                     $sum: {
//                         $cond: [
//                             { $gt: ['$stats.activity.lastActive', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
//                             1,
//                             0
//                         ]
//                     }
//                 }
//             }},
//             { $sort: { count: -1 } }
//         ]);

//         const collegeDistribution = await User.aggregate([
//             { $match: { isActive: true } },
//             {
//                 $lookup: {
//                     from: 'colleges',
//                     localField: 'academic.collegeId',
//                     foreignField: '_id',
//                     as: 'college'
//                 }
//             },
//             { $unwind: '$college' },
//             { $group: {
//                 _id: '$college.name',
//                 users: { $sum: 1 },
//                 collegeId: { $first: '$college._id' }
//             }},
//             { $sort: { users: -1 } },
//             { $limit: 10 }
//         ]);

//         res.json({
//             userStats,
//             topColleges: collegeDistribution,
//             totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0)
//         });
//     }),

//     // Platform college stats
//     getPlatformCollegeStats: errorMiddleware.catchAsync(async (req, res) => {
//         const collegeStats = await College.aggregate([
//             { $match: { 'status.isActive': true } },
//             { $project: {
//                 name: 1,
//                 code: 1,
//                 users: '$stats.users.total',
//                 activeUsers: '$stats.users.active',
//                 departments: { $size: '$departments' },
//                 subscription: '$subscription.plan',
//                 createdAt: 1
//             }},
//             { $sort: { users: -1 } }
//         ]);

//         const subscriptionDistribution = await College.aggregate([
//             { $match: { 'status.isActive': true } },
//             { $group: {
//                 _id: '$subscription.plan',
//                 count: { $sum: 1 },
//                 totalUsers: { $sum: '$stats.users.total' }
//             }}
//         ]);

//         res.json({
//             colleges: collegeStats,
//             subscriptionDistribution,
//             totalColleges: collegeStats.length
//         });
//     }),

//     // Platform engagement
//     getPlatformEngagement: errorMiddleware.catchAsync(async (req, res) => {
//         const recentAnalytics = await Analytics.find({
//             period: 'daily',
//             timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
//         })
//         .sort({ timestamp: 1 });

//         const engagementData = recentAnalytics.map(a => ({
//             date: a.timestamp,
//             activeUsers: a.users.active,
//             totalInteractions: a.engagement.totalInteractions,
//             contentCreated: a.content.total
//         }));

//         // Calculate averages
//         const avgEngagement = engagementData.length > 0 ? 
//             engagementData.reduce((sum, day) => sum + day.totalInteractions, 0) / engagementData.length : 0;

//         res.json({
//             engagementData,
//             averages: {
//                 dailyActiveUsers: engagementData.length > 0 ? 
//                     engagementData.reduce((sum, day) => sum + day.activeUsers, 0) / engagementData.length : 0,
//                 dailyInteractions: avgEngagement,
//                 engagementRate: engagementData.length > 0 ? 
//                     (avgEngagement / (engagementData[0]?.activeUsers || 1) * 100).toFixed(1) : '0.0'
//             }
//         });
//     }),

//     // College overview
//     getCollegeOverview: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;

//         const college = await College.findById(collegeId);
//         if (!college) {
//             return res.status(404).json({ error: 'College not found' });
//         }

//         // Get recent analytics
//         const recentAnalytics = await Analytics.findOne({
//             collegeId,
//             period: 'daily'
//         }).sort({ timestamp: -1 });

//         // Get department stats
//         const departmentStats = await Analytics.aggregate([
//             { $match: { collegeId, period: 'monthly' } },
//             { $sort: { timestamp: -1 } },
//             { $limit: 1 },
//             { $unwind: '$insights.popularCategories' },
//             { $limit: 5 }
//         ]);

//         res.json({
//             college: {
//                 name: college.name,
//                 code: college.code,
//                 stats: college.stats
//             },
//             recentAnalytics: recentAnalytics ? {
//                 activeUsers: recentAnalytics.users.active,
//                 newUsers: recentAnalytics.users.new,
//                 contentCreated: recentAnalytics.content.total,
//                 engagement: recentAnalytics.engagement.totalInteractions
//             } : null,
//             topDepartments: departmentStats.map(d => d.insights?.popularCategories).filter(Boolean),
//             timestamp: new Date()
//         });
//     }),

//     // College user stats
//     getCollegeUserStats: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;

//         const userStats = await User.aggregate([
//             { 
//                 $match: { 
//                     'academic.collegeId': collegeId,
//                     isActive: true 
//                 } 
//             },
//             { $group: {
//                 _id: '$academic.role',
//                 count: { $sum: 1 },
//                 active: {
//                     $sum: {
//                         $cond: [
//                             { $gt: ['$stats.activity.lastActive', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
//                             1,
//                             0
//                         ]
//                     }
//                 },
//                 avgEngagement: { $avg: '$stats.engagement.avgEngagementRate' }
//             }},
//             { $sort: { count: -1 } }
//         ]);

//         const departmentStats = await User.aggregate([
//             { 
//                 $match: { 
//                     'academic.collegeId': collegeId,
//                     isActive: true,
//                     'academic.departmentId': { $exists: true }
//                 } 
//             },
//             { $group: {
//                 _id: '$academic.departmentName',
//                 users: { $sum: 1 },
//                 departmentId: { $first: '$academic.departmentId' }
//             }},
//             { $sort: { users: -1 } }
//         ]);

//         res.json({
//             userStats,
//             departmentDistribution: departmentStats,
//             totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
//             activeUsers: userStats.reduce((sum, stat) => sum + stat.active, 0)
//         });
//     }),

//     // College content stats
//     getCollegeContentStats: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;
//         const { period = 'monthly' } = req.query;

//         const contentStats = await Content.aggregate([
//             { 
//                 $match: { 
//                     collegeId,
//                     'moderation.status': 'approved',
//                     createdAt: { 
//                         $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
//                     }
//                 } 
//             },
//             { $group: {
//                 _id: '$type',
//                 count: { $sum: 1 },
//                 totalLikes: { $sum: { $size: '$engagement.likes' } },
//                 totalComments: { $sum: { $size: '$engagement.comments' } },
//                 avgEngagement: { 
//                     $avg: { 
//                         $divide: [
//                             { $add: [
//                                 { $size: '$engagement.likes' },
//                                 { $size: '$engagement.comments' }
//                             ]},
//                             { $max: ['$engagement.views', 1] }
//                         ]
//                     }
//                 }
//             }},
//             { $sort: { count: -1 } }
//         ]);

//         const topContent = await Content.find({
//             collegeId,
//             'moderation.status': 'approved'
//         })
//         .select('title type category engagement.likes engagement.comments engagement.views createdAt')
//         .populate('authorId', 'profile.firstName profile.lastName')
//         .sort({ 'engagement.hotScore': -1 })
//         .limit(10);

//         res.json({
//             byType: contentStats,
//             topContent: topContent.map(content => ({
//                 id: content._id,
//                 title: content.title,
//                 type: content.type,
//                 category: content.category,
//                 likes: content.engagement.likes.length,
//                 comments: content.engagement.comments.length,
//                 views: content.engagement.views,
//                 author: content.authorId ? {
//                     name: content.authorId.profile.fullName
//                 } : null,
//                 hotScore: content.engagement.hotScore
//             })),
//             period
//         });
//     }),

//     // College engagement
//     getCollegeEngagement: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;
//         const { days = 30 } = req.query;

//         const startDate = new Date();
//         startDate.setDate(startDate.getDate() - parseInt(days));

//         const engagementData = await Analytics.getTimeSeries(
//             collegeId,
//             'engagement.totalInteractions',
//             startDate,
//             new Date(),
//             'daily'
//         );

//         const userActivity = await Analytics.getTimeSeries(
//             collegeId,
//             'users.active',
//             startDate,
//             new Date(),
//             'daily'
//         );

//         // Calculate engagement rate
//         const engagementRate = engagementData.map((eng, index) => ({
//             date: eng.timestamp,
//             rate: userActivity[index] ? 
//                 (eng.value / userActivity[index].value * 100).toFixed(1) : 0
//         }));

//         res.json({
//             engagementData,
//             userActivity,
//             engagementRate,
//             summary: {
//                 avgDailyEngagement: engagementData.length > 0 ? 
//                     (engagementData.reduce((sum, day) => sum + day.value, 0) / engagementData.length).toFixed(0) : 0,
//                 avgDailyActiveUsers: userActivity.length > 0 ? 
//                     (userActivity.reduce((sum, day) => sum + day.value, 0) / userActivity.length).toFixed(0) : 0,
//                 avgEngagementRate: engagementRate.length > 0 ? 
//                     (engagementRate.reduce((sum, day) => sum + parseFloat(day.rate), 0) / engagementRate.length).toFixed(1) : '0.0'
//             }
//         });
//     }),

//     // College department stats
//     getCollegeDepartmentStats: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;

//         const departments = await Department.find({ collegeId })
//             .select('name code stats students.current.count faculty.length placement.placementRate');

//         const departmentEngagement = await Content.aggregate([
//             { 
//                 $match: { 
//                     collegeId,
//                     'moderation.status': 'approved',
//                     departmentId: { $exists: true }
//                 } 
//             },
//             { $group: {
//                 _id: '$departmentId',
//                 postCount: { $sum: 1 },
//                 totalLikes: { $sum: { $size: '$engagement.likes' } },
//                 totalComments: { $sum: { $size: '$engagement.comments' } }
//             }},
//             {
//                 $lookup: {
//                     from: 'departments',
//                     localField: '_id',
//                     foreignField: '_id',
//                     as: 'department'
//                 }
//             },
//             { $unwind: '$department' },
//             { $project: {
//                 departmentName: '$department.name',
//                 departmentCode: '$department.code',
//                 postCount: 1,
//                 totalLikes: 1,
//                 totalComments: 1,
//                 engagementPerPost: {
//                     $divide: [
//                         { $add: ['$totalLikes', '$totalComments'] },
//                         '$postCount'
//                     ]
//                 }
//             }},
//             { $sort: { postCount: -1 } }
//         ]);

//         res.json({
//             departments: departments.map(dept => ({
//                 name: dept.name,
//                 code: dept.code,
//                 students: dept.students.current.count,
//                 faculty: dept.faculty.length,
//                 placementRate: dept.placement.placementRate
//             })),
//             engagement: departmentEngagement,
//             totalDepartments: departments.length
//         });
//     }),

//     // Real-time stats
//     getRealtimeStats: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;

//         const stats = await realTimeAnalytics.getRealtimeStats(collegeId);

//         res.json(stats);
//     }),

//     // Active users
//     getActiveUsers: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;

//         const activeUsers = await realTimeAnalytics.getActiveUsers(collegeId);

//         res.json(activeUsers);
//     }),

//     // User overview
//     getUserOverview: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;
//         const requestingUser = req.user;

//         // Check if user can view analytics
//         if (!requestingUser._id.equals(userId) && 
//             !['admin', 'college_admin'].includes(requestingUser.academic.role)) {
//             return res.status(403).json({ error: 'Not authorized' });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         const recentAnalytics = await UserAnalytics.findOne({
//             userId,
//             period: 'weekly'
//         }).sort({ date: -1 });

//         const overview = {
//             user: {
//                 id: user._id,
//                 name: user.profile.fullName,
//                 role: user.academic.role,
//                 department: user.academic.departmentName
//             },
//             stats: {
//                 posts: user.stats.content.posts,
//                 likesGiven: user.stats.content.likesGiven,
//                 likesReceived: user.stats.content.likesReceived,
//                 comments: user.stats.content.commentCount,
//                 followers: user.social.followers.length,
//                 following: user.social.following.length,
//                 streak: user.stats.activity.currentStreak
//             },
//             recentAnalytics: recentAnalytics ? {
//                 engagementScore: recentAnalytics.scores.engagement,
//                 contributionScore: recentAnalytics.scores.contribution,
//                 activity: recentAnalytics.activity.sessions.count
//             } : null
//         };

//         res.json(overview);
//     }),

//     // User activity
//     // getUserActivity: errorMiddleware.catchAsync(async (req, res) => {
//     //     const { userId } = req.params;
//     //     const { days = 30 } = req.query;

//     //     const startDate = new Date();
//     //     startDate.setDate(startDate.getDate() - parseInt(days));

//     //     const activity = await UserAnalytics.find({
//     //         userId,
//     //         period: 'daily',
//     //         date: { $gte: startDate }
//     //     })
//     //     .select('date activity.sessions.count activity.sessions.totalDuration content.created.posts content.created.comments')
//     //     .sort({ date: 1 });

//     //     res.json({
//     //         activity,
//     //         summary: {
//     //             totalSessions: activity.reduce((sum, day) => sum + day.activity.sessions.count, 0),
//     //             totalPosts: activity.reduce((sum, day) => sum + day.content.created.posts, 0),
//     //             totalComments: activity.reduce((sum, day) => sum + day.content.created.comments, 0),
//     //             avgSessionDuration: activity.length > 0 ? 
//     //                 (activity.reduce((sum, day) => sum + (day.activity.sessions.totalDuration || 0), 0) / 
//     //                  activity.reduce((sum, day) => sum + day.activity.sessions.count, 0)).toFixed(1) : 0
//     //         }
//     //     });
//     // }),

//     // Get user activity - FIXED VERSION
// getUserActivity: errorMiddleware.catchAsync(async (req, res) => {
//     const { userId } = req.params;
//     const { days = 30 } = req.query;

//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - parseInt(days));

//     // Get UserAnalytics data (not from User model)
//     const activity = await UserAnalytics.find({
//         userId,
//         period: 'daily',
//         date: { $gte: startDate }
//     })
//     .select('date activity.sessions.count activity.sessions.totalDuration content.created.posts content.created.comments content.created.media')
//     .sort({ date: 1 });

//     // Get actual content count from Content model
//     const actualPostCount = await Content.countDocuments({
//         authorId: userId,
//         'moderation.status': 'approved'
//     });

//     const actualCommentCount = await Content.countDocuments({
//         authorId: userId,
//         type: 'comment',
//         'moderation.status': 'approved'
//     });

//     // Get user data from User model (only basic fields, not nested ones that cause collisions)
//     const actualUser = await User.findById(userId)
//         .select('social.followers social.following stats.activity.lastActive stats.activity.currentStreak');

//     // Combine data
//     const summary = {
//         totalSessions: activity.reduce((sum, day) => sum + (day.activity?.sessions?.count || 0), 0),
//         totalPosts: actualPostCount, // Use actual count from Content model
//         totalComments: actualCommentCount, // Use actual count from Content model
//         followers: actualUser?.social?.followers?.length || 0,
//         following: actualUser?.social?.following?.length || 0,
//         currentStreak: actualUser?.stats?.activity?.currentStreak || 0,
//         lastActive: actualUser?.stats?.activity?.lastActive,
//         avgSessionDuration: activity.reduce((sum, day) => sum + (day.activity?.sessions?.count || 0), 0) > 0 ? 
//             (activity.reduce((sum, day) => sum + (day.activity?.sessions?.totalDuration || 0), 0) / 
//              activity.reduce((sum, day) => sum + (day.activity?.sessions?.count || 0), 0)).toFixed(1) : 0
//     };

//     res.json({
//         activity,
//         summary
//     });
// }),

//     // User engagement
//     getUserEngagement: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;

//         const user = await User.findById(userId)
//             .select('stats.content stats.engagement social.followers social.following');

//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         const engagement = {
//             content: {
//                 posts: user.stats.content.posts,
//                 likesGiven: user.stats.content.likesGiven,
//                 likesReceived: user.stats.content.likesReceived,
//                 comments: user.stats.content.commentCount,
//                 shares: user.stats.content.shares
//             },
//             social: {
//                 followers: user.social.followers.length,
//                 following: user.social.following.length,
//                 followerGrowth: user.stats.social?.followerGrowth?.[0]?.count || 0
//             },
//             rates: {
//                 engagementRate: user.stats.engagement?.avgEngagementRate || 0,
//                 likeRatio: user.stats.content.likesGiven > 0 ? 
//                     (user.stats.content.likesReceived / user.stats.content.likesGiven).toFixed(2) : 0
//             }
//         };

//         res.json(engagement);
//     }),

//     // User trends
//     getUserTrends: errorMiddleware.catchAsync(async (req, res) => {
//         const { userId } = req.params;

//         const trends = await UserAnalytics.getUserTrend(userId, 'scores.overall', 30);

//         res.json(trends);
//     }),

//     // Content analytics
//     getContentAnalytics: errorMiddleware.catchAsync(async (req, res) => {
//         const { contentId } = req.params;

//         const content = await Content.findById(contentId)
//             .select('title type category engagement ai.tags');

//         if (!content) {
//             return res.status(404).json({ error: 'Content not found' });
//         }

//         const analytics = {
//             id: content._id,
//             title: content.title,
//             type: content.type,
//             category: content.category,
//             engagement: {
//                 likes: content.engagement.likes.length,
//                 comments: content.engagement.comments.length,
//                 shares: content.engagement.shares,
//                 views: content.engagement.views,
//                 saves: content.engagement.saves.length,
//                 engagementRate: content.engagement.engagementRate
//             },
//             ai: {
//                 tags: content.ai?.tags || [],
//                 sentiment: content.ai?.sentiment
//             },
//             hotScore: content.engagement.hotScore,
//             isTrending: content.isTrending
//         };

//         res.json(analytics);
//     }),

//     // Popular content
//     getPopularContent: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;
//         const { timeframe = 'week', limit = 20 } = req.query;

//         const popularContent = await Content.getTrending(
//             user.academic.collegeId,
//             parseInt(limit),
//             timeframe
//         );

//         res.json({
//             timeframe,
//             content: popularContent
//         });
//     }),

//     // Trending content
//     getTrendingContent: errorMiddleware.catchAsync(async (req, res) => {
//         const user = req.user;
//         const { hours = 24, limit = 10 } = req.query;

//         const startDate = new Date();
//         startDate.setHours(startDate.getHours() - parseInt(hours));

//         const trendingContent = await Content.find({
//             collegeId: user.academic.collegeId,
//             'moderation.status': 'approved',
//             createdAt: { $gte: startDate },
//             'engagement.hotScore': { $exists: true }
//         })
//         .select('title type category engagement.hotScore engagement.likes engagement.comments createdAt')
//         .populate('authorId', 'profile.firstName profile.lastName profile.avatar')
//         .sort({ 'engagement.hotScore': -1 })
//         .limit(parseInt(limit));

//         res.json({
//             timeframe: `${hours} hours`,
//             content: trendingContent.map(c => ({
//                 id: c._id,
//                 title: c.title,
//                 type: c.type,
//                 category: c.category,
//                 hotScore: c.engagement.hotScore,
//                 likes: c.engagement.likes.length,
//                 comments: c.engagement.comments.length,
//                 author: c.authorId ? {
//                     name: c.authorId.profile.fullName,
//                     avatar: c.authorId.profile.avatar?.url
//                 } : null,
//                 timeAgo: Math.round((new Date() - c.createdAt) / (1000 * 60 * 60)) + ' hours'
//             }))
//         });
//     }),

//     // Churn predictions
//     getChurnPredictions: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;
//         const { limit = 50 } = req.query;

//         // Get users with low activity
//         const lowActivityUsers = await User.find({
//             'academic.collegeId': collegeId,
//             isActive: true,
//             'stats.activity.lastActive': { 
//                 $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
//             }
//         })
//         .select('profile.firstName profile.lastName email stats.activity.lastActive')
//         .limit(parseInt(limit));

//         const predictions = await Promise.all(
//             lowActivityUsers.map(async (user) => {
//                 const prediction = await predictiveAnalytics.predictUserChurn(collegeId, user._id);
//                 return {
//                     user: {
//                         id: user._id,
//                         name: user.profile.fullName,
//                         email: user.email,
//                         lastActive: user.stats.activity.lastActive
//                     },
//                     prediction
//                 };
//             })
//         );

//         res.json({
//             predictions: predictions.sort((a, b) => b.prediction.churnRisk - a.prediction.churnRisk),
//             summary: {
//                 totalAtRisk: predictions.filter(p => p.prediction.churnRisk > 70).length,
//                 avgChurnRisk: predictions.length > 0 ? 
//                     (predictions.reduce((sum, p) => sum + p.prediction.churnRisk, 0) / predictions.length).toFixed(1) : 0
//             }
//         });
//     }),

//     // Growth predictions
//     getGrowthPredictions: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;

//         const prediction = await predictiveAnalytics.predictPlatformGrowth(collegeId);

//         res.json(prediction);
//     }),

//     // Content predictions
//     getContentPredictions: errorMiddleware.catchAsync(async (req, res) => {
//         const { contentId } = req.params;

//         const content = await Content.findById(contentId);
//         if (!content) {
//             return res.status(404).json({ error: 'Content not found' });
//         }

//         const prediction = await predictiveAnalytics.predictContentPopularity(
//             contentId,
//             content.collegeId
//         );

//         res.json({
//             content: {
//                 id: content._id,
//                 title: content.title,
//                 type: content.type
//             },
//             prediction
//         });
//     }),

//     // Department analytics
//     getDepartmentAnalytics: errorMiddleware.catchAsync(async (req, res) => {
//         const { departmentId } = req.params;

//         const department = await Department.findById(departmentId);
//         if (!department) {
//             return res.status(404).json({ error: 'Department not found' });
//         }

//         // Get user stats for department
//         const userStats = await User.aggregate([
//             { 
//                 $match: { 
//                     'academic.departmentId': departmentId,
//                     isActive: true 
//                 } 
//             },
//             { $group: {
//                 _id: '$academic.role',
//                 count: { $sum: 1 },
//                 avgEngagement: { $avg: '$stats.engagement.avgEngagementRate' }
//             }}
//         ]);

//         // Get content stats for department
//         const contentStats = await Content.aggregate([
//             { 
//                 $match: { 
//                     departmentId,
//                     'moderation.status': 'approved',
//                     createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
//                 } 
//             },
//             { $group: {
//                 _id: '$type',
//                 count: { $sum: 1 },
//                 avgLikes: { $avg: { $size: '$engagement.likes' } },
//                 avgComments: { $avg: { $size: '$engagement.comments' } }
//             }}
//         ]);

//         res.json({
//             department: {
//                 name: department.name,
//                 code: department.code,
//                 stats: department.stats
//             },
//             userStats,
//             contentStats,
//             summary: {
//                 totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
//                 totalContent: contentStats.reduce((sum, stat) => sum + stat.count, 0),
//                 engagementScore: department.stats.engagementRate || 0
//             }
//         });
//     }),

//     // User leaderboard
//     getUserLeaderboard: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;
//         const { period = 'weekly', limit = 50 } = req.query;

//         const leaderboard = await UserAnalytics.getLeaderboard(
//             collegeId,
//             period,
//             parseInt(limit)
//         );

//         res.json({
//             period,
//             leaderboard
//         });
//     }),

//     // Department leaderboard
//     getDepartmentLeaderboard: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;

//         const departments = await Department.find({ collegeId })
//             .select('name code stats.studentCount stats.facultyCount stats.engagementRate placement.placementRate')
//             .sort({ 'stats.engagementRate': -1 });

//         res.json({
//             departments: departments.map((dept, index) => ({
//                 rank: index + 1,
//                 name: dept.name,
//                 code: dept.code,
//                 students: dept.stats.studentCount,
//                 faculty: dept.stats.facultyCount,
//                 engagementRate: dept.stats.engagementRate,
//                 placementRate: dept.placement.placementRate
//             }))
//         });
//     }),

//     // Export analytics
//     exportAnalytics: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;
//         const { format = 'json', startDate, endDate } = req.body;

//         // Get analytics data
//         const analytics = await Analytics.find({
//             collegeId,
//             period: 'daily',
//             ...(startDate && endDate && {
//                 timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
//             })
//         })
//         .sort({ timestamp: 1 });

//         if (format === 'csv') {
//             // Convert to CSV
//             const csvData = analytics.map(a => ({
//                 date: a.timestamp.toISOString().split('T')[0],
//                 activeUsers: a.users.active,
//                 newUsers: a.users.new,
//                 totalContent: a.content.total,
//                 totalInteractions: a.engagement.totalInteractions,
//                 engagementRate: a.engagement.engagementRate
//             }));

//             const csvHeaders = 'Date,Active Users,New Users,Total Content,Total Interactions,Engagement Rate\n';
//             const csvRows = csvData.map(d => 
//                 `${d.date},${d.activeUsers},${d.newUsers},${d.totalContent},${d.totalInteractions},${d.engagementRate}`
//             ).join('\n');

//             res.setHeader('Content-Type', 'text/csv');
//             res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
//             return res.send(csvHeaders + csvRows);
//         }

//         // Default: JSON
//         res.json({
//             collegeId,
//             period: `${startDate || 'start'} to ${endDate || 'end'}`,
//             analytics,
//             generatedAt: new Date()
//         });
//     }),

//     // Create custom report
//     createCustomReport: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;
//         const { name, metrics, filters, schedule } = req.body;
//         const user = req.user;

//         // TODO: Implement custom report generation and scheduling
//         // For now, return a mock response

//         const report = {
//             id: `report_${Date.now()}`,
//             name: name || 'Custom Report',
//             collegeId,
//             createdBy: user._id,
//             metrics: metrics || ['users.active', 'content.total', 'engagement.totalInteractions'],
//             filters: filters || {},
//             schedule: schedule || 'once',
//             status: 'pending',
//             createdAt: new Date()
//         };

//         res.status(201).json({
//             message: 'Custom report created',
//             report,
//             estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
//         });
//     }),

//     // Get report
//     getReport: errorMiddleware.catchAsync(async (req, res) => {
//         const { reportId } = req.params;

//         // TODO: Retrieve generated report
//         // For now, return mock data

//         res.json({
//             id: reportId,
//             status: 'completed',
//             generatedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
//             data: {
//                 summary: {
//                     period: 'Last 30 days',
//                     activeUsers: 1250,
//                     newUsers: 150,
//                     contentCreated: 325,
//                     engagementRate: '4.2%'
//                 },
//                 charts: [],
//                 insights: [
//                     'Peak activity occurs between 2 PM and 6 PM',
//                     'Most popular content category is "Study Materials"',
//                     'Engagement increased by 15% compared to previous period'
//                 ]
//             }
//         });
//     })
// };

// module.exports = analyticsController;

const Analytics = require('../../models/analytics/Analytics.model');
const UserAnalytics = require('../../models/analytics/UserAnalytics.model');
const College = require('../../models/college/College.model');
const User = require('../../models/user/User.model');
const Content = require('../../models/content/Content.model');
const RealTimeAnalytics = require('../../services/analytics/RealTimeAnalytics');
const PredictiveAnalytics = require('../../services/analytics/PredictiveAnalytics');
const Department = require('../../models/college/Department.model');
const errorMiddleware  = require('../../middleware/error.middleware');

const realTimeAnalytics = new RealTimeAnalytics();
const predictiveAnalytics = new PredictiveAnalytics();

const analyticsController = {
    // Platform overview (super admin only)
    getPlatformOverview: errorMiddleware.catchAsync(async (req, res) => {
        // Get total colleges
        const totalColleges = await College.countDocuments({ 'status.isActive': true });
        
        // Get total users
        const totalUsers = await User.countDocuments({ isActive: true });
        
        // Get total content
        const totalContent = await Content.countDocuments({ 
            'moderation.status': { $in: ['approved', 'pending'] },
            isActive: true 
        });
        
        // Get recent growth
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newColleges = await College.countDocuments({
            'status.isActive': true,
            createdAt: { $gte: thirtyDaysAgo }
        });
        
        const newUsers = await User.countDocuments({
            isActive: true,
            createdAt: { $gte: thirtyDaysAgo }
        });

        const newContent = await Content.countDocuments({
            'moderation.status': { $in: ['approved', 'pending'] },
            isActive: true,
            createdAt: { $gte: thirtyDaysAgo }
        });

        res.json({
            overview: {
                colleges: totalColleges,
                users: totalUsers,
                content: totalContent,
                growth: {
                    colleges: newColleges,
                    users: newUsers,
                    content: newContent,
                    collegeGrowthRate: totalColleges > 0 ? ((newColleges / totalColleges) * 100).toFixed(1) : '0.0',
                    userGrowthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(1) : '0.0'
                }
            },
            timestamp: new Date()
        });
    }),

    // Platform user stats
    getPlatformUserStats: errorMiddleware.catchAsync(async (req, res) => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const userStats = await User.aggregate([
            { $match: { isActive: true } },
            { $group: {
                _id: '$academic.role',
                count: { $sum: 1 },
                active: {
                    $sum: {
                        $cond: [
                            { 
                                $and: [
                                    { $ifNull: ['$stats.activity.lastActive', false] },
                                    { $gte: ['$stats.activity.lastActive', sevenDaysAgo] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }},
            { $sort: { count: -1 } }
        ]);

        const collegeDistribution = await User.aggregate([
            { $match: { isActive: true } },
            { $lookup: {
                from: 'colleges',
                localField: 'academic.collegeId',
                foreignField: '_id',
                as: 'college'
            }},
            { $unwind: { path: '$college', preserveNullAndEmptyArrays: true } },
            { $group: {
                _id: { 
                    collegeId: '$academic.collegeId',
                    collegeName: '$college.name' 
                },
                users: { $sum: 1 }
            }},
            { $project: {
                _id: 0,
                collegeId: '$_id.collegeId',
                collegeName: '$_id.collegeName',
                users: 1
            }},
            { $sort: { users: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            userStats,
            topColleges: collegeDistribution.filter(c => c.collegeId && c.collegeName),
            totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
            totalActiveUsers: userStats.reduce((sum, stat) => sum + stat.active, 0)
        });
    }),

    // Platform college stats
    getPlatformCollegeStats: errorMiddleware.catchAsync(async (req, res) => {
        const collegeStats = await College.aggregate([
            { $match: { 'status.isActive': true } },
            { $lookup: {
                from: 'users',
                let: { collegeId: '$_id' },
                pipeline: [
                    { $match: { 
                        $expr: { $eq: ['$academic.collegeId', '$$collegeId'] },
                        isActive: true 
                    }},
                    { $count: 'userCount' }
                ],
                as: 'userData'
            }},
            { $lookup: {
                from: 'contents',
                let: { collegeId: '$_id' },
                pipeline: [
                    { $match: { 
                        $expr: { $eq: ['$collegeId', '$$collegeId'] },
                        'moderation.status': { $in: ['approved', 'pending'] },
                        isActive: true 
                    }},
                    { $count: 'contentCount' }
                ],
                as: 'contentData'
            }},
            { $project: {
                name: 1,
                code: 1,
                users: { $ifNull: [{ $arrayElemAt: ['$userData.userCount', 0] }, 0] },
                departments: { $size: { $ifNull: ['$departments', []] } },
                subscription: '$subscription.plan',
                content: { $ifNull: [{ $arrayElemAt: ['$contentData.contentCount', 0] }, 0] },
                createdAt: 1
            }},
            { $sort: { users: -1 } }
        ]);

        const subscriptionDistribution = await College.aggregate([
            { $match: { 'status.isActive': true } },
            { $group: {
                _id: '$subscription.plan',
                count: { $sum: 1 }
            }}
        ]);

        res.json({
            colleges: collegeStats,
            subscriptionDistribution,
            totalColleges: collegeStats.length,
            totalUsers: collegeStats.reduce((sum, college) => sum + (college.users || 0), 0),
            totalContent: collegeStats.reduce((sum, college) => sum + (college.content || 0), 0)
        });
    }),

    // Platform engagement
    getPlatformEngagement: errorMiddleware.catchAsync(async (req, res) => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Get recent content engagement
        const recentContent = await Content.aggregate([
            { $match: { 
                createdAt: { $gte: sevenDaysAgo },
                isActive: true 
            }},
            { $project: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                likes: { $size: { $ifNull: ['$engagement.likes', []] } },
                comments: { $size: { $ifNull: ['$engagement.comments', []] } },
                views: { $ifNull: ['$engagement.views', 0] }
            }},
            { $group: {
                _id: '$date',
                contentCount: { $sum: 1 },
                totalLikes: { $sum: '$likes' },
                totalComments: { $sum: '$comments' },
                totalViews: { $sum: '$views' }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Get daily active users from UserAnalytics
        const dailyActiveUsers = await Analytics.aggregate([
            { $match: { 
                period: 'daily',
                timestamp: { $gte: sevenDaysAgo }
            }},
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                activeUsers: { $sum: '$users.active' }
            }},
            { $sort: { _id: 1 } }
        ]);

        // If no Analytics data, fallback to User model
        let engagementData = [];
        if (dailyActiveUsers.length > 0) {
            engagementData = recentContent.map(content => ({
                date: content._id,
                activeUsers: dailyActiveUsers.find(d => d._id === content._id)?.activeUsers || 0,
                totalInteractions: content.totalLikes + content.totalComments + content.totalViews,
                contentCreated: content.contentCount
            }));
        } else {
            // Fallback to just content data
            engagementData = recentContent.map(content => ({
                date: content._id,
                activeUsers: 0,
                totalInteractions: content.totalLikes + content.totalComments + content.totalViews,
                contentCreated: content.contentCount
            }));
        }

        // Calculate averages
        const avgEngagement = engagementData.length > 0 ? 
            engagementData.reduce((sum, day) => sum + day.totalInteractions, 0) / engagementData.length : 0;
        const avgActiveUsers = engagementData.length > 0 ? 
            engagementData.reduce((sum, day) => sum + day.activeUsers, 0) / engagementData.length : 0;

        res.json({
            engagementData,
            averages: {
                dailyActiveUsers: avgActiveUsers.toFixed(0),
                dailyInteractions: avgEngagement.toFixed(0),
                engagementRate: avgActiveUsers > 0 ? (avgEngagement / avgActiveUsers).toFixed(1) : '0.0'
            }
        });
    }),

    // College overview
    getCollegeOverview: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        // Get actual user stats
        const totalUsers = await User.countDocuments({ 
            'academic.collegeId': collegeId, 
            isActive: true 
        });

        const activeUsers = await User.countDocuments({ 
            'academic.collegeId': collegeId, 
            isActive: true,
            'stats.activity.lastActive': { 
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            }
        });

        // Get content stats
        const totalContent = await Content.countDocuments({ 
            collegeId, 
            isActive: true 
        });

        const newUsers = await User.countDocuments({ 
            'academic.collegeId': collegeId, 
            isActive: true,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });

        // Get department stats
        const departmentCount = await Department.countDocuments({ 
            collegeId, 
            'status.isActive': true 
        });

        // Get recent analytics from Analytics model
        const recentAnalytics = await Analytics.findOne({
            collegeId,
            period: 'daily'
        }).sort({ timestamp: -1 }).limit(1);

        res.json({
            college: {
                name: college.name,
                code: college.code,
                stats: {
                    users: { 
                        total: totalUsers,
                        active: activeUsers,
                        new: newUsers
                    },
                    content: { total: totalContent },
                    departments: departmentCount
                }
            },
            recentAnalytics: recentAnalytics ? {
                activeUsers: recentAnalytics.users?.active || 0,
                newUsers: recentAnalytics.users?.new || 0,
                contentCreated: recentAnalytics.content?.total || 0,
                engagement: recentAnalytics.engagement?.totalInteractions || 0
            } : null,
            timestamp: new Date()
        });
    }),

    // College user stats
    getCollegeUserStats: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const userStats = await User.aggregate([
            { 
                $match: { 
                    'academic.collegeId': collegeId,
                    isActive: true 
                } 
            },
            { $group: {
                _id: { 
                    role: '$academic.role',
                    department: '$academic.departmentName'
                },
                count: { $sum: 1 },
                active: {
                    $sum: {
                        $cond: [
                            { 
                                $and: [
                                    { $ifNull: ['$stats.activity.lastActive', false] },
                                    { $gte: ['$stats.activity.lastActive', sevenDaysAgo] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }},
            { $group: {
                _id: '$_id.role',
                count: { $sum: '$count' },
                active: { $sum: '$active' }
            }},
            { $sort: { count: -1 } }
        ]);

        const departmentStats = await User.aggregate([
            { 
                $match: { 
                    'academic.collegeId': collegeId,
                    isActive: true,
                    'academic.departmentName': { $exists: true, $ne: '' }
                } 
            },
            { $group: {
                _id: '$academic.departmentName',
                users: { $sum: 1 }
            }},
            { $sort: { users: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            userStats,
            departmentDistribution: departmentStats,
            totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
            activeUsers: userStats.reduce((sum, stat) => sum + stat.active, 0)
        });
    }),

    // College content stats
    getCollegeContentStats: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const { period = 'monthly' } = req.query;

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const contentStats = await Content.aggregate([
            { 
                $match: { 
                    collegeId,
                    isActive: true,
                    createdAt: { $gte: thirtyDaysAgo }
                } 
            },
            { $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
                totalComments: { $sum: { $size: { $ifNull: ['$engagement.comments', []] } } },
                totalViews: { $sum: { $ifNull: ['$engagement.views', 0] } }
            }},
            { $project: {
                type: '$_id',
                count: 1,
                totalLikes: 1,
                totalComments: 1,
                totalViews: 1,
                avgEngagement: {
                    $divide: [
                        { $add: ['$totalLikes', '$totalComments', '$totalViews'] },
                        '$count'
                    ]
                }
            }},
            { $sort: { count: -1 } }
        ]);

        const topContent = await Content.find({
            collegeId,
            isActive: true,
            'moderation.status': 'approved'
        })
        .select('title type category engagement.likes engagement.comments engagement.views createdAt')
        .populate('authorId', 'profile.firstName profile.lastName profile.avatar')
        .sort({ 'engagement.hotScore': -1 })
        .limit(10);

        res.json({
            byType: contentStats,
            topContent: topContent.map(content => ({
                id: content._id,
                title: content.title,
                type: content.type,
                category: content.category,
                likes: content.engagement.likes.length,
                comments: content.engagement.comments.length,
                views: content.engagement.views || 0,
                author: content.authorId ? {
                    name: content.authorId.profile.fullName,
                    avatar: content.authorId.profile.avatar?.url
                } : null,
                createdAt: content.createdAt,
                hotScore: content.engagement.hotScore
            })),
            period,
            totalContent: contentStats.reduce((sum, stat) => sum + stat.count, 0)
        });
    }),

    // College engagement
    getCollegeEngagement: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        const endDate = new Date();

        // Try to get data from Analytics model first
        let engagementData = [];
        let userActivity = [];

        try {
            engagementData = await Analytics.find({
                collegeId,
                period: 'daily',
                timestamp: { $gte: startDate, $lte: endDate }
            })
            .select('timestamp users.active engagement.totalInteractions content.total')
            .sort({ timestamp: 1 });

            if (engagementData.length > 0) {
                res.json({
                    engagementData: engagementData.map(a => ({
                        date: a.timestamp,
                        value: a.engagement?.totalInteractions || 0,
                        activeUsers: a.users?.active || 0
                    })),
                    summary: {
                        avgDailyEngagement: engagementData.length > 0 ? 
                            (engagementData.reduce((sum, day) => sum + (day.engagement?.totalInteractions || 0), 0) / engagementData.length).toFixed(0) : 0,
                        avgDailyActiveUsers: engagementData.length > 0 ? 
                            (engagementData.reduce((sum, day) => sum + (day.users?.active || 0), 0) / engagementData.length).toFixed(0) : 0,
                        totalPeriodEngagement: engagementData.reduce((sum, day) => sum + (day.engagement?.totalInteractions || 0), 0),
                        totalPeriodActiveUsers: engagementData.reduce((sum, day) => sum + (day.users?.active || 0), 0)
                    }
                });
                return;
            }
        } catch (error) {
            console.log('Analytics model not available, falling back to Content model');
        }

        // Fallback to Content model
        const contentEngagement = await Content.aggregate([
            { 
                $match: { 
                    collegeId,
                    isActive: true,
                    createdAt: { $gte: startDate, $lte: endDate }
                } 
            },
            { $project: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                likes: { $size: { $ifNull: ['$engagement.likes', []] } },
                comments: { $size: { $ifNull: ['$engagement.comments', []] } },
                views: { $ifNull: ['$engagement.views', 0] }
            }},
            { $group: {
                _id: '$date',
                totalInteractions: { 
                    $sum: { $add: ['$likes', '$comments', '$views'] } 
                }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Get user activity
        const userActivityByDay = await User.aggregate([
            { 
                $match: { 
                    'academic.collegeId': collegeId,
                    isActive: true,
                    'stats.activity.lastActive': { $gte: startDate, $lte: endDate }
                } 
            },
            { $project: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$stats.activity.lastActive" } }
            }},
            { $group: {
                _id: '$date',
                activeUsers: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Combine data
        const fallbackData = contentEngagement.map(eng => ({
            date: eng._id,
            value: eng.totalInteractions,
            activeUsers: userActivityByDay.find(u => u._id === eng._id)?.activeUsers || 0
        }));

        res.json({
            engagementData: fallbackData,
            summary: {
                avgDailyEngagement: fallbackData.length > 0 ? 
                    (fallbackData.reduce((sum, day) => sum + day.value, 0) / fallbackData.length).toFixed(0) : 0,
                avgDailyActiveUsers: fallbackData.length > 0 ? 
                    (fallbackData.reduce((sum, day) => sum + day.activeUsers, 0) / fallbackData.length).toFixed(0) : 0,
                totalPeriodEngagement: fallbackData.reduce((sum, day) => sum + day.value, 0),
                totalPeriodActiveUsers: userActivityByDay.reduce((sum, day) => sum + day.activeUsers, 0)
            }
        });
    }),

    // College department stats
    getCollegeDepartmentStats: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        const departments = await Department.find({ collegeId, 'status.isActive': true })
            .select('name code stats placement.placementRate')
            .lean();

        // Get department engagement from content
        const departmentEngagement = await Content.aggregate([
            { 
                $match: { 
                    collegeId,
                    isActive: true,
                    departmentId: { $exists: true, $ne: null }
                } 
            },
            { $lookup: {
                from: 'departments',
                localField: 'departmentId',
                foreignField: '_id',
                as: 'department'
            }},
            { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
            { $group: {
                _id: '$departmentId',
                departmentName: { $first: '$department.name' },
                departmentCode: { $first: '$department.code' },
                postCount: { $sum: 1 },
                totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
                totalComments: { $sum: { $size: { $ifNull: ['$engagement.comments', []] } } }
            }},
            { $project: {
                departmentName: 1,
                departmentCode: 1,
                postCount: 1,
                totalLikes: 1,
                totalComments: 1,
                engagementPerPost: {
                    $divide: [
                        { $add: ['$totalLikes', '$totalComments'] },
                        { $max: ['$postCount', 1] }
                    ]
                }
            }},
            { $sort: { postCount: -1 } }
        ]);

        res.json({
            departments: departments.map(dept => ({
                name: dept.name,
                code: dept.code,
                students: dept.stats?.studentCount || 0,
                faculty: dept.stats?.facultyCount || 0,
                placementRate: dept.placement?.placementRate || 0
            })),
            engagement: departmentEngagement,
            totalDepartments: departments.length
        });
    }),

    // Real-time stats
    getRealtimeStats: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        try {
            const stats = await realTimeAnalytics.getRealtimeStats(collegeId);
            res.json(stats);
        } catch (error) {
            // Return basic stats if service not available
            const activeUsers = await User.countDocuments({
                'academic.collegeId': collegeId,
                isActive: true,
                'stats.activity.lastActive': { $gte: new Date(Date.now() - 15 * 60 * 1000) }
            });

            const recentContent = await Content.countDocuments({
                collegeId,
                isActive: true,
                createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
            });

            res.json({
                activeUsers,
                recentContent,
                onlineNow: activeUsers,
                timestamp: new Date()
            });
        }
    }),

    // Active users
    getActiveUsers: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;

        try {
            const activeUsers = await realTimeAnalytics.getActiveUsers(collegeId);
            res.json(activeUsers);
        } catch (error) {
            // Fallback to basic active users
            const activeUsers = await User.find({
                'academic.collegeId': collegeId,
                isActive: true,
                'stats.activity.lastActive': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
            .select('profile.firstName profile.lastName profile.avatar academic.role stats.activity.lastActive')
            .sort({ 'stats.activity.lastActive': -1 })
            .limit(50);

            res.json(activeUsers.map(user => ({
                id: user._id,
                name: user.profile.fullName,
                avatar: user.profile.avatar?.url,
                role: user.academic.role,
                lastActive: user.stats.activity.lastActive
            })));
        }
    }),

    // User overview
    getUserOverview: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const requestingUser = req.user;

        // Check if user can view analytics
        if (!requestingUser._id.equals(userId) && 
            !['admin', 'college_admin','super_admin'].includes(requestingUser.academic.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get actual content counts
        // const postCount = await Content.countDocuments({
        //     authorId: userId,
        //     isActive: true,
        //     type: { $ne: 'comment' }
        // });

        // const commentCount = await Content.countDocuments({
        //     authorId: userId,
        //     isActive: true,
        //     type: 'comment'
        // });

        // Get recent UserAnalytics
        const recentAnalytics = await UserAnalytics.findOne({
            userId,
            period: 'daily'
        }).sort({ date: -1 });

        const overview = {
            user: {
                id: user._id,
                name: user.profile.fullName,
                role: user.academic.role,
                department: user.academic.departmentName,
                avatar: user.profile.avatar?.url,
                email: user.email,
                joinedAt: user.createdAt
            },
            stats: {
                posts: user.stats?.content?.posts || 0,
                comments: user.stats?.content?.commentCount || 0,
                likesGiven: user.stats?.content?.likesGiven || 0,
                likesReceived: user.stats?.content?.likesReceived || 0,
                followers: user.social?.followers?.length || 0,
                following: user.social?.following?.length || 0,
                streak: user.stats?.activity?.currentStreak || 0,
                lastActive: user.stats?.activity?.lastActive
            },
            recentAnalytics: recentAnalytics ? {
                engagementScore: recentAnalytics.scores?.engagement || 0,
                contributionScore: recentAnalytics.scores?.contribution || 0,
                overallScore: recentAnalytics.scores?.overall || 0,
                activity: recentAnalytics.activity?.sessions?.count || 0
            } : null,

        };

        res.json(overview);
    }),

    // User activity
    getUserActivity: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Get UserAnalytics data
        const activity = await UserAnalytics.find({
            userId,
            period: 'daily',
            date: { $gte: startDate }
        })
        .select('date activity.sessions.count activity.sessions.totalDuration content.created.posts content.created.comments content.created.media')
        .sort({ date: 1 });

        // Get actual content count from Content model
        const actualPostCount = await Content.countDocuments({
            authorId: userId,
            isActive: true,
            type: { $ne: 'comment' }
        });

        const actualCommentCount = await Content.countDocuments({
            authorId: userId,
            isActive: true,
            type: 'comment'
        });

        // Get user data
        const actualUser = await User.findById(userId)
            .select('social.followers social.following stats.activity.lastActive stats.activity.currentStreak stats.activity.totalSessions');

        // Combine data
        const summary = {
            totalSessions: activity.reduce((sum, day) => sum + (day.activity?.sessions?.count || 0), 0),
            totalPosts: actualPostCount,
            totalComments: actualCommentCount,
            followers: actualUser?.social?.followers?.length || 0,
            following: actualUser?.social?.following?.length || 0,
            currentStreak: actualUser?.stats?.activity?.currentStreak || 0,
            lastActive: actualUser?.stats?.activity?.lastActive,
            avgSessionDuration: activity.reduce((sum, day) => sum + (day.activity?.sessions?.count || 0), 0) > 0 ? 
                (activity.reduce((sum, day) => sum + (day.activity?.sessions?.totalDuration || 0), 0) / 
                 activity.reduce((sum, day) => sum + (day.activity?.sessions?.count || 0), 0)).toFixed(1) : 0
        };

        res.json({
            activity,
            summary
        });
    }),

    // User engagement
    getUserEngagement: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's content for engagement metrics
        const userContent = await Content.find({
            authorId: userId,
            isActive: true,
            type: { $ne: 'comment' }
        }).select('engagement.likes engagement.comments engagement.views');

        // Calculate engagement metrics
        const totalLikesReceived = userContent.reduce((sum, content) => 
            sum + content.engagement.likes.length, 0);
        const totalCommentsReceived = userContent.reduce((sum, content) => 
            sum + content.engagement.comments.length, 0);
        const totalViews = userContent.reduce((sum, content) => 
            sum + (content.engagement.views || 0), 0);
        const postCount = userContent.length;

        const engagement = {
            content: {
                posts: user.stats?.content?.posts || 0,
                likesGiven: user.stats?.content?.likesGiven || 0,
                likesReceived: totalLikesReceived,
                comments: user.stats?.content?.commentCount || 0,
                shares: user.stats?.content?.shares || 0,
                totalViews: totalViews
            },
            social: {
                followers: user.social?.followers?.length || 0,
                following: user.social?.following?.length || 0,
                followerGrowth: user.stats?.social?.followerGrowth?.[0]?.count || 0
            },
            rates: {
                engagementRate: totalViews > 0 ? 
                    ((totalLikesReceived + totalCommentsReceived) / totalViews * 100).toFixed(1) : 0,
                likeRatio: (user.stats?.content?.likesGiven || 0) > 0 ? 
                    (totalLikesReceived / (user.stats.content.likesGiven || 1)).toFixed(2) : 0,
                avgLikesPerPost: postCount > 0 ? (totalLikesReceived / postCount).toFixed(1) : 0,
                avgCommentsPerPost: postCount > 0 ? (totalCommentsReceived / postCount).toFixed(1) : 0
            }
        };

        res.json(engagement);
    }),

    // User trends
    getUserTrends: errorMiddleware.catchAsync(async (req, res) => {
        const { userId } = req.params;

        try {
            const trends = await UserAnalytics.getUserTrend(userId, 'scores.overall', 30);
            res.json(trends);
        } catch (error) {
            // Fallback if method not available
            const trends = await UserAnalytics.find({
                userId,
                period: 'daily',
                date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            })
            .select('date scores.overall')
            .sort({ date: 1 });

            res.json({
                trends: trends.map(t => ({
                    date: t.date,
                    value: t.scores?.overall || 0
                })),
                summary: {
                    current: trends[trends.length - 1]?.scores?.overall || 0,
                    change: trends.length > 1 ? 
                        ((trends[trends.length - 1]?.scores?.overall || 0) - (trends[0]?.scores?.overall || 0)).toFixed(1) : 0
                }
            });
        }
    }),

    // Content analytics
    getContentAnalytics: errorMiddleware.catchAsync(async (req, res) => {
        const { contentId } = req.params;

        const content = await Content.findById(contentId)
            .populate('authorId', 'profile.firstName profile.lastName profile.avatar academic.role')
            .lean();

        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        const analytics = {
            id: content._id,
            title: content.title,
            type: content.type,
            category: content.category,
            author: content.authorId ? {
                id: content.authorId._id,
                name: content.authorId.profile.fullName,
                avatar: content.authorId.profile.avatar?.url,
                role: content.authorId.academic.role
            } : null,
            engagement: {
                likes: content.engagement?.likes?.length || 0,
                comments: content.engagement?.comments?.length || 0,
                shares: content.engagement?.shares || 0,
                views: content.engagement?.views || 0,
                saves: content.engagement?.saves?.length || 0,
                engagementRate: content.engagement?.views > 0 ? 
                    (((content.engagement.likes?.length || 0) + (content.engagement.comments?.length || 0)) / 
                     content.engagement.views * 100).toFixed(1) : 0
            },
            ai: {
                tags: content.aiAnalysis?.topics?.map(t => t.topic) || [],
                sentiment: content.aiAnalysis?.sentiment
            },
            hotScore: content.engagement.hotScore,
            isTrending: content.isTrending,
            createdAt: content.createdAt,
            updatedAt: content.updatedAt
        };

        res.json(analytics);
    }),

    // Popular content
    getPopularContent: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { timeframe = 'week', limit = 20 } = req.query;

        try {
            const popularContent = await Content.getTrending(
                user.academic.collegeId,
                parseInt(limit),
                timeframe
            );

            res.json({
                timeframe,
                content: popularContent
            });
        } catch (error) {
            // Fallback implementation
            let startDate = new Date();
            switch(timeframe) {
                case 'day':
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case 'week':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setDate(startDate.getDate() - 30);
                    break;
                default:
                    startDate.setDate(startDate.getDate() - 7);
                }
                const popularContent = await Content.find({
                    collegeId: user.academic.collegeId,
                    isActive: true,
                    'moderation.status': 'approved',
                    createdAt: { $gte: startDate }
                })
                .select('title type category engagement.likes engagement.comments engagement.views engagement.hotScore createdAt')
                .populate('authorId', 'profile.firstName profile.lastName profile.avatar')
                .sort({ 'engagement.hotScore': -1 })
                .limit(parseInt(limit));
        
                res.json({
                    timeframe,
                    content: popularContent.map(content => ({
                        id: content._id,
                        title: content.title,
                        type: content.type,
                        category: content.category,
                        likes: content.engagement.likes.length,
                        comments: content.engagement.comments.length,
                        views: content.engagement.views || 0,
                        hotScore: content.engagement.hotScore,
                        author: content.authorId ? {
                            name: content.authorId.profile.fullName,
                            avatar: content.authorId.profile.avatar?.url
                        } : null,
                        createdAt: content.createdAt
                    }))
                });
            }
        }),
        
        // Trending content
        getTrendingContent: errorMiddleware.catchAsync(async (req, res) => {
            const user = req.user;
            const { hours = 24, limit = 10 } = req.query;
        
            const startDate = new Date();
            startDate.setHours(startDate.getHours() - parseInt(hours));
        
            const trendingContent = await Content.find({
                collegeId: user.academic.collegeId,
                isActive: true,
                'moderation.status': 'approved',
                createdAt: { $gte: startDate }
            })
            .select('title type category engagement.hotScore engagement.likes engagement.comments engagement.views createdAt')
            .populate('authorId', 'profile.firstName profile.lastName profile.avatar')
            .sort({ 'engagement.hotScore': -1 })
            .limit(parseInt(limit));
        
            res.json({
                timeframe: `${hours} hours`,
                content: trendingContent.map(content => ({
                    id: content._id,
                    title: content.title,
                    type: content.type,
                    category: content.category,
                    hotScore: content.engagement.hotScore,
                    likes: content.engagement.likes.length,
                    comments: content.engagement.comments.length,
                    views: content.engagement.views || 0,
                    author: content.authorId ? {
                        name: content.authorId.profile.fullName,
                        avatar: content.authorId.profile.avatar?.url
                    } : null,
                    createdAt: content.createdAt,
                    timeAgo: Math.round((new Date() - content.createdAt) / (1000 * 60 * 60)) + ' hours'
                }))
            });
        }),
        
        // Churn predictions
        getChurnPredictions: errorMiddleware.catchAsync(async (req, res) => {
            const { collegeId } = req.params;
            const { limit = 50 } = req.query;
        
            try {
                // Try to use predictive analytics service
                const predictions = await predictiveAnalytics.predictUserChurn(collegeId, limit);
                res.json(predictions);
            } catch (error) {
                // Fallback to basic churn prediction based on inactivity
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
                // Get users with varying levels of inactivity
                const inactiveUsers = await User.find({
                    'academic.collegeId': collegeId,
                    isActive: true,
                    'stats.activity.lastActive': { $lt: thirtyDaysAgo }
                })
                .select('profile.firstName profile.lastName email stats.activity.lastActive stats.activity.totalSessions')
                .limit(parseInt(limit));
        
                const predictions = await Promise.all(
                    inactiveUsers.map(async (user) => {
                        // Calculate churn risk based on last activity and total sessions
                        const daysInactive = Math.floor((new Date() - user.stats.activity.lastActive) / (1000 * 60 * 60 * 24));
                        
                        let churnRisk = 0;
                        if (daysInactive > 30) churnRisk = 90;
                        else if (daysInactive > 21) churnRisk = 75;
                        else if (daysInactive > 14) churnRisk = 60;
                        else if (daysInactive > 7) churnRisk = 40;
                        else churnRisk = 20;
        
                        // Adjust based on total sessions (more sessions = lower risk)
                        const sessionAdjustment = Math.min(30, (user.stats.activity.totalSessions || 0) / 10);
                        churnRisk = Math.max(10, churnRisk - sessionAdjustment);
        
                        // Get user's recent content
                        const recentContent = await Content.countDocuments({
                            authorId: user._id,
                            createdAt: { $gte: thirtyDaysAgo }
                        });
        
                        // Content creators have lower churn risk
                        if (recentContent > 5) {
                            churnRisk = Math.max(10, churnRisk - 20);
                        }
        
                        return {
                            user: {
                                id: user._id,
                                name: user.profile.fullName,
                                email: user.email,
                                lastActive: user.stats.activity.lastActive,
                                daysInactive: daysInactive,
                                totalSessions: user.stats.activity.totalSessions || 0
                            },
                            prediction: {
                                churnRisk: Math.round(churnRisk),
                                riskLevel: churnRisk > 70 ? 'high' : churnRisk > 40 ? 'medium' : 'low',
                                factors: [
                                    daysInactive > 30 ? `Inactive for ${daysInactive} days` : null,
                                    recentContent < 2 ? 'Low content creation' : null,
                                    (user.stats.activity.totalSessions || 0) < 10 ? 'Low engagement' : null
                                ].filter(Boolean),
                                recommendations: [
                                    churnRisk > 70 ? 'Send re-engagement email' : null,
                                    churnRisk > 40 ? 'Highlight new content notifications' : null,
                                    'Personalized content recommendations'
                                ].filter(Boolean)
                            }
                        };
                    })
                );
        
                res.json({
                    predictions: predictions.sort((a, b) => b.prediction.churnRisk - a.prediction.churnRisk),
                    summary: {
                        totalAtRisk: predictions.filter(p => p.prediction.churnRisk > 70).length,
                        totalUsers: predictions.length,
                        avgChurnRisk: predictions.length > 0 ? 
                            (predictions.reduce((sum, p) => sum + p.prediction.churnRisk, 0) / predictions.length).toFixed(1) : 0,
                        highRiskCount: predictions.filter(p => p.prediction.riskLevel === 'high').length,
                        mediumRiskCount: predictions.filter(p => p.prediction.riskLevel === 'medium').length,
                        lowRiskCount: predictions.filter(p => p.prediction.riskLevel === 'low').length
                    }
                });
            }
        }),
        
        // Growth predictions
        getGrowthPredictions: errorMiddleware.catchAsync(async (req, res) => {
            const { collegeId } = req.params;
        
            try {
                const prediction = await predictiveAnalytics.predictPlatformGrowth(collegeId);
                res.json(prediction);
            } catch (error) {
                // Fallback to basic growth prediction
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
                // Get historical user growth
                const userGrowth = await User.aggregate([
                    { 
                        $match: { 
                            'academic.collegeId': collegeId,
                            isActive: true,
                            createdAt: { $gte: ninetyDaysAgo }
                        } 
                    },
                    { 
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m", date: "$createdAt" }
                            },
                            newUsers: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);
        
                // Get content growth
                const contentGrowth = await Content.aggregate([
                    { 
                        $match: { 
                            collegeId,
                            isActive: true,
                            createdAt: { $gte: ninetyDaysAgo }
                        } 
                    },
                    { 
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m", date: "$createdAt" }
                            },
                            newContent: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);
        
                // Calculate growth rates
                const recentUsers = userGrowth.slice(-3);
                const recentContent = contentGrowth.slice(-3);
                
                const avgUserGrowth = recentUsers.length > 0 ? 
                    recentUsers.reduce((sum, month) => sum + month.newUsers, 0) / recentUsers.length : 0;
                
                const avgContentGrowth = recentContent.length > 0 ? 
                    recentContent.reduce((sum, month) => sum + month.newContent, 0) / recentContent.length : 0;
        
                // Simple linear projection
                const prediction = {
                    nextMonth: {
                        newUsers: Math.round(avgUserGrowth * 1.1), // 10% growth
                        newContent: Math.round(avgContentGrowth * 1.15), // 15% growth
                        activeUsers: await User.countDocuments({
                            'academic.collegeId': collegeId,
                            isActive: true,
                            'stats.activity.lastActive': { $gte: thirtyDaysAgo }
                        }),
                        engagementRate: '5-8%' // Estimated range
                    },
                    nextQuarter: {
                        newUsers: Math.round(avgUserGrowth * 3.3), // 3 months with 10% monthly growth
                        newContent: Math.round(avgContentGrowth * 3.45), // 3 months with 15% monthly growth
                        activeUsers: '15-20% increase',
                        engagementRate: '8-12%'
                    },
                    confidence: {
                        userGrowth: avgUserGrowth > 10 ? 'high' : avgUserGrowth > 5 ? 'medium' : 'low',
                        contentGrowth: avgContentGrowth > 20 ? 'high' : avgContentGrowth > 10 ? 'medium' : 'low',
                        overall: 'medium'
                    },
                    recommendations: [
                        avgUserGrowth < 5 ? 'Implement referral program' : null,
                        avgContentGrowth < 10 ? 'Launch content creation incentives' : null,
                        'Enhance user onboarding experience',
                        'Expand department engagement'
                    ].filter(Boolean),
                    historicalData: {
                        userGrowth,
                        contentGrowth
                    }
                };
        
                res.json(prediction);
            }
        }),
        
        // Content predictions
        getContentPredictions: errorMiddleware.catchAsync(async (req, res) => {
            const { contentId } = req.params;
        
            const content = await Content.findById(contentId);
            if (!content) {
                return res.status(404).json({ error: 'Content not found' });
            }
        
            try {
                const prediction = await predictiveAnalytics.predictContentPopularity(
                    contentId,
                    content.collegeId
                );
                res.json({
                    content: {
                        id: content._id,
                        title: content.title,
                        type: content.type,
                        category: content.category
                    },
                    prediction
                });
            } catch (error) {
                // Fallback prediction based on content metrics
                const now = new Date();
                const hoursSinceCreation = (now - content.createdAt) / (1000 * 60 * 60);
                
                // Get similar content performance
                const similarContent = await Content.find({
                    collegeId: content.collegeId,
                    type: content.type,
                    category: content.category,
                    _id: { $ne: content._id },
                    createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
                })
                .select('engagement.likes engagement.comments engagement.views engagement.hotScore')
                .limit(10);
        
                // Calculate averages
                const avgLikes = similarContent.length > 0 ? 
                    similarContent.reduce((sum, c) => sum + c.engagement.likes.length, 0) / similarContent.length : 0;
                const avgComments = similarContent.length > 0 ? 
                    similarContent.reduce((sum, c) => sum + c.engagement.comments.length, 0) / similarContent.length : 0;
                const avgViews = similarContent.length > 0 ? 
                    similarContent.reduce((sum, c) => sum + (c.engagement.views || 0), 0) / similarContent.length : 0;
        
                // Current performance
                const currentLikes = content.engagement.likes.length;
                const currentComments = content.engagement.comments.length;
                const currentViews = content.engagement.views || 0;
                const currentHotScore = content.engagement.hotScore || 0;
        
                // Predict future performance
                const growthRate = hoursSinceCreation < 24 ? 2.5 : hoursSinceCreation < 72 ? 1.5 : 1.1;
                const predictedLikes = Math.round(currentLikes * growthRate);
                const predictedComments = Math.round(currentComments * growthRate);
                const predictedViews = Math.round(currentViews * growthRate);
        
                // Determine potential
                let potential = 'average';
                let confidence = 'medium';
                
                if (currentLikes > avgLikes * 1.5 && currentComments > avgComments * 1.5) {
                    potential = 'high';
                    confidence = 'high';
                } else if (currentLikes > avgLikes && currentComments > avgComments) {
                    potential = 'above average';
                    confidence = 'medium-high';
                } else if (currentLikes < avgLikes * 0.5 && currentComments < avgComments * 0.5) {
                    potential = 'low';
                    confidence = 'medium';
                }
        
                const prediction = {
                    currentPerformance: {
                        likes: currentLikes,
                        comments: currentComments,
                        views: currentViews,
                        hotScore: currentHotScore,
                        hoursSinceCreation: Math.round(hoursSinceCreation),
                        engagementRate: currentViews > 0 ? 
                            ((currentLikes + currentComments) / currentViews * 100).toFixed(1) + '%' : '0%'
                    },
                    predictedPerformance: {
                        next24Hours: {
                            likes: Math.round(predictedLikes * 1.2),
                            comments: Math.round(predictedComments * 1.2),
                            views: Math.round(predictedViews * 1.3)
                        },
                        next7Days: {
                            likes: Math.round(predictedLikes * 3),
                            comments: Math.round(predictedComments * 2.5),
                            views: Math.round(predictedViews * 4)
                        }
                    },
                    comparison: {
                        vsAverage: {
                            likes: ((currentLikes / avgLikes - 1) * 100).toFixed(1) + '%',
                            comments: ((currentComments / avgComments - 1) * 100).toFixed(1) + '%',
                            views: ((currentViews / avgViews - 1) * 100).toFixed(1) + '%'
                        },
                        industryAverage: {
                            likes: Math.round(avgLikes),
                            comments: Math.round(avgComments),
                            views: Math.round(avgViews)
                        }
                    },
                    potential: potential,
                    confidence: confidence,
                    recommendations: [
                        currentComments < avgComments * 0.7 ? 'Engage with commenters to boost discussions' : null,
                        currentLikes < avgLikes * 0.7 ? 'Share on relevant department groups' : null,
                        hoursSinceCreation > 48 && currentViews < avgViews * 0.5 ? 'Update with new information to regain visibility' : null,
                        'Add relevant tags for better discovery'
                    ].filter(Boolean),
                    estimatedPeakTime: hoursSinceCreation < 24 ? 'Within next 24 hours' : 
                                      hoursSinceCreation < 72 ? 'Within next 48 hours' : 'Already peaked'
                };
        
                res.json({
                    content: {
                        id: content._id,
                        title: content.title,
                        type: content.type,
                        category: content.category
                    },
                    prediction
                });
            }
        }),
        
        // Department analytics
        getDepartmentAnalytics: errorMiddleware.catchAsync(async (req, res) => {
            const { departmentId } = req.params;
        
            const department = await Department.findById(departmentId);
            if (!department) {
                return res.status(404).json({ error: 'Department not found' });
            }
        
            // Get user stats for department
            const userStats = await User.aggregate([
                { 
                    $match: { 
                        'academic.departmentId': departmentId,
                        isActive: true 
                    } 
                },
                { $group: {
                    _id: '$academic.role',
                    count: { $sum: 1 }
                }},
                { $project: {
                    role: '$_id',
                    count: 1,
                    _id: 0
                }}
            ]);
        
            // Get active users
            const activeUsers = await User.countDocuments({
                'academic.departmentId': departmentId,
                isActive: true,
                'stats.activity.lastActive': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            });
        
            // Get content stats for department
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const contentStats = await Content.aggregate([
                { 
                    $match: { 
                        departmentId,
                        isActive: true,
                        createdAt: { $gte: thirtyDaysAgo }
                    } 
                },
                { $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
                    totalComments: { $sum: { $size: { $ifNull: ['$engagement.comments', []] } } },
                    totalViews: { $sum: { $ifNull: ['$engagement.views', 0] } }
                }},
                { $project: {
                    type: '$_id',
                    count: 1,
                    totalLikes: 1,
                    totalComments: 1,
                    totalViews: 1,
                    avgEngagement: {
                        $divide: [
                            { $add: ['$totalLikes', '$totalComments'] },
                            { $max: ['$count', 1] }
                        ]
                    }
                }},
                { $sort: { count: -1 } }
            ]);
        
            // Get top content creators
            const topCreators = await Content.aggregate([
                { 
                    $match: { 
                        departmentId,
                        isActive: true,
                        createdAt: { $gte: thirtyDaysAgo }
                    } 
                },
                { $group: {
                    _id: '$authorId',
                    postCount: { $sum: 1 },
                    totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
                    totalComments: { $sum: { $size: { $ifNull: ['$engagement.comments', []] } } }
                }},
                { $sort: { postCount: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                { $project: {
                    userId: '$_id',
                    name: { $concat: ['$user.profile.firstName', ' ', '$user.profile.lastName'] },
                    avatar: '$user.profile.avatar.url',
                    role: '$user.academic.role',
                    postCount: 1,
                    totalLikes: 1,
                    totalComments: 1,
                    engagementPerPost: {
                        $divide: [
                            { $add: ['$totalLikes', '$totalComments'] },
                            '$postCount'
                        ]
                    }
                }}
            ]);
        
            res.json({
                department: {
                    name: department.name,
                    code: department.code,
                    hod: department.hod,
                    stats: {
                        facultyCount: department.stats?.facultyCount || 0,
                        studentCount: department.stats?.studentCount || 0,
                        activeUsers: activeUsers,
                        engagementRate: department.stats?.engagementRate || 0
                    }
                },
                userStats,
                contentStats,
                topCreators,
                summary: {
                    totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
                    totalContent: contentStats.reduce((sum, stat) => sum + stat.count, 0),
                    activePercentage: userStats.reduce((sum, stat) => sum + stat.count, 0) > 0 ? 
                        ((activeUsers / userStats.reduce((sum, stat) => sum + stat.count, 0)) * 100).toFixed(1) + '%' : '0%',
                    avgContentEngagement: contentStats.length > 0 ? 
                        (contentStats.reduce((sum, stat) => sum + stat.avgEngagement, 0) / contentStats.length).toFixed(1) : 0
                }
            });
        }),
        
        // User leaderboard
        getUserLeaderboard: errorMiddleware.catchAsync(async (req, res) => {
            const { collegeId } = req.params;
            const { period = 'weekly', limit = 50 } = req.query;
        
            try {
                const leaderboard = await UserAnalytics.getLeaderboard(
                    collegeId,
                    period,
                    parseInt(limit)
                );
                res.json({
                    period,
                    leaderboard
                });
            } catch (error) {
                // Fallback to manual leaderboard calculation
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
                const leaderboard = await User.aggregate([
                    { 
                        $match: { 
                            'academic.collegeId': collegeId,
                            isActive: true 
                        } 
                    },
                    { $lookup: {
                        from: 'contents',
                        let: { userId: '$_id' },
                        pipeline: [
                            { $match: { 
                                $expr: { $eq: ['$authorId', '$$userId'] },
                                isActive: true,
                                createdAt: { $gte: thirtyDaysAgo }
                            }},
                            { $group: {
                                _id: null,
                                postCount: { $sum: 1 },
                                totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
                                totalComments: { $sum: { $size: { $ifNull: ['$engagement.comments', []] } } }
                            }}
                        ],
                        as: 'contentStats'
                    }},
                    { $lookup: {
                        from: 'useranalytics',
                        let: { userId: '$_id' },
                        pipeline: [
                            { $match: { 
                                $expr: { $eq: ['$userId', '$$userId'] },
                                period: period,
                                date: { $gte: thirtyDaysAgo }
                            }},
                            { $sort: { date: -1 } },
                            { $limit: 1 }
                        ],
                        as: 'analytics'
                    }},
                    { $project: {
                        _id: 1,
                        name: { $concat: ['$profile.firstName', ' ', '$profile.lastName'] },
                        avatar: '$profile.avatar.url',
                        role: '$academic.role',
                        department: '$academic.departmentName',
                        postCount: { $ifNull: [{ $arrayElemAt: ['$contentStats.postCount', 0] }, 0] },
                        totalLikes: { $ifNull: [{ $arrayElemAt: ['$contentStats.totalLikes', 0] }, 0] },
                        totalComments: { $ifNull: [{ $arrayElemAt: ['$contentStats.totalComments', 0] }, 0] },
                        followers: { $size: { $ifNull: ['$social.followers', []] } },
                        engagementScore: { $ifNull: [{ $arrayElemAt: ['$analytics.scores.engagement', 0] }, 0] },
                        contributionScore: { $ifNull: [{ $arrayElemAt: ['$analytics.scores.contribution', 0] }, 0] }
                    }},
                    { $addFields: {
                        totalScore: {
                            $add: [
                                { $multiply: ['$postCount', 10] },
                                { $multiply: ['$totalLikes', 2] },
                                { $multiply: ['$totalComments', 3] },
                                { $multiply: ['$followers', 5] },
                                { $multiply: ['$engagementScore', 0.5] },
                                { $multiply: ['$contributionScore', 0.5] }
                            ]
                        }
                    }},
                    { $sort: { totalScore: -1 } },
                    { $limit: parseInt(limit) },
                    { $addFields: {
                        rank: { $add: [1, '$$ROOT.index'] }
                    }}
                ]);
        
                res.json({
                    period,
                    leaderboard: leaderboard.map(user => ({
                        userId: user._id,
                        name: user.name,
                        avatar: user.avatar,
                        role: user.role,
                        department: user.department,
                        postCount: user.postCount,
                        totalLikes: user.totalLikes,
                        totalComments: user.totalComments,
                        followers: user.followers,
                        engagementScore: Math.round(user.engagementScore),
                        contributionScore: Math.round(user.contributionScore),
                        totalScore: Math.round(user.totalScore),
                        rank: user.rank
                    }))
                });
            }
        }),
        
        // Department leaderboard
        getDepartmentLeaderboard: errorMiddleware.catchAsync(async (req, res) => {
            const { collegeId } = req.params;
        
            const departments = await Department.find({ 
                collegeId, 
                'status.isActive': true 
            })
            .select('name code stats.studentCount stats.facultyCount stats.engagementRate placement.placementRate')
            .lean();
        
            // Get department content engagement
            const departmentEngagement = await Content.aggregate([
                { 
                    $match: { 
                        collegeId,
                        isActive: true,
                        departmentId: { $exists: true, $ne: null }
                    } 
                },
                { $group: {
                    _id: '$departmentId',
                    postCount: { $sum: 1 },
                    totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
                    totalComments: { $sum: { $size: { $ifNull: ['$engagement.comments', []] } } },
                    totalViews: { $sum: { $ifNull: ['$engagement.views', 0] } }
                }},
                { $lookup: {
                    from: 'departments',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'department'
                }},
                { $unwind: '$department' },
                { $project: {
                    departmentId: '$_id',
                    departmentName: '$department.name',
                    departmentCode: '$department.code',
                    postCount: 1,
                    totalLikes: 1,
                    totalComments: 1,
                    totalViews: 1,
                    engagementPerPost: {
                        $divide: [
                            { $add: ['$totalLikes', '$totalComments'] },
                            { $max: ['$postCount', 1] }
                        ]
                    }
                }}
            ]);
        
            // Combine data and calculate scores
            const leaderboard = departments.map(dept => {
                const engagement = departmentEngagement.find(e => e.departmentId.toString() === dept._id.toString());
                
                // Calculate department score (weighted average)
                const studentEngagement = dept.stats?.studentCount ? 
                    ((engagement?.postCount || 0) / dept.stats.studentCount) * 100 : 0;
                
                const facultyRatio = dept.stats?.studentCount && dept.stats?.facultyCount ? 
                    (dept.stats.facultyCount / dept.stats.studentCount) * 100 : 0;
                
                const placementScore = dept.placement?.placementRate || 0;
                const engagementRate = dept.stats?.engagementRate || 0;
                
                const totalScore = 
                    (studentEngagement * 0.3) +
                    (facultyRatio * 0.2) +
                    (placementScore * 0.25) +
                    (engagementRate * 0.25);
        
                return {
                    ...dept,
                    engagement: engagement || {
                        postCount: 0,
                        totalLikes: 0,
                        totalComments: 0,
                        totalViews: 0,
                        engagementPerPost: 0
                    },
                    scores: {
                        studentEngagement: Math.round(studentEngagement),
                        facultyRatio: Math.round(facultyRatio),
                        placementScore: Math.round(placementScore),
                        engagementRate: Math.round(engagementRate),
                        totalScore: Math.round(totalScore)
                    }
                };
            });
        
            // Sort by total score
            leaderboard.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
        
            res.json({
                departments: leaderboard.map((dept, index) => ({
                    rank: index + 1,
                    name: dept.name,
                    code: dept.code,
                    students: dept.stats?.studentCount || 0,
                    faculty: dept.stats?.facultyCount || 0,
                    postCount: dept.engagement.postCount,
                    engagement: {
                        likes: dept.engagement.totalLikes,
                        comments: dept.engagement.totalComments,
                        views: dept.engagement.totalViews,
                        perPost: Math.round(dept.engagement.engagementPerPost)
                    },
                    placementRate: dept.placement?.placementRate || 0,
                    scores: dept.scores
                }))
            });
        }),
        
        // Export analytics
        exportAnalytics: errorMiddleware.catchAsync(async (req, res) => {
            const { collegeId } = req.params;
            const { format = 'json', startDate, endDate } = req.body;
        
            // Validate dates
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ error: 'Invalid date format' });
            }
        
            // Get analytics data from Analytics model if available
            let analyticsData;
            try {
                analyticsData = await Analytics.find({
                    collegeId,
                    period: 'daily',
                    timestamp: { $gte: start, $lte: end }
                })
                .select('timestamp users.active users.new users.total content.total content.byType engagement.totalInteractions engagement.likes engagement.comments')
                .sort({ timestamp: 1 });
        
                if (analyticsData.length === 0) {
                    // Fallback to generating data from other models
                    throw new Error('No analytics data found');
                }
            } catch (error) {
                // Generate analytics data from other models
                const dailyData = [];
                
                // Generate data for each day in range
                let currentDate = new Date(start);
                currentDate.setHours(0, 0, 0, 0);
                
                while (currentDate <= end) {
                    const nextDate = new Date(currentDate);
                    nextDate.setDate(nextDate.getDate() + 1);
                    
                    // Get user stats for this day
                    const newUsers = await User.countDocuments({
                        'academic.collegeId': collegeId,
                        isActive: true,
                        createdAt: { $gte: currentDate, $lt: nextDate }
                    });
                    
                    const activeUsers = await User.countDocuments({
                        'academic.collegeId': collegeId,
                        isActive: true,
                        'stats.activity.lastActive': { $gte: currentDate, $lt: nextDate }
                    });
                    
                    // Get content stats for this day
                    const newContent = await Content.countDocuments({
                        collegeId,
                        isActive: true,
                        createdAt: { $gte: currentDate, $lt: nextDate }
                    });
                    
                    // Get engagement for this day
                    const dayContent = await Content.find({
                        collegeId,
                        isActive: true,
                        'engagement.likes.likedAt': { $gte: currentDate, $lt: nextDate }
                    });
                    
                    const totalLikes = dayContent.reduce((sum, content) => {
                        const dayLikes = content.engagement.likes.filter(like => 
                            like.likedAt >= currentDate && like.likedAt < nextDate
                        ).length;
                        return sum + dayLikes;
                    }, 0);
                    
                    const totalComments = await Content.countDocuments({
                        collegeId,
                        isActive: true,
                        'engagement.comments.createdAt': { $gte: currentDate, $lt: nextDate }
                    });
        
                    dailyData.push({
                        timestamp: new Date(currentDate),
                        users: {
                            active: activeUsers,
                            new: newUsers,
                            total: 0 // Would need separate query
                        },
                        content: {
                            total: newContent,
                            byType: {} // Would need separate aggregation
                        },
                        engagement: {
                            totalInteractions: totalLikes + totalComments,
                            likes: totalLikes,
                            comments: totalComments
                        }
                    });
                    
                    currentDate = nextDate;
                }
                
                analyticsData = dailyData;
            }
        
            if (format === 'csv') {
                // Convert to CSV
                const csvData = analyticsData.map(a => ({
                    date: a.timestamp.toISOString().split('T')[0],
                    activeUsers: a.users?.active || 0,
                    newUsers: a.users?.new || 0,
                    totalContent: a.content?.total || 0,
                    totalInteractions: a.engagement?.totalInteractions || 0,
                    likes: a.engagement?.likes || 0,
                    comments: a.engagement?.comments || 0,
                    engagementRate: a.users?.active > 0 ? 
                        ((a.engagement?.totalInteractions || 0) / a.users.active * 100).toFixed(2) : 0
                }));
        
                const csvHeaders = 'Date,Active Users,New Users,Total Content,Total Interactions,Likes,Comments,Engagement Rate\n';
                const csvRows = csvData.map(d => 
                    `${d.date},${d.activeUsers},${d.newUsers},${d.totalContent},${d.totalInteractions},${d.likes},${d.comments},${d.engagementRate}`
                ).join('\n');
        
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=analytics_${collegeId}_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`);
                return res.send(csvHeaders + csvRows);
            } else if (format === 'excel') {
                // For Excel format, we would need a library like exceljs
                // For now, return JSON with instructions
                res.json({
                    message: 'Excel export requires additional setup. Currently returning JSON data.',
                    data: analyticsData,
                    exportOptions: {
                        format: 'excel',
                        status: 'not_implemented',
                        recommendation: 'Install exceljs package for Excel export'
                    }
                });
            }
        
            // Default: JSON
            res.json({
                collegeId,
                period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
                analytics: analyticsData,
                summary: {
                    totalDays: analyticsData.length,
                    avgDailyActiveUsers: analyticsData.length > 0 ? 
                        (analyticsData.reduce((sum, day) => sum + (day.users?.active || 0), 0) / analyticsData.length).toFixed(0) : 0,
                    avgDailyInteractions: analyticsData.length > 0 ? 
                        (analyticsData.reduce((sum, day) => sum + (day.engagement?.totalInteractions || 0), 0) / analyticsData.length).toFixed(0) : 0,
                    totalNewUsers: analyticsData.reduce((sum, day) => sum + (day.users?.new || 0), 0),
                    totalNewContent: analyticsData.reduce((sum, day) => sum + (day.content?.total || 0), 0)
                },
                generatedAt: new Date(),
                format: 'json'
            });
        }),
        
        // Create custom report
        createCustomReport: errorMiddleware.catchAsync(async (req, res) => {
            const { collegeId } = req.params;
            const { name, metrics, filters, schedule } = req.body;
            const user = req.user;
        
            // Validate metrics
            const validMetrics = [
                'users.active', 'users.new', 'users.total',
                'content.total', 'content.byType', 'content.byCategory',
                'engagement.totalInteractions', 'engagement.likes', 'engagement.comments',
                'department.stats', 'user.engagement', 'content.popularity'
            ];
        
            const invalidMetrics = metrics?.filter(m => !validMetrics.includes(m));
            if (invalidMetrics && invalidMetrics.length > 0) {
                return res.status(400).json({
                    error: 'Invalid metrics',
                    invalidMetrics,
                    validMetrics
                });
            }
        
            // Generate report ID
            const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
            // Create report object
            const report = {
                id: reportId,
                name: name || 'Custom Analytics Report',
                collegeId,
                createdBy: {
                    userId: user._id,
                    name: user.profile.fullName,
                    email: user.email
                },
                metrics: metrics || ['users.active', 'content.total', 'engagement.totalInteractions'],
                filters: filters || {
                    timeRange: 'last_30_days',
                    contentType: 'all',
                    userRole: 'all'
                },
                schedule: schedule || 'once',
                status: 'processing',
                createdAt: new Date(),
                estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
            };
        
            // In a real implementation, you would:
            // 1. Store the report request in a database
            // 2. Queue a background job to generate the report
            // 3. Notify user when report is ready
        
            // For now, simulate immediate processing for simple reports
            if (schedule === 'once' && metrics.length <= 5) {
                // Simple report - generate immediately
                setTimeout(async () => {
                    // This would be a background job in production
                    try {
                        // Generate report data
                        const reportData = await generateReportData(collegeId, metrics, filters);
                        
                        // Store report (in production, this would be in a database)
                        report.status = 'completed';
                        report.completedAt = new Date();
                        report.data = reportData;
                        report.downloadUrl = `/api/analytics/reports/${reportId}/download`;
                        
                        console.log(`Report ${reportId} generated successfully`);
                    } catch (error) {
                        report.status = 'failed';
                        report.error = error.message;
                        console.error(`Failed to generate report ${reportId}:`, error);
                    }
                }, 2000); // Simulate 2 second processing time
            }
        
            res.status(201).json({
                message: 'Custom report created successfully',
                report: {
                    id: report.id,
                    name: report.name,
                    status: report.status,
                    createdAt: report.createdAt,
                    estimatedCompletion: report.estimatedCompletion,
                    downloadUrl: schedule === 'once' ? `/api/analytics/reports/${reportId}/download` : null,
                    apiStatusUrl: `/api/analytics/reports/${reportId}/status`
                },
                instructions: schedule === 'once' ? 
                    'Report is being generated. Check status via the API status URL.' :
                    `Report will be generated ${schedule} and delivered via email.`
            });
        }),
        
        // Get report status
        getReportStatus: errorMiddleware.catchAsync(async (req, res) => {
            const { reportId } = req.params;
        
            // In production, this would fetch from database
            // For now, simulate different statuses
            const statuses = ['processing', 'completed', 'failed'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            const mockReport = {
                id: reportId,
                name: 'Custom Analytics Report',
                status: randomStatus,
                createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                ...(randomStatus === 'completed' && {
                    completedAt: new Date(),
                    downloadUrl: `/api/analytics/reports/${reportId}/download`,
                    size: '2.4 MB',
                    format: 'json'
                }),
                ...(randomStatus === 'failed' && {
                    error: 'Data aggregation timeout',
                    retryUrl: `/api/analytics/reports/${reportId}/retry`
                })
            };
        
            res.json(mockReport);
        }),
        
        // Download report
        downloadReport: errorMiddleware.catchAsync(async (req, res) => {
            const { reportId } = req.params;
            const { format = 'json' } = req.query;
        
            // In production, this would fetch from storage
            // For now, generate mock report data
            const mockData = {
                reportId,
                generatedAt: new Date(),
                period: 'Last 30 days',
                summary: {
                    activeUsers: 1250,
                    newUsers: 150,
                    contentCreated: 325,
                    totalInteractions: 12500,
                    engagementRate: '4.2%'
                },
                metrics: {
                    dailyActiveUsers: Array.from({ length: 30 }, (_, i) => ({
                        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        count: Math.floor(Math.random() * 200) + 1000
                    })),
                    contentByType: [
                        { type: 'post', count: 150 },
                        { type: 'event', count: 45 },
                        { type: 'study_material', count: 80 },
                        { type: 'question', count: 50 }
                    ],
                    topContent: [
                        { title: 'Introduction to Machine Learning', likes: 245, comments: 42 },
                        { title: 'Campus Fest 2024 Announcement', likes: 198, comments: 35 },
                        { title: 'Final Exam Schedule', likes: 176, comments: 28 }
                    ]
                }
            };
        
            if (format === 'csv') {
                // Convert to CSV
                const csvData = [
                    ['Metric', 'Value'],
                    ['Active Users', mockData.summary.activeUsers],
                    ['New Users', mockData.summary.newUsers],
                    ['Content Created', mockData.summary.contentCreated],
                    ['Total Interactions', mockData.summary.totalInteractions],
                    ['Engagement Rate', mockData.summary.engagementRate],
                    [],
                    ['Date', 'Active Users'],
                    ...mockData.metrics.dailyActiveUsers.map(d => [d.date, d.count]),
                    [],
                    ['Content Type', 'Count'],
                    ...mockData.metrics.contentByType.map(c => [c.type, c.count])
                ];
        
                const csvContent = csvData.map(row => row.join(',')).join('\n');
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=report_${reportId}.csv`);
                return res.send(csvContent);
            }
        
            // Default: JSON
            res.json(mockData);
        }),
        
        // Get analytics dashboard data
        getDashboardData: errorMiddleware.catchAsync(async (req, res) => {
            const user = req.user;
            const { timeframe = 'week' } = req.query;
        
            let startDate;
            switch(timeframe) {
                case 'day':
                    startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    break;
                case 'week':
                    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'quarter':
                    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            }
        
            const dashboardData = {
                timeframe,
                summary: {
                    totalUsers: await User.countDocuments({
                        'academic.collegeId': user.academic.collegeId,
                        isActive: true
                    }),
                    activeUsers: await User.countDocuments({
                        'academic.collegeId': user.academic.collegeId,
                        isActive: true,
                        'stats.activity.lastActive': { $gte: startDate }
                    }),
                    newUsers: await User.countDocuments({
                        'academic.collegeId': user.academic.collegeId,
                        isActive: true,
                        createdAt: { $gte: startDate }
                    }),
                    totalContent: await Content.countDocuments({
                        collegeId: user.academic.collegeId,
                        isActive: true,
                        createdAt: { $gte: startDate }
                    }),
                    totalInteractions: await getTotalInteractions(user.academic.collegeId, startDate)
                },
                charts: {
                    dailyActivity: await getDailyActivity(user.academic.collegeId, startDate),
                    contentDistribution: await getContentDistribution(user.academic.collegeId, startDate),
                    userGrowth: await getUserGrowth(user.academic.collegeId, startDate)
                },
                insights: await generateInsights(user.academic.collegeId, startDate),
                lastUpdated: new Date()
            };
        
            res.json(dashboardData);
        }),
        
        // Get real-time updates (WebSocket/SSE endpoint)
    }
    module.exports = analyticsController;