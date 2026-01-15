const mongoose = require('mongoose');
const { BaseSchema, AIEnrichedSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const commentSchema = new mongoose.Schema({
    // Core References
    contentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Content',
        required: true,
        index: true 
    },
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
    
    // Comment Structure
    parentCommentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment',
        default: null,
        index: true 
    },
    isReply: { 
        type: Boolean, 
        default: false 
    },
    depth: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 5 
    }, // Max nesting depth
    threadId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment',
        default: null,
        index: true 
    }, // Root comment of thread
    
    // Content
    text: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 2000 
    },
    formattedText: String, // With markdown/HTML
    mentions: [{
        userId: mongoose.Schema.Types.ObjectId,
        position: Number, // Character position in text
        username: String
    }],
    hashtags: [{
        tag: String,
        position: Number
    }],
    links: [{
        url: String,
        title: String,
        description: String,
        image: String,
        position: Number
    }],
    
    // Media Attachments
    media: [{
        mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },
        type: String,
        url: String,
        thumbnail: String,
        caption: String
    }],
    codeSnippet: {
        language: String,
        code: String,
        filename: String
    },
    
    // Engagement
    engagement: {
        likes: [{
            userId: mongoose.Schema.Types.ObjectId,
            likedAt: Date
        }],
        replies: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Comment' 
        }],
        shares: { type: Number, default: 0 },
        saves: [{ 
            userId: mongoose.Schema.Types.ObjectId,
            savedAt: Date 
        }],
        reports: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        hotScore: Number // For ranking algorithm
    },
    
    // Moderation
    moderation: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'flagged', 'hidden', 'deleted'],
            default: 'approved'
        },
        flags: [{
            type: String,
            enum: ['spam', 'harassment', 'hate_speech', 'misinformation', 'off_topic', 'other'],
            flaggedBy: mongoose.Schema.Types.ObjectId,
            flaggedAt: Date,
            reason: String,
            aiConfidence: Number
        }],
        reviewedBy: mongoose.Schema.Types.ObjectId,
        reviewedAt: Date,
        autoModerationScore: Number,
        toxicityScore: Number, // 0-1
        requiresManualReview: { type: Boolean, default: false }
    },
    
    // Metadata
    metadata: {
        ip: String,
        userAgent: String,
        device: String,
        location: String,
        editCount: { type: Number, default: 0 },
        lastEdited: Date,
        editHistory: [{
            text: String,
            editedAt: Date,
            reason: String
        }],
        isEdited: { type: Boolean, default: false },
        isPinned: { type: Boolean, default: false },
        pinnedBy: mongoose.Schema.Types.ObjectId,
        pinnedAt: Date,
        featured: { type: Boolean, default: false }, // Featured by moderators
        bestAnswer: { type: Boolean, default: false } // For Q&A
    },
    
    // AI Analysis
    aiAnalysis: {
        sentiment: {
            label: { type: String, enum: ['positive', 'negative', 'neutral', 'mixed'] },
            score: Number,
            emotions: Map // joy, sadness, anger, etc.
        },
        intent: {
            type: String,
            enum: ['question', 'answer', 'opinion', 'fact', 'joke', 'critique', 'support', 'other']
        },
        topics: [String],
        keywords: [String],
        entities: [{
            type: String,
            text: String,
            category: String
        }],
        qualityScore: Number, // 0-100 based on grammar, relevance, etc.
        relevanceToParent: Number, // 0-1
        summary: String,
        suggestedReplies: [String], // AI-generated reply suggestions
        isConstructive: Boolean,
        toxicityBreakdown: Map // Different types of toxicity
    },
    
    // User Context
    userContext: {
        roleAtTime: String, // User's role when commenting
        departmentAtTime: String,
        reputationScore: Number, // User's reputation at time of comment
        badges: [String] // Badges user had at time
    },
    
    // Thread Management
    threadInfo: {
        replyCount: { type: Number, default: 0 },
        lastReplyAt: Date,
        participants: [mongoose.Schema.Types.ObjectId], // Unique users in thread
        isLocked: { type: Boolean, default: false },
        lockedBy: mongoose.Schema.Types.ObjectId,
        lockedAt: Date,
        lockReason: String
    },
    
    // Notifications
    notifications: {
        mentionedUsersNotified: [mongoose.Schema.Types.ObjectId],
        parentAuthorNotified: Boolean,
        subscribersNotified: [mongoose.Schema.Types.ObjectId]
    },
    
    // AI Enrichment
    ...AIEnrichedSchema,
    
    // Base Schema
    ...BaseSchema
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Apply Timestamps Plugin
TimestampsPlugin(commentSchema);

