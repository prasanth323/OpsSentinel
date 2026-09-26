import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import agentRoutes from './routes/agentRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
// Default to 5001 because macOS ControlCenter/AirPlay reserves port 5000
const DEFAULT_PORT = 5001;
const PORT = process.env.PORT && process.env.PORT !== '5000' ? process.env.PORT : DEFAULT_PORT;

// Initialize Database Schemas
initDatabase();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'OpsSentinel Autonomous SRE Defense Engine',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '')
  });
});

// Serve frontend static assets from client/dist (Single Host Mode)
app.use(express.static(clientDistPath));

// For all non-API routes, serve client index.html (SPA React Router fallback)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[OpsSentinel Unhandled Error]:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 OpsSentinel Unified Single-Host App Online!`);
  console.log(`🌐 Open in Browser: http://localhost:${PORT}`);
  console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Default Demo SRE: sre@sentinel.ai / sentinel2025`);
  console.log(`====================================================`);
});
