const Joi = require('joi');

const Validation = {
    // User Validation
    user: {
        register: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            firstName: Joi.string().min(2).max(50).required(),
            lastName: Joi.string().min(1).max(50).required(),
            collegeCode: Joi.string().required(),
            role: Joi.string().valid('student', 'faculty', 'admin').default('student')
        }),

        login: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }),

        update: Joi.object({
            firstName: Joi.string().min(2).max(50),
            lastName: Joi.string().min(1).max(50),
            bio: Joi.string().max(500),
            profileVisibility: Joi.string().valid('public', 'college', 'private')
        })
    },

    // Content Validation
    content: {
        create: Joi.object({
            title: Joi.string().min(3).max(200).required(),
            content: Joi.string().min(10).max(10000).required(),
            type: Joi.string().valid('post', 'event', 'poll', 'study_material').required(),
            category: Joi.string().valid('academic', 'cultural', 'sports', 'general'),
            visibility: Joi.string().valid('public', 'college', 'department', 'private'),
            tags: Joi.array().items(Joi.string()).max(10)
        }),

        update: Joi.object({
            title: Joi.string().min(3).max(200),
            content: Joi.string().min(10).max(10000),
            category: Joi.string().valid('academic', 'cultural', 'sports', 'general'),
            visibility: Joi.string().valid('public', 'college', 'department', 'private'),
            tags: Joi.array().items(Joi.string()).max(10)
        })
    },

    // Comment Validation
    comment: {
        create: Joi.object({
            text: Joi.string().min(1).max(2000).required(),
            parentCommentId: Joi.string().allow(null)
        })
    },

    // College Validation
    college: {
        create: Joi.object({
            name: Joi.string().min(3).max(100).required(),
            code: Joi.string().min(2).max(10).required(),
            emailDomain: Joi.string().domain().required()
        })
    },

    // Pagination Validation
    pagination: Joi.object({
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(100).default(10),
        sort: Joi.string().default('-createdAt'),
        search: Joi.string().allow('')
    }),

    // File Validation
    file: Joi.object({
        fieldname: Joi.string().required(),
        originalname: Joi.string().required(),
        encoding: Joi.string(),
        mimetype: Joi.string().valid(
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov',
            'application/pdf', 'application/msword',
            'application/vnd.ms-powerpoint', 'text/plain'
        ).required(),
        size: Joi.number().max(50 * 1024 * 1024).required() // 50MB max
    }),

    // Helper Methods
    // validate: (schema, data) => {
    //     const { error, value } = schema.validate(data, {
    //         abortEarly: false,
    //         stripUnknown: true
    //     });

    //     if (error) {
    //         const errors = error.details.map(detail => ({
    //             field: detail.path.join('.'),
    //             message: detail.message
    //         }));
    //         throw { status: 400, errors };
    //     }

    //     return value;
    // },

    // Helper Methods
    validate: (schema) => {
        // Return a middleware function
        return (req, res, next) => {
            // 1. If schema is a plain object, convert to Joi object
            const joiSchema = Joi.isSchema(schema) ? schema : Joi.object(schema);

            // 2. Validate req.body
            const { error, value } = joiSchema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true
            });

            console.log(req.body);

            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));
                
                // Pass error to your global error handler
                // Creating a custom error object that matches your error middleware structure
                const err = new Error('Validation Error');
                err.status = 400;
                err.details = errors;
                err.name = 'ValidationError'; // Helpful for your error handler check
                return next(err);
            }

            // 3. Replace req.body with the sanitized value
            req.body = value;
            next();
        };
    },

    validateParams: (schema, params) => {
        const { error, value } = schema.validate(params);
        if (error) {
            throw { status: 400, message: 'Invalid parameters' };
        }
        return value;
    },

    validateFile: (file) => {
        const { error } = Validation.file.validate(file);
        if (error) {
            throw { status: 400, message: 'Invalid file' };
        }
        return true;
    }
};

module.exports = Validation;