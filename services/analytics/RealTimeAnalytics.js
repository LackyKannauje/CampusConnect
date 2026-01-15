const Analytics = require('../../models/analytics/Analytics.model');
const UserAnalytics = require('../../models/analytics/UserAnalytics.model');
const redis = require('redis');

class RealTimeAnalytics {
    constructor() {
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        this.redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
        
        this.initializeRedis();
    }

    async initializeRedis() {
        await this.redisClient.connect();
    }

    async trackEvent(event, data) {
        const {
            userId,
            collegeId,
            departmentId,
            eventType,
            contentType,
            contentId,
            metadata = {}
        } = data;

        const timestamp = new Date();
        const hour = timestamp.getHours();
        const dateKey = timestamp.toISOString().split('T')[0];

        // Store in Redis for real-time analytics
        const pipeline = this.redisClient.multi();

        // Increment counters
        pipeline.incr(`analytics:${collegeId}:events:total`);
        pipeline.incr(`analytics:${collegeId}:events:${eventType}`);
        pipeline.incr(`analytics:${collegeId}:hourly:${hour}`);
        
        if (userId) {
            pipeline.zincrby(`analytics:${collegeId}:active_users`, 1, userId);
            pipeline.zincrby(`analytics:${collegeId}:users:${eventType}`, 1, userId);
        }

        if (contentType && contentId) {
            pipeline.zincrby(`analytics:${collegeId}:content:popular`, 1, contentId);
            pipeline.incr(`analytics:${collegeId}:content:${contentType}:events`);
        }

        // Store event in stream for processing
        pipeline.xAdd(`analytics:events`, '*', {
            event,
            userId: userId || '',
            collegeId,
            eventType,
            contentType: contentType || '',
            contentId: contentId || '',
            metadata: JSON.stringify(metadata),
            timestamp: timestamp.toISOString()
        });

        await pipeline.exec();

        // Update user analytics
        if (userId) {
            await this.updateUserAnalytics(userId, collegeId, eventType, metadata);
        }

        return { success: true, timestamp };
    }

    async updateUserAnalytics(userId, collegeId, eventType, metadata) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let userAnalytics = await UserAnalytics.findOne({
            userId,
            collegeId,
            period: 'daily',
            date: today
        });

        if (!userAnalytics) {
            userAnalytics = new UserAnalytics({
                userId,
                collegeId,
                period: 'daily',
                date: today,
                activity: { sessions: { count: 0 } },
                content: { created: {}, engagement: {}, views: {} },
                social: { followers: {}, following: {}, connections: {}, messages: {} },
                academic: {},
                aiInteractions: { byType: new Map() },
                scores: {},
                patterns: {},
                goals: {},
                retention: {},
                insights: {}
            });
        }

        // Update based on event type
        switch (eventType) {
            case 'login':
                userAnalytics.activity.logins += 1;
                userAnalytics.activity.lastActive = new Date();
                userAnalytics.activity.sessions.count += 1;
                break;

            case 'post_created':
                userAnalytics.content.created.posts += 1;
                break;

            case 'comment_created':
                userAnalytics.content.created.comments += 1;
                break;

            case 'like_given':
                userAnalytics.content.engagement.likesGiven += 1;
                break;

            case 'like_received':
                userAnalytics.content.engagement.likesReceived += 1;
                break;

            case 'view_content':
                userAnalytics.content.views.given += 1;
                break;

            case 'follow':
                userAnalytics.social.following.new += 1;
                userAnalytics.social.following.count += 1;
                break;

            case 'ai_interaction':
                const aiType = metadata.type || 'general';
                const currentCount = userAnalytics.aiInteractions.byType.get(aiType) || 0;
                userAnalytics.aiInteractions.byType.set(aiType, currentCount + 1);
                userAnalytics.aiInteractions.total += 1;
                break;
        }

        // Update streak
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const yesterdayAnalytics = await UserAnalytics.findOne({
            userId,
            collegeId,
            period: 'daily',
            date: yesterday
        });

