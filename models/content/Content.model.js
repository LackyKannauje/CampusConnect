const mongoose = require('mongoose');
const { BaseSchema, AIEnrichedSchema, TimestampsPlugin } = require('../shared/BaseSchema');
const { ContentTypes, Visibility, MediaTypes } = require('../shared/enums');

const contentSchema = new mongoose.Schema({
    // Core Identification
    contentId: { 
        type: String, 
        unique: true, 
        required: true,
        index: true 
    },
    slug: { 
        type: String, 
        lowercase: true,
        trim: true,
        index: true 
    },
    
    // Ownership
    authorId: { 
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
    departmentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Department' 
    },
    
    // Content Type & Category
    type: {
        type: String,
        enum: Object.values(ContentTypes),
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: [
            'announcement', 'event', 'academic', 'sports', 'cultural',
            'placement', 'study_material', 'question_paper', 'notes',
            'research', 'project', 'tutorial', 'discussion', 'news',
            'interview', 'competition', 'workshop', 'seminar', 'general'
        ],
        default: 'general',
        index: true
    },
    subcategory: String,
    tags: [{ 
        type: String, 
        lowercase: true,
        trim: true,
        index: true 
    }],
    
    // Content Details
    title: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 200 
    },
    subtitle: String,
    excerpt: { 
        type: String, 
        maxlength: 500 
    },
    content: {
        text: String,
        html: String,
        markdown: String,
        wordCount: Number,
        readingTime: Number, // in minutes
        language: { type: String, default: 'en' }
    },
    
    // Media
    featuredMedia: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Media' 
    },
    media: [{
        mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },
        type: String,
        url: String,
        thumbnail: String,
        caption: String,
        order: Number
    }],
    attachments: [{
        mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },
        name: String,
        description: String,
        size: Number
    }],
    
    // Type-Specific Fields
    // For Events
    eventDetails: {
        startDate: Date,
        endDate: Date,
        location: {
            type: String,
            enum: ['physical', 'online', 'hybrid'],
            default: 'physical'
        },
        venue: String,
        onlineLink: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        registration: {
            required: { type: Boolean, default: false },
            deadline: Date,
            maxParticipants: Number,
            registeredCount: { type: Number, default: 0 },
            link: String
        },
        schedule: [{
            time: String,
            title: String,
            speaker: String,
            description: String
        }],
        speakers: [{
            name: String,
            role: String,
            organization: String,
            photo: String
        }],
        isRecurring: { type: Boolean, default: false },
        recurrence: String // 'daily', 'weekly', 'monthly'
    },
    
    // For Study Materials
    studyMaterial: {
        subject: String,
        topic: String,
        courseCode: String,
        semester: Number,
        professor: String,
        academicYear: String,
        difficulty: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        },
        estimatedStudyTime: Number, // in hours
        prerequisites: [String],
        learningOutcomes: [String],
        isVerified: { type: Boolean, default: false },
        verifiedBy: mongoose.Schema.Types.ObjectId,
        verifiedAt: Date
    },
    
    // For Polls
    poll: {
        question: String,
        options: [{
            text: String,
            mediaId: mongoose.Schema.Types.ObjectId,
            votes: { type: Number, default: 0 },
            voters: [mongoose.Schema.Types.ObjectId],
            percentage: Number
        }],
        isMultipleChoice: { type: Boolean, default: false },
        maxChoices: Number,
        isAnonymous: { type: Boolean, default: false },
        showResults: { 
            type: String, 
            enum: ['always', 'after_vote', 'after_deadline', 'never'],
            default: 'after_vote'
        },
        deadline: Date,
        totalVotes: { type: Number, default: 0 },
        votedUsers: [mongoose.Schema.Types.ObjectId]
    },
    
    // For Jobs/Placements
    jobDetails: {
        company: String,
        position: String,
        location: String,
        type: {
            type: String,
            enum: ['full_time', 'part_time', 'internship', 'contract', 'remote']
        },
        salary: {
            min: Number,
            max: Number,
            currency: String,
            isDisclosed: Boolean
        },
        description: String,
        requirements: [String],
        benefits: [String],
        applicationDeadline: Date,
        applicationLink: String,
        contactEmail: String,
        experienceRequired: String,
        openings: Number,
        appliedCount: { type: Number, default: 0 }
    },
    
    // For Questions
    questionDetails: {
        isAnswered: { type: Boolean, default: false },
        acceptedAnswerId: mongoose.Schema.Types.ObjectId,
        viewCount: { type: Number, default: 0 },
        followers: [mongoose.Schema.Types.ObjectId],
        bounty: {
            amount: Number,
            currency: String,
            expiresAt: Date
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard']
        },
        subjectTags: [String]
    },
    
    // Visibility & Targeting
    visibility: {
        scope: {
            type: String,
            enum: Object.values(Visibility),
            default: Visibility.COLLEGE,
            index: true
        },
        targetGroups: {
            departments: [String],
            batches: [String],
            roles: [String],
            specificUsers: [mongoose.Schema.Types.ObjectId]
        },
        isPublic: { type: Boolean, default: false },
        isDraft: { type: Boolean, default: false },
        publishedAt: Date,
        scheduledAt: Date,
        expiresAt: Date,
        archiveAt: Date
    },
    
    // Engagement Metrics
    engagement: {
        views: { 
            type: Number, 
            default: 0,
            index: true 
        },
        uniqueViews: { type: Number, default: 0 },
        likes: [{
            userId: mongoose.Schema.Types.ObjectId,
            likedAt: Date,
            reaction: { // Facebook-like reactions
                type: String,
                enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry']
            }
        }],
        comments: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Comment' 
        }],
        shares: { 
            type: Number, 
            default: 0 
        },
        saves: [{ 
            userId: mongoose.Schema.Types.ObjectId,
            savedAt: Date,
            folder: String 
        }],
        downloads: { type: Number, default: 0 },
        bookmarks: [{ 
            userId: mongoose.Schema.Types.ObjectId,
            bookmarkedAt: Date 
        }],
        claps: { type: Number, default: 0 }, // Medium-like claps
        hotScore: Number, // For trending algorithm
        engagementRate: Number, // (likes + comments + shares) / views
        avgTimeSpent: Number // in seconds
    },
    
    // Comments & Discussions
    comments: {
        enabled: { type: Boolean, default: true },
        moderation: { 
            type: String, 
            enum: ['none', 'pre_moderation', 'post_moderation'],
            default: 'post_moderation'
        },
        maxDepth: { type: Number, default: 5 },
        isLocked: { type: Boolean, default: false },
        lockedBy: mongoose.Schema.Types.ObjectId,
        lockedAt: Date,
        lockReason: String
    },
    
    // Moderation
    moderation: {
        status: {
            type: String,
            enum: ['draft', 'pending', 'approved', 'flagged', 'rejected', 'archived'],
            default: 'pending',
            index: true
        },
        flags: [{
            type: String,
            enum: ['spam', 'inappropriate', 'misinformation', 'copyright', 'duplicate', 'low_quality'],
            flaggedBy: mongoose.Schema.Types.ObjectId,
            flaggedAt: Date,
            reason: String,
            aiConfidence: Number
        }],
        reviewedBy: mongoose.Schema.Types.ObjectId,
        reviewedAt: Date,
        autoModerationScore: Number,
        requiresManualReview: { type: Boolean, default: false },
        takedownRequests: [{
            requestedBy: String,
            reason: String,
            requestedAt: Date,
            status: String
        }]
    },
    
    // SEO & Discovery
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String],
        canonicalUrl: String,
        ogImage: String,
        ogDescription: String,
        twitterCard: String,
        schemaMarkup: Map
    },
    
    // AI Analysis
    aiAnalysis: {
        summary: String,
        keyPoints: [String],
        sentiment: {
            label: String,
            score: Number,
            emotions: Map
        },
        topics: [{
            topic: String,
            confidence: Number,
            category: String
        }],
        keywords: [{
            keyword: String,
            relevance: Number
        }],
        readability: {
            score: Number, // 0-100
            gradeLevel: String,
            complexity: String
        },
        entities: [{
            type: String, // PERSON, ORGANIZATION, LOCATION, etc.
            text: String,
            confidence: Number
        }],
        citations: [{
            source: String,
            url: String,
            relevance: Number
        }],
        plagiarismScore: Number,
        qualityScore: Number, // 0-100
        recommendations: [String], // AI suggestions for improvement
        embedding: [Number], // Vector embedding for semantic search
        processedAt: Date,
        modelVersion: String
    },
    
    // Collaboration
    collaboration: {
        coAuthors: [{
            userId: mongoose.Schema.Types.ObjectId,
            role: String, // 'author', 'editor', 'reviewer'
            addedAt: Date,
            permissions: [String]
        }],
        editHistory: [{
            userId: mongoose.Schema.Types.ObjectId,
            changes: Map,
            timestamp: Date,
            version: Number
        }],
        currentVersion: { type: Number, default: 1 },
        isCollaborative: { type: Boolean, default: false },
        inviteLink: String,
        inviteExpires: Date
    },
    
    // Monetization
    monetization: {
        isPaid: { type: Boolean, default: false },
        price: {
            amount: Number,
            currency: String,
            type: { type: String, enum: ['one_time', 'subscription'] }
        },
        purchases: [{
            userId: mongoose.Schema.Types.ObjectId,
            purchasedAt: Date,
            amount: Number,
            transactionId: String
        }],
        revenue: { type: Number, default: 0 },
        affiliateLink: String,
        sponsorship: {
            isSponsored: { type: Boolean, default: false },
            sponsor: String,
            terms: Map
        }
    },
    
    // Accessibility
    accessibility: {
        hasAltText: { type: Boolean, default: false },
        hasCaptions: { type: Boolean, default: false },
        hasTranscript: { type: Boolean, default: false },
        language: String,
        readingLevel: String,
        compatibleScreenReaders: [String]
    },
    
    // Statistics
    statistics: {
        viewHistory: [{
            date: Date,
            views: Number,
            uniqueViews: Number
        }],
        engagementHistory: [{
            date: Date,
            likes: Number,
            comments: Number,
            shares: Number
        }],
        demographic: {
            byDepartment: Map,
            byBatch: Map,
            byRole: Map
        },
        referralSources: [{
            source: String,
            count: Number
        }]
    },
    
    // Notifications
    notifications: {
        subscribers: [mongoose.Schema.Types.ObjectId],
        mentionedUsers: [mongoose.Schema.Types.ObjectId],
        notifyOnPublish: { type: Boolean, default: true },
        notifyOnComment: { type: Boolean, default: true },
        notifyOnUpdate: { type: Boolean, default: false }
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
TimestampsPlugin(contentSchema);

// Virtual Fields
contentSchema.virtual('likeCount').get(function() {
    return this.engagement.likes?.length || 0;
});

contentSchema.virtual('commentCount').get(function() {
    return this.engagement.comments?.length || 0;
});

contentSchema.virtual('saveCount').get(function() {
    return this.engagement.saves?.length || 0;
});

contentSchema.virtual('author').get(function() {
    // Will be populated
    return this._author;
});

contentSchema.virtual('isPublished').get(function() {
    return this.moderation.status === 'approved' && 
           (!this.visibility.scheduledAt || new Date() >= this.visibility.scheduledAt);
});

contentSchema.virtual('isExpired').get(function() {
    return this.visibility.expiresAt && new Date() > this.visibility.expiresAt;
});

contentSchema.virtual('isTrending').get(function() {
    const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    const engagementRate = (this.likeCount + this.commentCount) / Math.max(this.engagement.views, 1);
    return hoursSinceCreation < 48 && engagementRate > 0.1;
});

contentSchema.virtual('estimatedRevenue').get(function() {
    if (!this.monetization.isPaid) return 0;
    return this.monetization.revenue || 0;
});

// Indexes
contentSchema.index({ contentId: 1 }, { unique: true });
contentSchema.index({ slug: 1 }, { unique: true, sparse: true });
contentSchema.index({ authorId: 1, createdAt: -1 });
contentSchema.index({ collegeId: 1, type: 1, createdAt: -1 });
contentSchema.index({ collegeId: 1, category: 1, createdAt: -1 });
contentSchema.index({ 'tags': 1 });
contentSchema.index({ 'ai.tags': 1 });
contentSchema.index({ 'engagement.hotScore': -1 });
contentSchema.index({ 'visibility.scope': 1, 'moderation.status': 1, createdAt: -1 });
contentSchema.index({ 'ai.embeddings.text': 'cosmosSearch' });
contentSchema.index({ 'visibility.scheduledAt': 1, 'moderation.status': 1 });
contentSchema.index({ 'visibility.expiresAt': 1 });
contentSchema.index({ title: 'text', 'content.text': 'text', 'content.markdown': 'text' });

// Middleware
contentSchema.pre('save', async function(next) {
    // Generate contentId if not present
    if (!this.contentId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        this.contentId = `${this.type}_${timestamp}_${random}`;
    }
    
    // Generate slug from title
    if (!this.slug && this.title) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
        
        // Make slug unique
        const slugCount = await this.constructor.countDocuments({ 
            slug: new RegExp(`^${this.slug}(-[0-9]*)?$`) 
        });
        
        if (slugCount > 0) {
            this.slug = `${this.slug}-${slugCount + 1}`;
        }
    }
    
    // Calculate reading time
    if (this.content.text && !this.content.readingTime) {
        const words = this.content.text.split(/\s+/).length;
        const wordsPerMinute = 200;
        this.content.readingTime = Math.ceil(words / wordsPerMinute);
        this.content.wordCount = words;
    }
    
    // Set publishedAt if being published
    if (this.moderation.status === 'approved' && !this.visibility.publishedAt) {
        this.visibility.publishedAt = new Date();
    }
    
    // Calculate hot score
    if (this.isNew) {
        this.calculateHotScore();
    }
    
    // Set default excerpt
    if (!this.excerpt && this.content.text) {
        this.excerpt = this.content.text.substring(0, 200) + '...';
    }
    
    next();
});

contentSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    
    // Update hot score if engagement changes
    if (update.$inc && (update.$inc['engagement.likes'] || update.$inc['engagement.comments'])) {
        this.set({ 'engagement.hotScore': this.calculateHotScore() });
    }
    
    next();
});

// Methods
contentSchema.methods.calculateHotScore = function() {
    const likes = this.engagement.likes?.length || 0;
    const comments = this.engagement.comments?.length || 0;
    const shares = this.engagement.shares || 0;
    const views = this.engagement.views || 1;
    
    const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    const gravity = 1.8;
    
    // Reddit-like hot score algorithm
    const score = (likes * 2 + comments * 1.5 + shares * 1) - 1;
    const order = Math.log10(Math.max(Math.abs(score), 1));
    const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
    const seconds = ageInHours * 3600;
    
    const hotScore = sign * order + seconds / (gravity * 3600);
    this.engagement.hotScore = hotScore;
    
    return hotScore;
};

contentSchema.methods.incrementView = function(userId = null) {
    this.engagement.views += 1;
    
    if (userId) {
        // Check if unique view
        // Implementation depends on your tracking system
    }
    
    this.calculateHotScore();
};

contentSchema.methods.addLike = function(userId, reaction = 'like') {
    const existingIndex = this.engagement.likes.findIndex(
        like => like.userId.equals(userId)
    );
    
    if (existingIndex > -1) {
        // Update existing reaction
        this.engagement.likes[existingIndex].reaction = reaction;
        this.engagement.likes[existingIndex].likedAt = new Date();
    } else {
        // Add new like
        this.engagement.likes.push({
            userId,
            likedAt: new Date(),
            reaction
        });
    }
    
    this.calculateHotScore();
    return true;
};

