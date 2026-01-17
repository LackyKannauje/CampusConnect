const ContentModerator = require('../../services/ai/ContentModerator');
const AIConfig = require('../../models/ai/AIConfig.model');
const AIInteraction = require('../../models/ai/AIInteraction.model');
const Embedding = require('../../models/ai/Embedding.model');
const Content = require('../../models/content/Content.model');
const errorMiddleware  = require('../../middleware/error.middleware');
const User = require('../../models/user/User.model');
const College = require('../../models/college/College.model');
const Department = require('../../models/college/Department.model');

const contentModerator = new ContentModerator();

const aiController = {
    // Moderate content
    moderateContent: errorMiddleware.catchAsync(async (req, res) => {
        const { content } = req.body;
        const user = req.user;

        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Content is required' });
        }

        const moderation = await contentModerator.moderateContent(content, {
            contentType: 'text',
            collegeId: user.academic.collegeId,
            userId: user._id,
            fallback: true
        });

        res.json({
            safe: moderation.safe,
            flagged: moderation.flagged,
            categories: moderation.categories,
            confidence: moderation.confidence,
            provider: moderation.provider,
            cached: moderation.cached || false
        });
    }),

    // Generate tags
    generateTags: errorMiddleware.catchAsync(async (req, res) => {
        const { content, maxTags = 5 } = req.body;
        const user = req.user;

        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Content is required' });
        }

        const tagResult = await contentModerator.generateTags(content, {
            collegeId: user.academic.collegeId,
            maxTags
        });

        res.json({
            tags: tagResult.tags,
            confidence: tagResult.confidence,
            provider: tagResult.provider,
            cached: tagResult.cached || false
        });
    }),

    // Summarize content
    summarizeContent: errorMiddleware.catchAsync(async (req, res) => {
        const { content, maxLength = 150 } = req.body;
        const user = req.user;

        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Content is required' });
        }

        const summaryResult = await contentModerator.generateSummary(content, {
            collegeId: user.academic.collegeId,
            maxLength
        });

        res.json({
            summary: summaryResult.summary,
            originalLength: summaryResult.originalLength,
            summaryLength: summaryResult.summaryLength,
            compressionRatio: summaryResult.compressionRatio,
            provider: summaryResult.provider,
            cached: summaryResult.cached || false,
            fallback: summaryResult.fallback || false
        });
    }),

    // Generate embedding
    generateEmbedding: errorMiddleware.catchAsync(async (req, res) => {
        const { content, contentType = 'text', contentId } = req.body;
        const user = req.user;

        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Content is required' });
        }

        const embedding = await contentModerator.generateEmbedding(content, {
            collegeId: user.academic.collegeId,
            contentType,
            contentId
        });

        res.json({
            embedding: embedding ? embedding.slice(0, 10) : null, // Return first 10 dimensions for preview
            dimensions: embedding ? embedding.length : 0,
            generated: !!embedding
        });
    }),

    // Semantic search
    semanticSearch: errorMiddleware.catchAsync(async (req, res) => {
        const { query, contentType = 'content', limit = 10 } = req.body;
        const user = req.user;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Generate embedding for query
        const queryEmbedding = await contentModerator.generateEmbedding(query, {
            collegeId: user.academic.collegeId,
            contentType: 'text'
        });

        if (!queryEmbedding) {
            return res.status(500).json({ error: 'Failed to process query' });
        }

        // Find similar embeddings
        const similar = await Embedding.findSimilar(queryEmbedding, {
            contentType,
            collegeId: user.academic.collegeId,
            limit: parseInt(limit),
            minSimilarity: 0.7
        });

        // Get content details for results
        const results = await Promise.all(
            similar.map(async (item) => {
                let content = null;
                switch (item.contentType) {
                    case 'content':
                        content = await Content.findById(item.contentId)
                            .select('title excerpt type category')
                            .populate('authorId', 'profile.firstName profile.lastName');
                        break;
                    // Add other content types as needed
                }

                return {
                    id: item.contentId,
                    contentType: item.contentType,
                    similarity: item.similarity,
                    content: content ? {
                        title: content.title,
                        excerpt: content.excerpt,
                        type: content.type,
                        category: content.category,
                        author: content.authorId ? {
                            name: content.authorId.profile.fullName
                        } : null
                    } : null
                };
            })
        );

        res.json({
            query,
            results: results.filter(r => r.content),
            total: results.length
        });
    }),

    // Get suggestions
    getSuggestions: errorMiddleware.catchAsync(async (req, res) => {
        const { query } = req.query;
        const user = req.user;

        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters' });
        }

        // Get content suggestions
        const contentSuggestions = await Content.find({
            collegeId: user.academic.collegeId,
            title: new RegExp(query, 'i'),
            'moderation.status': 'approved'
        })
        .select('title type category')
        .limit(5);

        // Get tag suggestions
        const tagSuggestions = await Content.aggregate([
            {
                $match: {
                    collegeId: user.academic.collegeId,
                    tags: new RegExp(query, 'i')
                }
            },
            { $unwind: '$tags' },
            {
                $match: {
                    tags: new RegExp(query, 'i')
                }
            },
            {
                $group: {
                    _id: '$tags',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            query,
            suggestions: {
                content: contentSuggestions,
                tags: tagSuggestions.map(t => ({
                    tag: t._id,
                    count: t.count
                }))
            }
        });
    }),

    // AI Chat
    chat: errorMiddleware.catchAsync(async (req, res) => {
        const { message, context } = req.body;
        const user = req.user;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // For now, return a simple response
        // In production, integrate with OpenAI/Gemini chat API
        const response = {
            message: `I received your message: "${message.substring(0, 50)}..."`,
            context: context || {},
            timestamp: new Date(),
            type: 'text'
        };

        res.json(response);
    }),

    // Study assistant
    studyAssistant: errorMiddleware.catchAsync(async (req, res) => {
        const { question, subject, context } = req.body;
        const user = req.user;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({ error: 'Question is required' });
        }

        // For now, return a simple response
        // In production, integrate with educational AI
        const response = {
            answer: `This is a study assistant response for: "${question.substring(0, 50)}..."`,
            subject: subject || 'general',
            sources: [],
            confidence: 0.8,
            timestamp: new Date()
        };

        res.json(response);
    }),

    // Code help
    codeHelp: errorMiddleware.catchAsync(async (req, res) => {
        const { code, language, question } = req.body;
        const user = req.user;

        if (!code && !question) {
            return res.status(400).json({ error: 'Code or question is required' });
        }

        // For now, return a simple response
        // In production, integrate with code-specific AI
        const response = {
            suggestion: `Here's a suggestion for your ${language || 'code'} question.`,
            language: language || 'unknown',
            improvedCode: code ? `${code}\n// Improved version` : null,
            explanation: 'Explanation would go here in production.',
            timestamp: new Date()
        };

        res.json(response);
    }),

    // Get content recommendations
    getContentRecommendations: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { limit = 10 } = req.query;

        // Get user's interests from AI profile
        const userInterests = user.aiProfile?.detectedInterests?.map(i => i.topic) || [];

        let recommendedContent = [];

        if (userInterests.length > 0) {
            // Find content with matching tags
            recommendedContent = await Content.find({
                collegeId: user.academic.collegeId,
                tags: { $in: userInterests },
                'moderation.status': 'approved',
                authorId: { $ne: user._id } // Don't recommend user's own content
            })
            .select('title excerpt type category tags featuredMedia engagement.likes engagement.comments')
            .populate('authorId', 'profile.firstName profile.lastName profile.avatar')
            .sort({ 'engagement.hotScore': -1 })
            .limit(parseInt(limit));
        } else {
            // Fallback: popular content
            recommendedContent = await Content.find({
                collegeId: user.academic.collegeId,
                'moderation.status': 'approved'
            })
            .select('title excerpt type category tags featuredMedia engagement.likes engagement.comments')
            .populate('authorId', 'profile.firstName profile.lastName profile.avatar')
            .sort({ 'engagement.hotScore': -1 })
            .limit(parseInt(limit));
        }

        res.json({
            recommendations: recommendedContent.map(content => ({
                id: content._id,
                title: content.title,
                excerpt: content.excerpt,
                type: content.type,
                category: content.category,
                tags: content.tags,
                author: {
                    id: content.authorId._id,
                    name: content.authorId.profile.fullName,
                    avatar: content.authorId.profile.avatar?.url
                },
                engagement: {
                    likes: content.engagement.likes.length,
                    comments: content.engagement.comments.length
                },
                reason: userInterests.length > 0 ? 'Based on your interests' : 'Popular in your college'
            }))
        });
    }),

    // Get user recommendations
    getUserRecommendations: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { limit = 10 } = req.query;

        // Find users with similar interests/department
        const similarUsers = await User.find({
            'academic.collegeId': user.academic.collegeId,
            _id: { $ne: user._id, $nin: user.social.following },
            isActive: true,
            $or: [
                { 'academic.departmentId': user.academic.departmentId },
                { 'profile.skills': { $in: user.profile.skills || [] } },
                { 'profile.interests': { $in: user.profile.interests || [] } }
            ]
        })
        .select('profile.firstName profile.lastName profile.avatar profile.bio academic.role academic.departmentName')
        .limit(parseInt(limit));

        res.json({
            recommendations: similarUsers.map(u => ({
                id: u._id,
                name: u.profile.fullName,
                avatar: u.profile.avatar?.url,
                bio: u.profile.bio,
                role: u.academic.role,
                department: u.academic.departmentName,
                reason: u.academic.departmentId?.equals(user.academic.departmentId) ? 
                       'Same department' : 'Similar interests'
            }))
        });
    }),

    // Get study recommendations
    getStudyRecommendations: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { subject, limit = 10 } = req.query;

        let query = {
            collegeId: user.academic.collegeId,
            type: 'study_material',
            'moderation.status': 'approved'
        };

        if (subject) {
            query['studyMaterial.subject'] = new RegExp(subject, 'i');
        } else if (user.academic.departmentName) {
            query['studyMaterial.subject'] = new RegExp(user.academic.departmentName, 'i');
        }

        const studyMaterials = await Content.find(query)
            .select('title excerpt studyMaterial engagement.downloads engagement.views')
            .populate('authorId', 'profile.firstName profile.lastName profile.avatar')
            .sort({ 'engagement.downloads': -1 })
            .limit(parseInt(limit));

        res.json({
            recommendations: studyMaterials.map(material => ({
                id: material._id,
                title: material.title,
                excerpt: material.excerpt,
                subject: material.studyMaterial?.subject,
                downloads: material.engagement.downloads,
                views: material.engagement.views,
                author: material.authorId ? {
                    name: material.authorId.profile.fullName,
                    avatar: material.authorId.profile.avatar?.url
                } : null
            }))
        });
    }),

    // Get AI config
    getAIConfig: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const collegeId = user.academic.collegeId;

        const config = await AIConfig.getConfigForScope('college', collegeId);
        if (!config) {
            return res.status(404).json({ error: 'AI configuration not found' });
        }

        // Remove sensitive API keys
        const safeConfig = {
            models: config.models,
            features: config.features,
            rateLimits: config.rateLimits,
            cache: config.cache,
            budget: {
                monthlyLimit: config.budget.monthlyLimit,
                currentMonthSpent: config.budget.currentMonthSpent,
                budgetRemaining: config.budgetRemaining,
                budgetPercentage: config.budgetPercentage
            }
        };

        res.json(safeConfig);
    }),

    // Update AI config
    updateAIConfig: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const collegeId = user.academic.collegeId;
        const updates = req.body;

        let config = await AIConfig.getConfigForScope('college', collegeId);
        if (!config) {
            config = new AIConfig({
                scope: 'college',
                scopeId: collegeId
            });
        }

        // Update allowed fields
        if (updates.models) config.models = { ...config.models, ...updates.models };
        if (updates.features) config.features = { ...config.features, ...updates.features };
        if (updates.rateLimits) config.rateLimits = { ...config.rateLimits, ...updates.rateLimits };
        if (updates.cache) config.cache = { ...config.cache, ...updates.cache };
        if (updates.budget?.monthlyLimit) config.budget.monthlyLimit = updates.budget.monthlyLimit;

        await config.save();

        res.json({
            message: 'AI configuration updated successfully',
            config: {
                models: config.models,
                features: config.features,
                budget: {
                    monthlyLimit: config.budget.monthlyLimit,
                    currentMonthSpent: config.budget.currentMonthSpent
                }
            }
        });
    }),

    // Get AI usage
    getAIUsage: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { period = 'monthly', startDate, endDate } = req.query;

        const usage = await AIInteraction.getUsageStats(
            user.academic.collegeId,
            startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate ? new Date(endDate) : new Date()
        );

        res.json({ period, usage });
    }),

    // Get AI cost
    getAICost: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;
        const { period = 'monthly' } = req.query;

        const costAnalysis = await AIInteraction.getCostAnalysis(
            user.academic.collegeId,
            period
        );

        res.json({ period, costAnalysis });
    }),

    // Get top AI users
    getTopAIUsers: errorMiddleware.catchAsync(async (req, res) => {
        const user = req.user;

        const topUsers = await AIInteraction.getTopUsers(user.academic.collegeId, 10);

        res.json({ topUsers });
    }),

    // Submit feedback
    submitFeedback: errorMiddleware.catchAsync(async (req, res) => {
        const { requestId } = req.params;
        const { rating, helpful, corrections } = req.body;
        const user = req.user;

        const interaction = await AIInteraction.findOne({
            requestId,
            userId: user._id
        });

        if (!interaction) {
            return res.status(404).json({ error: 'AI interaction not found' });
        }

        interaction.feedback = {
            rating,
            helpful,
            corrections
        };

        await interaction.save();

        res.json({ message: 'Feedback submitted successfully' });
    }),

    // Get AI health
    getAIHealth: errorMiddleware.catchAsync(async (req, res) => {
        // Check AI service availability
        const health = {
            status: 'operational',
            timestamp: new Date(),
            services: {
                openai: 'operational', // Would actually ping OpenAI API
                gemini: 'operational', // Would actually ping Gemini API
                moderation: 'operational',
                embeddings: 'operational'
            },
            cache: {
                hits: 0, // Would get from cache stats
                misses: 0,
                hitRate: '0%'
            },
            lastChecked: new Date()
        };

        res.json(health);
    }),

    // Create AI config (super admin only)
        createAIConfig: errorMiddleware.catchAsync(async (req, res) => {
        const { scope, scopeId, config } = req.body;
        const user = req.user;

        // Validate scope
        const validScopes = ['global', 'college', 'department', 'user'];
        if (!validScopes.includes(scope)) {
            return res.status(400).json({ 
                error: 'Invalid scope. Must be: global, college, department, or user' 
            });
        }

        // Check if config already exists
        const existingConfig = await AIConfig.findOne({ scope, scopeId });
        if (existingConfig) {
            return res.status(400).json({ error: 'AI config already exists for this scope' });
        }

        // Validate scopeId based on scope
        if (scope === 'college' && scopeId) {
            const college = await College.findById(scopeId);
            if (!college) {
                return res.status(404).json({ error: 'College not found' });
            }
        }

        if (scope === 'department' && scopeId) {
            const department = await Department.findById(scopeId);
            if (!department) {
                return res.status(404).json({ error: 'Department not found' });
            }
        }

        if (scope === 'user' && scopeId) {
            const user = await User.findById(scopeId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
        }

        // Create new config
        const aiConfig = new AIConfig({
            scope,
            scopeId: scope === 'global' ? undefined : scopeId,
            ...config
        });

        await aiConfig.save();

        // Remove sensitive data from response
        const responseConfig = aiConfig.toObject();
        Object.keys(responseConfig.providers).forEach(provider => {
            delete responseConfig.providers[provider].apiKey;
        });

        res.status(201).json({
            message: 'AI configuration created successfully',
            config: responseConfig
        });
    }),

    // Get specific config by scope
    getSpecificConfig: errorMiddleware.catchAsync(async (req, res) => {
        const { scope, scopeId } = req.params;
        const user = req.user;

        // Validate access permissions
        if (scope === 'college' && scopeId) {
            // User must belong to the college
            if (!user.academic.collegeId.equals(scopeId) && user.academic.role !== 'super_admin') {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        if (scope === 'department' && scopeId) {
            const department = await Department.findById(scopeId);
            if (!department) {
                return res.status(404).json({ error: 'Department not found' });
            }
            
            // User must belong to the department's college
            if (!user.academic.collegeId.equals(department.collegeId) && 
                user.academic.role !== 'super_admin') {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        if (scope === 'user' && scopeId) {
            // Users can only view their own config or super admin
            if (!user._id.equals(scopeId) && user.academic.role !== 'super_admin') {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const config = await AIConfig.findOne({ scope, scopeId: scope === 'global' ? undefined : scopeId });

        if (!config) {
            return res.status(404).json({ error: 'AI configuration not found' });
        }

        // Remove sensitive data from response
        const safeConfig = config.toObject();
        Object.keys(safeConfig.providers).forEach(provider => {
            delete safeConfig.providers[provider].apiKey;
        });

        res.json(safeConfig);
    }),

    // Create AI interaction (for manual tracking)
    createInteraction: errorMiddleware.catchAsync(async (req, res) => {
        const { 
            service, 
            model, 
            endpoint, 
            input, 
            context,
            metadata = {} 
        } = req.body;
        const user = req.user;

        // Validate required fields
        if (!service || !model || !endpoint || !input) {
            return res.status(400).json({ 
                error: 'service, model, endpoint, and input are required' 
            });
        }

        const validServices = ['openai', 'gemini', 'huggingface', 'azure', 'custom'];
        if (!validServices.includes(service)) {
            return res.status(400).json({ 
                error: `Invalid service. Must be one of: ${validServices.join(', ')}` 
            });
        }

        const validEndpoints = [
            'moderation', 'tagging', 'summarization', 'sentiment',
            'translation', 'transcription', 'ocr', 'embeddings',
            'chat', 'image_generation', 'code_generation', 'qna',
            'custom'
        ];
        
        if (!validEndpoints.includes(endpoint)) {
            return res.status(400).json({ 
                error: `Invalid endpoint. Must be one of: ${validEndpoints.join(', ')}` 
            });
        }

        // Check rate limits
        const recentCalls = await AIInteraction.countDocuments({
            userId: user._id,
            collegeId: user.academic.collegeId,
            createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // Last minute
        });

        if (recentCalls >= 100) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please wait.' });
        }

        // Create interaction
        const interaction = new AIInteraction({
            requestId: `${endpoint}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: user._id,
            collegeId: user.academic.collegeId,
            service,
            model,
            endpoint,
            input,
            inputMetadata: {
                contentType: typeof input === 'string' ? 'text' : 'json',
                size: JSON.stringify(input).length,
                tokenCount: estimateTokens(JSON.stringify(input))
            },
            context: {
                source: 'manual_api',
                ...context
            },
            status: 'pending',
            metadata
        });

        await interaction.save();

        res.status(201).json({
            message: 'AI interaction created successfully',
            interaction: {
                requestId: interaction.requestId,
                status: interaction.status,
                createdAt: interaction.createdAt
            }
        });
    }),

    // Get interaction by request ID
    getInteraction: errorMiddleware.catchAsync(async (req, res) => {
        const { requestId } = req.params;
        const user = req.user;

        const interaction = await AIInteraction.findOne({
            requestId,
            userId: user._id // Users can only view their own interactions
        });

        if (!interaction) {
            return res.status(404).json({ error: 'Interaction not found' });
        }

        res.json({
            interaction: {
                requestId: interaction.requestId,
                service: interaction.service,
                model: interaction.model,
                endpoint: interaction.endpoint,
                input: interaction.input,
                output: interaction.output,
                status: interaction.status,
                metrics: interaction.metrics,
                quality: interaction.quality,
                feedback: interaction.feedback,
                createdAt: interaction.createdAt,
                updatedAt: interaction.updatedAt
            }
        });
    }),

    // Update interaction (for async processing)
    updateInteraction: errorMiddleware.catchAsync(async (req, res) => {
        const { requestId } = req.params;
        const { output, status, metrics, error } = req.body;
        const user = req.user;

        const interaction = await AIInteraction.findOne({
            requestId,
            userId: user._id
        });

        if (!interaction) {
            return res.status(404).json({ error: 'Interaction not found' });
        }

        // Check if interaction can be updated
        if (interaction.status === 'completed' || interaction.status === 'failed') {
            return res.status(400).json({ error: 'Cannot update completed or failed interaction' });
        }

        // Update fields
        if (output !== undefined) interaction.output = output;
        if (status) interaction.status = status;
        if (metrics) interaction.metrics = { ...interaction.metrics, ...metrics };
        if (error) interaction.error = error;

        // Auto-calculate cost if not provided
        if (!interaction.metrics.cost && interaction.metrics.tokens) {
            interaction.calculateCost();
        }

        // Update quality score if output is provided
        if (output && !interaction.quality.confidence) {
            interaction.quality.confidence = 0.8; // Default confidence
        }

        interaction.updatedAt = new Date();
        await interaction.save();

        res.json({
            message: 'Interaction updated successfully',
            interaction: {
                requestId: interaction.requestId,
                status: interaction.status,
                updatedAt: interaction.updatedAt
            }
        });
    })
};

module.exports = aiController;