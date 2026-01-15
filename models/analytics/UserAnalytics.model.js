const mongoose = require('mongoose');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const userAnalyticsSchema = new mongoose.Schema({
    // User Reference
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
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    
    // Activity Metrics
    activity: {
        sessions: {
            count: { type: Number, default: 0 },
            totalDuration: Number, // in minutes
            avgDuration: Number,
            peakHour: Number,
            daysActive: [String] // ['mon', 'tue', ...]
        },
        logins: { type: Number, default: 0 },
        lastActive: Date,
        streak: {
            current: { type: Number, default: 0 },
            longest: { type: Number, default: 0 }
        }
    },
    
    // Content Metrics
    content: {
        created: {
            posts: { type: Number, default: 0 },
            comments: { type: Number, default: 0 },
            media: { type: Number, default: 0 },
            questions: { type: Number, default: 0 },
            answers: { type: Number, default: 0 }
        },
        engagement: {
            likesGiven: { type: Number, default: 0 },
            likesReceived: { type: Number, default: 0 },
            commentsGiven: { type: Number, default: 0 },
            commentsReceived: { type: Number, default: 0 },
            shares: { type: Number, default: 0 },
            saves: { type: Number, default: 0 }
        },
        views: {
            given: { type: Number, default: 0 },
            received: { type: Number, default: 0 }
        }
    },
    
    // Social Metrics
    social: {
        followers: {
            count: { type: Number, default: 0 },
            new: { type: Number, default: 0 },
            lost: { type: Number, default: 0 }
        },
        following: {
            count: { type: Number, default: 0 },
            new: { type: Number, default: 0 },
            unfollowed: { type: Number, default: 0 }
        },
        connections: {
            count: { type: Number, default: 0 },
            new: { type: Number, default: 0 }
        },
        messages: {
            sent: { type: Number, default: 0 },
            received: { type: Number, default: 0 }
        }
    },
    
    // Academic Metrics
    academic: {
        materialsAccessed: { type: Number, default: 0 },
        timeSpentStudying: Number, // in minutes
        coursesEnrolled: { type: Number, default: 0 },
        assignmentsSubmitted: { type: Number, default: 0 },
        grades: Map,
        achievements: [String]
    },
    
    // AI Interaction Metrics
    aiInteractions: {
        total: { type: Number, default: 0 },
        byType: Map,
        helpful: { type: Number, default: 0 },
        unhelpful: { type: Number, default: 0 },
        avgRating: Number
    },
    
    // Performance Scores
    scores: {
        engagement: { type: Number, default: 0, min: 0, max: 100 },
        contribution: { type: Number, default: 0, min: 0, max: 100 },
        influence: { type: Number, default: 0, min: 0, max: 100 },
        quality: { type: Number, default: 0, min: 0, max: 100 },
        overall: { type: Number, default: 0, min: 0, max: 100 }
    },
    
    // Behavior Patterns
    patterns: {
        preferredContentType: String,
        activeHours: [Number], // 0-23
        postingFrequency: Number, // posts per day
        interactionStyle: {
            type: String,
            enum: ['creator', 'curator', 'consumer', 'collaborator', 'observer']
        },
        sentimentTrend: {
            type: String,
            enum: ['positive', 'neutral', 'negative', 'mixed']
        }
    },
    
    // Goals & Progress
    goals: {
        set: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        inProgress: { type: Number, default: 0 },
        successRate: Number
    },
    
    // Retention Metrics
    retention: {
        isRetained: Boolean,
        streak: Number,
        churnRisk: Number, // 0-100
        predictedLifetime: Number, // in days
        loyaltyScore: Number // 0-100
    },
    
    // Insights
    insights: {
        strengths: [String],
        areasToImprove: [String],
        recommendations: [String],
        predictedInterests: [String],
        engagementTrend: String
    },
    
    // Comparisons
    comparisons: {
        previousPeriod: Map,
        userAverage: Map,
        topPercentile: Number
    },
    
    // Base Schema
    ...BaseSchema
}, {
    timestamps: true
});

// Apply Timestamps Plugin
TimestampsPlugin(userAnalyticsSchema);

// Indexes
userAnalyticsSchema.index({ userId: 1, period: 1, date: -1 }, { unique: true });
userAnalyticsSchema.index({ collegeId: 1, 'scores.overall': -1 });
userAnalyticsSchema.index({ 'retention.churnRisk': 1 });
userAnalyticsSchema.index({ date: 1 });

// Virtual Fields
userAnalyticsSchema.virtual('engagementRate').get(function() {
    const totalInteractions = this.content.engagement.likesGiven + 
                            this.content.engagement.commentsGiven +
                            this.content.engagement.shares;
    return this.activity.sessions.count > 0 ? 
           totalInteractions / this.activity.sessions.count : 0;
});

