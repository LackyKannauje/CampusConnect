const mongoose = require('mongoose');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const reactionSchema = new mongoose.Schema({
    // Target
    targetType: {
        type: String,
        enum: ['content', 'comment', 'media'],
        required: true,
        index: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    
    // User
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
    
    // Reaction
    reaction: {
        type: String,
        enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'upvote', 'downvote', 'bookmark', 'save'],
        required: true
    },
    intensity: {
        type: Number,
        min: 1,
        max: 10,
        default: 1
    }, // For future: reaction strength
    
    // Metadata
    metadata: {
        device: String,
        ip: String,
        location: String,
        isAnonymous: { type: Boolean, default: false }
    },
    
    // Base Schema
    ...BaseSchema
}, {
    timestamps: true
});

// Apply Timestamps Plugin
TimestampsPlugin(reactionSchema);

// Compound Indexes
reactionSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });
reactionSchema.index({ userId: 1, createdAt: -1 });
reactionSchema.index({ collegeId: 1, reaction: 1, createdAt: -1 });
reactionSchema.index({ targetType: 1, targetId: 1, reaction: 1 });

// Methods
reactionSchema.methods.toPublicJSON = function() {
    return {
        id: this._id,
        reaction: this.reaction,
        intensity: this.intensity,
        createdAt: this.createdAt,
        user: {
            id: this.userId,
            // Will be populated
        }
    };
};

// Static Methods
reactionSchema.statics.getReactionSummary = function(targetType, targetId) {
    return this.aggregate([
        {
            $match: {
                targetType,
                targetId: mongoose.Types.ObjectId(targetId)
            }
        },
        {
            $group: {
                _id: '$reaction',
                count: { $sum: 1 },
                users: { $push: '$userId' }
            }
        },
        {
            $project: {
                _id: 0,
                reaction: '$_id',
                count: 1,
                userCount: { $size: '$users' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

reactionSchema.statics.getUserReactions = function(userId, targetType = null, limit = 50) {
    const match = { userId: mongoose.Types.ObjectId(userId) };
    if (targetType) match.targetType = targetType;
    
    return this.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: targetType === 'content' ? 'contents' : 
                      targetType === 'comment' ? 'comments' : 'media',
                localField: 'targetId',
                foreignField: '_id',
                as: 'target'
            }
        },
        { $unwind: '$target' },
        {
            $project: {
                _id: 1,
                reaction: 1,
                targetType: 1,
                targetId: 1,
                createdAt: 1,
                target: {
                    _id: '$target._id',
                    title: '$target.title',
                    type: '$target.type',
                    // Other relevant fields
                }
            }
        }
    ]);
};

const Reaction = mongoose.model('Reaction', reactionSchema);

module.exports = Reaction;