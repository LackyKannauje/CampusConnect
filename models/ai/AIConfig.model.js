const mongoose = require('mongoose');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const aiConfigSchema = new mongoose.Schema({
    // Scope
    scope: {
        type: String,
        enum: ['global', 'college', 'department', 'user'],
        default: 'global',
        required: true,
        index: true
    },
    scopeId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    }, // collegeId, departmentId, or userId

    // Provider Configuration
    providers: {
        openrouter: {
            apiKey: { type: String, select: false },
            baseURL: String,
            timeout: { type: Number, default: 60000 },
            maxRetries: { type: Number, default: 3 }
        },
        openai: {
            apiKey: { type: String, select: false },
            organization: String,
            baseURL: String,
            timeout: { type: Number, default: 30000 },
            maxRetries: { type: Number, default: 3 }
        },
        gemini: {
            apiKey: { type: String, select: false },
            baseURL: String
        },
        huggingface: {
            apiKey: { type: String, select: false },
            baseURL: String
        },
        azure: {
            apiKey: { type: String, select: false },
            endpoint: String,
            deployment: String
        }
    },

    // Model Configuration (UPDATED)
    models: {
        moderation: {
            provider: { type: String, default: 'openai' },
            model: { type: String, default: 'text-moderation-latest' },
            enabled: { type: Boolean, default: true },
            threshold: { type: Number, default: 0.8, min: 0, max: 1 }
        },
        tagging: {
            provider: { type: String, default: 'openrouter' },
            model: { type: String, default: 'openai/gpt-oss-120b' },
            enabled: { type: Boolean, default: true },
            maxTags: { type: Number, default: 5 }
        },
        summarization: {
            provider: { type: String, default: 'openrouter' },
            model: { type: String, default: 'openai/gpt-oss-120b' },
            enabled: { type: Boolean, default: true },
            maxLength: { type: Number, default: 150 }
        },
        sentiment: {
            provider: { type: String, default: 'huggingface' },
            model: { type: String, default: 'distilbert-base-uncased-finetuned-sst-2-english' },
            enabled: { type: Boolean, default: true }
        },
        embeddings: {
            provider: { type: String, default: 'openrouter' },
            model: { type: String, default: 'text-embedding-ada-002' },
            enabled: { type: Boolean, default: true },
            dimensions: { type: Number, default: 1536 }
        },
        // NEW MODELS ADDED
        chat: {
            provider: { type: String, default: 'openrouter' },
            model: { type: String, default: 'openai/gpt-oss-120b' },
            enabled: { type: Boolean, default: true },
            maxTokens: { type: Number, default: 1000 },
            temperature: { type: Number, default: 0.7, min: 0, max: 2 }
        },
        studyAssistant: {
            provider: { type: String, default: 'openrouter' },
            model: { type: String, default: 'openai/gpt-oss-120b' },
            enabled: { type: Boolean, default: true },
            maxTokens: { type: Number, default: 1500 },
            temperature: { type: Number, default: 0.3, min: 0, max: 1 }
        },
        codeHelp: {
            provider: { type: String, default: 'openrouter' },
            model: { type: String, default: 'openai/gpt-oss-120b' },
            enabled: { type: Boolean, default: true },
            maxTokens: { type: Number, default: 2000 },
            temperature: { type: Number, default: 0.1, min: 0, max: 1 }
        }
    },

    // Rate Limiting
    rateLimits: {
        perMinute: { type: Number, default: 60 },
        perHour: { type: Number, default: 1000 },
        perDay: { type: Number, default: 10000 },
        burstLimit: { type: Number, default: 10 }
    },

    // Caching
    cache: {
        enabled: { type: Boolean, default: true },
        ttl: { type: Number, default: 86400 }, // 24 hours in seconds
        maxSize: { type: Number, default: 1000 } // max cached items
    },

    // Cost Management
    budget: {
        monthlyLimit: { type: Number, default: 100 }, // USD
        alertThreshold: { type: Number, default: 0.8 }, // 80%
        currentMonthSpent: { type: Number, default: 0 },
        lastReset: Date
    },

    // Features (UPDATED)
    features: {
        autoModeration: { type: Boolean, default: true },
        smartTagging: { type: Boolean, default: true },
        contentSummary: { type: Boolean, default: true },
        sentimentAnalysis: { type: Boolean, default: true },
        recommendations: { type: Boolean, default: true },
        embeddings: { type: Boolean, default: true },
        plagiarismCheck: { type: Boolean, default: false },
        translation: { type: Boolean, default: false },
        transcription: { type: Boolean, default: false },
        // NEW FEATURES ADDED
        chat: { type: Boolean, default: true },
        studyAssistant: { type: Boolean, default: true },
        codeHelp: { type: Boolean, default: true }
    },

    // Fallback Strategy
    fallback: {
        enabled: { type: Boolean, default: true },
        primaryProvider: { type: String, default: 'openrouter' },
        secondaryProvider: { type: String, default: 'openai' },
        tertiaryProvider: { type: String, default: 'gemini' },
        fallbackThreshold: { type: Number, default: 5000 } // ms
    },

    // Monitoring
    monitoring: {
        enabled: { type: Boolean, default: true },
        alertOnFailure: { type: Boolean, default: true },
        alertOnHighLatency: { type: Boolean, default: true },
        latencyThreshold: { type: Number, default: 5000 }, // ms
        accuracyThreshold: { type: Number, default: 0.7 } // 70%
    },

    // Base Schema
    ...BaseSchema
}, {
    timestamps: true
});

