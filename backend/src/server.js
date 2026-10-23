
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const db = require('./config/database');

// ===================================
// IMPORT ROUTES
// ===================================

// Authentication
const authRoutes = require('./routes/authRoutes');

// Account Management
const accountRoutes = require('./routes/accountRoutes');

// Admin
const classRoutes = require('./routes/classRoutes');
const studentRoutes = require('./routes/studentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const gradeRoutes = require('./routes/gradeRoutes');

// Teacher
const teacherRoutes = require('./routes/teacherRoutes');

// Student
const studentPortalRoutes = require('./routes/studentPortalRoutes');

// ===================================
// IMPORT MIDDLEWARE
// ===================================

const { allowRoles } = require('./middleware/auth');

const {
  metricsMiddleware,
  metricsHandler
} = require('./middleware/metrics');

// ===================================
// EXPRESS APPLICATION
// ===================================

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ===================================
// BASIC MIDDLEWARE
// ===================================

app.disable('x-powered-by');

app.use(helmet());

app.use(express.json({
  limit: '1mb'
}));

// ===================================
// PROMETHEUS MONITORING
// ===================================

app.use(metricsMiddleware);

app.get('/metrics', metricsHandler);

// ===================================
// SESSION SECRET VALIDATION
// ===================================

if (
  !process.env.SESSION_SECRET ||
  process.env.SESSION_SECRET.length < 32
) {
  throw new Error(
    'SESSION_SECRET chưa được cấu hình hoặc quá ngắn (tối thiểu 32 ký tự)'
  );
}

// ===================================
// MYSQL SESSION STORE
// ===================================

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  createDatabaseTable: true
});

// ===================================
// SESSION CONFIGURATION
// ===================================

// Local HTTP:
// SESSION_COOKIE_SECURE=false
//
// Production HTTPS:
// SESSION_COOKIE_SECURE=true

const secureCookie =
  process.env.SESSION_COOKIE_SECURE === 'true';

if (secureCookie) {
  app.set('trust proxy', 1);
}

app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// ===================================
// AUTHENTICATION API
// ===================================

// POST /api/auth/login
// GET  /api/auth/me
// POST /api/auth/logout

app.use('/api/auth', authRoutes);

// ===================================
// ACCOUNT MANAGEMENT API
// ===================================

// Chỉ Admin được quản lý tài khoản.
//
// GET    /api/accounts
// GET    /api/accounts/teachers
// POST   /api/accounts
// PUT    /api/accounts/:id
// POST   /api/accounts/:id/reset-password
// PATCH  /api/accounts/:id/status
// DELETE /api/accounts/:id

app.use(
  '/api/accounts',
  allowRoles('admin'),
  accountRoutes
);

// ===================================
// ADMIN API
// ===================================

// Admin quản lý lớp học
app.use(
  '/api/classes',
  allowRoles('admin'),
  classRoutes
);

// Admin quản lý sinh viên
app.use(
  '/api/students',
  allowRoles('admin'),
  studentRoutes
);

// Admin quản lý môn học
app.use(
  '/api/subjects',
  allowRoles('admin'),
  subjectRoutes
);

// Admin quản lý điểm số
app.use(
  '/api/grades',
  allowRoles('admin'),
  gradeRoutes
);

// ===================================
// TEACHER API
// ===================================

// Giáo viên chỉ được quản lý
// lớp và môn đã được phân công.
//
// GET /api/teacher/assignments
// GET /api/teacher/assignments/:id/students
// PUT /api/teacher/assignments/:id/students/:studentId/grade

app.use(
  '/api/teacher',
  allowRoles('teacher'),
  teacherRoutes
);

// ===================================
// STUDENT PORTAL API
// ===================================

// Sinh viên chỉ được xem
// hồ sơ và điểm của chính mình.
//
// GET /api/student-portal/profile
// GET /api/student-portal/grades

app.use(
  '/api/student-portal',
  allowRoles('student'),
  studentPortalRoutes
);

// ===================================
// BACKEND HEALTH CHECK
// ===================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    application: 'Student Management System',
    timestamp: new Date().toISOString()
  });
});

// ===================================
// MYSQL HEALTH CHECK
// ===================================

app.get('/api/health/db', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT 1 AS connected'
    );

    res.status(200).json({
      status: 'ok',
      database: 'connected',
      result: rows[0]
    });

  } catch (error) {
    console.error(
      'Database connection failed:',
      error.message
    );

    res.status(503).json({
      status: 'error',
      database: 'disconnected'
    });
  }
});

// ===================================
// 404 NOT FOUND
// ===================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Không tìm thấy đường dẫn'
  });
});

// ===================================
// GLOBAL ERROR HANDLER
// ===================================

app.use((err, req, res, next) => {
  console.error('Backend error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: 'Đã xảy ra lỗi hệ thống'
  });
});

// ===================================
// START SERVER
// ===================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Student Management API running on port ${PORT}`
  );

  console.log('Authentication: ENABLED');

  console.log(
    'Roles: ADMIN / TEACHER / STUDENT'
  );

  console.log('Account Management: ENABLED');

  console.log('Session Store: MySQL');
});
