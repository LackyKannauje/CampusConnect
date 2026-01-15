const Validation = require('../utils/validation');

const validationMiddleware = {
    // Validate request body
    validateBody: (schema) => {
        return (req, res, next) => {
            try {
                req.body = Validation.validate(schema, req.body);
                next();
            } catch (error) {
                res.status(error.status || 400).json({
                    error: 'Validation failed',
                    details: error.errors
                });
            }
        };
    },

    // Validate request params
    validateParams: (schema) => {
        return (req, res, next) => {
            try {
                req.params = Validation.validateParams(schema, req.params);
                next();
            } catch (error) {
                res.status(error.status || 400).json({
                    error: error.message
                });
            }
        };
    },

    // Validate query parameters
    validateQuery: (schema) => {
        return (req, res, next) => {
            try {
                req.query = Validation.validate(schema, req.query);
                next();
            } catch (error) {
                res.status(error.status || 400).json({
                    error: 'Invalid query parameters',
                    details: error.errors
                });
            }
        };
    },

    // Validate file upload
    validateFile: (options = {}) => {
        return (req, res, next) => {
            try {
                if (!req.file && !options.optional) {
                    throw { status: 400, message: 'File is required' };
                }

                if (req.file) {
                    Validation.validateFile(req.file);
                    
                    // Check file size limit
                    const maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default
                    if (req.file.size > maxSize) {
                        throw { 
                            status: 400, 
                            message: `File too large. Max size: ${maxSize / 1024 / 1024}MB` 
                        };
                    }

                    // Check MIME type
                    const allowedTypes = options.allowedTypes || [
                        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                        'video/mp4', 'video/avi', 'video/mov',
                        'application/pdf', 'application/msword',
                        'application/vnd.ms-powerpoint', 'text/plain'
                    ];
                    
                    if (!allowedTypes.includes(req.file.mimetype)) {
                        throw { 
                            status: 400, 
                            message: 'Invalid file type' 
                        };
                    }
                }
                
                next();
            } catch (error) {
                res.status(error.status || 400).json({
                    error: error.message
                });
            }
        };
    }
};

module.exports = validationMiddleware;