const aiConfig = {
    // Default AI providers configuration
    providers: {
        openrouter: {
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            timeout: 60000,
            maxRetries: 3
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORG_ID,
            baseURL: 'https://api.openai.com/v1',
            timeout: 30000,
            maxRetries: 3
        },
        openrouter: {
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            timeout: 60000,
            maxRetries: 3
        },
        gemini: {
            apiKey: process.env.GEMINI_API_KEY,
            baseURL: 'https://generativelanguage.googleapis.com/v1beta'
        },
        huggingface: {
            apiKey: process.env.HUGGINGFACE_API_KEY,
            baseURL: 'https://api-inference.huggingface.co'
        }
    },

    // Default models for each task
    models: {
        moderation: 'text-moderation-latest',
        tagging: 'gpt-3.5-turbo',
        summarization: 'gpt-3.5-turbo',
        sentiment: 'distilbert-base-uncased-finetuned-sst-2-english',
        embeddings: 'text-embedding-ada-002'
    },

    // Rate limits per provider (requests per minute)
    rateLimits: {
        openai: 60,
        openrouter: 60,
        gemini: 100,
        huggingface: 30
    },

    // Cost per 1K tokens (in USD)
    costs: {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
        'openai/gpt-oss-120b': { input: 0.000039, output: 0.00019 }, // Updated with approximate pricing
        'text-embedding-ada-002': { input: 0.0001, output: 0 },
        'gemini-pro': { input: 0.0005, output: 0.0015 }
    },

    // Feature flags
    features: {
        autoModeration: true,
        smartTagging: true,
        contentSummary: true,
        sentimentAnalysis: true,
        recommendations: true,
        embeddings: true
    },

    // Fallback Strategy
    fallback: {
        enabled: true,
        primaryProvider: 'openrouter',
        secondaryProvider: 'openai',
        tertiaryProvider: 'gemini',
        fallbackThreshold: 5000 // ms
    },

    // Cache settings (in seconds)
    cache: {
        moderation: 86400, // 24 hours
        tagging: 43200, // 12 hours
        summarization: 86400, // 24 hours
        embeddings: 604800 // 7 days
    }
};

module.exports = aiConfig;