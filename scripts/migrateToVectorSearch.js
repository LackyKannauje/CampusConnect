// scripts/migrateToVectorSearch.js
require('dotenv').config();
const mongoose = require('mongoose');
const Embedding = require('../models/ai/Embedding.model');

async function migrate() {
    try {
        console.log('🚀 Starting MongoDB Vector Search Migration...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('✅ Connected to MongoDB');
        
        // 1. Mark all existing embeddings as indexed for MongoDB Atlas
        const result = await Embedding.updateMany(
            { indexedAt: { $exists: false } },
            { 
                indexedAt: new Date(),
                indexId: 'mongodb_vector',
                $setOnInsert: { clusterId: 1 }
            },
            { upsert: false }
        );
        
        console.log(`✅ Marked ${result.modifiedCount} embeddings as indexed`);
        
        // 2. Validate embedding vectors
        const invalidVectors = await Embedding.find({
            $or: [
                { vector: { $exists: false } },
                { vector: { $type: 'array', $size: 0 } },
                { dimensions: { $exists: false } }
            ]
        });
        
        if (invalidVectors.length > 0) {
            console.warn(`⚠️  Found ${invalidVectors.length} invalid embeddings`);
            console.log('Sample invalid IDs:', invalidVectors.slice(0, 3).map(d => d._id));
        }
        
        // 3. Add missing dimensions if needed
        const vectorsWithoutDimensions = await Embedding.find({
            dimensions: { $exists: false },
            vector: { $exists: true, $type: 'array' }
        });
        
        for (const doc of vectorsWithoutDimensions) {
            if (Array.isArray(doc.vector)) {
                await Embedding.updateOne(
                    { _id: doc._id },
                    { $set: { dimensions: doc.vector.length } }
                );
            }
        }
        
        console.log(`✅ Updated ${vectorsWithoutDimensions.length} documents with dimensions`);
        
        // 4. Create regular indexes for performance
        console.log('🔄 Creating regular indexes...');
        await Embedding.collection.createIndex({ contentType: 1, contentId: 1 }, { unique: true });
        await Embedding.collection.createIndex({ collegeId: 1, contentType: 1 });
        await Embedding.collection.createIndex({ indexedAt: 1 });
        await Embedding.collection.createIndex({ model: 1 });
        
        console.log('✅ Regular indexes created');
        
        // 5. Display migration summary
        const stats = await Embedding.aggregate([
            {
                $group: {
                    _id: {
                        contentType: '$contentType',
                        model: '$model'
                    },
                    count: { $sum: 1 },
                    avgDimensions: { $avg: '$dimensions' },
                    indexedCount: { 
                        $sum: { $cond: [{ $ifNull: ['$indexedAt', false] }, 1, 0] }
                    }
                }
            }
        ]);
        
        console.log('\n📊 Migration Summary:');
        console.log('===================');
        stats.forEach(stat => {
            console.log(`${stat._id.contentType} (${stat._id.model}):`);
            console.log(`  Total: ${stat.count}`);
            console.log(`  Avg Dimensions: ${Math.round(stat.avgDimensions || 0)}`);
            console.log(`  Indexed: ${stat.indexedCount}/${stat.count}`);
        });
        
        // 6. Instructions for Atlas Vector Search index
        console.log('\n🔧 NEXT STEPS:');
        console.log('=============');
        console.log('1. Go to MongoDB Atlas → Atlas Search → Create Search Index');
        console.log('2. Choose JSON Editor and paste this configuration:');
        
        const vectorIndexConfig = {
            "fields": [
                {
                    "type": "vector",
                    "path": "vector",
                    "numDimensions": 1536, // Change if using different model
                    "similarity": "cosine",
                    "indexOptions": {
                        "type": "hnsw",
                        "space": "cosine",
                        "efConstruction": 128,
                        "M": 16
                    }
                },
                {
                    "type": "filter",
                    "path": "contentType"
                },
                {
                    "type": "filter", 
                    "path": "collegeId"
                }
            ]
        };
        
        console.log(JSON.stringify(vectorIndexConfig, null, 2));
        console.log('\n3. Name the index: "embedding_vectors"');
        console.log('4. Wait for index to build (can take minutes to hours)');
        console.log('5. Test with: db.embeddings.aggregate([{ $vectorSearch: { ... } }])');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Migration script completed');
        process.exit(0);
    }
}

// Check if script is being run directly
if (require.main === module) {
    migrate();
} else {
    // Export for programmatic use
    module.exports = { migrate };
}