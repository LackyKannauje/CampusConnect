const OpenRouterService = require('./OpenRouterService');
const AIInteraction = require('../../models/ai/AIInteraction.model');

class AIService {
    constructor(config = {}) {
        this.openRouter = new OpenRouterService(config.openRouter || {});
        this.config = config;
    }

    /**
     * Generate chat response
     * @param {string} message - User message
     * @param {Object} context - Conversation context
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Chat response
     */
    async chat(message, context = {}, options = {}) {
        const requestId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const systemPrompt = this.getChatSystemPrompt(context);
        const messages = this.buildChatMessages(systemPrompt, message, context);
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openrouter',
            model: options.model || 'openai/gpt-4o',
            endpoint: 'chat',
            input: { message, context },
            inputMetadata: {
                messageLength: message.length,
                hasContext: !!context && Object.keys(context).length > 0,
                tokenCount: this.openRouter.estimateTokens(message)
            },
            collegeId: options.collegeId,
            userId: options.userId
        });

        try {
            await aiInteraction.markProcessing().save();

            const response = await this.openRouter.client.post('/chat/completions', {
                model: options.model || 'openai/gpt-4o',
                messages: messages,
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.7,
                stream: options.stream || false
            });

            const aiMessage = response.data.choices[0].message.content;
            const output = this.formatChatResponse(aiMessage, context);

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
            return this.getFallbackChatResponse(message, error);
        }
    }

    /**
     * Study assistant - helps with academic questions
     * @param {string} question - Study question
     * @param {string} subject - Subject area
     * @param {Object} context - Additional context
     * @param {Object} options - Configuration options
     * @returns {Promise<Object>} Study assistant response
     */
    async studyAssistant(question, subject = 'general', context = {}, options = {}) {
        const requestId = `study_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const systemPrompt = this.getStudySystemPrompt(subject, context);
        const messages = this.buildStudyMessages(systemPrompt, question, context);
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openrouter',
            model: options.model || 'anthropic/claude-3-haiku',
            endpoint: 'study_assistant',
            input: { question, subject, context },
            inputMetadata: {
                questionLength: question.length,
                subject: subject,
                tokenCount: this.openRouter.estimateTokens(question)
            },
            collegeId: options.collegeId,
            userId: options.userId
        });

        try {
            await aiInteraction.markProcessing().save();

            const response = await this.openRouter.client.post('/chat/completions', {
                model: options.model || 'anthropic/claude-3-haiku',
                messages: messages,
                max_tokens: options.maxTokens || 2500,
                temperature: options.temperature || 0.3,
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(response.data.choices[0].message.content);
            const output = this.formatStudyResponse(result, question, subject);

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
            return this.getFallbackStudyResponse(question, subject, error);
        }
    }

    /**
     * Code help - assists with programming questions
     * @param {string} code - Code snippet
     * @param {string} language - Programming language
     * @param {string} question - Code-related question
     * @param {Object} context - Additional context
     * @param {Object} options - Configuration options
     * @returns {Promise<Object>} Code assistance response
     */
    async codeHelp(code, language = 'unknown', question = '', context = {}, options = {}) {
        const requestId = `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const systemPrompt = this.getCodeSystemPrompt(language, context);
        const messages = this.buildCodeMessages(systemPrompt, code, question, context);
        
        const aiInteraction = new AIInteraction({
            requestId,
            service: 'openrouter',
            model: options.model || 'codestral-latest',
            endpoint: 'code_help',
            input: { code, language, question, context },
            inputMetadata: {
                hasCode: !!code,
                hasQuestion: !!question,
                language: language,
                codeLength: code ? code.length : 0,
                questionLength: question.length,
                tokenCount: this.openRouter.estimateTokens(code + question)
            },
            collegeId: options.collegeId,
            userId: options.userId
        });

        try {
            await aiInteraction.markProcessing().save();

            const response = await this.openRouter.client.post('/chat/completions', {
                model: options.model || 'codestral-latest',
                messages: messages,
                max_tokens: options.maxTokens || 3000,
                temperature: options.temperature || 0.2,
                stream: false
            });

            const aiMessage = response.data.choices[0].message.content;
            const output = this.formatCodeResponse(aiMessage, code, language);

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
            return this.getFallbackCodeResponse(code, language, question, error);
        }
    }

    // Helper Methods

    getChatSystemPrompt(context) {
        return `You are a helpful AI assistant in a university campus platform. 
        ${context.role ? `You are acting as: ${context.role}` : ''}
        ${context.tone ? `Use a ${context.tone} tone.` : 'Use a friendly, professional tone.'}
        Be concise but helpful. If asked about campus-specific information, mention that you don't have access to real-time campus data.`;
    }

    getStudySystemPrompt(subject, context) {
        return `You are an expert ${subject} tutor for university students. 
        Provide clear, accurate explanations at an appropriate academic level.
        ${context.level ? `The student is at ${context.level} level.` : 'Assume undergraduate level.'}
        Format your response as JSON with: answer (string), explanation (string), keyPoints (array), resources (array), confidence (number 0-1).`;
    }

    getCodeSystemPrompt(language, context) {
        return `You are a ${language} programming expert. 
        ${context.task ? `The task is: ${context.task}` : 'Help with code understanding and improvement.'}
        Provide practical, efficient solutions with explanations.
        Format code examples properly. Highlight best practices and potential issues.`;
    }

    buildChatMessages(systemPrompt, message, context) {
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        if (context.history && Array.isArray(context.history)) {
            context.history.forEach(msg => {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
        }

        messages.push({ role: 'user', content: message });
        return messages;
    }

    buildStudyMessages(systemPrompt, question, context) {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Subject: ${context.subject || 'general'}\nQuestion: ${question}` }
        ];

        if (context.relatedQuestions) {
            messages.push({ 
                role: 'user', 
                content: `Related context: ${JSON.stringify(context.relatedQuestions)}` 
            });
        }

        return messages;
    }

    buildCodeMessages(systemPrompt, code, question, context) {
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        if (code) {
            messages.push({ 
                role: 'user', 
                content: `Language: ${context.language || 'unknown'}\nCode:\n${code}\n\nQuestion: ${question || 'Please review this code'}` 
            });
        } else {
            messages.push({ 
                role: 'user', 
                content: `Language: ${context.language || 'unknown'}\nQuestion: ${question}` 
            });
        }

        return messages;
    }

    formatChatResponse(aiMessage, context) {
        return {
            message: aiMessage,
            context: context || {},
            timestamp: new Date(),
            type: 'text',
            suggestions: this.extractChatSuggestions(aiMessage)
        };
    }

    formatStudyResponse(result, question, subject) {
        return {
            answer: result.answer || '',
            explanation: result.explanation || '',
            subject: subject || 'general',
            keyPoints: result.keyPoints || [],
            resources: result.resources || [],
            confidence: result.confidence || 0.8,
            timestamp: new Date(),
            question: question
        };
    }

    formatCodeResponse(aiMessage, code, language) {
        return {
            suggestion: aiMessage,
            language: language || 'unknown',
            improvedCode: code ? this.extractImprovedCode(aiMessage, code) : null,
            explanation: this.extractCodeExplanation(aiMessage),
            timestamp: new Date(),
            hasCodeExample: this.hasCodeBlocks(aiMessage)
        };
    }

    extractChatSuggestions(message) {
        // Simple extraction of potential follow-up questions
        const suggestions = [];
        if (message.includes('?')) {
            const sentences = message.split(/[.!?]+/);
            sentences.slice(0, 3).forEach(sentence => {
                if (sentence.trim().length > 10) {
                    suggestions.push(`Tell me more about: ${sentence.trim()}`);
                }
            });
        }
        return suggestions.slice(0, 3);
    }

    extractImprovedCode(aiMessage, originalCode) {
        // Extract code blocks from AI response
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
        const matches = [...aiMessage.matchAll(codeBlockRegex)];
        
        if (matches.length > 0) {
            return matches[0][1].trim();
        }
        
        // Fallback: return AI message if no code blocks found
        return aiMessage;
    }

    extractCodeExplanation(aiMessage) {
        // Remove code blocks and get the explanation
        return aiMessage.replace(/```[\s\S]*?```/g, '').trim();
    }

    hasCodeBlocks(message) {
        return /```[\s\S]*?```/.test(message);
    }

    // Fallback responses
    getFallbackChatResponse(message, error) {
        console.warn('Chat fallback triggered:', error.message);
        return {
            success: false,
            data: {
                message: `I received your message: "${message.substring(0, 50)}..." (Note: Using fallback response)`,
                context: {},
                timestamp: new Date(),
                type: 'text',
                fallback: true
            },
            error: error.message,
            requestId: `fallback_chat_${Date.now()}`
        };
    }

    getFallbackStudyResponse(question, subject, error) {
        console.warn('Study assistant fallback triggered:', error.message);
        return {
            success: false,
            data: {
                answer: `This is a study assistant response for: "${question.substring(0, 50)}..."`,
                subject: subject || 'general',
                sources: [],
                confidence: 0.5,
                timestamp: new Date(),
                fallback: true
            },
            error: error.message,
            requestId: `fallback_study_${Date.now()}`
        };
    }

    getFallbackCodeResponse(code, language, question, error) {
        console.warn('Code help fallback triggered:', error.message);
        return {
            success: false,
            data: {
                suggestion: `Here's a suggestion for your ${language || 'code'} question.`,
                language: language || 'unknown',
                improvedCode: code ? `${code}\n// Improved version` : null,
                explanation: 'Explanation would go here in production.',
                timestamp: new Date(),
                fallback: true
            },
            error: error.message,
            requestId: `fallback_code_${Date.now()}`
        };
    }

    // Utility methods
    async checkServiceHealth() {
        try {
            const response = await this.openRouter.client.get('/models');
            return {
                healthy: true,
                models: response.data.data.length,
                service: 'openrouter'
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                service: 'openrouter'
            };
        }
    }

    async getAvailableModels() {
        try {
            const response = await this.openRouter.client.get('/models');
            return response.data.data.map(model => ({
                id: model.id,
                name: model.name,
                context_length: model.context_length,
                pricing: model.pricing
            }));
        } catch (error) {
            return [];
        }
    }
}

module.exports = AIService;