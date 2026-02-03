const AIConfig = require('../../models/ai/AIConfig.model');
const Embedding = require('../../models/ai/Embedding.model');
const Cache = require('../../utils/cache'); // Assume cache utility exists

class ContentModerator {
    constructor() {
        this.cache = new Cache();
        this.providers = {};
    }

    async initializeProvider(provider, config) {
        if (provider === 'openrouter') {
            const OpenRouterService = require('./OpenRouterService');
            this.providers.openrouter = new OpenRouterService(config);
        } else if (provider === 'openai') {
            const OpenAIService = require('./OpenAiService');
            this.providers.openai = new OpenAIService(config);
        } else if (provider === 'gemini') {
            const GeminiService = require('./GeminiService');
            this.providers.gemini = new GeminiService(config);
        }
    }

    async moderateContent(content, options = {}) {
        const {
            contentType = 'text',
            contentId,
            collegeId,
            userId,
            fallback = true
        } = options;

        // Check cache first
        const cacheKey = `moderation:${collegeId}:${contentType}:${contentId || this.hashContent(content)}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return { ...cached, cached: true };
        }

        // Get college AI config
        const config = await AIConfig.getConfigForScope('college', collegeId);
        if (!config || !config.features.autoModeration) {
            return { safe: true, skipped: true };
        }

        const provider = config.models.moderation.provider;
        const model = config.models.moderation.model;
        const threshold = config.models.moderation.threshold;

        try {
            await this.initializeProvider(provider, config.providers[provider]);

            let result;
            if (provider === 'openai' || provider === 'openrouter') {
                result = await this.providers[provider].moderateContent(content, {
                    model,
                    collegeId,
                    userId,
                    fallback
                });
            } else if (provider === 'gemini') {
                result = await this.providers.gemini.moderateContent(content, {
                    model,
                    collegeId
                });
            }

            if (result.success) {
                const moderationResult = {
                    safe: !result.data.flagged,
                    flagged: result.data.flagged,
                    categories: result.data.flaggedCategories,
                    scores: result.data.categoryScores,
                    confidence: result.data.confidence || 0.9,
                    provider,
                    model,
                    requestId: result.requestId,
                    timestamp: new Date()
                };

                // Cache result for 24 hours
                await this.cache.set(cacheKey, moderationResult, 86400);

                // Apply threshold
                if (threshold && result.data.categoryScores) {
                    const maxScore = Math.max(...Object.values(result.data.categoryScores));
                    moderationResult.safe = maxScore < threshold;
                }

                return moderationResult;
            }

        } catch (error) {
            console.error(`Moderation failed for provider ${provider}:`, error.message);

            if (fallback) {
                // Try fallback provider
                const fallbackProvider = config.getFallbackProvider(provider);
                if (fallbackProvider !== provider) {
                    return this.moderateContent(content, {
                        ...options,
                        provider: fallbackProvider,
                        fallback: false // Prevent infinite loop
                    });
                }
            }
        }

        // Ultimate fallback: basic keyword check
        return this.basicContentCheck(content);
    }

    async generateTags(content, options = {}) {
        const { collegeId, contentType = 'text', maxTags = 5 } = options;

        const cacheKey = `tags:${collegeId}:${this.hashContent(content)}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return { ...cached, cached: true };
        }
        console.log(cached);

        const config = await AIConfig.getConfigForScope('college', collegeId);
        console.log(config.features);

        if (!config || !config.features.smartTagging) {
            return { tags: [], skipped: true };
        }

        const provider = config.models.tagging.provider;
        const model = config.models.tagging.model;

        try {
            await this.initializeProvider(provider, config.providers[provider]);
            let result;
            if (provider === 'openai' || provider === 'openrouter') {

                result = await this.providers[provider].generateTags(content, {
                    model,
                    maxTags,
                    collegeId
                });
            } else if (provider === 'gemini') {
                result = await this.providers.gemini.generateTags(content, {
                    model,
                    maxTags,
                    collegeId
                });
            }
            console.log(result)
            if (result.success) {
                const tags = result.data.tags || [];

                // Cache for 12 hours
                await this.cache.set(cacheKey, { tags }, 43200);

                return {
                    tags,
                    confidence: result.data.confidence || 0.8,
                    provider,
                    requestId: result.requestId
                };
            }

        } catch (error) {
            console.error(`Tagging failed:`, error.message);
        }

