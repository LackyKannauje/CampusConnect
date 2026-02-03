// const Department = require('../../models/college/Department.model');
// const College = require('../../models/college/College.model');
// const User = require('../../models/user/User.model');
// const Pagination = require('../../utils/pagination');
// const errorMiddleware  = require('../../middleware/error.middleware');

// const departmentController = {
//     // Get college departments
//     getCollegeDepartments: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;
//         const { activeOnly = true } = req.query;

//         const departments = await Department.findByCollege(collegeId, {
//             activeOnly: activeOnly !== 'false',
//             sortBy: 'name'
//         });

//         res.json({ departments });
//     }),

//     // Create department
//     createDepartment: errorMiddleware.catchAsync(async (req, res) => {
//         const { collegeId } = req.params;
//         const { code, name, description, hodId } = req.body;
//         const user = req.user;

//         const college = await College.findById(collegeId);
//         if (!college) {
//             return res.status(404).json({ error: 'College not found' });
//         }

//         // Check if department code already exists
//         const existingDept = await Department.findOne({
//             collegeId,
//             code: code.toUpperCase()
//         });

//         if (existingDept) {
//             return res.status(400).json({ error: 'Department code already exists' });
//         }

//         // Check college department limit
//         if (!college.canAddDepartment()) {
//             return res.status(400).json({ 
//                 error: 'College department limit reached' 
//             });
//         }

//         // Verify HOD if provided
//         let hod = null;
//         if (hodId) {
//             hod = await User.findOne({
//                 _id: hodId,
//                 'academic.collegeId': collegeId,
//                 'academic.role': 'faculty'
//             });

//             if (!hod) {
//                 return res.status(400).json({ 
//                     error: 'HOD must be a faculty member of this college' 
//                 });
//             }
//         }

//         // Create department
//         const department = new Department({
//             collegeId,
//             code: code.toUpperCase(),
//             name,
//             details: { description },
//             hod: hod?._id
//         });

//         await department.save();

//         // Add HOD as faculty if specified
//         if (hod) {
//             department.addFaculty(hod._id, 'Head of Department');
//             await department.save();

//             // Update user's department
//             hod.academic.departmentId = department._id;
//             hod.academic.departmentName = department.name;
//             await hod.save();
//         }

//         res.status(201).json({
//             message: 'Department created successfully',
//             department: {
//                 id: department._id,
//                 code: department.code,
//                 name: department.name,
//                 hod: hod ? {
//                     id: hod._id,
//                     name: hod.profile.fullName
//                 } : null
//             }
//         });
//     }),

//     // Get department by ID
//     getDepartmentById: errorMiddleware.catchAsync(async (req, res) => {
//         const { departmentId } = req.params;
//         const user = req.user;

//         const department = await Department.findById(departmentId)
//             .populate('hod', 'profile.firstName profile.lastName profile.avatar')
//             .populate('faculty.userId', 'profile.firstName profile.lastName profile.avatar academic.role');

//         if (!department || !department.status.isActive) {
//             return res.status(404).json({ error: 'Department not found' });
//         }

//         // Check if user belongs to this college
//         if (!user.academic.collegeId.equals(department.collegeId)) {
//             return res.status(403).json({ error: 'Access denied' });
//         }

//         const response = {
//             id: department._id,
//             code: department.code,
//             name: department.name,
//             details: department.details,
//             hod: department.hod ? {
//                 id: department.hod._id,
//                 name: department.hod.profile.fullName,
//                 avatar: department.hod.profile.avatar?.url
//             } : null,
//             faculty: department.faculty.filter(f => f.isActive).map(f => ({
//                 id: f.userId._id,
//                 name: f.userId.profile.fullName,
//                 avatar: f.userId.profile.avatar?.url,
//                 designation: f.designation,
//                 role: f.userId.academic.role
//             })),
//             students: department.students,
//             courses: department.courses,
//             placement: department.placement,
//             stats: department.stats,
//             settings: department.settings,
//             createdAt: department.createdAt
//         };

//         res.json(response);
//     }),

//     // Update department
//     updateDepartment: errorMiddleware.catchAsync(async (req, res) => {
//         const { departmentId } = req.params;
//         const updates = req.body;
//         const user = req.user;

//         const department = await Department.findById(departmentId);
//         if (!department) {
//             return res.status(404).json({ error: 'Department not found' });
//         }