userAnalyticsSchema.virtual('influenceScore').get(function() {
    const followers = this.social.followers.count;
    const engagement = (this.content.engagement.likesReceived + 
                       this.content.engagement.commentsReceived) / 
                       Math.max(this.content.created.posts, 1);
    return Math.min(100, (followers * 0.3 + engagement * 0.7));
});

// Methods
userAnalyticsSchema.methods.calculateScores = function() {
    // Engagement Score (0-100)
    const engagementScore = Math.min(100, 
        (this.activity.sessions.count * 5) + 
        (this.content.created.posts * 10) + 
        (this.content.engagement.likesGiven * 2)
    );
    
    // Contribution Score (0-100)
    const contributionScore = Math.min(100,
        (this.content.created.posts * 15) +
        (this.content.created.comments * 5) +
        (this.academic.answersProvided * 10)
    );
    
    // Influence Score (0-100)
    const influenceScore = this.influenceScore;
    
    // Quality Score (0-100) - based on engagement received
    const qualityScore = Math.min(100,
        (this.content.engagement.likesReceived / Math.max(this.content.created.posts, 1)) * 100
    );
    
    // Overall Score (weighted average)
    const overallScore = (
        engagementScore * 0.25 +
        contributionScore * 0.30 +
        influenceScore * 0.25 +
        qualityScore * 0.20
    );
    
    this.scores = {
        engagement: Math.round(engagementScore),
        contribution: Math.round(contributionScore),
        influence: Math.round(influenceScore),
        quality: Math.round(qualityScore),
        overall: Math.round(overallScore)
    };
    
    return this.scores;
};

userAnalyticsSchema.methods.updateRetention = function(previousAnalytics) {
    if (!previousAnalytics) {
        this.retention.streak = 1;
        this.retention.isRetained = true;
        return;
    }
    
    this.retention.isRetained = this.activity.sessions.count > 0;
    this.retention.streak = this.retention.isRetained ? 
        (previousAnalytics.retention.streak || 0) + 1 : 1;
    
    // Calculate churn risk (simplified)
    const activityDrop = previousAnalytics.activity.sessions.count - 
                        this.activity.sessions.count;
    this.retention.churnRisk = Math.min(100, Math.max(0, activityDrop * 10));
    
    // Loyalty score based on streak and engagement
    this.retention.loyaltyScore = Math.min(100,
        (this.retention.streak * 5) + 
        (this.scores.overall * 0.5)
    );
};

// Static Methods
userAnalyticsSchema.statics.getLeaderboard = function(collegeId, period = 'weekly', limit = 50) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                period: period,
                date: { $gte: thirtyDaysAgo }
            }
        },
        {
            $sort: { 'scores.overall': -1 }
        },
        {
            $group: {
                _id: '$userId',
                score: { $first: '$scores.overall' },
                engagement: { $first: '$scores.engagement' },
                contribution: { $first: '$scores.contribution' },
                data: { $first: '$$ROOT' }
            }
        },
        { $sort: { score: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                _id: 0,
                userId: '$_id',
                name: { 
                    $concat: [
                        '$user.profile.firstName',
                        ' ',
                        '$user.profile.lastName'
                    ]
                },
                avatar: '$user.profile.avatar.url',
                role: '$user.academic.role',
                department: '$user.academic.departmentName',
                score: { $round: ['$score', 1] },
                engagement: { $round: ['$engagement', 1] },
                contribution: { $round: ['$contribution', 1] },
                rank: { $add: [1, '$$ROOT.index'] }
            }
        }
    ]);
};

userAnalyticsSchema.statics.getUserTrend = function(userId, metric, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                userId: mongoose.Types.ObjectId(userId),
                period: 'daily',
                date: { $gte: startDate }
            }
        },
        { $sort: { date: 1 } },
        {
            $group: {
                _id: null,
                dates: { $push: '$date' },
                values: { $push: `$${metric}` },
                avgValue: { $avg: `$${metric}` },
                growth: {
                    $avg: {
                        $cond: [
                            { $gte: [`$${metric}`, { $avg: `$${metric}` }] },
                            1,
                            -1
                        ]
                    }
                }
            }
        },
        {
            $project: {
                trend: {
                    dates: 1,
                    values: 1,
                    avgValue: { $round: ['$avgValue', 2] },
                    growth: { $round: ['$growth', 2] },
                    summary: {
                        min: { $min: '$values' },
                        max: { $max: '$values' },
                        current: { $arrayElemAt: ['$values', -1] }
                    }
                },
                _id: 0
            }
        }
    ]);
};

const UserAnalytics = mongoose.model('UserAnalytics', userAnalyticsSchema);

module.exports = UserAnalytics;