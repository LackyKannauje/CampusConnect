const mongoose = require('mongoose');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const analyticsSchema = new mongoose.Schema({
    // Scope
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true,
        index: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    
    // Time Period
    period: {
        type: String,
        enum: ['realtime', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'],
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    
    // User Metrics
    users: {
        total: { type: Number, default: 0 },
        active: { type: Number, default: 0 },
        new: { type: Number, default: 0 },
        returning: { type: Number, default: 0 },
        byRole: Map,
        byDepartment: Map,
        byBatch: Map,
        retentionRate: Number,
        churnRate: Number
    },
    
    // Content Metrics
    content: {
        total: { type: Number, default: 0 },
        byType: Map,
        byCategory: Map,
        byDepartment: Map,
        growth: Number,
        engagementRate: Number
    },
    
    // Engagement Metrics
    engagement: {
        totalInteractions: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        saves: { type: Number, default: 0 },
        avgSessionDuration: Number,
        bounceRate: Number,
        peakHours: [Number]
    },
    
    // AI Metrics
    ai: {
        totalRequests: { type: Number, default: 0 },
        byEndpoint: Map,
        totalCost: Number,
        accuracy: Number,
        cacheHitRate: Number,
        avgLatency: Number
    },
    
    // Performance Metrics
    performance: {
        apiResponseTime: Number,
        pageLoadTime: Number,
        errorRate: Number,
        uptime: Number,
        activeConnections: Number
    },
    
    // Academic Metrics
    academic: {
        materialsAccessed: { type: Number, default: 0 },
        questionsAsked: { type: Number, default: 0 },
        answersProvided: { type: Number, default: 0 },
        eventsAttended: { type: Number, default: 0 },
        avgGrades: Number
    },
    
    // Business Metrics
    business: {
        revenue: Number,
        expenses: Number,
        conversionRate: Number,
        customerSatisfaction: Number,
        referralRate: Number
    },
    
    // Platform Metrics
    platform: {
        totalStorage: Number,
        bandwidthUsed: Number,
        apiCalls: Number,
        mobileUsers: Number,
        desktopUsers: Number
    },
    
    // Insights (AI Generated)
    insights: {
        topTrending: [{
            contentId: mongoose.Schema.Types.ObjectId,
            title: String,
            score: Number
        }],
        popularCategories: [{
            category: String,
            count: Number,
            growth: Number
        }],
        activeUsers: [{
            userId: mongoose.Schema.Types.ObjectId,
            name: String,
            score: Number
        }],
        recommendations: [String],
        predictions: {
            nextDayActiveUsers: Number,
            nextWeekGrowth: Number,
            riskFactors: [String]
        },
        anomalies: [{
            metric: String,
            value: Number,
            expected: Number,
            deviation: Number
        }]
    },
    
    // Comparisons
    comparisons: {
        previousPeriod: Map,
        yearOverYear: Map,
        departmentComparison: Map,
        collegeAverage: Map
    },
    
    // Status
    status: {
        isProcessed: { type: Boolean, default: false },
        processingTime: Number,
        dataSource: String,
        version: String
    },
    
    // Base Schema
    ...BaseSchema
}, {
    timestamps: true
});

// Apply Timestamps Plugin
TimestampsPlugin(analyticsSchema);

// Indexes
analyticsSchema.index({ collegeId: 1, period: 1, timestamp: -1 }, { unique: true });
analyticsSchema.index({ timestamp: 1 });
analyticsSchema.index({ 'insights.topTrending.score': -1 });

// Virtual Fields
analyticsSchema.virtual('engagementRate').get(function() {
    if (!this.users.active || !this.engagement.totalInteractions) return 0;
    return (this.engagement.totalInteractions / this.users.active) * 100;
});

analyticsSchema.virtual('contentGrowth').get(function() {
    if (!this.comparisons.previousPeriod) return 0;
    const previous = this.comparisons.previousPeriod.get('content.total') || 0;
    if (!previous) return 100;
    return ((this.content.total - previous) / previous) * 100;
});

// Methods
analyticsSchema.methods.calculateInsights = function(previousData = null) {
    const insights = {
        topTrending: [],
        popularCategories: [],
        activeUsers: [],
        recommendations: [],
        predictions: {},
        anomalies: []
    };
    
    // Calculate trending content (simplified)
    if (this.engagement.totalInteractions > 100) {
        insights.recommendations.push('High engagement detected - consider promoting top content');
    }
    
    // Detect anomalies
    if (previousData) {
        const userGrowth = ((this.users.active - previousData.users.active) / previousData.users.active) * 100;
        if (Math.abs(userGrowth) > 50) {
            insights.anomalies.push({
                metric: 'active_users',
                value: this.users.active,
                expected: previousData.users.active * 1.1,
                deviation: userGrowth
            });
        }
    }
    
    this.insights = insights;
    return insights;
};

analyticsSchema.methods.toDashboardJSON = function() {
    return {
        period: this.period,
        timestamp: this.timestamp,
        summary: {
            users: {
                total: this.users.total,
                active: this.users.active,
                new: this.users.new,
                growth: this.users.growth
            },
            content: {
                total: this.content.total,
                engagementRate: this.engagementRate
            },
            engagement: {
                total: this.engagement.totalInteractions,
                likes: this.engagement.likes,
                comments: this.engagement.comments
            }
        },
        insights: this.insights
    };
};

// Static Methods
analyticsSchema.statics.getTimeSeries = function(collegeId, metric, startDate, endDate, period = 'daily') {
    const matchStage = {
        collegeId: mongoose.Types.ObjectId(collegeId),
        timestamp: { $gte: startDate, $lte: endDate },
        period: period
    };
    
    return this.aggregate([
        { $match: matchStage },
        { $sort: { timestamp: 1 } },
        {
            $project: {
                timestamp: 1,
                value: `$${metric}`,
                _id: 0
            }
        }
    ]);
};

analyticsSchema.statics.getCollegeComparison = function(collegeIds, metric, period = 'monthly') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.aggregate([
        {
            $match: {
                collegeId: { $in: collegeIds.map(id => mongoose.Types.ObjectId(id)) },
                period: period,
                timestamp: { $gte: thirtyDaysAgo }
            }
        },
        {
            $group: {
                _id: '$collegeId',
                currentValue: { $last: `$${metric}` },
                avgValue: { $avg: `$${metric}` },
                maxValue: { $max: `$${metric}` },
                trend: { 
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
            $lookup: {
                from: 'colleges',
                localField: '_id',
                foreignField: '_id',
                as: 'college'
            }
        },
        { $unwind: '$college' },
        {
            $project: {
                collegeId: '$_id',
                collegeName: '$college.name',
                collegeCode: '$college.code',
                currentValue: 1,
                avgValue: { $round: ['$avgValue', 2] },
                maxValue: 1,
                trend: { $round: ['$trend', 2] },
                rank: { $add: [1, '$$ROOT.index'] }
            }
        },
        { $sort: { currentValue: -1 } }
    ]);
};

analyticsSchema.statics.generatePredictions = function(collegeId, days = 7) {
    // This would use a proper time series forecasting model
    // Simplified version for demonstration
    
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                period: 'daily',
                timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
        },
        { $sort: { timestamp: 1 } },
        {
            $group: {
                _id: null,
                activeUsers: { $push: '$users.active' },
                content: { $push: '$content.total' },
                engagement: { $push: '$engagement.totalInteractions' },
                dates: { $push: '$timestamp' }
            }
        },
        {
            $project: {
                predictions: {
                    nextDayActiveUsers: { $avg: '$activeUsers' },
                    nextDayContent: { $avg: '$content' },
                    growthTrend: {
                        $divide: [
                            { $subtract: [
                                { $arrayElemAt: ['$activeUsers', -1] },
                                { $arrayElemAt: ['$activeUsers', 0] }
                            ]},
                            30
                        ]
                    }
                },
                confidence: 0.75,
                _id: 0
            }
        }
    ]);
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;