//         // Check permissions
//         const isCollegeAdmin = user.academic.role === 'college_admin' || 
//                               user.academic.role === 'admin';
//         const isHOD = department.hod && department.hod.equals(user._id);

//         if (!isCollegeAdmin && !isHOD) {
//             return res.status(403).json({ error: 'Not authorized to update department' });
//         }

//         // Update allowed fields
//         if (updates.name) department.name = updates.name;
//         if (updates.details) department.details = { ...department.details, ...updates.details };
//         if (updates.settings && (isCollegeAdmin || updates.settings.visibility)) {
//             department.settings = { ...department.settings, ...updates.settings };
//         }

//         // Update HOD (college admin only)
//         if (updates.hodId && isCollegeAdmin) {
//             const newHOD = await User.findOne({
//                 _id: updates.hodId,
//                 'academic.collegeId': department.collegeId,
//                 'academic.role': 'faculty'
//             });

//             if (!newHOD) {
//                 return res.status(400).json({ 
//                     error: 'HOD must be a faculty member of this college' 
//                 });
//             }

//             // Remove old HOD designation if exists
//             if (department.hod) {
//                 department.removeFaculty(department.hod);
//             }

//             // Set new HOD
//             department.hod = newHOD._id;
//             department.addFaculty(newHOD._id, 'Head of Department');

//             // Update user's department
//             newHOD.academic.departmentId = department._id;
//             newHOD.academic.departmentName = department.name;
//             await newHOD.save();
//         }

//         await department.save();

//         res.json({
//             message: 'Department updated successfully',
//             department: {
//                 id: department._id,
//                 code: department.code,
//                 name: department.name,
//                 hod: department.hod ? { id: department.hod } : null
//             }
//         });
//     }),

//     // Delete department
//     deleteDepartment: errorMiddleware.catchAsync(async (req, res) => {
//         const { departmentId } = req.params;
//         const user = req.user;

//         const department = await Department.findById(departmentId);
//         if (!department) {
//             return res.status(404).json({ error: 'Department not found' });
//         }

//         // Check if department has members
//         if (department.students.current.count > 0 || department.faculty.length > 0) {
//             return res.status(400).json({ 
//                 error: 'Cannot delete department with members' 
//             });
//         }

//         await department.deleteOne();

//         res.json({ message: 'Department deleted successfully' });
//     }),

//     // Get department members
//     getDepartmentMembers: errorMiddleware.catchAsync(async (req, res) => {
//         const { departmentId } = req.params;
//         const { role, batch } = req.query;

//         const department = await Department.findById(departmentId);
//         if (!department) {
//             return res.status(404).json({ error: 'Department not found' });
//         }

//         let query = {
//             'academic.departmentId': departmentId,
//             isActive: true
//         };

//         if (role) query['academic.role'] = role;
//         if (batch) query['academic.batch.name'] = batch;

//         const result = await Pagination.paginate(User, query, {
//             page: req.pagination.page,
//             limit: req.pagination.limit,
//             select: 'profile.firstName profile.lastName profile.avatar academic.role academic.batch academic.rollNumber',
//             sort: { 'profile.firstName': 1 }
//         });

//         res.json(result);
//     }),

//     // Add department member
//     addDepartmentMember: errorMiddleware.catchAsync(async (req, res) => {
//         const { departmentId, userId } = req.params;
//         const { designation } = req.body;

//         const department = await Department.findById(departmentId);
//         if (!department) {
//             return res.status(404).json({ error: 'Department not found' });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Check if user belongs to same college
//         if (!user.academic.collegeId.equals(department.collegeId)) {
//             return res.status(400).json({ 
//                 error: 'User must belong to the same college' 
//             });
//         }

//         // Add based on user role
//         let added = false;
//         if (user.academic.role === 'faculty') {
//             added = department.addFaculty(userId, designation || 'Faculty');
//             if (added) {
//                 user.academic.departmentId = departmentId;
//                 user.academic.departmentName = department.name;
//                 await user.save();
//             }
//         } else if (user.academic.role === 'student') {
//             // For students, we track in department stats
//             department.addStudent(user.academic.batch?.name || 'Unknown');
//             added = true;
            
//             user.academic.departmentId = departmentId;
//             user.academic.departmentName = department.name;
//             await user.save();
//         }

//         if (!added) {
//             return res.status(400).json({ error: 'User already in department or invalid role' });
//         }

//         await department.save();