        if (yesterdayAnalytics && yesterdayAnalytics.activity.sessions.count > 0) {
            userAnalytics.activity.streak.current = (yesterdayAnalytics.activity.streak.current || 0) + 1;
            userAnalytics.activity.streak.longest = Math.max(
                userAnalytics.activity.streak.current,
                userAnalytics.activity.streak.longest
            );
        } else {
            userAnalytics.activity.streak.current = 1;
        }

        // Calculate scores
        userAnalytics.calculateScores();
        userAnalytics.updateRetention(yesterdayAnalytics);

        await userAnalytics.save();
    }

    async getRealtimeStats(collegeId) {
        const stats = await this.redisClient.mGet([
            `analytics:${collegeId}:events:total`,
            `analytics:${collegeId}:hourly:${new Date().getHours()}`,
            `analytics:${collegeId}:active_users:count`
        ]);

        const activeUsers = await this.redisClient.zCard(`analytics:${collegeId}:active_users`);
        const popularContent = await this.redisClient.zRangeWithScores(
            `analytics:${collegeId}:content:popular`, 0, 4, { REV: true }
        );

        return {
            totalEvents: parseInt(stats[0]) || 0,
            hourlyEvents: parseInt(stats[1]) || 0,
            activeUsers,
            popularContent: popularContent.map(item => ({
                contentId: item.value,
                score: item.score
            })),
            timestamp: new Date()
        };
    }

    async getActiveUsers(collegeId, limit = 20) {
        const userIds = await this.redisClient.zRange(
            `analytics:${collegeId}:active_users`, 0, limit - 1, { REV: true }
        );

        return {
            userIds,
            count: userIds.length,
            timestamp: new Date()
        };
    }

    async processEventStream(batchSize = 100) {
        try {
            const events = await this.redisClient.xRead(
                { key: 'analytics:events', id: '0' },
                { COUNT: batchSize }
            );

            if (!events || events.length === 0) {
                return { processed: 0 };
            }

            const batch = events[0].messages;
            const analyticsUpdates = [];

            for (const message of batch) {
                const event = JSON.parse(message.message.event);
                const data = JSON.parse(message.message.data);
                
                // Update hourly analytics
                analyticsUpdates.push(this.updateHourlyAnalytics(data));
            }

            await Promise.all(analyticsUpdates);

            // Acknowledge processed events
            const lastId = batch[batch.length - 1].id;
            await this.redisClient.xDel('analytics:events', lastId);

            return { processed: batch.length };

        } catch (error) {
            console.error('Error processing event stream:', error);
            return { processed: 0, error: error.message };
        }
    }

    async updateHourlyAnalytics(data) {
        const { collegeId, eventType, timestamp } = data;
        const hour = new Date(timestamp).getHours();
        const date = new Date(timestamp);
        date.setMinutes(0, 0, 0, 0);

        let analytics = await Analytics.findOne({
            collegeId,
            period: 'hourly',
            timestamp: date
        });

        if (!analytics) {
            analytics = new Analytics({
                collegeId,
                period: 'hourly',
                timestamp: date,
                users: { total: 0, active: 0, new: 0, returning: 0 },
                content: { total: 0, byType: new Map() },
                engagement: { totalInteractions: 0 },
                ai: { totalRequests: 0 },
                performance: {},
                insights: {}
            });
        }

        // Update counters
        analytics.engagement.totalInteractions += 1;
        
        if (eventType.includes('content')) {
            analytics.content.total += 1;
        }

        if (eventType.includes('ai')) {
            analytics.ai.totalRequests += 1;
        }

        await analytics.save();
    }

    async cleanupOldData(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        // Cleanup old Redis keys
        const keys = await this.redisClient.keys('analytics:*:hourly:*');
        for (const key of keys) {
            const timestamp = key.split(':').pop();
            const date = new Date(timestamp);
            if (date < cutoff) {
                await this.redisClient.del(key);
            }
        }

        return { cleaned: keys.length };
    }
}

module.exports = RealTimeAnalytics;