contentSchema.methods.removeLike = function(userId) {
    const initialLength = this.engagement.likes.length;
    this.engagement.likes = this.engagement.likes.filter(
        like => !like.userId.equals(userId)
    );
    
    if (this.engagement.likes.length !== initialLength) {
        this.calculateHotScore();
        return true;
    }
    return false;
};

contentSchema.methods.canUserAccess = function(user) {
    // Check moderation status
    if (this.moderation.status !== 'approved') {
        return user._id.equals(this.authorId) || 
               user.academic.role === 'admin' || 
               user.academic.role === 'moderator';
    }
    
    // Check expiration
    if (this.visibility.expiresAt && new Date() > this.visibility.expiresAt) {
        return user._id.equals(this.authorId) || 
               user.academic.role === 'admin';
    }
    
    // Check visibility scope
    switch (this.visibility.scope) {
        case 'public':
            return true;
        case 'college':
            return user.collegeId.equals(this.collegeId);
        case 'department':
            return user.collegeId.equals(this.collegeId) && 
                   user.departmentId && 
                   user.departmentId.equals(this.departmentId);
        case 'batch':
            return user.collegeId.equals(this.collegeId) && 
                   this.visibility.targetGroups?.batches?.includes(user.academic.batch?.name);
        case 'private':
            return user._id.equals(this.authorId) ||
                   this.visibility.targetGroups?.specificUsers?.some(id => id.equals(user._id));
        case 'followers':
            // Check if user follows author
            // This would require additional logic
            return user._id.equals(this.authorId);
        default:
            return false;
    }
};

