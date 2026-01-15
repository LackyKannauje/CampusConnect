const Analytics = require('../../models/analytics/Analytics.model');
const UserAnalytics = require('../../models/analytics/UserAnalytics.model');

class PredictiveAnalytics {
    constructor() {
        // This would use a proper ML model in production
        // For now, using statistical methods
    }

    async predictUserChurn(collegeId, userId) {
        // Get user's recent analytics
        const recentAnalytics = await UserAnalytics.find({
            userId,
            collegeId,
            period: 'daily',
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).sort({ date: -1 }).limit(30);

        if (recentAnalytics.length < 7) {
            return {
                churnRisk: 50,
                confidence: 0.3,
                reasons: ['Insufficient data']
            };
        }

        // Calculate features
        const features = this.calculateChurnFeatures(recentAnalytics);
        
        // Simple rule-based prediction
        let churnScore = 0;
        let reasons = [];

        if (features.activityDrop > 50) {
            churnScore += 40;
            reasons.push(`Activity dropped by ${features.activityDrop}%`);
        }

        if (features.engagementDrop > 60) {
            churnScore += 30;
            reasons.push(`Engagement dropped by ${features.engagementDrop}%`);
        }

        if (features.lastActiveDays > 7) {
            churnScore += 20;
            reasons.push(`Inactive for ${features.lastActiveDays} days`);
        }

        if (features.avgSessionDuration < 60) {
            churnScore += 10;
            reasons.push('Low session duration');
        }

        return {
            churnRisk: Math.min(100, churnScore),
            confidence: this.calculateConfidence(recentAnalytics.length),
            reasons,
            features,
            predictedChurnDate: this.predictChurnDate(features)
        };
    }

    async predictContentPopularity(contentId, collegeId) {
        // Get similar content performance
        const similarContent = await Analytics.aggregate([
            {
                $match: {
                    collegeId,
                    'insights.topTrending.contentId': { $exists: true }
                }
            },
            { $unwind: '$insights.topTrending' },
            {
                $match: {
                    'insights.topTrending.contentId': { $ne: contentId }
                }
            },
            {
                $group: {
                    _id: null,
                    avgScore: { $avg: '$insights.topTrending.score' },
                    maxScore: { $max: '$insights.topTrending.score' },
                    count: { $sum: 1 }
                }
            }
        ]);

        if (!similarContent.length) {
            return {
                popularityScore: 50,
                confidence: 0.2,
                factors: ['No similar content data']
            };
        }

        const { avgScore, maxScore } = similarContent[0];
        
        // Base prediction on historical averages
        let popularityScore = 50; // Neutral
        
        if (maxScore > 80) popularityScore += 20;
        if (avgScore > 60) popularityScore += 10;

        return {
            popularityScore: Math.min(100, popularityScore),
            confidence: 0.6,
            factors: [
                `Historical average: ${avgScore.toFixed(1)}`,
                `Maximum observed: ${maxScore.toFixed(1)}`
            ],
            predictedEngagement: this.predictEngagement(avgScore)
        };
    }

    async predictPlatformGrowth(collegeId) {
        // Get historical data
        const historicalData = await Analytics.find({
            collegeId,
            period: 'monthly',
            timestamp: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }).sort({ timestamp: 1 });

        if (historicalData.length < 3) {
            return {
                nextMonthUsers: 0,
                confidence: 0.2,
                message: 'Insufficient historical data'
            };
        }

        // Simple linear regression for user growth
        const userCounts = historicalData.map(d => d.users.total);
        const growthRate = this.calculateGrowthRate(userCounts);
        
        const lastCount = userCounts[userCounts.length - 1];
        const predictedNextMonth = lastCount * (1 + growthRate);

        return {
            nextMonthUsers: Math.round(predictedNextMonth),
            growthRate: (growthRate * 100).toFixed(1),
            confidence: Math.min(0.8, historicalData.length / 12),
            trend: growthRate > 0 ? 'growing' : 'declining',
            predictedTimeline: this.generateGrowthTimeline(lastCount, growthRate)
        };
    }

    async getRecommendations(collegeId, userId = null) {
        const recommendations = [];

        // College-level recommendations
        const collegeStats = await Analytics.findOne({
            collegeId,
            period: 'monthly'
        }).sort({ timestamp: -1 });

        if (collegeStats) {
            if (collegeStats.engagement.totalInteractions / collegeStats.users.total < 2) {
                recommendations.push({
                    type: 'engagement',
                    priority: 'high',
                    message: 'Low engagement rate detected. Consider running engagement campaigns.',
                    action: 'campaign'
                });
            }

            if (collegeStats.users.new / collegeStats.users.total < 0.05) {
                recommendations.push({
                    type: 'growth',
                    priority: 'medium',
                    message: 'Low new user growth. Review onboarding process.',
                    action: 'onboarding_review'
                });
            }
        }

        // User-specific recommendations
        if (userId) {
            const userChurn = await this.predictUserChurn(collegeId, userId);
            
            if (userChurn.churnRisk > 70) {
                recommendations.push({
                    type: 'retention',
                    priority: 'high',
                    message: 'High churn risk detected for this user.',
                    action: 'personalized_outreach',
                    userId
                });
            }
        }

        return recommendations;
    }

    // Helper Methods
    calculateChurnFeatures(analytics) {
        if (analytics.length < 2) return {};

        const recent = analytics[0];
        const previous = analytics[1];

        return {
            activityDrop: previous.activity.sessions.count > 0 ?
                ((previous.activity.sessions.count - recent.activity.sessions.count) / 
                 previous.activity.sessions.count * 100) : 0,
            engagementDrop: previous.content.engagement.likesGiven > 0 ?
                ((previous.content.engagement.likesGiven - recent.content.engagement.likesGiven) / 
                 previous.content.engagement.likesGiven * 100) : 0,
            lastActiveDays: Math.floor((new Date() - recent.activity.lastActive) / (1000 * 60 * 60 * 24)),
            avgSessionDuration: analytics.reduce((sum, a) => sum + (a.activity.sessions.avgDuration || 0), 0) / analytics.length
        };
    }

    calculateGrowthRate(values) {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        const periods = values.length - 1;
        
        return (Math.pow(last / first, 1 / periods) - 1);
    }

    calculateConfidence(dataPoints) {
        // More data points = higher confidence
        return Math.min(0.9, dataPoints / 30);
    }

    predictChurnDate(features) {
        if (features.lastActiveDays > 14) {
            return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        }
        if (features.activityDrop > 70) {
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    predictEngagement(avgScore) {
        return {
            predictedLikes: Math.round(avgScore * 0.5),
            predictedComments: Math.round(avgScore * 0.2),
            predictedShares: Math.round(avgScore * 0.1)
        };
    }

    generateGrowthTimeline(current, rate) {
        const months = 6;
        const timeline = [];
        
        for (let i = 1; i <= months; i++) {
            timeline.push({
                month: i,
                predictedUsers: Math.round(current * Math.pow(1 + rate, i))
            });
        }
        
        return timeline;
    }
}

module.exports = PredictiveAnalytics;