        return { tags: [], confidence: 0 };
    }

    async generateSummary(content, options = {}) {
        const { collegeId, maxLength = 150 } = options;

        const cacheKey = `summary:${collegeId}:${this.hashContent(content)}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return { ...cached, cached: true };
        }

        const config = await AIConfig.getConfigForScope('college', collegeId);
        if (!config || !config.features.contentSummary) {
            return { summary: '', skipped: true };
        }

        const provider = config.models.summarization.provider;
        const model = config.models.summarization.model;

        try {
            await this.initializeProvider(provider, config.providers[provider]);

            let result;
            if (provider === 'openai' || provider === 'openrouter') {
                result = await this.providers[provider].generateSummary(content, {
                    model,
                    maxLength,
                    collegeId
                });
            } else if (provider === 'gemini') {
                result = await this.providers.gemini.generateSummary(content, {
                    model,
                    maxLength,
                    collegeId
                });
            }
            if (result.success) {
                const summary = result.data.summary;

                // Cache for 24 hours
                await this.cache.set(cacheKey, { summary }, 86400);

                return {
                    summary,
                    originalLength: result.data.originalLength,
                    summaryLength: result.data.summaryLength,
                    compressionRatio: result.data.compressionRatio,
                    provider,
                    requestId: result.requestId
                };
            }

        } catch (error) {
            console.error(`Summarization failed:`, error.message);
        }

        // Fallback: first 150 characters
        return {
            summary: content.substring(0, maxLength) + (content.length > maxLength ? '...' : ''),
            fallback: true
        };
    }

    async generateEmbedding(content, options = {}) {
        const { collegeId, contentType, contentId } = options;

        // Check if embedding exists
        if (contentId) {
            const existing = await Embedding.findOne({
                contentType,
                contentId
            });

            if (existing) {
                return existing.vector;
            }
        }

        const config = await AIConfig.getConfigForScope('college', collegeId);
        if (!config || !config.features.embeddings) {
            return null;
        }

        const provider = config.models.embeddings.provider;
        const model = config.models.embeddings.model;

        try {
            await this.initializeProvider(provider, config.providers[provider]);

            if (provider === 'openai' || provider === 'openrouter') {
                const result = await this.providers[provider].generateEmbedding(content, {
                    model,
                    collegeId
                });

                if (result.success && contentId) {
                    // Store embedding
                    await Embedding.create({
                        contentType,
                        contentId,
                        collegeId,
                        model: result.data.model,
                        dimensions: result.data.dimensions,
                        vector: result.data.embedding,
                        metadata: {
                            text: content.substring(0, 500),
                            generatedAt: new Date()
                        }
                    });
                }

                return result.success ? result.data.embedding : null;
            }

        } catch (error) {
            console.error(`Embedding generation failed:`, error.message);
        }

        return null;
    }

   
    // Add these methods to your existing ContentModerator class

async chat(message, context = {}, options = {}) {
    const { collegeId, userId, conversationId } = options;

    // Check cache for similar conversations
    const cacheKey = `chat:${collegeId}:${conversationId || this.hashContent(message)}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
        return { ...cached, cached: true };
    }

    const config = await AIConfig.getConfigForScope('college', collegeId);
    if (!config || !config.features.chat) {
        const fallbackResponse = {
            message: `I received your message: "${message.substring(0, 50)}..."`,
            context: context || {},
            timestamp: new Date(),
            type: 'text'
        };
        
        
        
        return fallbackResponse;
    }

    const provider = config.models.chat.provider;
    const model = config.models.chat.model;
    const maxTokens = config.models.chat.maxTokens || 1000;
    const temperature = config.models.chat.temperature || 0.7;

    try {
        await this.initializeProvider(provider, config.providers[provider]);

        let result;
        if (provider === 'openai' || provider === 'openrouter') {
            result = await this.providers[provider].chat(message, {
                model,
                maxTokens,
                temperature,
                context,
                collegeId,
                userId
            });
        } else if (provider === 'gemini') {
            result = await this.providers.gemini.chat(message, {
                model,
                maxTokens,
                temperature,
                context,
                collegeId,
                userId
            });
        }

        if (result.success) {
            const response = {
                message: result.data.message,
                context: result.data.context || {},
                timestamp: new Date(),
                type: result.data.type || 'text',
                provider,
                requestId: result.requestId
            };

            // Cache for 1 hour for frequent conversations
            await this.cache.set(cacheKey, response, 3600);

            

            return response;
        }

    } catch (error) {
        console.error(`Chat failed:`, error.message);
    }

    // Fallback response
    const fallbackResponse = {
        message: `I received your message: "${message.substring(0, 50)}..."`,
        context: context || {},
        timestamp: new Date(),
        type: 'text',
        fallback: true
    };

    

    return fallbackResponse;
}

