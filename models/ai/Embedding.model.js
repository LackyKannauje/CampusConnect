const mongoose = require('mongoose');
const { BaseSchema, TimestampsPlugin } = require('../shared/BaseSchema');

const embeddingSchema = new mongoose.Schema({
    // Content Reference
    contentType: {
        type: String,
        enum: ['content', 'comment', 'media', 'user', 'college', 'department'],
        required: true,
        index: true
    },
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    
    // Context
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        index: true
    },
    
    // Embedding Data
    model: {
        type: String,
        required: true,
        index: true
    },
    dimensions: {
        type: Number,
        required: true
    },
    vector: {
        type: [Number],
        required: true,
        validate: {
            validator: function(v) {
                return v.length === this.dimensions;
            },
            message: 'Vector length must match dimensions'
        }
    },
    
    // Metadata
    metadata: {
        text: String,
        language: String,
        tokenCount: Number,
        generatedAt: Date,
        confidence: Number,
        version: String
    },
    
    // Indexing Info
    indexedAt: Date,
    indexId: String,
    clusterId: Number,
    
    // Base Schema
    ...BaseSchema
}, {
    timestamps: true
});

// Apply Timestamps Plugin
TimestampsPlugin(embeddingSchema);

// Indexes
embeddingSchema.index({ contentType: 1, contentId: 1 }, { unique: true });
embeddingSchema.index({ collegeId: 1, contentType: 1 });
embeddingSchema.index({ model: 1, indexedAt: 1 });
embeddingSchema.index({ clusterId: 1 });

// Virtual Fields
embeddingSchema.virtual('isIndexed').get(function() {
    return !!this.indexedAt;
});

// Methods
embeddingSchema.methods.calculateSimilarity = function(otherVector) {
    if (!otherVector || this.vector.length !== otherVector.length) {
        return 0;
    }
    
    // Cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < this.vector.length; i++) {
        dotProduct += this.vector[i] * otherVector[i];
        normA += this.vector[i] * this.vector[i];
        normB += otherVector[i] * otherVector[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    return normA && normB ? dotProduct / (normA * normB) : 0;
};

embeddingSchema.methods.markIndexed = function(indexId, clusterId = null) {
    this.indexedAt = new Date();
    this.indexId = indexId;
    if (clusterId !== null) this.clusterId = clusterId;
    return this.save();
};

// Static Methods
embeddingSchema.statics.findSimilar = function(vector, options = {}) {
    const {
        contentType = null,
        collegeId = null,
        limit = 10,
        minSimilarity = 0.7
    } = options;
    
    const query = {};
    if (contentType) query.contentType = contentType;
    if (collegeId) query.collegeId = collegeId;
    if (options.model) query.model = options.model;
    
    return this.find(query)
        .then(embeddings => {
            return embeddings
                .map(embedding => ({
                    embedding,
                    similarity: embedding.calculateSimilarity(vector)
                }))
                .filter(item => item.similarity >= minSimilarity)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit)
                .map(item => ({
                    contentId: item.embedding.contentId,
                    contentType: item.embedding.contentType,
                    similarity: item.similarity,
                    metadata: item.embedding.metadata
                }));
        });
};

embeddingSchema.statics.bulkUpsert = async function(embeddings) {
    const operations = embeddings.map(embedding => ({
        updateOne: {
            filter: {
                contentType: embedding.contentType,
                contentId: embedding.contentId
            },
            update: { $set: embedding },
            upsert: true
        }
    }));
    
    return this.bulkWrite(operations);
};

embeddingSchema.statics.getEmbeddingStats = function() {
    return this.aggregate([
        { $group: {
            _id: {
                contentType: '$contentType',
                model: '$model'
            },
            count: { $sum: 1 },
            avgDimensions: { $avg: '$dimensions' },
            indexedCount: { 
                $sum: { $cond: [{ $ifNull: ['$indexedAt', false] }, 1, 0] }
            },
            lastUpdated: { $max: '$updatedAt' }
        }},
        { $project: {
            contentType: '$_id.contentType',
            model: '$_id.model',
            count: 1,
            avgDimensions: { $round: ['$avgDimensions', 2] },
            indexedPercentage: {
                $multiply: [
                    { $divide: ['$indexedCount', '$count'] },
                    100
                ]
            },
            lastUpdated: 1,
            _id: 0
        }},
        { $sort: { count: -1 } }
    ]);
};

const Embedding = mongoose.model('Embedding', embeddingSchema);

module.exports = Embedding;