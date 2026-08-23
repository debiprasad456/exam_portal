const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dns = require('dns');
require('dotenv').config();

// Ensure public DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS fails
}

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const { initSocket } = require('./socket/examSocket');
const { setIO } = require('./socket/ioInstance');

const app = express();
app.set('trust proxy', 1);
const httpServer = http.createServer(app);

const rawAllowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : [];

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://candidate-examination-portal.vercel.app',
];

const allowedOriginSet = new Set([...rawAllowedOrigins, ...defaultAllowedOrigins]);

const corsOriginValidator = (origin, callback) => {
  // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server, health check)
  if (!origin) return callback(null, true);

  if (allowedOriginSet.has(origin) || (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:'))) {
    return callback(null, true);
  }

  return callback(new Error(`CORS error: Origin ${origin} is not allowed`));
};

const corsOptions = {
  origin: corsOriginValidator,
  credentials: true,
};

const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// Store io instance globally
setIO(io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting (Increased to 10000 to allow multiple candidates sharing campus/lab IP addresses)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/candidate', candidateRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Init Socket.IO
initSocket(io);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    maxPoolSize: 30,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log('✅ MongoDB connected (Pool Size: 30)');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = { app, io };
