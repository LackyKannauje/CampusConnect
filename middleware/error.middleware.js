const errorMiddleware = {
    // 404 Not Found handler
    notFound: (req, res, next) => {
        const error = new Error(`Not Found - ${req.originalUrl}`);
        error.status = 404;
        next(error);
    },

    // Global error handler
    errorHandler: (err, req, res, next) => {
        // Default error values
        const status = err.status || 500;
        const message = err.message || 'Internal Server Error';
        const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;

        // Log error for debugging
        console.error(`[${new Date().toISOString()}] Error:`, {
            method: req.method,
            path: req.path,
            status,
            message,
            stack: err.stack,
            user: req.user?._id,
            ip: req.ip
        });

        // Mongoose validation error
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            
            return res.status(400).json({
                error: 'Validation Error',
                details: errors
            });
        }

        // Mongoose duplicate key error
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({
                error: 'Duplicate Entry',
                message: `${field} already exists`
            });
        }

        // JWT errors
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid Token'
            });
        }

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token Expired'
            });
        }

        // Rate limit error
        if (err.status === 429) {
            return res.status(429).json({
                error: 'Rate Limit Exceeded',
                message: 'Too many requests, please try again later.'
            });
        }

        // File upload error
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: err.message
            });
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Invalid file upload',
                message: err.message
            });
        }

        // Return error response
        const response = {
            error: message,
            path: req.path,
            timestamp: new Date().toISOString()
        };

        // Add stack trace in development
        if (stack) {
            response.stack = stack;
        }

        // Add validation errors if present
        if (err.details) {
            response.details = err.details;
        }

        res.status(status).json(response);
    },

    // Async error wrapper (for controllers)
    catchAsync: (fn) => {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    },

    // Custom error constructor
    createError: (status, message, details = null) => {
        const error = new Error(message);
        error.status = status;
        if (details) error.details = details;
        return error;
    }
};

module.exports = errorMiddleware;