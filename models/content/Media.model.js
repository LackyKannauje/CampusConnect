const mongoose = require('mongoose');
const { BaseSchema, AIEnrichedSchema, TimestampsPlugin } = require('../shared/BaseSchema');
const { MediaTypes } = require('../shared/enums');
const { FileSchema } = require('../shared/types');

const mediaSchema = new mongoose.Schema({
    // Core Identification
    mediaId: { 
        type: String, 
        unique: true, 
        required: true,
        index: true 
    },
    originalName: { 
        type: String, 
        required: true 
    },
    
    // File Information
    file: FileSchema,
    
    // Type & Category
    type: {
        type: String,
        enum: Object.values(MediaTypes),
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: [
            'profile', 'post', 'event', 'study_material', 
            'announcement', 'resource', 'avatar', 'banner'
        ],
        default: 'post'
    },
    subcategory: String, // e.g., 'lecture_notes', 'question_paper', 'lab_manual'
    
    // Ownership & Permissions
    uploadedBy: { 
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
    
    // Access Control
    permissions: {
        visibility: {
            type: String,
            enum: ['public', 'college', 'department', 'private'],
            default: 'college'
        },
        downloadable: { type: Boolean, default: true },
        shareable: { type: Boolean, default: true },
        requiresAuth: { type: Boolean, default: false },
        allowedRoles: [String], // User roles that can access
        allowedUsers: [mongoose.Schema.Types.ObjectId],
        passwordProtected: { type: Boolean, default: false },
        passwordHash: String,
        expiresAt: Date,
        maxDownloads: Number,
        maxViews: Number
    },
    
    // Content Information
    contentInfo: {
        title: String,
        description: String,
        tags: [{ 
            type: String, 
            lowercase: true,
            index: true 
        }],
        subject: String,
        topic: String,
        author: String,
        publisher: String,
        year: Number,
        edition: String,
        isbn: String,
        language: String,
        pageCount: Number,
        duration: Number, // for videos/audio in seconds
        resolution: String, // for videos/images
        format: String, // e.g., 'mp4', 'pdf', 'jpg'
        quality: {
            type: String,
            enum: ['low', 'medium', 'high', 'original'],
            default: 'medium'
        }
    },
    
    // Processing Status
    processing: {
        status: {
            type: String,
            enum: ['uploading', 'processing', 'ready', 'failed', 'deleted'],
            default: 'uploading'
        },
        progress: Number, // 0-100
        error: String,
        processedAt: Date,
        transformations: [
            {
              type: { type: String },   // 👈 IMPORTANT CHANGE
              url: { type: String },
              size: { type: Number },
              createdAt: { type: Date, default: Date.now }
            }
          ],          
        optimizationLevel: Number // 0-100
    },
    
    // Usage & Analytics
    usage: {
        views: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        embeds: { type: Number, default: 0 },
        lastViewed: Date,
        lastDownloaded: Date,
        viewHistory: [{
            userId: mongoose.Schema.Types.ObjectId,
            viewedAt: Date,
            duration: Number, // seconds viewed
            device: String
        }],
        downloadHistory: [{
            userId: mongoose.Schema.Types.ObjectId,
            downloadedAt: Date,
            ip: String
        }]
    },
    
    // AI Analysis
    aiAnalysis: {
        // For Images/Videos
        objects: [{
            name: String,
            confidence: Number,
            boundingBox: [Number] // [x, y, width, height]
        }],
        faces: [{
            count: Number,
            emotions: Map,
            landmarks: [Number]
        }],
        scene: String,
        colors: [{
            hex: String,
            percentage: Number
        }],
        nsfwScore: Number, // 0-1
        textInImage: String, // OCR extracted text
        
        // For Documents
        extractedText: String,
        summary: String,
        keywords: [String],
        topics: [String],
        sentiment: {
            label: String,
            score: Number
        },
        
        // For Videos/Audio
        transcription: String,
        chapters: [{
            title: String,
            startTime: Number,
            endTime: Number
        }],
        audioFeatures: {
            tempo: Number,
            mood: String,
            language: String
        },
        
        // Quality Assessment
        qualityScore: Number, // 0-100
        blurScore: Number, // 0-1 (higher = more blurry)
        compressionArtifacts: Number,
        
        // Processing Metadata
        processedBy: String, // AI service used
        processingTime: Number, // ms
        confidence: Number,
        modelVersion: String
    },
    
    // Storage & CDN
    storage: {
        provider: { 
            type: String, 
            enum: ['cloudinary', 's3', 'azure', 'gcp', 'local'],
            default: 'cloudinary'
        },
        bucket: String,
        region: String,
        path: String,
        urls: {
            raw: String,
            optimized: String,
            thumbnail: String,
            preview: String,
            streaming: String // for videos
        },
        versions: [{
            version: Number,
            url: String,
            size: Number,
            createdAt: Date
        }],
        backupLocations: [String],
        isArchived: { type: Boolean, default: false },
        archiveLocation: String,
        retentionPolicy: String // 'forever', '30days', '1year'
    },
    
    // Content Moderation
    moderation: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'flagged', 'rejected', 'quarantined'],
            default: 'pending'
        },
        flags: [{
            type: String,
            enum: ['copyright', 'nsfw', 'violence', 'hate_speech', 'spam', 'quality'],
            confidence: Number,
            flaggedBy: mongoose.Schema.Types.ObjectId,
            flaggedAt: Date,
            reason: String
        }],
        reviewedBy: mongoose.Schema.Types.ObjectId,
        reviewedAt: Date,
        autoModerationScore: Number, // 0-100
        requiresManualReview: { type: Boolean, default: false },
        takedownRequests: [{
            requestedBy: String,
            reason: String,
            requestedAt: Date,
            status: String
        }],
        copyrightInfo: {
            owner: String,
            license: String,
            attribution: String,
            allowedUses: [String]
        }
    },
    
    // Metadata
    metadata: {
        uploadSource: { 
            type: String, 
            enum: ['web', 'mobile', 'api', 'import'],
            default: 'web'
        },
        uploadIp: String,
        userAgent: String,
        checksum: String, // MD5/SHA256
        exifData: Map, // For images
        codecInfo: Map, // For videos
        fileStructure: Map, // For documents
        relatedFiles: [{
            mediaId: String,
            relation: String // 'thumbnail', 'caption', 'subtitle'
        }]
    },
    
    // Engagement
    engagement: {
        likes: [{ 
            userId: mongoose.Schema.Types.ObjectId,
            likedAt: Date 
        }],
        comments: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Comment' 
        }],
        collections: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Collection' 
        }],
        playlists: [{
            playlistId: mongoose.Schema.Types.ObjectId,
            addedAt: Date
        }]
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
TimestampsPlugin(mediaSchema);

