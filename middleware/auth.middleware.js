const jwt = require('jsonwebtoken');
const User = require('../models/user/User.model');
const UserSession = require('../models/user/UserSession.model');

const authMiddleware = {
    // Verify JWT token
    authenticate: async (req, res, next) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({ 
                    error: 'Authentication required' 
                });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Check if session exists and is active
            const session = await UserSession.findOne({
                sessionId: decoded.sessionId,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });

            if (!session) {
                return res.status(401).json({ 
                    error: 'Session expired or invalid' 
                });
            }

            // Get user
            const user = await User.findById(decoded.userId)
                .select('-auth.passwordHash -auth.twoFactorSecret')
                .populate('academic.collegeId', 'name code');

            if (!user || !user.isActive) {
                return res.status(401).json({ 
                    error: 'User not found or inactive' 
                });
            }

            // Check if user is banned/suspended
            if (user.moderation.isBanned) {
                return res.status(403).json({ 
                    error: 'Account is banned' 
                });
            }

            if (user.moderation.isSuspended && user.moderation.suspensionEnds > new Date()) {
                return res.status(403).json({ 
                    error: 'Account is suspended' 
                });
            }

            // Attach user and session to request
            req.user = user;
            req.session = session;
            
            // Update session activity
            session.updateActivity(req.path, req.method);
            await session.save();

            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    error: 'Invalid token' 
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired' 
                });
            }
            return res.status(500).json({ 
                error: 'Authentication failed' 
            });
        }
    },

    // Role-based authorization
    authorize: (roles = []) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ 
                    error: 'Authentication required' 
                });
            }

            // Convert string to array if needed
            const requiredRoles = Array.isArray(roles) ? roles : [roles];
            
            // Check if user has required role
            const userRole = req.user.academic.role;
            const hasRole = requiredRoles.includes(userRole);

            // Special check for college admin
            if (requiredRoles.includes('college_admin')) {
                const isCollegeAdmin = req.user._id.equals(req.user.academic.collegeId.admin);
                if (isCollegeAdmin) {
                    return next();
                }
            }

            if (!hasRole) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions' 
                });
            }

            next();
        };
    },

    // Check college membership
    checkCollegeAccess: (collegeIdParam = 'collegeId') => {
        return async (req, res, next) => {
            try {
                const collegeId = req.params[collegeIdParam] || req.body.collegeId;
                
                if (!collegeId) {
                    return res.status(400).json({ 
                        error: 'College ID required' 
                    });
                }

                // Super admin can access all colleges
                if (req.user.academic.role === 'super_admin') {
                    return next();
                }

                // Check if user belongs to this college
                if (!req.user.academic.collegeId.equals(collegeId)) {
                    return res.status(403).json({ 
                        error: 'Access denied to this college' 
                    });
                }

                next();
            } catch (error) {
                return res.status(500).json({ 
                    error: 'College access check failed' 
                });
            }
        };
    },

    // Optional authentication (for public endpoints)
    optionalAuth: async (req, res, next) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.userId)
                    .select('-auth.passwordHash')
                    .populate('academic.collegeId', 'name code');

                if (user && user.isActive) {
                    req.user = user;
                }
            }
            
            next();
        } catch (error) {
            // Invalid token, proceed without user
            next();
        }
    }
};

module.exports = authMiddleware;