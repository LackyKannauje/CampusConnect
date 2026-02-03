const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');

// AI Content Processing
/**
 * @swagger
 * /ai/moderate:
 *   post:
 *     summary: Moderate content
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Moderation result
 */
router.post('/moderate',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 30 }), // 30 requests per minute
    aiController.moderateContent
);

/**
 * @swagger
 * /ai/tag:
 *   post:
 *     summary: Generate tags
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generated tags
 */
router.post('/tag',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 50 }),
    aiController.generateTags
);

/**
 * @swagger
 * /ai/summarize:
 *   post:
 *     summary: Summarize content
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Summary generated
 */
router.post('/summarize',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 40 }),
    aiController.summarizeContent
);

/**
 * @swagger
 * /ai/embedding:
 *   post:
 *     summary: Generate embedding
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Embedding generated
 */
router.post('/embedding',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 20 }),
    aiController.generateEmbedding
);

// AI Search
/**
 * @swagger
 * /ai/search/semantic:
 *   post:
 *     summary: Semantic search
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/search/semantic',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 30 }),
    aiController.semanticSearch
);

// test vector
router.post('/test/vector',
    authMiddleware.authenticate,
    aiController.testVectorSearch
);

/**
 * @swagger
 * /ai/search/suggest:
 *   get:
 *     summary: Get search suggestions
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search suggestions
 */
router.get('/search/suggest',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 60 }),
    aiController.getSuggestions
);

// AI Chat/Assistant
/**
 * @swagger
 * /ai/chat:
 *   post:
 *     summary: Chat with AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI response
 */
router.post('/chat',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 20 }),
    aiController.chat
);

/**
 * @swagger
 * /ai/study-assistant:
 *   post:
 *     summary: Study assistant
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *     responses:
 *       200:
 *         description: Study materials
 */
router.post('/study-assistant',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 15 }),
    aiController.studyAssistant
);

/**
 * @swagger
 * /ai/code-help:
 *   post:
 *     summary: Code helper
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code help
 */
router.post('/code-help',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 10 }),
    aiController.codeHelp
);

// AI Recommendations
/**
 * @swagger
 * /ai/recommendations/content:
 *   get:
 *     summary: Content recommendations
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Content recommendations
 */
router.get('/recommendations/content',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 20 }),
    aiController.getContentRecommendations
);

/**
 * @swagger
 * /ai/recommendations/users:
 *   get:
 *     summary: User recommendations
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User recommendations
 */
router.get('/recommendations/users',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 20 }),
    aiController.getUserRecommendations
);

/**
 * @swagger
 * /ai/recommendations/study:
 *   get:
 *     summary: Study recommendations
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Study recommendations
 */
router.get('/recommendations/study',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 15 }),
    aiController.getStudyRecommendations
);

// AI Configuration (Admin only)
/**
 * @swagger
 * /ai/config:
 *   get:
 *     summary: Get AI config
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI configuration
 */
router.get('/config',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getAIConfig
);

/**
 * @swagger
 * /ai/config:
 *   put:
 *     summary: Update AI config
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Config updated
 */
router.put('/config',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.updateAIConfig
);

// AI Usage Analytics
/**
 * @swagger
 * /ai/usage:
 *   get:
 *     summary: Get AI usage stats
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage stats
 */
router.get('/usage',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getAIUsage
);

/**
 * @swagger
 * /ai/usage/cost:
 *   get:
 *     summary: Get AI cost metrics
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cost metrics
 */
router.get('/usage/cost',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getAICost
);

/**
 * @swagger
 * /ai/usage/top-users:
 *   get:
 *     summary: Get top AI users
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top users list
 */
router.get('/usage/top-users',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getTopAIUsers
);

// AI Feedback
/**
 * @swagger
 * /ai/feedback/{requestId}:
 *   post:
 *     summary: Submit feedback
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feedback submitted
 */
router.post('/feedback/:requestId',
    authMiddleware.authenticate,
    aiController.submitFeedback
);

// AI Health Check
/**
 * @swagger
 * /ai/health:
 *   get:
 *     summary: AI service health
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service health
 */
router.get('/health',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin']),
    aiController.getAIHealth
);

// Add these routes after existing ones

// AI Config Management
/**
 * @swagger
 * /ai/config/create:
 *   post:
 *     summary: Create AI config
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - model
 *               - type
 *             properties:
 *               provider:
 *                 type: string
 *               model:
 *                 type: string
 *               type:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               config:
 *                 type: object
 *     responses:
 *       201:
 *         description: Config created
 */
router.post('/config/create',
    authMiddleware.authenticate,
    authMiddleware.authorize(['super_admin']),
    aiController.createAIConfig
);

/**
 * @swagger
 * /ai/config/{scope}/{scopeId}:
 *   get:
 *     summary: Get specific AI config
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema:
 *           type: string
 *           enum: [global, college, department, user]
 *       - in: path
 *         name: scopeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI configuration
 */
router.get('/config/:scope/:scopeId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin', 'college_admin']),
    aiController.getSpecificConfig
);

// AI Interaction Management
/**
 * @swagger
 * /ai/interaction/create:
 *   post:
 *     summary: Create AI interaction
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - type
 *             properties:
 *               prompt:
 *                 type: string
 *               type:
 *                 type: string
 *               context:
 *                 type: object
 *     responses:
 *       201:
 *         description: Interaction created
 */
router.post('/interaction/create',
    authMiddleware.authenticate,
    rateLimitMiddleware.aiLimiter({ windowMs: 60000, max: 100 }),
    aiController.createInteraction
);

/**
 * @swagger
 * /ai/interaction/{requestId}:
 *   get:
 *     summary: Get interaction by ID
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interaction details
 */
router.get('/interaction/:requestId',
    authMiddleware.authenticate,
    aiController.getInteraction
);

/**
 * @swagger
 * /ai/interaction/{requestId}/update:
 *   post:
 *     summary: Update interaction
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Interaction updated
 */
router.post('/interaction/:requestId/update',
    authMiddleware.authenticate,
    aiController.updateInteraction
);

module.exports = router;