async studyAssistant(question, subject, context = {}, options = {}) {
    const { collegeId, userId, includeSources = true } = options;

    const cacheKey = `study:${collegeId}:${subject}:${this.hashContent(question)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
        
        return { ...cached, cached: true };
    }

    const config = await AIConfig.getConfigForScope('college', collegeId);
    console.log(config.features.studyAssistant);
    if (!config || !config.features.studyAssistant) {
        const fallbackResponse = {
            answer: `This is a study assistant response for: "${question.substring(0, 50)}..."`,
            subject: subject || 'general',
            sources: [],
            confidence: 0.8,
            timestamp: new Date(),
            fallback: true
        };
        
        return fallbackResponse;
    }

    const provider = config.models.studyAssistant?.provider || config.models.chat.provider;
    const model = config.models.studyAssistant?.model || config.models.chat.model;
    const maxTokens = config.models.studyAssistant?.maxTokens || 1500;
    const temperature = config.models.studyAssistant?.temperature || 0.3;

    try {
        await this.initializeProvider(provider, config.providers[provider]);

        let result;
        if (provider === 'openai' || provider === 'openrouter') {
            result = await this.providers[provider].studyAssistant(question, {
                model,
                maxTokens,
                temperature,
                subject,
                context,
                collegeId,
                userId,
                includeSources
            });
        } else if (provider === 'gemini') {
            result = await this.providers.gemini.studyAssistant(question, {
                model,
                maxTokens,
                temperature,
                subject,
                context,
                collegeId,
                userId,
                includeSources
            });
        }
        
        if (result.success) {
            const response = {
                answer: result.data.answer,
                subject: result.data.subject || subject || 'general',
                sources: result.data.sources || [],
                confidence: result.data.confidence || 0.8,
                timestamp: new Date(),
                provider,
                requestId: result.requestId,
                explanation: result.data.explanation
            };

            // Cache for 6 hours for educational content
            await this.cache.set(cacheKey, response, 21600);

          

            return response;
        }

    } catch (error) {
        console.error(`Study assistant failed:`, error.message);
    }

    // Fallback response
    const fallbackResponse = {
        answer: `This is a study assistant response for: "${question.substring(0, 50)}..."`,
        subject: subject || 'general',
        sources: [],
        confidence: 0.8,
        timestamp: new Date(),
        fallback: true
    };


    return fallbackResponse;
}

async codeHelp(code, language, question, options = {}) {
    const { collegeId, userId, explanationLevel = 'detailed' } = options;

    const cacheKey = `code:${collegeId}:${language}:${this.hashContent(code || question)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
       
        return { ...cached, cached: true };
    }

    const config = await AIConfig.getConfigForScope('college', collegeId);
    if (!config || !config.features.codeHelp) {
        const fallbackResponse = {
            suggestion: `Here's a suggestion for your ${language || 'code'} question.`,
            language: language || 'unknown',
            improvedCode: code ? `${code}\n// Improved version` : null,
            explanation: 'Explanation would go here in production.',
            timestamp: new Date(),
            fallback: true
        };
        
      
        
        return fallbackResponse;
    }

    const provider = config.models.codeHelp?.provider || config.models.chat.provider;
    const model = config.models.codeHelp?.model || config.models.chat.model;
    const maxTokens = config.models.codeHelp?.maxTokens || 2000;
    const temperature = config.models.codeHelp?.temperature || 0.1;

    try {
        await this.initializeProvider(provider, config.providers[provider]);

        let result;
        if (provider === 'openai' || provider === 'openrouter') {
            result = await this.providers[provider].codeHelp(code, {
                model,
                maxTokens,
                temperature,
                language,
                question,
                collegeId,
                userId,
                explanationLevel
            });
        } else if (provider === 'gemini') {
            result = await this.providers.gemini.codeHelp(code, {
                model,
                maxTokens,
                temperature,
                language,
                question,
                collegeId,
                userId,
                explanationLevel
            });
        }

        if (result.success) {
            const response = {
                suggestion: result.data.suggestion,
                language: result.data.language || language || 'unknown',
                improvedCode: result.data.improvedCode || (code ? `${code}\n// Optimized version` : null),
                explanation: result.data.explanation,
                timestamp: new Date(),
                provider,
                requestId: result.requestId,
                complexity: result.data.complexity,
                bestPractices: result.data.bestPractices || []
            };

            // Cache for 12 hours for code solutions
            await this.cache.set(cacheKey, response, 43200);



            return response;
        }

    } catch (error) {
        console.error(`Code help failed:`, error.message);
    }

    // Fallback response
    const fallbackResponse = {
        suggestion: `Here's a suggestion for your ${language || 'code'} question.`,
        language: language || 'unknown',
        improvedCode: code ? `${code}\n// Improved version` : null,
        explanation: 'Explanation would go here in production.',
        timestamp: new Date(),
        fallback: true
    };

  

    return fallbackResponse;
}
 // Helper Methods
 hashContent(content) {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        hash = ((hash << 5) - hash) + content.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(36);
}

basicContentCheck(content) {
    const blockedPatterns = [
        /(?:http|https):\/\/[^\s]+/g, // URLs
        /[\d]{10,}/g, // Phone numbers
        /[\w\.-]+@[\w\.-]+\.[\w]{2,}/g // Emails
    ];

    const blockedKeywords = ['spam', 'scam', 'fraud', 'buy now', 'click here'];

    const issues = [];

    blockedPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) issues.push(...matches);
    });

    const lowerContent = content.toLowerCase();
    blockedKeywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
            issues.push(keyword);
        }
    });

    return {
        safe: issues.length === 0,
        flagged: issues.length > 0,
        categories: issues.length > 0 ? ['suspicious_patterns'] : [],
        scores: {},
        confidence: 0.5,
        provider: 'basic',
        issues
    };
}
}

module.exports = ContentModerator;