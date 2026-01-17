const AIConfig = require('../../models/ai/AIConfig.model');
const Embedding = require('../../models/ai/Embedding.model');
const Cache = require('../../utils/cache'); // Assume cache utility exists

class ContentModerator {
    constructor() {
        this.cache = new Cache();
        this.providers = {};
    }

    async initializeProvider(provider, config) {
        if (provider === 'openai') {
            const OpenAIService = require('./OpenAIService');
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
            if (provider === 'openai') {
                result = await this.providers.openai.moderateContent(content, {
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
            if (provider === 'openai') {

                result = await this.providers.openai.generateTags(content, {
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
            if (provider === 'openai') {
                result = await this.providers.openai.generateSummary(content, {
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

            if (provider === 'openai') {
                const result = await this.providers.openai.generateEmbedding(content, {
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