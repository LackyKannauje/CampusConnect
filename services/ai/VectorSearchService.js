// const Embedding = require("../../models/ai/Embedding.model");

// // services/VectorSearchService.js
// class VectorSearchService {
//     async semanticSearch(queryEmbedding, options = {}) {
//         const {
//             contentType,
//             collegeId,
//             limit = 10,
//             minScore = 0.7
//         } = options;

//         const pipeline = [
//             {
//                 $vectorSearch: {
//                     index: "embedding_vector_index",
//                     path: "vector",
//                     queryVector: queryEmbedding,
//                     numCandidates: 100,
//                     limit: limit * 2
//                 }
//             },
//             {
//                 $match: {
//                     contentType: contentType,
//                     collegeId: collegeId,
//                     // MongoDB doesn't support $meta in $match, filter after
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     contentId: 1,
//                     contentType: 1,
//                     metadata: 1,
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             },
//             {
//                 $match: {
//                     score: { $gte: minScore }
//                 }
//             },
//             { $limit: limit },
//             { $sort: { score: -1 } }
//         ];

//         return await Embedding.aggregate(pipeline);
//     }

//     async createVectorIndexes() {
//         // For hybrid search - keep your existing indexes
//         await Embedding.collection.createIndex({ contentType: 1, contentId: 1 }, { unique: true });
//         await Embedding.collection.createIndex({ collegeId: 1, contentType: 1 });
//         // Add for vector search optimization
//         await Embedding.collection.createIndex({ indexedAt: 1 });
//     }
// }

// module.exports = VectorSearchService;
const mongoose = require("mongoose");
const Embedding = require("../../models/ai/Embedding.model");

class VectorSearchService {
  async semanticSearch(queryEmbedding, options = {}) {
    const {
      contentType,
      collegeId,
      limit = 10,
      minScore = 0.7
    } = options;

    // Safety check
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
      throw new Error("Invalid embedding dimensions for vector search");
    }

    // ✅ Build filter safely
    const filterClauses = [];

    if (contentType) {
      filterClauses.push({
        contentType: contentType
      });
    }

    if (collegeId) {
      filterClauses.push({
        collegeId: new mongoose.Types.ObjectId(collegeId)
      });
    }

    const vectorFilter =
      filterClauses.length > 0
        ? { $and: filterClauses }
        : undefined;

    const pipeline = [
      {
        $vectorSearch: {
          index: "embedding_vector_index",
          path: "vector",
          queryVector: queryEmbedding,
          numCandidates: Math.max(limit * 10, 50),
          limit,
          ...(vectorFilter && { filter: vectorFilter })
        }
      },
      {
        $project: {
          _id: 0,
          contentId: 1,
          contentType: 1,
          metadata: 1,
          score: { $meta: "vectorSearchScore" }
        }
      },
      {
        $match: {
          score: { $gte: minScore }
        }
      },
      {
        $sort: { score: -1 }
      }
    ];

    return Embedding.aggregate(pipeline);
  }
}

module.exports = VectorSearchService;