// Virtual Fields
mediaSchema.virtual('downloadUrl').get(function() {
    return this.permissions.downloadable ? this.file.url : null;
});

mediaSchema.virtual('thumbnailUrl').get(function () {
    if (this.file?.thumbnail) return this.file.thumbnail;
  
    const thumb = this.processing?.transformations?.find(
      t => t && t.type === 'thumbnail'
    );
  
    if (thumb?.url) return thumb.url;
  
    return this.file?.url || null;
  });
  

mediaSchema.virtual('isProcessed').get(function() {
    return this.processing.status === 'ready';
});

mediaSchema.virtual('isSafe').get(function() {
    return this.moderation.status === 'approved' && 
           (!this.aiAnalysis.nsfwScore || this.aiAnalysis.nsfwScore < 0.3);
});

mediaSchema.virtual('sizeInMB').get(function() {
    return (this.file?.size / (1024 * 1024)).toFixed(2);
});

mediaSchema.virtual('durationFormatted').get(function() {
    if (!this.contentInfo.duration) return null;
    const minutes = Math.floor(this.contentInfo.duration / 60);
    const seconds = Math.floor(this.contentInfo.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Indexes
mediaSchema.index({ mediaId: 1 }, { unique: true });
mediaSchema.index({ 'file.type': 1, 'processing.status': 1 });
mediaSchema.index({ 'contentInfo.tags': 1 });
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ collegeId: 1, category: 1 });
mediaSchema.index({ 'aiAnalysis.keywords': 1 });
mediaSchema.index({ 'moderation.status': 1, 'moderation.autoModerationScore': 1 });
mediaSchema.index({ 'usage.views': -1 });
mediaSchema.index({ 'ai.embeddings.image': 'cosmosSearch' }); // For vector search

// Middleware
mediaSchema.pre('save', async function() {
    // Generate mediaId if not present
    if (!this.mediaId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        this.mediaId = `media_${timestamp}_${random}`;
    }
    
    // Set default quality based on size
    if (this.file.size > 50 * 1024 * 1024) { // > 50MB
        this.contentInfo.quality = 'low';
    } else if (this.file.size > 10 * 1024 * 1024) { // > 10MB
        this.contentInfo.quality = 'medium';
    }
    
    // Auto-detect type if not specified
    if (!this.type && this.file.type) {
        const ext = this.originalName.split('.').pop().toLowerCase();
        const typeMap = {
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'webp': 'image',
            'mp4': 'video', 'avi': 'video', 'mov': 'video', 'mkv': 'video', 'webm': 'video',
            'pdf': 'pdf', 'doc': 'doc', 'docx': 'doc', 'ppt': 'ppt', 'pptx': 'ppt',
            'txt': 'doc', 'md': 'doc', 'mp3': 'audio', 'wav': 'audio'
        };
        this.type = typeMap[ext] || 'other';
    }
    
});

// Methods
mediaSchema.methods.incrementView = function(userId = null, duration = 0) {
    this.usage.views += 1;
    this.usage.lastViewed = new Date();
    
    if (userId) {
        this.usage.viewHistory.push({
            userId,
            viewedAt: new Date(),
            duration,
            device: 'web' // Can be enhanced
        });
        
        // Keep only last 100 view records
        if (this.usage.viewHistory.length > 100) {
            this.usage.viewHistory = this.usage.viewHistory.slice(-100);
        }
    }
};

mediaSchema.methods.incrementDownload = function(userId = null) {
    this.usage.downloads += 1;
    this.usage.lastDownloaded = new Date();
    
    if (userId) {
        this.usage.downloadHistory.push({
            userId,
            downloadedAt: new Date(),
            ip: 'unknown' // Can be enhanced
        });
    }
    
    // Check download limits
    if (this.permissions.maxDownloads && 
        this.usage.downloads >= this.permissions.maxDownloads) {
        this.permissions.downloadable = false;
    }
};

mediaSchema.methods.checkAccess = function(user) {
    // Check expiration
    if (this.permissions.expiresAt && new Date() > this.permissions.expiresAt) {
        return false;
    }
    
    // Check visibility
    switch (this.permissions.visibility) {
        case 'public':
            return true;
        case 'college':
            return user.collegeId.equals(this.collegeId);
        case 'department':
            return user.collegeId.equals(this.collegeId) && 
                   user.departmentId && 
                   user.departmentId.equals(this.departmentId);
        case 'private':
            return user._id.equals(this.uploadedBy) ||
                   this.permissions.allowedUsers.some(id => id.equals(user._id));
        default:
            return false;
    }
};

mediaSchema.methods.getOptimizedUrl = function(quality = 'medium') {
    if (this.storage.urls.optimized) {
        return this.storage.urls.optimized;
    }
    
    // Generate quality-based URL
    const baseUrl = this.file.url;
    if (quality === 'low' && this.processing.transformations?.compressed) {
        return this.processing.transformations.compressed.url;
    }
    
    return baseUrl;
};

// Static Methods
mediaSchema.statics.findByCollege = function(collegeId, options = {}) {
    const {
        type = null,
        category = null,
        limit = 50,
        skip = 0,
        sortBy = 'createdAt',
        sortOrder = -1
    } = options;
    
    const query = { collegeId, isActive: true };
    
    if (type) query.type = type;
    if (category) query.category = category;
    
    return this.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'profile.firstName profile.lastName profile.avatar');
};

mediaSchema.statics.getStorageStats = function(collegeId = null) {
    const matchStage = collegeId ? { collegeId: mongoose.Types.ObjectId(collegeId) } : {};
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    type: '$type',
                    collegeId: '$collegeId'
                },
                count: { $sum: 1 },
                totalSize: { $sum: '$file.size' },
                avgSize: { $avg: '$file.size' }
            }
        },
        {
            $group: {
                _id: '$_id.collegeId',
                byType: {
                    $push: {
                        type: '$_id.type',
                        count: '$count',
                        size: '$totalSize',
                        avgSize: '$avgSize'
                    }
                },
                totalCount: { $sum: '$count' },
                totalSize: { $sum: '$totalSize' }
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
        {
            $unwind: {
                path: '$college',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 0,
                collegeId: '$_id',
                collegeName: '$college.name',
                stats: {
                    totalCount: 1,
                    totalSize: 1,
                    byType: 1
                }
            }
        }
    ]);
};

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;