//         res.json({ 
//             message: 'Member added to department successfully',
//             member: {
//                 id: user._id,
//                 name: user.profile.fullName,
//                 role: user.academic.role,
//                 department: department.name
//             }
//         });
//     }),

//     // Remove department member
//     removeDepartmentMember: errorMiddleware.catchAsync(async (req, res) => {
//         const { departmentId, userId } = req.params;

//         const department = await Department.findById(departmentId);
//         if (!department) {
//             return res.status(404).json({ error: 'Department not found' });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Check if user is HOD
//         if (department.hod && department.hod.equals(userId)) {
//             return res.status(400).json({ 
//                 error: 'Cannot remove HOD. Assign new HOD first.' 
//             });
//         }

//         let removed = false;
//         if (user.academic.role === 'faculty') {
//             removed = department.removeFaculty(userId);
//         }

//         if (removed || user.academic.role === 'student') {
//             user.academic.departmentId = null;
//             user.academic.departmentName = '';
//             await user.save();
//             removed = true;
//         }

//         if (!removed) {
//             return res.status(400).json({ error: 'User not found in department' });
//         }

//         await department.save();

//         res.json({ message: 'Member removed from department successfully' });
//     })
// };

// module.exports = departmentController;

const Department = require('../../models/college/Department.model');
const College = require('../../models/college/College.model');
const User = require('../../models/user/User.model');
const Analytics = require('../../models/analytics/Analytics.model');
const Pagination = require('../../utils/pagination');
const errorMiddleware  = require('../../middleware/error.middleware');

