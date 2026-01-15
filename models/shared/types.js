const mongoose = require('mongoose');

module.exports = {
    // Reusable field types
    LocationSchema: new mongoose.Schema({
        type: { 
            type: String, 
            enum: ['Point'], 
            default: 'Point' 
        },
        coordinates: { 
            type: [Number], 
            required: true 
        },
        address: String,
        city: String,
        state: String,
        country: String
    }, { _id: false }),

    FileSchema: new mongoose.Schema({
        url: { type: String, required: true },
        type: { type: String, required: true },
        thumbnail: String,
        filename: String,
        size: Number,
        duration: Number, // for videos/audio
        dimensions: {
            width: Number,
            height: Number
        },
        format: String,
        storage: { 
            type: String, 
            enum: ['cloudinary', 's3', 'local'],
            default: 'cloudinary'
        }
    }, { _id: false }),

    ContactSchema: new mongoose.Schema({
        email: String,
        phone: String,
        website: String,
        social: {
            twitter: String,
            linkedin: String,
            github: String,
            instagram: String
        }
    }, { _id: false }),

    StatsSchema: new mongoose.Schema({
        count: { type: Number, default: 0 },
        lastUpdated: Date,
        trend: Number, // percentage change
        history: [{
            date: Date,
            value: Number
        }]
    }, { _id: false })
};