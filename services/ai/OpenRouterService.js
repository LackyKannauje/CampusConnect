const axios = require('axios');
const AIInteraction = require('../../models/ai/AIInteraction.model');
require('dotenv').config();

class OpenRouterService {
    constructor(config) {
        this.config = config;
        this.client = axios.create({
            baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
            headers: {
                'Authorization': `Bearer ${config.apiKey || process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                // Optional: headers for OpenRouter rankings
                'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
                'X-Title': 'Campus Connect'
            },
            timeout: config.timeout || 60000
        });
    }

    async moderateContent(text, options = {}) {
        // OpenRouter doesn't strictly have a /moderations endpoint that matches OpenAI exactly across all models
        // But some models might support it. For now, we mirror OpenAI structure or return basic if unsupported.
        // If the user configures an OpenAI-compatible moderation model on OpenRouter, this might work.
        // Otherwise, we might want to throw or return true to fallback.
        // However, usually moderation is done via specific content-safety models.

        const requestId = `mod_or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openrouter',
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

            // Note: OpenRouter might not route /moderations to OpenAI. 
            // If this fails 404, we catch it.
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

            if (options.fallback) {
                return this.basicModerationFallback(text);
            }

            throw new Error(`OpenRouter moderation failed: ${error.message}`);
        }
    }

    async generateTags(text, options = {}) {
        console.log('OpenRouter generateTags called with text length:', text.length);

        try {
            const requestId = `tag_or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const aiInteraction = new AIInteraction({
                requestId,
                service: 'openrouter',
                model: options.model || 'openai/gpt-oss-120b',
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

            const prompt = `Extract exactly 5 relevant tags from the text below.
            Output ONLY a valid JSON array of strings. 
            Do NOT use markdown code blocks. 
            Do NOT include explanations or other text.
            Example: ["tag1", "tag2", "tag3", "tag4", "tag5"]
            
            Text: ${text}`;

            console.log('Making OpenRouter API request...');

            try {
                const response = await this.client.post('/chat/completions', {
                    model: options.model || 'openai/gpt-oss-120b',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1200, // Increased to allow for reasoning tokens
                    temperature: 0.1  // Lower temperature for more deterministic output
                });


                const tagsContent = response.data.choices[0].message.content.trim();
                let tags = [];
                // Attempt to parse JSON
                try {
                    // Find JSON array in text if wrapped or mixed with text
                    const match = tagsContent.match(/\[.*\]/s);
                    if (match) {
                        tags = JSON.parse(match[0]);
                    } else {
                        tags = JSON.parse(tagsContent);
                    }
                } catch (e) {
                    // Fallback splitting if JSON parse fails
                    tags = tagsContent.split(',').map(t => t.trim());
                }

                // Clean tags
                tags = tags.slice(0, options.maxTags || 5).filter(t => t.length > 2);

                const output = { tags };

                aiInteraction.markCompleted(output, {
                    latency: { total: 0 }, // Axios interceptors usually needed for duration
                    tokens: {
                        input: response.data.usage?.prompt_tokens || 0,
                        output: response.data.usage?.completion_tokens || 0,
                        total: response.data.usage?.total_tokens || 0
                    }
                });

                await aiInteraction.save();
                await aiInteraction.calculateCost();

                return {
                    success: true,
                    data: {
                        tags,
                        confidence: 0.8 // Placeholder
                    },
                    requestId
                };

            } catch (apiError) {
                console.error('OpenRouter API error:', apiError.message);
                throw apiError;
            }

        } catch (error) {
            console.error('Full generateTags error:', error);
            throw new Error(`OpenRouter tagging failed: ${error.message}`);
        }
    }

    async generateSummary(text, options = {}) {
        const requestId = `sum_or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openrouter',
            model: options.model || 'openai/gpt-oss-120b',
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
                model: options.model || 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1500, // Increased to allow for reasoning
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
                latency: { total: 0 },
                tokens: {
                    input: response.data.usage?.prompt_tokens || 0,
                    output: response.data.usage?.completion_tokens || 0,
                    total: response.data.usage?.total_tokens || 0
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
            throw new Error(`OpenRouter summarization failed: ${error.message}`);
        }
    }

    async generateEmbedding(text, options = {}) {
        const requestId = `emb_or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openrouter',
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
                input: text,
                encoding_format: 'float'
            });

            console.log('OpenRouter embedding response:', response.data);

            const embedding = response.data.data[0].embedding;
    
            if (!Array.isArray(embedding)) {
                throw new Error('Embedding response is not an array');
            }
            
            if (embedding.length === 0) {
                throw new Error('Empty embedding received');
            }
            
            // Check if all are numbers
            const hasNaN = embedding.some(v => typeof v !== 'number' || isNaN(v));
            if (hasNaN) {
                console.warn('Embedding contains NaN values');
            }

            const output = {
                embedding,
                dimensions: embedding.length,
                model: response.data.model
            };

            aiInteraction.markCompleted(output, {
                latency: { total: 0 },
                tokens: {
                    input: response.data.usage?.prompt_tokens || 0,
                    output: 0,
                    total: response.data.usage?.total_tokens || 0
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
            throw new Error(`OpenRouter embedding failed: ${error.message}`);
        }
    }
    // Add these methods to your existing OpenRouterService class

async chat(message, options = {}) {
    const requestId = `chat_or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const aiInteraction = new AIInteraction({
        requestId,
        service: 'openrouter',
        model: options.model || 'openai/gpt-oss-120b',
        endpoint: 'chat',
        input: { message, context: options.context },
        inputMetadata: {
            contentType: 'text',
            size: message.length,
            tokenCount: this.estimateTokens(message)
        },
        collegeId: options.collegeId,
        userId: options.userId
    });

    try {
        await aiInteraction.markProcessing().save();

        const messages = [];
        
        // Add system prompt if context exists
        if (options.context?.role === 'study_assistant') {
            messages.push({
                role: 'system',
                content: 'You are a helpful study assistant. Provide educational, accurate information.'
            });
        } else if (options.context?.role === 'code_assistant') {
            messages.push({
                role: 'system',
                content: 'You are a coding assistant. Provide code examples and explanations.'
            });
        }

        // Add user message
        messages.push({ role: 'user', content: message });

        const response = await this.client.post('/chat/completions', {
            model: options.model || 'openai/gpt-oss-120b',
            messages,
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7
        });

        const aiMessage = response.data.choices[0].message.content.trim();
        
        const output = {
            message: aiMessage,
            context: options.context || {},
            type: 'text'
        };

        aiInteraction.markCompleted(output, {
            latency: { total: 0 },
            tokens: {
                input: response.data.usage?.prompt_tokens || 0,
                output: response.data.usage?.completion_tokens || 0,
                total: response.data.usage?.total_tokens || 0
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
        throw new Error(`OpenRouter chat failed: ${error.message}`);
    }
}

async studyAssistant(question, options = {}) {
    const requestId = `study_or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const aiInteraction = new AIInteraction({
        requestId,
        service: 'openrouter',
        model: options.model || 'openai/gpt-oss-120b',
        endpoint: 'study_assistant',
        input: { question, subject: options.subject, context: options.context },
        inputMetadata: {
            contentType: 'text',
            size: question.length,
            tokenCount: this.estimateTokens(question)
        },
        collegeId: options.collegeId,
        userId: options.userId
    });

    try {
        await aiInteraction.markProcessing().save();

        const systemPrompt = `You are an expert educational assistant specializing in ${options.subject || 'academic subjects'}. 
        Provide detailed, accurate explanations. If asked, include sources or references.
        Format your response clearly with explanations, examples, and key takeaways.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
        ];

        const response = await this.client.post('/chat/completions', {
            model: options.model || 'openai/gpt-oss-120b',
            messages,
            max_tokens: options.maxTokens || 1500,
            temperature: options.temperature || 0.3
        });

        const answer = response.data.choices[0].message.content.trim();
        
        // Extract potential sources (simplified)
        const sources = [];
        const sourceMatches = answer.match(/\[source:\s*(.+?)\]/gi) || [];
        sourceMatches.forEach(match => {
            const source = match.replace(/\[source:\s*|\]/gi, '');
            sources.push(source);
        });

        const cleanAnswer = answer.replace(/\[source:\s*.+?\]/gi, '').trim();
        
        const output = {
            answer: cleanAnswer,
            subject: options.subject || 'general',
            sources: sources.length > 0 ? sources : [],
            confidence: 0.9,
            explanation: cleanAnswer
        };

        aiInteraction.markCompleted(output, {
            latency: { total: 0 },
            tokens: {
                input: response.data.usage?.prompt_tokens || 0,
                output: response.data.usage?.completion_tokens || 0,
                total: response.data.usage?.total_tokens || 0
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
        throw new Error(`OpenRouter study assistant failed: ${error.message}`);
    }
}

async codeHelp(code, options = {}) {
    const requestId = `code_or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const aiInteraction = new AIInteraction({
        requestId,
        service: 'openrouter',
        model: options.model || 'openai/gpt-oss-120b',
        endpoint: 'code_help',
        input: { code, language: options.language, question: options.question },
        inputMetadata: {
            contentType: 'code',
            size: (code || '').length,
            tokenCount: this.estimateTokens(code || options.question || '')
        },
        collegeId: options.collegeId,
        userId: options.userId
    });

    try {
        await aiInteraction.markProcessing().save();

        let prompt;
        if (code && options.question) {
            prompt = `Language: ${options.language || 'unknown'}\n\nCode:\n${code}\n\nQuestion: ${options.question}\n\nPlease analyze the code, answer the question, suggest improvements if needed, and explain your reasoning.`;
        } else if (code) {
            prompt = `Language: ${options.language || 'unknown'}\n\nCode:\n${code}\n\nPlease analyze this code, suggest improvements, explain what it does, and identify any issues.`;
        } else {
            prompt = `Language: ${options.language || 'unknown'}\n\nQuestion: ${options.question}\n\nPlease provide a detailed explanation and code example if applicable.`;
        }

        const systemPrompt = `You are an expert programming assistant. Provide clear code analysis, suggestions, and explanations.
        Format with clear sections: Analysis, Suggestions, Explanation, Best Practices.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        const response = await this.client.post('/chat/completions', {
            model: options.model || 'openai/gpt-oss-120b',
            messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.1
        });

        const result = response.data.choices[0].message.content.trim();
        
        // Parse the response to extract improved code if present
        let improvedCode = null;
        const codeBlockMatch = result.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
        if (codeBlockMatch && code) {
            improvedCode = codeBlockMatch[1];
        }

        const output = {
            suggestion: result,
            language: options.language || 'unknown',
            improvedCode: improvedCode,
            explanation: result,
            complexity: 'medium',
            bestPractices: []
        };

        aiInteraction.markCompleted(output, {
            latency: { total: 0 },
            tokens: {
                input: response.data.usage?.prompt_tokens || 0,
                output: response.data.usage?.completion_tokens || 0,
                total: response.data.usage?.total_tokens || 0
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
        throw new Error(`OpenRouter code help failed: ${error.message}`);
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
        const recentCalls = await AIInteraction.countDocuments({
            service: 'openrouter',
            createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
        });

        return recentCalls < (this.config.rateLimit || 60);
    }
}

module.exports = OpenRouterService;
