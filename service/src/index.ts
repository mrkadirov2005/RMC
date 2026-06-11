require('reflect-metadata');
require('dotenv/config');

const { ensureDatabaseAndMigrate } = require('./db/ensureDatabaseAndMigrate');

async function main() {
  // Must happen before requiring modules that connect to Postgres at import-time.
  await ensureDatabaseAndMigrate();

  const express = require('express');
  const cors = require('cors');
  const swaggerUI = require('swagger-ui-express');
  const swaggerDocs = require('./swagger/swagger');
  const { requireAuth, requireRole, requireOwner } = require('./middleware/auth');
  const { validateBody } = require('./middleware/validation');
  const { CredentialsDto } = require('./dtos/request.dto');
  const { initMongo, closeMongo } = require('./db/mongo');
  const { requestLogger } = require('./middleware/requestLogger');

  // Import routes (after DB bootstrap)
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
  const ownerRoutes = require('./routes/ownerRoutes');
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
  const requestLogRoutes = require('./routes/requestLogRoutes');
  const translationRoutes = require('./routes/translationRoutes');
  const systemRoutes = require('./routes/systemRoutes');
  const archiveRoutes = require('./routes/archiveRoutes');

  const app = express();
  const PORT = process.env.PORT || 4000;
  const BODY_LIMIT = process.env.BODY_LIMIT || '25mb';

  app.use(cors());
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
  // Request logging (MongoDB). Logs once per request on response finish/abort.
  app.use(requestLogger);

  // Init Mongo connection + indexes in the background.
  // If Mongo is unavailable, the API will still work; it will just skip request log inserts.
  void initMongo().catch((err: any) => {
    console.warn('[mongo] init failed:', err?.message || err);
  });

  // Health check
  app.get('/api/health', (req: any, res: any): void => {
    res.json({ status: 'OK', message: 'CRM Backend Server is running' });
  });

  // Swagger UI
  app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs, { explorer: true }));

  // Public static-content translations. Writes are protected inside the router.
  app.use('/api/translations', translationRoutes);

  // API Routes
  // Auth routes (public - no authentication required)
  app.post('/api/students/auth/login', validateBody(CredentialsDto), require('./modules/students/controllers/student.controller').studentLogin);
  app.post('/api/teachers/auth/login', validateBody(CredentialsDto), require('./modules/teachers/controllers/teacher.controller').teacherLogin);
  app.post('/api/teachers/auth/payment-login', validateBody(CredentialsDto), require('./modules/teachers/controllers/teacher.controller').teacherPaymentLogin);
  app.post('/api/superusers/auth/login', validateBody(CredentialsDto), require('./modules/superusers/controllers/superuser.controller').login);
  app.post('/api/owners/auth/login', require('./modules/owners/controllers/owner.controller').login);
  app.post('/api/owners/auth/register', require('./modules/owners/controllers/owner.controller').register);
  app.post('/api/parents/auth/login', validateBody(CredentialsDto), require('./modules/parents').parentLogin);

  // Protected routes - require authentication + role-based access
  app.use('/api/students', requireAuth, requireRole('superuser', 'teacher'), studentRoutes);
  app.use('/api/teachers', requireAuth, requireRole('superuser'), teacherRoutes);
  app.use('/api/classes', requireAuth, requireRole('superuser', 'teacher', 'student'), classRoutes);
  app.use('/api/centers', requireAuth, requireRole('superuser'), centerRoutes);
  app.use('/api/payments', requireAuth, paymentRoutes);
  app.use('/api/debts', requireAuth, requireRole('superuser'), debtRoutes);
  app.use('/api/grades', requireAuth, requireRole('superuser', 'teacher'), gradeRoutes);
  app.use('/api/attendance', requireAuth, requireRole('superuser', 'teacher'), attendanceRoutes);
  app.use('/api/assignments', requireAuth, requireRole('superuser', 'teacher'), assignmentRoutes);
  app.use('/api/subjects', requireAuth, requireRole('superuser', 'teacher'), subjectRoutes);
  app.use('/api/superusers', requireAuth, requireRole('superuser'), superuserRoutes);
  app.use('/api/owners', requireAuth, requireOwner, ownerRoutes);
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
  // Request logs (MongoDB): only superuser.
  app.use('/api/request-logs', requireAuth, requireRole('superuser'), requestLogRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/archive', requireAuth, requireRole('superuser'), archiveRoutes);

  // Error handling middleware
  app.use((err: Error, req: any, res: any, next: any): void => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Graceful shutdown - use a flag to prevent multiple calls
  let isShuttingDown = false;

  const gracefulShutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('Shutting down gracefully...');
    const pool = require('./db/pool');

    server.close(async () => {
      try {
        await pool.end();
        await closeMongo();
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
}

void main().catch((err: any) => {
  console.error('[startup] failed:', err?.stack || err);
  process.exit(1);
});
