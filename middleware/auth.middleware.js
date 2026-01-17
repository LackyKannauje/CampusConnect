// const jwt = require('jsonwebtoken');
// const User = require('../models/user/User.model');
// const UserSession = require('../models/user/UserSession.model');

// const authMiddleware = {
//     // Verify JWT token
//     authenticate: async (req, res, next) => {
//         try {
//             const token = req.headers.authorization?.replace('Bearer ', '');
            
//             if (!token) {
//                 return res.status(401).json({ 
//                     error: 'Authentication required' 
//                 });
//             }

//             // Verify token
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
//             // Check if session exists and is active
//             const session = await UserSession.findOne({
//                 sessionId: decoded.sessionId,
//                 isActive: true,
//                 expiresAt: { $gt: new Date() }
//             });

//             if (!session) {
//                 return res.status(401).json({ 
//                     error: 'Session expired or invalid' 
//                 });
//             }

//             // Get user
//             const user = await User.findById(decoded.userId)
//                 .select('-auth.passwordHash -auth.twoFactorSecret')
//                 .populate('academic.collegeId', 'name code');

//             if (!user || !user.isActive) {
//                 return res.status(401).json({ 
//                     error: 'User not found or inactive' 
//                 });
//             }

//             // Check if user is banned/suspended
//             if (user.moderation.isBanned) {
//                 return res.status(403).json({ 
//                     error: 'Account is banned' 
//                 });
//             }

//             if (user.moderation.isSuspended && user.moderation.suspensionEnds > new Date()) {
//                 return res.status(403).json({ 
//                     error: 'Account is suspended' 
//                 });
//             }

//             // Attach user and session to request
//             req.user = user;
//             req.session = session;
            
//             // Update session activity
//             session.updateActivity(req.path, req.method);
//             await session.save();

//             next();
//         } catch (error) {
//             if (error.name === 'JsonWebTokenError') {
//                 return res.status(401).json({ 
//                     error: 'Invalid token' 
//                 });
//             }
//             if (error.name === 'TokenExpiredError') {
//                 return res.status(401).json({ 
//                     error: 'Token expired' 
//                 });
//             }
//             return res.status(500).json({ 
//                 error: 'Authentication failed' 
//             });
//         }
//     },

//     // Role-based authorization
//     authorize: (roles = []) => {
//         return (req, res, next) => {
//             if (!req.user) {
//                 return res.status(401).json({ 
//                     error: 'Authentication required' 
//                 });
//             }

//             // Convert string to array if needed
//             const requiredRoles = Array.isArray(roles) ? roles : [roles];
            
//             // Check if user has required role
//             const userRole = req.user.academic.role;
//             const hasRole = requiredRoles.includes(userRole);

//             // Special check for college admin
//             if (requiredRoles.includes('college_admin')) {
//                 const isCollegeAdmin = req.user._id.equals(req.user.academic.collegeId.admin);
//                 if (isCollegeAdmin) {
//                     return next();
//                 }
//             }

//             if (!hasRole) {
//                 return res.status(403).json({ 
//                     error: 'Insufficient permissions' 
//                 });
//             }

//             next();
//         };
//     },

//     // Check college membership
//     checkCollegeAccess: (collegeIdParam = 'collegeId') => {
//         return async (req, res, next) => {
//             try {
//                 const collegeId = req.params[collegeIdParam] || req.body.collegeId;
                
//                 if (!collegeId) {
//                     return res.status(400).json({ 
//                         error: 'College ID required' 
//                     });
//                 }

//                 // Super admin can access all colleges
//                 if (req.user.academic.role === 'super_admin') {
//                     return next();
//                 }

//                 // Check if user belongs to this college
//                 if (!req.user.academic.collegeId.equals(collegeId)) {
//                     return res.status(403).json({ 
//                         error: 'Access denied to this college' 
//                     });
//                 }

//                 next();
//             } catch (error) {
//                 return res.status(500).json({ 
//                     error: 'College access check failed' 
//                 });
//             }
//         };
//     },

//     // Optional authentication (for public endpoints)
//     optionalAuth: async (req, res, next) => {
//         try {
//             const token = req.headers.authorization?.replace('Bearer ', '');
            
