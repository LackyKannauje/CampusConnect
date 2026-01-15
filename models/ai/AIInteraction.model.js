const mongoose = require('mongoose');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const aiInteractionSchema = new mongoose.Schema({
    // Request Identification
    requestId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        index: true
    },
    
    // User Context
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true,
        index: true
    },
    
    // AI Service Details
    service: {
        type: String,
        enum: ['openai', 'gemini', 'huggingface', 'azure', 'custom'],
        required: true
    },
    model: {
        type: String,
        required: true
    },
    endpoint: {
        type: String,
        enum: [
            'moderation', 'tagging', 'summarization', 'sentiment',
            'translation', 'transcription', 'ocr', 'embeddings',
            'chat', 'image_generation', 'code_generation', 'qna'
        ],
        required: true
    },
    
    // Request Data
    input: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    inputMetadata: {
        contentType: String,
        size: Number,
        language: String,
        tokenCount: Number
    },
    
    // Response Data
    output: mongoose.Schema.Types.Mixed,
    outputMetadata: {
        contentType: String,
        size: Number,
        tokenCount: Number,
        finishReason: String
    },
    
    // Processing Metrics
    metrics: {
        latency: { // in milliseconds
            total: Number,
            network: Number,
            processing: Number
        },
        tokens: {
            input: Number,
            output: Number,
            total: Number
        },
        cost: {
            amount: Number,
            currency: { type: String, default: 'USD' },
            modelCost: Number,
            apiCost: Number
        },
        cacheHit: { type: Boolean, default: false },
        retryCount: { type: Number, default: 0 }
    },
    
    // Quality & Accuracy
    quality: {
        confidence: Number,
        accuracy: Number,
        relevance: Number,
        coherence: Number,
        flags: [{
            type: String,
            description: String
        }]
    },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'rate_limited', 'cached'],
        default: 'pending',
        index: true
    },
    error: {
        code: String,
        message: String,
        details: mongoose.Schema.Types.Mixed
    },
    
    // Feedback
    feedback: {
        rating: { // 1-5
            type: Number,
            min: 1,
            max: 5
        },
        helpful: Boolean,
        corrections: mongoose.Schema.Types.Mixed,
        reported: Boolean,
        reportedReason: String
    },
    
    // Context
    context: {
        source: {
            type: String,
            enum: ['api', 'background_job', 'user_action', 'system']
        },
        contentType: String,
        contentId: mongoose.Schema.Types.ObjectId,
        action: String,
        userAgent: String,
        ip: String
    },
    
    // Cache Reference
    cacheKey: String,
    expiresAt: {
        type: Date,
        index: true
    },
    
    // Base Schema
    ...BaseSchema
}, {
    timestamps: true
});

// Apply Timestamps Plugin
TimestampsPlugin(aiInteractionSchema);

// Indexes
aiInteractionSchema.index({ requestId: 1 }, { unique: true });
aiInteractionSchema.index({ userId: 1, createdAt: -1 });
aiInteractionSchema.index({ collegeId: 1, service: 1, createdAt: -1 });
aiInteractionSchema.index({ endpoint: 1, status: 1 });
aiInteractionSchema.index({ 'metrics.cost.amount': -1 });
aiInteractionSchema.index({ 'quality.confidence': -1 });
aiInteractionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual Fields
aiInteractionSchema.virtual('totalCostUSD').get(function() {
    return this.metrics.cost?.amount || 0;
});

aiInteractionSchema.virtual('isSuccessful').get(function() {
    return this.status === 'completed' || this.status === 'cached';
});

aiInteractionSchema.virtual('responseTime').get(function() {
    return this.metrics.latency?.total || 0;
});

// Methods
aiInteractionSchema.methods.markProcessing = function() {
    if (this.status === 'pending') {
        this.status = 'processing';
        return true;
    }
    return false;
};

aiInteractionSchema.methods.markCompleted = function(output, metrics) {
    this.status = 'completed';
    this.output = output;
    this.metrics = { ...this.metrics, ...metrics };
    return this;
};

aiInteractionSchema.methods.markFailed = function(error, metrics = {}) {
    this.status = 'failed';
    this.error = error;
    this.metrics = { ...this.metrics, ...metrics };
    return this;
};

