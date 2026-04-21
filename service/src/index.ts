const express = require('express');
const cors = require('cors');
require('dotenv/config');
const swaggerUI = require('swagger-ui-express');
const swaggerDocs = require('./swagger/swagger');
const { requireAuth, requireRole } = require('./middleware/auth');

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const classRoutes = require('./routes/classRoutes');
const centerRoutes = require('./routes/centerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const debtRoutes = require('./routes/debtRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const superuserRoutes = require('./routes/superuserRoutes');
const testRoutes = require('./routes/testRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const discountRoutes = require('./routes/discountRoutes');
const refundRoutes = require('./routes/refundRoutes');
const paymentPlanRoutes = require('./routes/paymentPlanRoutes');
const savedFilterRoutes = require('./routes/savedFilterRoutes');
const searchRoutes = require('./routes/searchRoutes');
const importExportRoutes = require('./routes/importExportRoutes');
const parentRoutes = require('./routes/parentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const portalRoutes = require('./routes/portalRoutes');
const roomsRoutes = require('./routes/roomsRoutes');



const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// function to log the coming requests

app.use((req: any, res: any, next: any): void => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});
// Health check
app.get('/api/health', (req: any, res: any): void => {
  res.json({ status: 'OK', message: 'CRM Backend Server is running' });
});


// Swagger UI
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs, { explorer: true }));

// API Routes
// Auth routes (public - no authentication required)
app.post('/api/students/auth/login', require('./controllers/studentController').studentLogin);
app.post('/api/teachers/auth/login', require('./controllers/teacherController').teacherLogin);
app.post('/api/teachers/auth/payment-login', require('./controllers/teacherController').teacherPaymentLogin);
app.post('/api/superusers/auth/login', require('./controllers/superuserController').login);
app.post('/api/parents/auth/login', require('./modules/parents').parentLogin);

// Protected routes - require authentication + role-based access
// Students: superuser and teacher can manage; students can view own data via portal
app.use('/api/students', requireAuth, requireRole('superuser', 'teacher'), studentRoutes);

// Teachers: superuser only for management
app.use('/api/teachers', requireAuth, requireRole('superuser'), teacherRoutes);

// Classes: superuser and teacher
app.use('/api/classes', requireAuth, requireRole('superuser', 'teacher'), classRoutes);

// Centers: superuser only
app.use('/api/centers', requireAuth, requireRole('superuser'), centerRoutes);

// Payments: superuser only
app.use('/api/payments', requireAuth, paymentRoutes);

// Debts: superuser only
app.use('/api/debts', requireAuth, requireRole('superuser'), debtRoutes);

// Grades: superuser and teacher
app.use('/api/grades', requireAuth, requireRole('superuser', 'teacher'), gradeRoutes);

// Attendance: superuser and teacher
app.use('/api/attendance', requireAuth, requireRole('superuser', 'teacher'), attendanceRoutes);

// Assignments: superuser and teacher
app.use('/api/assignments', requireAuth, requireRole('superuser', 'teacher'), assignmentRoutes);

// Subjects: superuser and teacher
app.use('/api/subjects', requireAuth, requireRole('superuser', 'teacher'), subjectRoutes);

// Superusers: superuser only for management
app.use('/api/superusers', requireAuth, requireRole('superuser'), superuserRoutes);

// Tests: authenticated users (role checks are more granular inside routes)
app.use('/api/tests', requireAuth, testRoutes);

// Phase 1 / extended APIs (superuser unless noted)
app.use('/api/invoices', requireAuth, requireRole('superuser'), invoiceRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);
app.use('/api/audit-logs', requireAuth, requireRole('superuser'), auditLogRoutes);
app.use('/api/discounts', requireAuth, requireRole('superuser'), discountRoutes);
app.use('/api/refunds', requireAuth, requireRole('superuser'), refundRoutes);
app.use('/api/payment-plans', requireAuth, requireRole('superuser'), paymentPlanRoutes);
app.use('/api/saved-filters', requireAuth, savedFilterRoutes);
app.use('/api/search', requireAuth, requireRole('superuser', 'teacher'), searchRoutes);
app.use('/api/data', requireAuth, requireRole('superuser'), importExportRoutes);
app.use('/api/parents', requireAuth, parentRoutes);
app.use('/api/reports', requireAuth, requireRole('superuser'), reportRoutes);
app.use('/api/portal', requireAuth, requireRole('student'), portalRoutes);
app.use('/api/rooms', requireAuth, requireRole('superuser', 'teacher'), roomsRoutes);



// Error handling middleware
app.use((err: Error, req: any, res: any, next: any): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown - use a flag to prevent multiple calls
let isShuttingDown = false;

const gracefulShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('Shutting down gracefully...');
  const pool = require('../config/dbcon');
  
  server.close(async () => {
    try {
      await pool.end();
      console.log('Server and database pool closed');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export {};