contentSchema.methods.getRelatedContent = async function(limit = 10) {
    return this.constructor.aggregate([
        {
            $match: {
                collegeId: this.collegeId,
                _id: { $ne: this._id },
                'moderation.status': 'approved',
                'ai.embeddings.text': { $exists: true }
            }
        },
        {
            $addFields: {
                similarity: {
                    $cosmosSearch: {
                        path: 'ai.embeddings.text',
                        query: this.ai.embeddings?.text || [],
                        k: limit
                    }
                }
            }
        },
        {
            $sort: { similarity: -1 }
        },
        {
            $limit: limit
        },
        {
            $project: {
                _id: 1,
                title: 1,
                type: 1,
                category: 1,
                excerpt: 1,
                featuredMedia: 1,
                likeCount: { $size: '$engagement.likes' },
                commentCount: { $size: '$engagement.comments' },
                similarity: 1
            }
        }
    ]);
};

// Static Methods
contentSchema.statics.getTrending = function(collegeId = null, limit = 20, timeframe = 'week') {
    const timeframes = {
        'day': 1,
        'week': 7,
        'month': 30,
        'year': 365
    };
    
    const days = timeframes[timeframe] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const matchStage = {
        'moderation.status': 'approved',
        createdAt: { $gte: startDate },
        'engagement.hotScore': { $exists: true }
    };
    
    if (collegeId) {
        matchStage.collegeId = mongoose.Types.ObjectId(collegeId);
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $addFields: {
                likeCount: { $size: '$engagement.likes' },
                commentCount: { $size: '$engagement.comments' }
            }
        },
        {
            $sort: { 'engagement.hotScore': -1 }
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: 'users',
                localField: 'authorId',
                foreignField: '_id',
                as: 'author'
            }
        },
        {
            $unwind: '$author'
        },
        {
            $project: {
                _id: 1,
                contentId: 1,
                title: 1,
                type: 1,
                category: 1,
                excerpt: 1,
                featuredMedia: 1,
                likeCount: 1,
                commentCount: 1,
                views: '$engagement.views',
                hotScore: '$engagement.hotScore',
                createdAt: 1,
                author: {
                    _id: '$author._id',
                    name: { $concat: ['$author.profile.firstName', ' ', '$author.profile.lastName'] },
                    avatar: '$author.profile.avatar.url',
                    role: '$author.academic.role'
                }
            }
        }
    ]);
};

