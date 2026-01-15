class Pagination {
    static async paginate(model, query = {}, options = {}) {
        const {
            page = 1,
            limit = 10,
            sort = { createdAt: -1 },
            select = '',
            populate = [],
            lean = false
        } = options;

        const skip = (page - 1) * limit;
        
        const [data, total] = await Promise.all([
            model.find(query)
                .select(select)
                .populate(populate)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(lean),
            model.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext,
                hasPrev,
                nextPage: hasNext ? page + 1 : null,
                prevPage: hasPrev ? page - 1 : null
            }
        };
    }

    static async aggregatePaginate(model, pipeline, options = {}) {
        const {
            page = 1,
            limit = 10
        } = options;

        const skip = (page - 1) * limit;

        const paginationPipeline = [
            ...pipeline,
            { $facet: {
                metadata: [
                    { $count: 'total' }
                ],
                data: [
                    { $skip: skip },
                    { $limit: limit }
                ]
            }}
        ];

        const [result] = await model.aggregate(paginationPipeline);
        
        const total = result.metadata[0]?.total || 0;
        const data = result.data || [];
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext,
                hasPrev,
                nextPage: hasNext ? page + 1 : null,
                prevPage: hasPrev ? page - 1 : null
            }
        };
    }

    static cursorPaginate(model, query = {}, options = {}) {
        const {
            limit = 10,
            cursor = null,
            sortField = '_id',
            sortDirection = -1
        } = options;

        const sort = { [sortField]: sortDirection };
        const findQuery = { ...query };

        if (cursor) {
            findQuery[sortField] = sortDirection === -1 
                ? { $lt: cursor } 
                : { $gt: cursor };
        }

        return model.find(findQuery)
            .sort(sort)
            .limit(limit + 1) // Get one extra to check if there's more
            .lean();
    }
}

module.exports = Pagination;