//             if (token) {
//                 const decoded = jwt.verify(token, process.env.JWT_SECRET);
//                 const user = await User.findById(decoded.userId)
//                     .select('-auth.passwordHash')
//                     .populate('academic.collegeId', 'name code');

//                 if (user && user.isActive) {
//                     req.user = user;
//                 }
//             }
            
//             next();
//         } catch (error) {
//             // Invalid token, proceed without user
//             next();
//         }
//     }
// };

// module.exports = authMiddleware;

const jwt = require('jsonwebtoken');
const User = require('../models/user/User.model');
const UserSession = require('../models/user/UserSession.model');

// Role hierarchy configuration (higher number = higher privilege)
const ROLE_HIERARCHY = {
    'super_admin': 1000,
    'admin': 900,
    'college_admin': 800,
    'moderator': 700,
    'faculty': 600,
    'alumni': 300,
    'student': 200,
    'guest': 100
};

// Permission matrix for special permissions
const PERMISSION_MATRIX = {
    'super_admin': {
        can_manage_all_colleges: true,
        can_manage_users: true,
        can_manage_content: true,
        can_view_analytics: true,
        can_moderate: true,
        can_configure_system: true
    },
    'admin': {
        can_manage_users: true,
        can_manage_content: true,
        can_view_analytics: true,
        can_moderate: true
    },
    'college_admin': {
        can_manage_college_users: true,
        can_manage_college_content: true,
        can_view_college_analytics: true,
        can_moderate_college: true
    },
    'moderator': {
        can_moderate_content: true,
        can_view_reports: true
    },
    'faculty': {
        can_create_courses: true,
        can_manage_students: true,
        can_post_announcements: true
    },
    'student': {
        can_post_content: true,
        can_comment: true,
        can_join_groups: true
    },
    'alumni': {
        can_post_content: true,
        can_comment: true,
        can_view_alumni_content: true
    }
};