// Apply Timestamps Plugin
TimestampsPlugin(aiConfigSchema);

// Indexes (UPDATED with new indexes)
aiConfigSchema.index({ scope: 1, scopeId: 1 }, { unique: true });
aiConfigSchema.index({ 'budget.currentMonthSpent': -1 });
aiConfigSchema.index({ 'features.autoModeration': 1 });
aiConfigSchema.index({ 'features.chat': 1 });
aiConfigSchema.index({ 'features.studyAssistant': 1 });
aiConfigSchema.index({ 'features.codeHelp': 1 });

// Virtual Fields
aiConfigSchema.virtual('isOverBudget').get(function () {
    return this.budget.currentMonthSpent >= this.budget.monthlyLimit;
});

aiConfigSchema.virtual('budgetRemaining').get(function () {
    return this.budget.monthlyLimit - this.budget.currentMonthSpent;
});

aiConfigSchema.virtual('budgetPercentage').get(function () {
    return (this.budget.currentMonthSpent / this.budget.monthlyLimit) * 100;
});

// Methods
aiConfigSchema.methods.canMakeRequest = function (endpoint) {
    const modelConfig = this.models[endpoint];
    return modelConfig && modelConfig.enabled && !this.isOverBudget;
};

aiConfigSchema.methods.getProviderConfig = function (provider) {
    return this.providers[provider];
};

aiConfigSchema.methods.addToSpent = function (amount) {
    this.budget.currentMonthSpent += amount;

    // Check if need to alert
    if (this.budgetPercentage >= this.budget.alertThreshold * 100) {
        // Trigger alert (implementation depends on your alert system)
        console.log(`Budget alert: ${this.budgetPercentage}% spent`);
    }

    return this.save();
};

aiConfigSchema.methods.resetMonthlyBudget = function () {
    this.budget.currentMonthSpent = 0;
    this.budget.lastReset = new Date();
    return this.save();
};

aiConfigSchema.methods.getFallbackProvider = function (currentProvider) {
    if (!this.fallback.enabled) return currentProvider;

    const providers = [
        this.fallback.primaryProvider,
        this.fallback.secondaryProvider,
        this.fallback.tertiaryProvider
    ];

    const currentIndex = providers.indexOf(currentProvider);
    return currentIndex < providers.length - 1 ? providers[currentIndex + 1] : currentProvider;
};

// Static Methods
aiConfigSchema.statics.getConfigForScope = async function (scope, scopeId) {
    // Try specific scope first
    let config = await this.findOne({ scope, scopeId });

    // Fall back to global if not found
    if (!config && scope !== 'global') {
        config = await this.findOne({ scope: 'global' });
    }

    return config;
};

aiConfigSchema.statics.getBudgetSummary = function () {
    return this.aggregate([
        {
            $group: {
                _id: '$scope',
                totalBudget: { $sum: '$budget.monthlyLimit' },
                totalSpent: { $sum: '$budget.currentMonthSpent' },
                count: { $sum: 1 },
                avgUsage: { $avg: { $divide: ['$budget.currentMonthSpent', '$budget.monthlyLimit'] } }
            }
        },
        {
            $project: {
                scope: '$_id',
                totalBudget: { $round: ['$totalBudget', 2] },
                totalSpent: { $round: ['$totalSpent', 2] },
                remaining: { $subtract: ['$totalBudget', '$totalSpent'] },
                usagePercentage: {
                    $multiply: [
                        { $divide: ['$totalSpent', '$totalBudget'] },
                        100
                    ]
                },
                avgUsage: { $multiply: ['$avgUsage', 100] },
                count: 1,
                _id: 0
            }
        },
        { $sort: { totalSpent: -1 } }
    ]);
};

const AIConfig = mongoose.model('AIConfig', aiConfigSchema);

module.exports = AIConfig;