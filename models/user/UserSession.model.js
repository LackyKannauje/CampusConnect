const mongoose = require('mongoose');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const userSessionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        index: true 
    },
    sessionId: { 
        type: String, 
        required: true,
        unique: true,
        index: true 
    },
    
    // Device Information
    device: {
        type: { 
            type: String, 
            enum: ['web', 'android', 'ios', 'desktop'],
            required: true 
        },
        name: String,
        os: String,
        browser: String,
        version: String,
        isMobile: Boolean,
        isTablet: Boolean,
        isDesktop: Boolean
    },
    
    // Location
    location: {
        ip: String,
        city: String,
        region: String,
        country: String,
        countryCode: String,
        timezone: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        isp: String
    },
    
    // Session Details
    token: { 
        type: String, 
        required: true,
        select: false 
    },
    refreshToken: { 
        type: String, 
        select: false 
    },
    expiresAt: { 
        type: Date, 
        required: true,
        index: true 
    },
    
    // Activity Tracking
    activity: {
        lastActive: { 
            type: Date, 
            default: Date.now 
        },
        totalRequests: { 
            type: Number, 
            default: 0 
        },
        endpoints: [{
            path: String,
            method: String,
            count: Number,
            lastCalled: Date
        }],
        notificationsReceived: { type: Number, default: 0 },
        notificationsRead: { type: Number, default: 0 }
    },
    
    // Status
    isActive: { 
        type: Boolean, 
        default: true,
        index: true 
    },
    logoutAt: Date,
    logoutReason: {
        type: String,
        enum: ['user', 'timeout', 'revoked', 'security', 'system']
    },
    
    // Security
    security: {
        fingerprint: String,
        userAgentHash: String,
        isSecure: Boolean,
        mfaVerified: { type: Boolean, default: false },
        mfaMethod: String
    },
    
    // AI Session Analysis
    aiAnalysis: {
        behaviorPattern: String,
        anomalyScore: Number,
        riskLevel: { 
            type: String, 
            enum: ['low', 'medium', 'high'],
            default: 'low' 
        },
        flags: [{
            type: String,
            description: String,
            timestamp: Date
        }]
    },
    
    ...BaseSchema
}, {
    timestamps: true
});

// Apply Timestamps Plugin
TimestampsPlugin(userSessionSchema);

// Indexes
userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userSessionSchema.index({ 'activity.lastActive': -1 });
userSessionSchema.index({ 'location.ip': 1 });
userSessionSchema.index({ 'device.type': 1 });

// Methods
userSessionSchema.methods.isExpired = function() {
    return new Date() > this.expiresAt;
};

userSessionSchema.methods.updateActivity = function(endpoint, method) {
    this.activity.lastActive = new Date();
    this.activity.totalRequests += 1;
    
    const endpointIndex = this.activity.endpoints.findIndex(
        ep => ep.path === endpoint && ep.method === method
    );
    
    if (endpointIndex > -1) {
        this.activity.endpoints[endpointIndex].count += 1;
        this.activity.endpoints[endpointIndex].lastCalled = new Date();
    } else {
        this.activity.endpoints.push({
            path: endpoint,
            method: method,
            count: 1,
            lastCalled: new Date()
        });
    }
};

userSessionSchema.methods.logout = function(reason = 'user') {
    this.isActive = false;
    this.logoutAt = new Date();
    this.logoutReason = reason;
};

// Static Methods
userSessionSchema.statics.cleanupExpired = async function() {
    return this.deleteMany({ 
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isActive: false }
        ]
    });
};

userSessionSchema.statics.findActiveByUser = function(userId) {
    return this.find({ 
        userId, 
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).sort({ 'activity.lastActive': -1 });
};

const UserSession = mongoose.model('UserSession', userSessionSchema);

module.exports = UserSession;