const authMiddleware = {
    // Verify JWT token
    authenticate: async (req, res, next) => {
        try {
            // Get token from various sources
            let token = req.headers.authorization?.replace('Bearer ', '');
            
            // Also check cookies for token (for web clients)
            if (!token && req.cookies?.token) {
                token = req.cookies.token;
            }

            if (!token) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Verify token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch (jwtError) {
                if (jwtError.name === 'TokenExpiredError') {
                    return res.status(401).json({ 
                        success: false,
                        error: 'Session expired. Please login again.',
                        code: 'TOKEN_EXPIRED'
                    });
                }
                return res.status(401).json({ 
                    success: false,
                    error: 'Invalid authentication token',
                    code: 'INVALID_TOKEN'
                });
            }

            // Check session validity
            const session = await UserSession.findOne({
                sessionId: decoded.sessionId,
                isActive: true,
                expiresAt: { $gt: new Date() }
            }).populate('userId', 'academic.collegeId');

            if (!session) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Session invalid or expired',
                    code: 'SESSION_INVALID'
                });
            }

            // Get user with necessary data
            const user = await User.findById(decoded.userId)
                .select('-auth.passwordHash -auth.twoFactorSecret -auth.loginHistory')
                .populate({
                    path: 'academic.collegeId',
                    select: 'name code admin status'
                })
                .populate({
                    path: 'academic.departmentId',
                    select: 'name code head'
                });

            if (!user) {
                return res.status(401).json({ 
                    success: false,
                    error: 'User account not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Check user status
            if (!user.isActive) {
                return res.status(403).json({ 
                    success: false,
                    error: 'Account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED'
                });
            }

            if (user.moderation?.isBanned) {
                return res.status(403).json({ 
                    success: false,
                    error: 'Account is permanently banned',
                    code: 'ACCOUNT_BANNED'
                });
            }

            if (user.moderation?.isSuspended && user.moderation.suspensionEnds > new Date()) {
                const suspensionEnds = new Date(user.moderation.suspensionEnds);
                const timeLeft = Math.ceil((suspensionEnds - new Date()) / (1000 * 60 * 60 * 24));
                return res.status(403).json({ 
                    success: false,
                    error: `Account is suspended. Suspension ends in ${timeLeft} day(s).`,
                    code: 'ACCOUNT_SUSPENDED',
                    suspensionEnds: suspensionEnds
                });
            }

            // Attach user and session to request
            req.user = user;
            req.session = session;
            req.userId = user._id;
            req.userRole = user.academic?.role;
            req.collegeId = user.academic?.collegeId?._id;

            // // Update session activity (async, don't wait)
            // session.updateActivity(req.ip, req.method, req.path).catch(console.error);
            // Update session activity
            try {
                if (session.updateActivity && typeof session.updateActivity === 'function') {
                    session.updateActivity(req.path, req.method);
                    session.save().catch(err => console.error('Session save error:', err));
                }
            } catch (updateError) {
                console.error('Session update error:', updateError);
            }

            // Add request timing for rate limiting
            req.requestTime = Date.now();

            next();
        } catch (error) {
            console.error('Authentication error:', error);
            
            // Log security events
            if (error.name === 'JsonWebTokenError') {
                console.warn('JWT validation failed:', {
                    ip: req.ip,
                    path: req.path,
                    error: error.message
                });
            }

            return res.status(500).json({ 
                success: false,
                error: 'Authentication failed',
                code: 'AUTH_FAILED'
            });
        }
    },

    // Enhanced Role-based authorization with hierarchy
    authorize: (roles = [], options = {}) => {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ 
                        success: false,
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                }

                const user = req.user;
                const userRole = user.academic?.role;
                
                if (!userRole) {
                    return res.status(403).json({ 
                        success: false,
                        error: 'User role not defined',
                        code: 'ROLE_UNDEFINED'
                    });
                }

                // Convert roles to array if needed
                const requiredRoles = Array.isArray(roles) ? roles : [roles];
                
                // If no roles specified, allow any authenticated user
                if (requiredRoles.length === 0 && !options.requireAnyRole) {
                    return next();
                }

                // Get user's role hierarchy level
                const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;

                // Check permissions based on hierarchy
                let hasPermission = false;
                let permissionReason = '';

                // SUPER_ADMIN always has access (unless explicitly restricted)
                if (userRole === 'super_admin' && !options.bypassSuperAdmin) {
                    hasPermission = true;
                    permissionReason = 'super_admin_privilege';
                }

                // Check role hierarchy if not already authorized
                if (!hasPermission && requiredRoles.length > 0) {
                    for (const requiredRole of requiredRoles) {
                        const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;
                        
                        // User has permission if their role level >= required role level
                        if (userRoleLevel >= requiredRoleLevel) {
                            hasPermission = true;
                            permissionReason = `role_hierarchy_${userRole}_>=_${requiredRole}`;
                            break;
                        }
                    }
                }

                // Check explicit role match (if hierarchy didn't grant access)
                if (!hasPermission && requiredRoles.includes(userRole)) {
                    hasPermission = true;
                    permissionReason = 'exact_role_match';
                }

                // Special permission: college_admin (can be a role OR user is college admin)
                if (!hasPermission && requiredRoles.includes('college_admin')) {
                    const college = user.academic?.collegeId;
                    if (college && college.admin && college.admin.equals(user._id)) {
                        hasPermission = true;
                        permissionReason = 'college_admin_privilege';
                    }
                }

                // Special permission: department head
                if (!hasPermission && requiredRoles.includes('department_head')) {
                    const department = user.academic?.departmentId;
                    if (department && department.head && department.head.equals(user._id)) {
                        hasPermission = true;
                        permissionReason = 'department_head_privilege';
                    }
                }

                // Check custom permissions from options
                if (!hasPermission && options.requirePermissions) {
                    const userPermissions = PERMISSION_MATRIX[userRole] || {};
                    const hasAllPermissions = options.requirePermissions.every(
                        perm => userPermissions[perm] === true
                    );
                    
                    if (hasAllPermissions) {
                        hasPermission = true;
                        permissionReason = 'custom_permissions';
                    }
                }

                // Check ownership (for resources owned by user)
                if (!hasPermission && options.checkOwnership) {
                    const resourceUserId = req[options.ownershipParam || 'params']?.userId;
                    if (resourceUserId && resourceUserId === user._id.toString()) {
                        hasPermission = true;
                        permissionReason = 'resource_ownership';
                    }
                }

                // If still no permission, check if any role is acceptable
                if (!hasPermission && options.requireAnyRole) {
                    hasPermission = true;
                    permissionReason = 'any_role_accepted';
                }

                // Log authorization attempts (for audit trail)
                if (process.env.NODE_ENV === 'production' && !hasPermission) {
                    console.warn('Authorization failed:', {
                        userId: user._id,
                        userRole: userRole,
                        requiredRoles: requiredRoles,
                        path: req.path,
                        method: req.method,
                        ip: req.ip,
                        timestamp: new Date().toISOString()
                    });
                }

                if (!hasPermission) {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        userRole: userRole,
                        requiredRoles: requiredRoles.length > 0 ? requiredRoles : undefined,
                        hint: 'Contact administrator for access'
                    });
                }

                // Store permission info for downstream middleware
                req.permissionInfo = {
                    granted: true,
                    reason: permissionReason,
                    userRole: userRole,
                    requiredRoles: requiredRoles
                };

                next();
            } catch (error) {
                console.error('Authorization error:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Authorization check failed',
                    code: 'AUTHORIZATION_FAILED'
                });
            }
        };
    },

    // Check college membership with enhanced features
    checkCollegeAccess: (options = {}) => {
        return async (req, res, next) => {
            try {
                const user = req.user;
                const collegeId = req.params.collegeId || req.body.collegeId || options.collegeIdParam;
                
                if (!collegeId) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'College ID required',
                        code: 'COLLEGE_ID_REQUIRED'
                    });
                }

                // SUPER_ADMIN can access all colleges
                if (user.academic?.role === 'super_admin' && !options.restrictSuperAdmin) {
                    req.collegeAccess = {
                        granted: true,
                        reason: 'super_admin_access',
                        collegeId: collegeId
                    };
                    return next();
                }

                // ADMIN can access their assigned college(s)
                if (user.academic?.role === 'admin') {
                    // Check if admin is assigned to this specific college
                    // You might want to add an admin.colleges array to User model
                    if (user.academic?.collegeId?.equals(collegeId)) {
                        req.collegeAccess = {
                            granted: true,
                            reason: 'admin_access',
                            collegeId: collegeId
                        };
                        return next();
                    }
                }

                // Check if user belongs to this college
                if (!user.academic?.collegeId?.equals(collegeId)) {
                    return res.status(403).json({ 
                        success: false,
                        error: 'Access denied to this college',
                        code: 'COLLEGE_ACCESS_DENIED',
                        userCollege: user.academic?.collegeId,
                        requestedCollege: collegeId
                    });
                }

                // Check if college is active (if college data is populated)
                if (user.academic?.collegeId?.status === 'inactive') {
                    return res.status(403).json({ 
                        success: false,
                        error: 'College is inactive',
                        code: 'COLLEGE_INACTIVE'
                    });
                }

                req.collegeAccess = {
                    granted: true,
                    reason: 'college_member',
                    collegeId: collegeId
                };

                next();
            } catch (error) {
                console.error('College access check error:', error);
                return res.status(500).json({ 
                    success: false,
                    error: 'College access verification failed',
                    code: 'COLLEGE_CHECK_FAILED'
                });
            }
        };
    },

    // Optional authentication (for public endpoints)
    optionalAuth: async (req, res, next) => {
        try {
            let token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token && req.cookies?.token) {
                token = req.cookies.token;
            }

            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    
                    const user = await User.findById(decoded.userId)
                        .select('-auth.passwordHash -auth.twoFactorSecret')
                        .populate('academic.collegeId', 'name code status');

                    if (user && user.isActive && !user.moderation?.isBanned) {
                        req.user = user;
                        req.userId = user._id;
                        req.userRole = user.academic?.role;
                        req.collegeId = user.academic?.collegeId?._id;
                        
                        // Check for temporary suspensions
                        if (user.moderation?.isSuspended && user.moderation.suspensionEnds > new Date()) {
                            // User is suspended but we still attach for read-only access if needed
                            req.userSuspended = true;
                        }
                    }
                } catch (jwtError) {
                    // Invalid token, proceed without user
                    console.debug('Optional auth token invalid:', jwtError.message);
                }
            }
            
            next();
        } catch (error) {
            console.error('Optional auth error:', error);
            // Don't fail the request for optional auth errors
            next();
        }
    },
};

module.exports = authMiddleware;