// Virtual Fields
commentSchema.virtual('likeCount').get(function() {
    return this.engagement.likes?.length || 0;
});

commentSchema.virtual('replyCount').get(function() {
    return this.engagement.replies?.length || 0;
});

commentSchema.virtual('isRoot').get(function() {
    return !this.parentCommentId;
});

commentSchema.virtual('author').get(function() {
    // Will be populated
    return this._author;
});

commentSchema.virtual('content').get(function() {
    // Will be populated
    return this._content;
});

// Indexes
commentSchema.index({ contentId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1, createdAt: 1 });
commentSchema.index({ threadId: 1, createdAt: 1 });
commentSchema.index({ collegeId: 1, 'moderation.status': 1 });
commentSchema.index({ 'engagement.hotScore': -1 });
commentSchema.index({ 'aiAnalysis.sentiment.score': 1 });
commentSchema.index({ 'metadata.isPinned': -1, createdAt: -1 });
commentSchema.index({ 'metadata.bestAnswer': -1 });
commentSchema.index({ 'mentions.userId': 1 });
commentSchema.index({ 'hashtags.tag': 1 });
commentSchema.index({ 'ai.tags': 1 });

// Middleware
commentSchema.pre('save', function(next) {
    // Set depth based on parent
    if (this.parentCommentId && this.depth === 0) {
        this.depth = 1;
        this.isReply = true;
    }
    
    // Auto-generate threadId for root comments
    if (!this.parentCommentId && !this.threadId) {
        this.threadId = this._id;
    } else if (this.parentCommentId && !this.threadId) {
        // Will be set in post-find middleware
    }
    
    // Calculate hot score (Reddit-like algorithm)
    if (this.isNew) {
        const likes = this.engagement.likes?.length || 0;
        const replies = this.engagement.replies?.length || 0;
        const ageInHours = 1; // New comment
        const order = Math.log10(Math.max(Math.abs(likes), 1));
        const sign = likes > 0 ? 1 : likes < 0 ? -1 : 0;
        const seconds = ageInHours * 3600;
        
        this.engagement.hotScore = (sign * order + seconds / 45000).toFixed(7);
    }
    
    // Track edit history
    if (this.isModified('text') && !this.isNew) {
        if (!this.metadata.editHistory) {
            this.metadata.editHistory = [];
        }
        
        this.metadata.editHistory.push({
            text: this.text,
            editedAt: new Date(),
            reason: 'user_edit'
        });
        
        this.metadata.editCount += 1;
        this.metadata.lastEdited = new Date();
        this.metadata.isEdited = true;
    }
    
    // Extract mentions and hashtags
    if (this.isModified('text')) {
        this.extractMetadata();
    }
    
    next();
});

commentSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    
    if (update.text) {
        // Add to edit history
        this.set({
            'metadata.editCount': { $inc: 1 },
            'metadata.lastEdited': new Date(),
            'metadata.isEdited': true,
            $push: {
                'metadata.editHistory': {
                    text: update.text,
                    editedAt: new Date(),
                    reason: 'user_edit'
                }
            }
        });
    }
    
    next();
});

// Methods
commentSchema.methods.extractMetadata = function() {
    // Extract mentions (@username)
    const mentionRegex = /@([\w.-]+)/g;
    let match;
    this.mentions = [];
    
    while ((match = mentionRegex.exec(this.text)) !== null) {
        this.mentions.push({
            username: match[1],
            position: match.index
        });
    }
    
    // Extract hashtags (#tag)
    const hashtagRegex = /#(\w+)/g;
    this.hashtags = [];
    
    while ((match = hashtagRegex.exec(this.text)) !== null) {
        this.hashtags.push({
            tag: match[1].toLowerCase(),
            position: match.index
        });
    }
    
    // Extract links (simple regex)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    this.links = [];
    
    while ((match = urlRegex.exec(this.text)) !== null) {
        this.links.push({
            url: match[1],
            position: match.index
        });
    }
};

commentSchema.methods.addLike = function(userId) {
    if (!this.engagement.likes.some(like => like.userId.equals(userId))) {
        this.engagement.likes.push({
            userId,
            likedAt: new Date()
        });
        
        // Update hot score
        this.updateHotScore();
        return true;
    }
    return false;
};

