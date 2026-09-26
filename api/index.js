import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from '../server/src/config/db.js';
import authRoutes from '../server/src/routes/authRoutes.js';
import agentRoutes from '../server/src/routes/agentRoutes.js';

dotenv.config();

const app = express();

// Initialize Database Schemas (SQLite or In-Memory Serverless)
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
    system: 'OpsSentinel Autonomous SRE Defense Engine (Vercel Serverless)',
    timestamp: new Date().toISOString()
  });
});

export default app;
