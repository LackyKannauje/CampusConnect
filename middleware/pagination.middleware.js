const paginationMiddleware = (req, res, next) => {
    try {
        // Parse pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Parse sort parameter
        let sort = {};
        if (req.query.sort) {
            const sortFields = req.query.sort.split(',');
            sortFields.forEach(field => {
                if (field.startsWith('-')) {
                    sort[field.substring(1)] = -1;
                } else {
                    sort[field] = 1;
                }
            });
        } else {
            sort = { createdAt: -1 }; // Default sort
        }

        // Parse select fields
        let select = '';
        if (req.query.select) {
            select = req.query.select.split(',').join(' ');
        }

        // Parse populate fields
        let populate = [];
        if (req.query.populate) {
            populate = req.query.populate.split(',').map(path => {
                return { path };
            });
        }

        // Parse search query
        let search = {};
        if (req.query.search) {
            search = {
                $or: [
                    { title: { $regex: req.query.search, $options: 'i' } },
                    { description: { $regex: req.query.search, $options: 'i' } }
                ]
            };
        }

        // Parse filters
        let filters = {};
        if (req.query.filters) {
            try {
                filters = JSON.parse(req.query.filters);
            } catch (error) {
                // If invalid JSON, ignore filters
            }
        }

        // Set pagination object in request
        req.pagination = {
            page,
            limit,
            skip,
            sort,
            select,
            populate,
            search,
            filters,
            query: req.query // Original query for reference
        };

        // Add pagination metadata to response locals
        res.locals.pagination = {
            page,
            limit
        };

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = paginationMiddleware;