const departmentController = {
    // Get college departments
    getCollegeDepartments: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const { activeOnly = true } = req.query;

        const departments = await Department.findByCollege(collegeId, {
            activeOnly: activeOnly !== 'false',
            sortBy: 'name'
        });

        res.json({ departments });
    }),

    // Create department
    createDepartment: errorMiddleware.catchAsync(async (req, res) => {
        const { collegeId } = req.params;
        const { code, name, description, hodId } = req.body;
        const user = req.user;

        const college = await College.findById(collegeId);
        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        // Check if department code already exists
        const existingDept = await Department.findOne({
            collegeId,
            code: code.toUpperCase()
        });

        if (existingDept) {
            return res.status(400).json({ error: 'Department code already exists' });
        }

        // Check college department limit
        if (!college.canAddDepartment()) {
            return res.status(400).json({ 
                error: 'College department limit reached' 
            });
        }

        // Verify HOD if provided
        let hod = null;
        if (hodId) {
            hod = await User.findOne({
                _id: hodId,
                'academic.collegeId': collegeId,
                'academic.role': 'faculty'
            });

            if (!hod) {
                return res.status(400).json({ 
                    error: 'HOD must be a faculty member of this college' 
                });
            }
        }

        // Create department
        const department = new Department({
            collegeId,
            code: code.toUpperCase(),
            name,
            details: { description },
            hod: hod?._id
        });

        await department.save();

        // Add HOD as faculty if specified
        if (hod) {
            department.addFaculty(hod._id, 'Head of Department');
            await department.save();

            // Update user's department
            hod.academic.departmentId = department._id;
            hod.academic.departmentName = department.name;
            await hod.save();
        }

        // Track department creation in analytics
        await updateDepartmentAnalytics(collegeId, department._id, 'department_created', {
            createdBy: user._id,
            hasHod: !!hod
        });

        res.status(201).json({
            message: 'Department created successfully',
            department: {
                id: department._id,
                code: department.code,
                name: department.name,
                hod: hod ? {
                    id: hod._id,
                    name: hod.profile.fullName
                } : null
            }
        });
    }),

    // Get department by ID
    getDepartmentById: errorMiddleware.catchAsync(async (req, res) => {
        const { departmentId } = req.params;
        const user = req.user;

        const department = await Department.findById(departmentId)
            .populate('hod', 'profile.firstName profile.lastName profile.avatar')
            .populate('faculty.userId', 'profile.firstName profile.lastName profile.avatar academic.role');

        if (!department || !department.status.isActive) {
            return res.status(404).json({ error: 'Department not found' });
        }

        // Check if user belongs to this college
        if (!user.academic.collegeId.equals(department.collegeId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const response = {
            id: department._id,
            code: department.code,
            name: department.name,
            details: department.details,
            hod: department.hod ? {
                id: department.hod._id,
                name: department.hod.profile.fullName,
                avatar: department.hod.profile.avatar?.url
            } : null,
            faculty: department.faculty.filter(f => f.isActive).map(f => ({
                id: f.userId._id,
                name: f.userId.profile.fullName,
                avatar: f.userId.profile.avatar?.url,
                designation: f.designation,
                role: f.userId.academic.role
            })),
            students: department.students,
            courses: department.courses,
            placement: department.placement,
            stats: department.stats,
            settings: department.settings,
            createdAt: department.createdAt
        };

        res.json(response);
    }),

    // Update department
    updateDepartment: errorMiddleware.catchAsync(async (req, res) => {
        const { departmentId } = req.params;
        const updates = req.body;
        const user = req.user;

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        // Check permissions
        const isCollegeAdmin = user.academic.role === 'college_admin' || 
                              user.academic.role === 'admin';
        const isHOD = department.hod && department.hod.equals(user._id);

        if (!isCollegeAdmin && !isHOD) {
            return res.status(403).json({ error: 'Not authorized to update department' });
        }

        // Update allowed fields
        if (updates.name) department.name = updates.name;
        if (updates.details) department.details = { ...department.details, ...updates.details };
        if (updates.settings && (isCollegeAdmin || updates.settings.visibility)) {
            department.settings = { ...department.settings, ...updates.settings };
        }

        // Update HOD (college admin only)
        if (updates.hodId && isCollegeAdmin) {
            const newHOD = await User.findOne({
                _id: updates.hodId,
                'academic.collegeId': department.collegeId,
                'academic.role': 'faculty'
            });

            if (!newHOD) {
                return res.status(400).json({ 
                    error: 'HOD must be a faculty member of this college' 
                });
            }

            // Remove old HOD designation if exists
            if (department.hod) {
                department.removeFaculty(department.hod);
            }

            // Set new HOD
            department.hod = newHOD._id;
            department.addFaculty(newHOD._id, 'Head of Department');

            // Update user's department
            newHOD.academic.departmentId = department._id;
            newHOD.academic.departmentName = department.name;
            await newHOD.save();

            // Track HOD change in analytics
            await updateDepartmentAnalytics(department.collegeId, departmentId, 'hod_changed', {
                oldHod: department.hod,
                newHod: newHOD._id
            });
        }

        await department.save();

        // Track department update in analytics
        if (Object.keys(updates).length > 0) {
            await updateDepartmentAnalytics(department.collegeId, departmentId, 'department_updated', {
                updatedBy: user._id,
                updatedFields: Object.keys(updates)
            });
        }

        res.json({
            message: 'Department updated successfully',
            department: {
                id: department._id,
                code: department.code,
                name: department.name,
                hod: department.hod ? { id: department.hod } : null
            }
        });
    }),

    // Delete department
    deleteDepartment: errorMiddleware.catchAsync(async (req, res) => {
        const { departmentId } = req.params;
        const user = req.user;

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        // Check if department has members
        if (department.students.current.count > 0 || department.faculty.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete department with members' 
            });
        }

        // Track department deletion in analytics
        await updateDepartmentAnalytics(department.collegeId, departmentId, 'department_deleted', {
            deletedBy: user._id,
            facultyCount: department.faculty.length,
            studentCount: department.students.current.count
        });

        await department.deleteOne();

        res.json({ message: 'Department deleted successfully' });
    }),

    // Get department members
    getDepartmentMembers: errorMiddleware.catchAsync(async (req, res) => {
        const { departmentId } = req.params;
        const { role, batch } = req.query;

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        let query = {
            'academic.departmentId': departmentId,
            isActive: true
        };

        if (role) query['academic.role'] = role;
        if (batch) query['academic.batch.name'] = batch;

        const result = await Pagination.paginate(User, query, {
            page: req.pagination.page,
            limit: req.pagination.limit,
            select: 'profile.firstName profile.lastName profile.avatar academic.role academic.batch academic.rollNumber',
            sort: { 'profile.firstName': 1 }
        });

        res.json(result);
    }),

    // Add department member
    addDepartmentMember: errorMiddleware.catchAsync(async (req, res) => {
        const { departmentId, userId } = req.params;
        const { designation } = req.body;

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user belongs to same college
        if (!user.academic.collegeId.equals(department.collegeId)) {
            return res.status(400).json({ 
                error: 'User must belong to the same college' 
            });
        }

        // Add based on user role
        let added = false;
        if (user.academic.role === 'faculty') {
            added = department.addFaculty(userId, designation || 'Faculty');
            if (added) {
                user.academic.departmentId = departmentId;
                user.academic.departmentName = department.name;
                await user.save();
            }
        } else if (user.academic.role === 'student') {
            // For students, we track in department stats
            department.addStudent(user.academic.batch?.name || 'Unknown');
            added = true;
            
            user.academic.departmentId = departmentId;
            user.academic.departmentName = department.name;
            await user.save();
        }

        if (!added) {
            return res.status(400).json({ error: 'User already in department or invalid role' });
        }

        await department.save();

        // Track member addition in analytics
        await updateDepartmentAnalytics(department.collegeId, departmentId, 'member_added', {
            userId: user._id,
            userRole: user.academic.role,
            designation: designation || 'none'
        });

        res.json({ 
            message: 'Member added to department successfully',
            member: {
                id: user._id,
                name: user.profile.fullName,
                role: user.academic.role,
                department: department.name
            }
        });
    }),

    // Remove department member
    removeDepartmentMember: errorMiddleware.catchAsync(async (req, res) => {
        const { departmentId, userId } = req.params;

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user is HOD
        if (department.hod && department.hod.equals(userId)) {
            return res.status(400).json({ 
                error: 'Cannot remove HOD. Assign new HOD first.' 
            });
        }

        let removed = false;
        if (user.academic.role === 'faculty') {
            removed = department.removeFaculty(userId);
        }

        if (removed || user.academic.role === 'student') {
            user.academic.departmentId = null;
            user.academic.departmentName = '';
            await user.save();
            removed = true;
        }

        if (!removed) {
            return res.status(400).json({ error: 'User not found in department' });
        }

        await department.save();

        // Track member removal in analytics
        await updateDepartmentAnalytics(department.collegeId, departmentId, 'member_removed', {
            userId: user._id,
            userRole: user.academic.role
        });

        res.json({ message: 'Member removed from department successfully' });
    })
};

