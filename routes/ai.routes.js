const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai/ai.controller');
const validation = require('../utils/validation');
const authMiddleware = require('../middleware/auth.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');

// AI Content Processing
router.post('/moderate', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 30 }), // 30 requests per minute
    aiController.moderateContent
);

router.post('/tag', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 50 }),
    aiController.generateTags
);

router.post('/summarize', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 40 }),
    aiController.summarizeContent
);

router.post('/embedding', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 20 }),
    aiController.generateEmbedding
);

// AI Search
router.post('/search/semantic', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 30 }),
    aiController.semanticSearch
);

router.get('/search/suggest', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 60 }),
    aiController.getSuggestions
);

// AI Chat/Assistant
router.post('/chat', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 20 }),
    aiController.chat
);

router.post('/study-assistant', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 15 }),
    aiController.studyAssistant
);

router.post('/code-help', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 10 }),
    aiController.codeHelp
);

// AI Recommendations
router.get('/recommendations/content', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 20 }),
    aiController.getContentRecommendations
);

router.get('/recommendations/users', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 20 }),
    aiController.getUserRecommendations
);

router.get('/recommendations/study', 
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 15 }),
    aiController.getStudyRecommendations
);

// AI Configuration (Admin only)
router.get('/config', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getAIConfig
);

router.put('/config', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.updateAIConfig
);

// AI Usage Analytics
router.get('/usage', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getAIUsage
);

router.get('/usage/cost', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getAICost
);

router.get('/usage/top-users', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getTopAIUsers
);

// AI Feedback
router.post('/feedback/:requestId', 
    authMiddleware.authenticate,
    aiController.submitFeedback
);

// AI Health Check
router.get('/health', 
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin']),
    aiController.getAIHealth
);

module.exports = router;