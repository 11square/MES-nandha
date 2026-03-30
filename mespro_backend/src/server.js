const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const appConfig = require('./config/app');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const db = require('./models');

const app = express();

// Trust proxy (nginx reverse proxy)
app.set('trust proxy', 1);

// ---------------------
// Security Middleware
// ---------------------
app.use(helmet());

// CORS
app.use(cors({
  origin: appConfig.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);
app.use('/api/v1', limiter);

// ---------------------
// Body Parsing
// ---------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------
// Static file serving for local uploads
// ---------------------
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../public/uploads')));

// ---------------------
// Logging
// ---------------------
if (appConfig.env !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ---------------------
// API Routes
// ---------------------
app.use('/api/v1', routes);

// Legacy /api redirect to /api/v1 for backward compatibility
app.use('/api', routes);

// ---------------------
// 404 Handler
// ---------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ---------------------
// Global Error Handler
// ---------------------
app.use(errorHandler);

// ---------------------
// Database & Server Start
// ---------------------
const PORT = appConfig.port;

const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    logger.info('✓ Database connection established successfully.');

    // Sync models in development (use migrations in production)
    if (appConfig.env === 'development') {
      // await db.sequelize.sync({ alter: true }); // Uncomment to auto-sync
      logger.info('✓ Models synchronized (manual sync disabled — use migrations).');
    }

    app.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT} in ${appConfig.env} mode`);
      logger.info(`✓ API base URL: http://localhost:${PORT}/api/v1`);
      logger.info(`✓ Health check: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    logger.error('✗ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