// Analytics Helper Function
async function updateDepartmentAnalytics(collegeId, departmentId, metric, details = {}) {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Find or create analytics record for the college
        let analytics = await Analytics.findOne({
            collegeId,
            period: 'daily',
            timestamp: { 
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!analytics) {
            analytics = new Analytics({
                collegeId,
                period: 'daily',
                timestamp: today,
                users: { total: 0, active: 0, new: 0 },
                content: { total: 0 },
                engagement: { totalInteractions: 0 }
            });
        }

        // Update department-related metrics
        switch (metric) {
            case 'department_created':
                if (!analytics.users.byDepartment) {
                    analytics.users.byDepartment = new Map();
                }
                analytics.users.byDepartment.set(departmentId.toString(), {
                    name: details.name || 'New Department',
                    faculty: 0,
                    students: 0
                });
                break;
                
            case 'member_added':
                if (details.userRole === 'faculty') {
                    // Increment faculty count in department
                    if (analytics.users.byDepartment && analytics.users.byDepartment.has(departmentId.toString())) {
                        const deptData = analytics.users.byDepartment.get(departmentId.toString());
                        deptData.faculty = (deptData.faculty || 0) + 1;
                        analytics.users.byDepartment.set(departmentId.toString(), deptData);
                    }
                    analytics.users.faculty = (analytics.users.faculty || 0) + 1;
                } else if (details.userRole === 'student') {
                    // Increment student count in department
                    if (analytics.users.byDepartment && analytics.users.byDepartment.has(departmentId.toString())) {
                        const deptData = analytics.users.byDepartment.get(departmentId.toString());
                        deptData.students = (deptData.students || 0) + 1;
                        analytics.users.byDepartment.set(departmentId.toString(), deptData);
                    }
                }
                break;
                
            case 'member_removed':
                if (details.userRole === 'faculty') {
                    // Decrement faculty count in department
                    if (analytics.users.byDepartment && analytics.users.byDepartment.has(departmentId.toString())) {
                        const deptData = analytics.users.byDepartment.get(departmentId.toString());
                        deptData.faculty = Math.max(0, (deptData.faculty || 1) - 1);
                        analytics.users.byDepartment.set(departmentId.toString(), deptData);
                    }
                    analytics.users.faculty = Math.max(0, (analytics.users.faculty || 1) - 1);
                }
                break;
        }

        await analytics.save();
    } catch (error) {
        console.error('Error updating department analytics:', error);
    }
}

module.exports = departmentController;