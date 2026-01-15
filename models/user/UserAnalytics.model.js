const mongoose = require('mongoose');
const { BaseSchema } = require('../shared/BaseSchema');

const userAnalyticsSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        index: true 
    },
    collegeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'College',
        required: true,
        index: true 
    },
    
    // Time Period
    period: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
        required: true
    },
    date: { 
        type: Date, 
        required: true,
        index: true 
    },
    
    // Engagement Metrics
    engagement: {
        sessions: {
            count: { type: Number, default: 0 },
            duration: { type: Number, default: 0 }, // in minutes
            avgDuration: Number
        },
        content: {
            postsCreated: { type: Number, default: 0 },
            commentsMade: { type: Number, default: 0 },
            likesGiven: { type: Number, default: 0 },
            likesReceived: { type: Number, default: 0 },
            shares: { type: Number, default: 0 },
            saves: { type: Number, default: 0 }
        },
        social: {
            newFollowers: { type: Number, default: 0 },
            newFollowing: { type: Number, default: 0 },
            messagesSent: { type: Number, default: 0 },
            messagesReceived: { type: Number, default: 0 }
        },
        notifications: {
            received: { type: Number, default: 0 },
            read: { type: Number, default: 0 },
            clicked: { type: Number, default: 0 }
        }
    },
    
    // Academic Activity
    academic: {
        materialsAccessed: { type: Number, default: 0 },
        questionsAsked: { type: Number, default: 0 },
        answersProvided: { type: Number, default: 0 },
        eventsAttended: { type: Number, default: 0 },
        studyGroupsJoined: { type: Number, default: 0 }
    },
    
    // AI Interaction
    aiInteractions: {
        total: { type: Number, default: 0 },
        byFeature: {
            contentTagging: Number,
            summarization: Number,
            recommendations: Number,
            moderation: Number,
            search: Number,
            tutoring: Number
        },
        satisfaction: {
            helpful: Number,
            neutral: Number,
            unhelpful: Number
        }
    },
    
    // Performance Metrics
    performance: {
        engagementScore: Number, // 0-100
        contributionScore: Number, // 0-100
        influenceScore: Number, // 0-100
        rankInCollege: Number,
        rankInDepartment: Number,
        percentile: Number
    },
    
    // Behavioral Patterns
    patterns: {
        peakActivityHour: Number,
        mostActiveDay: String,
        preferredContentType: String,
        avgResponseTime: Number, // in minutes
        completionRate: Number // % of started actions completed
    },
    
    // Goals & Progress
    goals: {
        set: { type: Number, default: 0 },
        achieved: { type: Number, default: 0 },
        inProgress: { type: Number, default: 0 },
        successRate: Number
    },
    
    // Retention Metrics
    retention: {
        isRetained: Boolean, // Active for consecutive periods
        streak: Number,
        churnRisk: Number, // 0-100
        predictedLifetime: Number // in days
    },
    
    // AI-Generated Insights
    insights: {
        strengths: [String],
        areasToImprove: [String],
        recommendations: [String],
        predictedInterests: [String],
        engagementTrend: { 
            type: String, 
            enum: ['increasing', 'decreasing', 'stable', 'volatile'] 
        }
    },
    
    ...BaseSchema
}, {
    timestamps: true
});

// Compound Indexes
userAnalyticsSchema.index({ userId: 1, date: -1 });
userAnalyticsSchema.index({ collegeId: 1, date: -1 });
userAnalyticsSchema.index({ 'performance.engagementScore': -1 });
userAnalyticsSchema.index({ 'retention.churnRisk': 1 });

// Methods
userAnalyticsSchema.methods.calculateEngagementScore = function() {
    const weights = {
        sessions: 0.2,
        postsCreated: 0.15,
        commentsMade: 0.1,
        likesGiven: 0.05,
        likesReceived: 0.1,
        newFollowers: 0.1,
        materialsAccessed: 0.1,
        eventsAttended: 0.05,
        aiInteractions: 0.05
    };
    
    let score = 0;
    
    // Normalize and weight each metric
    if (this.engagement.sessions.count > 0) {
        score += Math.min(this.engagement.sessions.count / 10, 1) * weights.sessions * 100;
    }
    
    if (this.engagement.content.postsCreated > 0) {
        score += Math.min(this.engagement.content.postsCreated / 5, 1) * weights.postsCreated * 100;
    }
    
    // Add more calculations...
    
    this.performance.engagementScore = Math.round(Math.min(score, 100));
    return this.performance.engagementScore;
};

userAnalyticsSchema.methods.updateRetention = function(previousPeriod) {
    if (!previousPeriod) {
        this.retention.streak = 1;
        this.retention.isRetained = true;
        return;
    }
    
    this.retention.isRetained = previousPeriod.engagement.sessions.count > 0;
    this.retention.streak = this.retention.isRetained ? 
        (previousPeriod.retention.streak || 0) + 1 : 1;
    
    // Calculate churn risk based on engagement drop
    const engagementDrop = previousPeriod.performance.engagementScore - 
                          (this.performance.engagementScore || 0);
    this.retention.churnRisk = Math.max(0, Math.min(100, engagementDrop * 2));
};

// Static Methods
userAnalyticsSchema.statics.getLeaderboard = function(collegeId, period = 'weekly', limit = 50) {
    const dateFilter = getDateFilter(period);
    
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                date: dateFilter,
                'performance.engagementScore': { $exists: true }
            }
        },
        {
            $sort: { 'performance.engagementScore': -1 }
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $project: {
                _id: 0,
                userId: 1,
                name: '$user.profile.fullName',
                avatar: '$user.profile.avatar.url',
                role: '$user.academic.role',
                department: '$user.academic.departmentName',
                score: '$performance.engagementScore',
                rank: { $add: [1, '$$ROOT.index'] }
            }
        }
    ]);
};

userAnalyticsSchema.statics.getTrends = function(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                userId: mongoose.Types.ObjectId(userId),
                date: { $gte: startDate },
                period: 'daily'
            }
        },
        {
            $sort: { date: 1 }
        },
        {
            $group: {
                _id: null,
                dates: { $push: '$date' },
                engagementScores: { $push: '$performance.engagementScore' },
                posts: { $push: '$engagement.content.postsCreated' },
                comments: { $push: '$engagement.content.commentsMade' },
                sessions: { $push: '$engagement.sessions.count' }
            }
        },
        {
            $project: {
                _id: 0,
                trends: {
                    dates: 1,
                    engagementScores: 1,
                    posts: 1,
                    comments: 1,
                    sessions: 1,
                    avgEngagement: { $avg: '$performance.engagementScore' },
                    totalPosts: { $sum: '$engagement.content.postsCreated' },
                    totalComments: { $sum: '$engagement.content.commentsMade' }
                }
            }
        }
    ]);
};

// Helper function
function getDateFilter(period) {
    const now = new Date();
    let startDate;
    
    switch(period) {
        case 'daily':
            startDate = new Date(now.setDate(now.getDate() - 1));
            break;
        case 'weekly':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'monthly':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        default:
            startDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    return { $gte: startDate };
}

const UserAnalytics = mongoose.model('UserAnalytics', userAnalyticsSchema);

module.exports = UserAnalytics;