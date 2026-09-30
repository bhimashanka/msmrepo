const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');

const basesRouter = require('./routes/bases');
const dashboardRouter = require('./routes/dashboard');
const purchasesRouter = require('./routes/purchases');
const transfersRouter = require('./routes/transfers');
const assignmentsRouter = require('./routes/assignments');
const auditLogsRouter = require('./routes/auditLogs');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize Database & Tables
initDatabase();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', system: 'Military Asset Management System API', timestamp: new Date() });
});

// Mount Routes
app.use('/api', basesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api', assignmentsRouter); // mounts /api/assignments & /api/expenditures
app.use('/api/audit-logs', auditLogsRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Military Asset Management System Backend Server `);
  console.log(` Running on http://localhost:${PORT}`);
  console.log(` API Endpoints active and database initialized.`);
  console.log(`====================================================`);
});
