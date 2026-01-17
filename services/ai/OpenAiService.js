const axios = require('axios');
const AIInteraction = require('../../models/ai/AIInteraction.model');
require('dotenv').config();

class OpenAIService {
    constructor(config) {
        this.config = config;
        this.client = axios.create({
            baseURL: config.baseURL || 'https://api.openai.com/v1',
            headers: {
                'Authorization': `Bearer ${config.apiKey || process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: config.timeout || 30000
        });
    }

    async moderateContent(text, options = {}) {
        const requestId = `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openai',
            model: options.model || 'text-moderation-latest',
            endpoint: 'moderation',
            input: { text },
            inputMetadata: {
                contentType: 'text',
                size: text.length,
                tokenCount: this.estimateTokens(text)
            },
            context: options.context || {},
            collegeId: options.collegeId
        });

        try {
            await aiInteraction.markProcessing().save();

            const response = await this.client.post('/moderations', {
                input: text,
                model: options.model || 'text-moderation-latest'
            });

            const result = response.data.results[0];
            const output = {
                flagged: result.flagged,
                categories: result.categories,
                categoryScores: result.category_scores,
                flaggedCategories: Object.keys(result.categories).filter(key => result.categories[key])
            };

            aiInteraction.markCompleted(output, {
                latency: { total: response.duration || 0 },
                tokens: {
                    input: this.estimateTokens(text),
                    output: 0,
                    total: this.estimateTokens(text)
                }
            });

            await aiInteraction.save();
            await aiInteraction.calculateCost();

            return {
                success: true,
                data: output,
                requestId
            };

        } catch (error) {
            aiInteraction.markFailed({
                code: error.response?.status || 500,
                message: error.message,
                details: error.response?.data
            }, {
                latency: { total: error.duration || 0 }
            });

            await aiInteraction.save();

            // Fallback to basic moderation if OpenAI fails
            if (options.fallback) {
                return this.basicModerationFallback(text);
            }

            throw new Error(`OpenAI moderation failed: ${error.message}`);
        }
    }



    async generateTags(text, options = {}) {
    console.log('generateTags called with text length:', text.length);
    
    try {
        const requestId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openai',
            model: options.model || 'gpt-3.5-turbo',
            endpoint: 'tagging',
            input: { text },
            inputMetadata: {
                contentType: 'text',
                size: text.length,
                tokenCount: this.estimateTokens(text)
            },
            collegeId: options.collegeId,
            metrics: {
                latency: { total: 0, network: 0, processing: 0 },
                tokens: { input: 0, output: 0, total: 0 },
                cost: { amount: 0, currency: 'USD', modelCost: 0, apiCost: 0 },
                cacheHit: false,
                retryCount: 0
            }
        });

        aiInteraction.status = 'processing';
        await aiInteraction.save();

        const prompt = `Extract relevant tags from the following text. Return only a JSON array of tags: ${text}`;
        
        console.log('Making OpenAI API request...');
        console.log('Prompt length:', prompt.length);
        
        const startTime = Date.now();
        
        try {
            const response = await this.client.post('/chat/completions', {
                model: options.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
                temperature: 0.3
            });
            
            const endTime = Date.now();
            console.log('OpenAI response status:', response.status);
            console.log('OpenAI response data:', response.data);
            
            // ... rest of your code ...
            
        } catch (apiError) {
            console.error('OpenAI API error details:', {
                status: apiError.response?.status,
                statusText: apiError.response?.statusText,
                data: apiError.response?.data,
                message: apiError.message,
                config: {
                    url: apiError.config?.url,
                    method: apiError.config?.method,
                    headers: apiError.config?.headers
                }
            });
            throw apiError;
        }

    } catch (error) {
        console.error('Full generateTags error:', error);
        throw new Error(`OpenAI tagging failed: ${error.message}`);
    }
}
    async generateSummary(text, options = {}) {
        const requestId = `sum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openai',
            model: options.model || 'gpt-3.5-turbo',
            endpoint: 'summarization',
            input: { text },
            inputMetadata: {
                contentType: 'text',
                size: text.length,
                tokenCount: this.estimateTokens(text)
            },
            collegeId: options.collegeId
        });

        try {
            await aiInteraction.markProcessing().save();

            const prompt = `Summarize the following text in ${options.maxLength || 150} characters: ${text}`;
            
            const response = await this.client.post('/chat/completions', {
                model: options.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.5
            });

            const summary = response.data.choices[0].message.content.trim();
            
            const output = {
                summary,
                originalLength: text.length,
                summaryLength: summary.length,
                compressionRatio: (summary.length / text.length * 100).toFixed(1)
            };

            aiInteraction.markCompleted(output, {
                latency: { total: response.duration || 0 },
                tokens: {
                    input: response.data.usage.prompt_tokens,
                    output: response.data.usage.completion_tokens,
                    total: response.data.usage.total_tokens
                }
            });

            await aiInteraction.save();
            await aiInteraction.calculateCost();

            return {
                success: true,
                data: output,
                requestId
            };

        } catch (error) {
            aiInteraction.markFailed({
                code: error.response?.status || 500,
                message: error.message,
                details: error.response?.data
            });

            await aiInteraction.save();
            throw new Error(`OpenAI summarization failed: ${error.message}`);
        }
    }

    async generateEmbedding(text, options = {}) {
        const requestId = `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openai',
            model: options.model || 'text-embedding-ada-002',
            endpoint: 'embeddings',
            input: { text },
            inputMetadata: {
                contentType: 'text',
                size: text.length,
                tokenCount: this.estimateTokens(text)
            },
            collegeId: options.collegeId
        });

        try {
            await aiInteraction.markProcessing().save();

            const response = await this.client.post('/embeddings', {
                model: options.model || 'text-embedding-ada-002',
                input: text
            });

            const embedding = response.data.data[0].embedding;
            
            const output = {
                embedding,
                dimensions: embedding.length,
                model: response.data.model
            };

            aiInteraction.markCompleted(output, {
                latency: { total: response.duration || 0 },
                tokens: {
                    input: response.data.usage.prompt_tokens,
                    output: 0,
                    total: response.data.usage.total_tokens
                }
            });

            await aiInteraction.save();
            await aiInteraction.calculateCost();

            return {
                success: true,
                data: output,
                requestId
            };

        } catch (error) {
            aiInteraction.markFailed({
                code: error.response?.status || 500,
                message: error.message,
                details: error.response?.data
            });

            await aiInteraction.save();
            throw new Error(`OpenAI embedding failed: ${error.message}`);
        }
    }

    // Helper Methods
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    basicModerationFallback(text) {
        const blockedWords = ['spam', 'scam', 'fraud', 'hate'];
        const words = text.toLowerCase().split(/\W+/);
        const found = blockedWords.filter(word => words.includes(word));
        
        return {
            success: true,
            data: {
                flagged: found.length > 0,
                flaggedCategories: found,
                categories: {},
                categoryScores: {},
                fallback: true
            },
            requestId: `fallback_${Date.now()}`
        };
    }

    async checkRateLimit() {
        // Implement rate limiting check
        const recentCalls = await AIInteraction.countDocuments({
            service: 'openai',
            createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
        });

        return recentCalls < (this.config.rateLimit || 60);
    }
}

module.exports = OpenAIService;