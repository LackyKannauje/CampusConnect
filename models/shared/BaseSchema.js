const mongoose = require('mongoose');

const BaseSchema = {
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
    isActive: { 
        type: Boolean, 
        default: true,
        index: true 
    },
    metadata: { 
        type: Map, 
        of: mongoose.Schema.Types.Mixed,
        default: new Map() 
    },
    version: { 
        type: Number, 
        default: 1 
    }
};

const AIEnrichedSchema = {
    ai: {
        tags: [{ 
            type: String, 
            lowercase: true,
            index: true 
        }],
        summary: String,
        sentiment: {
            label: { 
                type: String, 
                enum: ['positive', 'negative', 'neutral', 'mixed'] 
            },
            score: { type: Number, min: -1, max: 1 }
        },
        embeddings: {
            text: [Number], // For semantic search
            image: [Number], // For image search
            updatedAt: Date
        },
        confidence: Number,
        processedAt: Date,
        modelUsed: String // e.g., 'gpt-4', 'gemini-pro', 'custom'
    }
};

const TimestampsPlugin = (schema) => {
    schema.pre('save', async function () {
        this.updatedAt = Date.now();
      });
      
      schema.pre('findOneAndUpdate', async function () {
        this.set({ updatedAt: Date.now() });
      });      
};

module.exports = { BaseSchema, AIEnrichedSchema, TimestampsPlugin };