commentSchema.methods.removeLike = function(userId) {
    const initialLength = this.engagement.likes.length;
    this.engagement.likes = this.engagement.likes.filter(
        like => !like.userId.equals(userId)
    );
    
    if (this.engagement.likes.length !== initialLength) {
        this.updateHotScore();
        return true;
    }
    return false;
};

commentSchema.methods.updateHotScore = function() {
    const likes = this.engagement.likes.length;
    const replies = this.engagement.replies?.length || 0;
    const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    
    const order = Math.log10(Math.max(Math.abs(likes), 1));
    const sign = likes > 0 ? 1 : likes < 0 ? -1 : 0;
    const seconds = ageInHours * 3600;
    
    // Weight replies as half a like
    const replyWeight = replies * 0.5;
    const weightedScore = likes + replyWeight;
    
    this.engagement.hotScore = parseFloat(
        (sign * Math.log10(Math.max(Math.abs(weightedScore), 1)) + seconds / 45000).toFixed(7)
    );
};

commentSchema.methods.canEdit = function(userId, isModerator = false) {
    if (isModerator) return true;
    if (this.userId.equals(userId)) {
        // Users can edit their own comments within 24 hours
        const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
        return hoursSinceCreation <= 24;
    }
    return false;
};

commentSchema.methods.canDelete = function(userId, isModerator = false) {
    if (isModerator) return true;
    if (this.userId.equals(userId)) {
        // Users can delete their own comments if they have no replies
        return (this.engagement.replies?.length || 0) === 0;
    }
    return false;
};

commentSchema.methods.getThreadDepth = async function() {
    if (!this.parentCommentId) return 0;
    
    let depth = 0;
    let current = this;
    
    while (current.parentCommentId && depth < 10) {
        const parent = await this.constructor.findById(current.parentCommentId);
        if (!parent) break;
        
        depth++;
        current = parent;
    }
    
    return depth;
};

// Static Methods
commentSchema.statics.getThread = async function(threadId, options = {}) {
    const {
        depthLimit = 5,
        sortBy = 'createdAt',
        sortOrder = 1,
        includeDeleted = false
    } = options;
    
    const query = { 
        $or: [
            { _id: threadId },
            { threadId: threadId }
        ],
        depth: { $lte: depthLimit }
    };
    
    if (!includeDeleted) {
        query['moderation.status'] = { $ne: 'deleted' };
    }
    
    return this.find(query)
        .sort({ depth: 1, [sortBy]: sortOrder })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar academic.role')
        .lean();
};

commentSchema.statics.getPopularComments = function(collegeId, days = 7, limit = 20) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                createdAt: { $gte: startDate },
                'moderation.status': 'approved',
                depth: 0 // Root comments only
            }
        },
        {
            $addFields: {
                likeCount: { $size: '$engagement.likes' },
                replyCount: { $size: '$engagement.replies' },
                engagementScore: {
                    $add: [
                        { $multiply: [{ $size: '$engagement.likes' }, 2] },
                        { $size: '$engagement.replies' }
                    ]
                }
            }
        },
        {
            $sort: { engagementScore: -1 }
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'author'
            }
        },
        {
            $unwind: '$author'
        },
        {
            $lookup: {
                from: 'contents',
                localField: 'contentId',
                foreignField: '_id',
                as: 'content'
            }
        },
        {
            $unwind: '$content'
        },
        {
            $project: {
                _id: 1,
                text: 1,
                likeCount: 1,
                replyCount: 1,
                engagementScore: 1,
                createdAt: 1,
                author: {
                    _id: '$author._id',
                    name: { $concat: ['$author.profile.firstName', ' ', '$author.profile.lastName'] },
                    avatar: '$author.profile.avatar.url',
                    role: '$author.academic.role'
                },
                content: {
                    _id: '$content._id',
                    title: '$content.title',
                    type: '$content.type'
                }
            }
        }
    ]);
};

commentSchema.statics.getSentimentAnalysis = function(collegeId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                createdAt: { $gte: startDate, $lte: endDate },
                'moderation.status': 'approved',
                'aiAnalysis.sentiment.label': { $exists: true }
            }
        },
        {
            $group: {
                _id: '$aiAnalysis.sentiment.label',
                count: { $sum: 1 },
                avgScore: { $avg: '$aiAnalysis.sentiment.score' },
                comments: { $push: '$$ROOT' }
            }
        },
        {
            $project: {
                _id: 0,
                sentiment: '$_id',
                count: 1,
                avgScore: 1,
                percentage: {
                    $multiply: [
                        { $divide: ['$count', { $sum: '$count' }] },
                        100
                    ]
                }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;