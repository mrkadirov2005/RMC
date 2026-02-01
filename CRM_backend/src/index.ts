const express = require('express');
const cors = require('cors');
require('dotenv/config');
const swaggerUI = require('swagger-ui-express');
const swaggerDocs = require('./swagger/swagger');

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
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/superusers', superuserRoutes);

// Error handling middleware
app.use((err: Error, req: any, res: any, next: any): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  const pool = require('../config/dbcon');
  await pool.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
