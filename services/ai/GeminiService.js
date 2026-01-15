const axios = require('axios');
const AIInteraction = require('../../models/ai/AIInteraction.model');

class GeminiService {
    constructor(config) {
        this.config = config;
        this.client = axios.create({
            baseURL: config.baseURL || 'https://generativelanguage.googleapis.com/v1beta',
            params: { key: config.apiKey },
            headers: { 'Content-Type': 'application/json' },
            timeout: config.timeout || 30000
        });
    }

    async moderateContent(text, options = {}) {
        const requestId = `gemini_mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'gemini',
            model: options.model || 'gemini-pro',
            endpoint: 'moderation',
            input: { text },
            inputMetadata: {
                contentType: 'text',
                size: text.length
            },
            collegeId: options.collegeId
        });

        try {
            await aiInteraction.markProcessing().save();

            // Gemini doesn't have explicit moderation API, so we use chat
            const prompt = `Is this text appropriate for an educational platform? Answer only "SAFE" or "UNSAFE" with reason: ${text}`;
            
            const response = await this.client.post(`/models/${options.model || 'gemini-pro'}:generateContent`, {
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            });

            const result = response.data.candidates[0].content.parts[0].text;
            const isSafe = result.includes('SAFE');
            
            const output = {
                flagged: !isSafe,
                categories: {},
                categoryScores: {},
                flaggedCategories: isSafe ? [] : ['content_policy'],
                geminiResponse: result
            };

            aiInteraction.markCompleted(output, {
                latency: { total: response.duration || 0 }
            });

            await aiInteraction.save();
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
            throw new Error(`Gemini moderation failed: ${error.message}`);
        }
    }

    async generateTags(text, options = {}) {
        const requestId = `gemini_tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'gemini',
            model: options.model || 'gemini-pro',
            endpoint: 'tagging',
            input: { text },
            inputMetadata: {
                contentType: 'text',
                size: text.length
            },
            collegeId: options.collegeId
        });

        try {
            await aiInteraction.markProcessing().save();

            const prompt = `Extract relevant tags as comma-separated values: ${text}`;
            
            const response = await this.client.post(`/models/${options.model || 'gemini-pro'}:generateContent`, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 100,
                    temperature: 0.3
                }
            });

            const content = response.data.candidates[0].content.parts[0].text;
            const tags = content.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
            
            const output = {
                tags: tags.slice(0, options.maxTags || 5),
                confidence: 0.85
            };

            aiInteraction.markCompleted(output, {
                latency: { total: response.duration || 0 }
            });

            await aiInteraction.save();
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
            throw new Error(`Gemini tagging failed: ${error.message}`);
        }
    }

    async generateSummary(text, options = {}) {
        const requestId = `gemini_sum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'gemini',
            model: options.model || 'gemini-pro',
            endpoint: 'summarization',
            input: { text },
            inputMetadata: {
                contentType: 'text',
                size: text.length
            },
            collegeId: options.collegeId
        });

        try {
            await aiInteraction.markProcessing().save();

            const prompt = `Summarize in ${options.maxLength || 150} characters: ${text}`;
            
            const response = await this.client.post(`/models/${options.model || 'gemini-pro'}:generateContent`, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 200,
                    temperature: 0.5
                }
            });

            const summary = response.data.candidates[0].content.parts[0].text.trim();
            
            const output = {
                summary,
                originalLength: text.length,
                summaryLength: summary.length
            };

            aiInteraction.markCompleted(output, {
                latency: { total: response.duration || 0 }
            });

            await aiInteraction.save();
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
            throw new Error(`Gemini summarization failed: ${error.message}`);
        }
    }

    async checkSafety(text) {
        try {
            const response = await this.client.post(`/models/gemini-pro:generateContent`, {
                contents: [{ parts: [{ text }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            });

            return {
                safe: !response.data.promptFeedback?.blockReason,
                reasons: response.data.promptFeedback?.blockReason || []
            };
        } catch (error) {
            return { safe: true, reasons: [], error: error.message };
        }
    }
}

module.exports = GeminiService;