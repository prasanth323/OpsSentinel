import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().optional().default('Site Reliability Engineer')
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required')
});

export const resolveIncidentSchema = z.object({
  scenarioId: z.string().optional(),
  title: z.string().min(3, 'Incident title is required and must be at least 3 characters'),
  service: z.string().min(2, 'Affected microservice is required'),
  severity: z.enum(['P1-CRITICAL', 'P2-HIGH', 'P3-MEDIUM', 'P4-LOW']).default('P1-CRITICAL'),
  errorLogs: z.string().min(5, 'Telemetry logs are required for multi-agent reasoning'),
  gitDiff: z.string().optional().default(''),
  metrics: z.object({
    errorRate: z.number().min(0).max(100),
    p99Latency: z.number().min(0),
    podHealth: z.number().min(0).max(100),
    cpuUsage: z.number().min(0).max(100).optional().default(85)
  })
});

export const approveIncidentSchema = z.object({
  incidentId: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  action: z.enum(['approve', 'reject']),
  resolutionPlan: z.object({
    command: z.string().min(1),
    service: z.string().min(1),
    blastRadius: z.string().optional(),
    confidenceScore: z.number().optional()
  }).optional()
});