aiInteractionSchema.methods.markCached = function(cacheKey) {
    this.status = 'cached';
    this.cacheKey = cacheKey;
    this.metrics.cacheHit = true;
    return this;
};

aiInteractionSchema.methods.calculateCost = function() {
    if (!this.metrics.tokens) return 0;
    
    // Sample pricing (adjust based on your provider)
    const prices = {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
        'gemini-pro': { input: 0.0005, output: 0.0015 },
        'default': { input: 0.001, output: 0.002 }
    };
    
    const modelPrice = prices[this.model] || prices.default;
    const inputCost = (this.metrics.tokens.input / 1000) * modelPrice.input;
    const outputCost = (this.metrics.tokens.output / 1000) * modelPrice.output;
    
    this.metrics.cost = {
        amount: inputCost + outputCost,
        currency: 'USD',
        modelCost: inputCost + outputCost,
        apiCost: 0.001 // Fixed API call cost
    };
    
    return this.metrics.cost.amount;
};

// Static Methods
aiInteractionSchema.statics.getUsageStats = function(collegeId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                createdAt: { $gte: startDate, $lte: endDate },
                status: { $in: ['completed', 'cached'] }
            }
        },
        {
            $group: {
                _id: {
                    service: '$service',
                    model: '$model',
                    endpoint: '$endpoint'
                },
                totalRequests: { $sum: 1 },
                successfulRequests: { 
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                cachedRequests: { 
                    $sum: { $cond: [{ $eq: ['$status', 'cached'] }, 1, 0] }
                },
                totalCost: { $sum: '$metrics.cost.amount' },
                totalTokens: { $sum: '$metrics.tokens.total' },
                avgLatency: { $avg: '$metrics.latency.total' },
                avgConfidence: { $avg: '$quality.confidence' }
            }
        },
        {
            $project: {
                _id: 0,
                service: '$_id.service',
                model: '$_id.model',
                endpoint: '$_id.endpoint',
                totalRequests: 1,
                successfulRequests: 1,
                cachedRequests: 1,
                cacheRate: { 
                    $multiply: [
                        { $divide: ['$cachedRequests', '$totalRequests'] },
                        100
                    ]
                },
                totalCost: { $round: ['$totalCost', 4] },
                totalTokens: 1,
                avgLatency: { $round: ['$avgLatency', 2] },
                avgConfidence: { $round: ['$avgConfidence', 2] }
            }
        },
        { $sort: { totalCost: -1 } }
    ]);
};

aiInteractionSchema.statics.getCostAnalysis = function(collegeId, period = 'monthly') {
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : 
                      period === 'weekly' ? '%Y-%W' : '%Y-%m';
    
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                'metrics.cost.amount': { $gt: 0 }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: groupFormat, date: '$createdAt' } },
                    endpoint: '$endpoint'
                },
                cost: { $sum: '$metrics.cost.amount' },
                requests: { $sum: 1 },
                tokens: { $sum: '$metrics.tokens.total' }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                endpoints: {
                    $push: {
                        endpoint: '$_id.endpoint',
                        cost: '$cost',
                        requests: '$requests',
                        tokens: '$tokens'
                    }
                },
                totalCost: { $sum: '$cost' },
                totalRequests: { $sum: '$requests' }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                date: '$_id',
                endpoints: 1,
                totalCost: { $round: ['$totalCost', 2] },
                totalRequests: 1,
                avgCostPerRequest: { 
                    $divide: ['$totalCost', '$totalRequests']
                }
            }
        }
    ]);
};

aiInteractionSchema.statics.getTopUsers = function(collegeId, limit = 10) {
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                userId: { $exists: true }
            }
        },
        {
            $group: {
                _id: '$userId',
                totalRequests: { $sum: 1 },
                totalCost: { $sum: '$metrics.cost.amount' },
                avgConfidence: { $avg: '$quality.confidence' },
                lastRequest: { $max: '$createdAt' }
            }
        },
        { $sort: { totalCost: -1 } },
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
                email: '$user.email',
                role: '$user.academic.role',
                totalRequests: 1,
                totalCost: { $round: ['$totalCost', 2] },
                avgConfidence: { $round: ['$avgConfidence', 2] },
                lastRequest: 1
            }
        }
    ]);
};

const AIInteraction = mongoose.model('AIInteraction', aiInteractionSchema);

module.exports = AIInteraction;