contentSchema.statics.getAnalytics = function(collegeId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                collegeId: mongoose.Types.ObjectId(collegeId),
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $facet: {
                // Content by type
                byType: [
                    {
                        $group: {
                            _id: '$type',
                            count: { $sum: 1 },
                            totalLikes: { $sum: { $size: '$engagement.likes' } },
                            totalComments: { $sum: { $size: '$engagement.comments' } },
                            totalViews: { $sum: '$engagement.views' }
                        }
                    },
                    { $sort: { count: -1 } }
                ],
                
                // Content by category
                byCategory: [
                    {
                        $group: {
                            _id: '$category',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ],
                
                // Top performing content
                topContent: [
                    {
                        $addFields: {
                            engagementScore: {
                                $add: [
                                    { $multiply: [{ $size: '$engagement.likes' }, 2] },
                                    { $size: '$engagement.comments' },
                                    '$engagement.shares'
                                ]
                            }
                        }
                    },
                    { $sort: { engagementScore: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            type: 1,
                            engagementScore: 1,
                            likes: { $size: '$engagement.likes' },
                            comments: { $size: '$engagement.comments' },
                            views: '$engagement.views'
                        }
                    }
                ],
                
                // Daily trends
                dailyTrends: [
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                            },
                            count: { $sum: 1 },
                            likes: { $sum: { $size: '$engagement.likes' } },
                            comments: { $sum: { $size: '$engagement.comments' } }
                        }
                    },
                    { $sort: { '_id': 1 } }
                ],
                
                // Author performance
                topAuthors: [
                    {
                        $group: {
                            _id: '$authorId',
                            postCount: { $sum: 1 },
                            totalLikes: { $sum: { $size: '$engagement.likes' } },
                            totalComments: { $sum: { $size: '$engagement.comments' } }
                        }
                    },
                    { $sort: { postCount: -1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: 'users',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'author'
                        }
                    },
                    { $unwind: '$author' },
                    {
                        $project: {
                            _id: 0,
                            authorId: '$_id',
                            authorName: { $concat: ['$author.profile.firstName', ' ', '$author.profile.lastName'] },
                            postCount: 1,
                            totalLikes: 1,
                            totalComments: 1
                        }
                    }
                ]
            }
        }
    ]);
};

contentSchema.statics.search = function(query, filters = {}, options = {}) {
    const {
        collegeId = null,
        type = null,
        category = null,
        limit = 20,
        skip = 0,
        sortBy = 'relevance',
        sortOrder = -1
    } = options;
    
    const searchQuery = {};
    
    // Text search
    if (query) {
        searchQuery.$text = { $search: query };
    }
    
    // Filters
    if (collegeId) searchQuery.collegeId = collegeId;
    if (type) searchQuery.type = type;
    if (category) searchQuery.category = category;
    if (filters.tags) searchQuery.tags = { $all: filters.tags };
    if (filters.authorId) searchQuery.authorId = filters.authorId;
    if (filters.departmentId) searchQuery.departmentId = filters.departmentId;
    
    // Moderation filter
    searchQuery['moderation.status'] = 'approved';
    
    // Build sort
    let sort = {};
    if (sortBy === 'relevance' && query) {
        sort = { score: { $meta: 'textScore' } };
    } else if (sortBy === 'hot') {
        sort = { 'engagement.hotScore': sortOrder };
    } else if (sortBy === 'new') {
        sort = { createdAt: sortOrder };
    } else if (sortBy === 'top') {
        sort = { 'engagement.likes': sortOrder };
    } else {
        sort = { [sortBy]: sortOrder };
    }
    
    return this.find(searchQuery)
        .select('title excerpt type category tags featuredMedia engagement.likes engagement.comments createdAt')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'profile.firstName profile.lastName profile.avatar academic.role');
};

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;