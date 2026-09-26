import express from 'express';
import db from '../config/db.js';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { resolveIncidentSchema, approveIncidentSchema } from '../validation/schemas.js';
import { executeMultiAgentPipeline, executeApprovedRemediation } from '../services/geminiAgent.js';

const router = express.Router();

/**
 * POST /api/agents/resolve
 * Triggers the 4-Stage Multi-Agent Orchestration Pipeline
 */
router.post('/resolve', authenticateToken, async (req, res) => {
  try {
    const validatedData = resolveIncidentSchema.parse(req.body);
    const incidentCode = `INC-${Date.now().toString().slice(-6)}`;

    // 1. Create record in local SQLite database
    const insertStmt = db.prepare(`
      INSERT INTO incidents (
        incident_code, title, severity, service, status,
        error_logs, git_diff, initial_metrics
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      incidentCode,
      validatedData.title,
      validatedData.severity,
      validatedData.service,
      'PENDING_APPROVAL',
      validatedData.errorLogs,
      validatedData.gitDiff || '',
      JSON.stringify(validatedData.metrics)
    );

    const incidentId = result.lastInsertRowid;

    // 2. Run the 4-Stage Multi-Agent Orchestration
    const pipelineResult = await executeMultiAgentPipeline({
      scenarioId: validatedData.scenarioId,
      title: validatedData.title,
      service: validatedData.service,
      errorLogs: validatedData.errorLogs,
      gitDiff: validatedData.gitDiff,
      metrics: validatedData.metrics
    });

    // 3. Record each agent execution step in SQLite
    const insertTraceStmt = db.prepare(`
      INSERT INTO agent_executions (incident_id, stage, agent_name, status, input_payload, output_payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const agent of pipelineResult.agents) {
      insertTraceStmt.run(
        incidentId,
        agent.id,
        agent.name,
        agent.status,
        JSON.stringify({ service: validatedData.service }),
        JSON.stringify(agent.output)
      );
    }

    // 4. Update incident with proposed remediation plan from agents
    db.prepare(`
      UPDATE incidents
      SET proposed_command = ?, blast_radius = ?, confidence_score = ?
      WHERE id = ?
    `).run(
      pipelineResult.actionCard.proposedCommand,
      pipelineResult.actionCard.blastRadius,
      pipelineResult.actionCard.confidenceScore,
      incidentId
    );

    // 5. Cloud Supabase Sync (Non-blocking)
    if (supabase) {
      supabase.from('incidents').insert([{
        incident_code: incidentCode,
        title: validatedData.title,
        severity: validatedData.severity,
        service: validatedData.service,
        status: 'PENDING_APPROVAL',
        error_logs: validatedData.errorLogs,
        git_diff: validatedData.gitDiff || '',
        initial_metrics: validatedData.metrics,
        proposed_command: pipelineResult.actionCard.proposedCommand,
        blast_radius: pipelineResult.actionCard.blastRadius,
        confidence_score: pipelineResult.actionCard.confidenceScore
      }]).then(({ error }) => {
        if (error) console.warn('[Supabase Sync Notice]:', error.message);
        else console.log('[Supabase Sync]: Incident successfully archived to Supabase Cloud.');
      }).catch(e => console.warn('[Supabase Sync Error]:', e.message));
    }

    return res.status(200).json({
      success: true,
      incidentId,
      incidentCode,
      agents: pipelineResult.agents,
      actionCard: pipelineResult.actionCard
    });
  } catch (err) {
    console.error('[Error in /api/agents/resolve]:', err);
    if (err.errors) {
      return res.status(400).json({
        success: false,
        error: err.errors.map(e => e.message).join(', ')
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/agents/approve
 * Human-in-the-Loop decision gateway
 */
router.post('/approve', authenticateToken, async (req, res) => {
  try {
    const validatedData = approveIncidentSchema.parse(req.body);
    const { incidentId, action, resolutionPlan } = validatedData;

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    if (action === 'reject') {
      db.prepare(`
        UPDATE incidents
        SET status = 'REJECTED'
        WHERE id = ?
      `).run(incidentId);

      // Record rejection trace
      db.prepare(`
        INSERT INTO agent_executions (incident_id, stage, agent_name, status, input_payload, output_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        incidentId,
        'agent-gatekeeper-rejection',
        'Sentinel-Human-Gatekeeper',
        'REJECTED_BY_OPERATOR',
        JSON.stringify({ operator: req.user.username }),
        JSON.stringify({ reason: 'Operator rejected planned remediation command.' })
      );

      // Sync rejection to Supabase
      if (supabase) {
        supabase.from('incidents')
          .update({ status: 'REJECTED' })
          .eq('incident_code', incident.incident_code)
          .catch(e => console.warn('[Supabase Sync]:', e.message));
      }

      return res.json({
        success: true,
        action: 'rejected',
        message: 'Remediation aborted by Human Operator.'
      });
    }

    // Execute approved remediation
    db.prepare(`UPDATE incidents SET status = 'RESOLVING' WHERE id = ?`).run(incidentId);

    const executionResult = await executeApprovedRemediation(incident, resolutionPlan);

    // Update incident to RESOLVED with metrics and RCA Markdown
    db.prepare(`
      UPDATE incidents
      SET status = 'RESOLVED',
          final_metrics = ?,
          rca_markdown = ?,
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify(executionResult.healthyMetrics),
      executionResult.rcaMarkdown,
      incidentId
    );

    // Record execution completion in SQLite
    db.prepare(`
      INSERT INTO agent_executions (incident_id, stage, agent_name, status, input_payload, output_payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      incidentId,
      'agent-executor',
      'Sentinel-Executor-CLI',
      'COMPLETED',
      JSON.stringify({ command: resolutionPlan?.command || incident.proposed_command }),
      JSON.stringify({ logs: executionResult.terminalLogs })
    );

    // Sync resolution to Supabase Cloud
    if (supabase) {
      supabase.from('incidents').update({
        status: 'RESOLVED',
        final_metrics: executionResult.healthyMetrics,
        rca_markdown: executionResult.rcaMarkdown,
        resolved_at: new Date().toISOString()
      }).eq('incident_code', incident.incident_code)
        .then(({ error }) => {
          if (error) console.warn('[Supabase Resolve Sync Notice]:', error.message);
          else console.log('[Supabase Resolve Sync]: Resolution updated in Supabase.');
        })
        .catch(e => console.warn('[Supabase Resolve Sync Error]:', e.message));
    }

    return res.json({
      success: true,
      action: 'approved',
      incidentId,
      terminalLogs: executionResult.terminalLogs,
      healthyMetrics: executionResult.healthyMetrics,
      rcaMarkdown: executionResult.rcaMarkdown
    });
  } catch (err) {
    console.error('[Error in /api/agents/approve]:', err);
    if (err.errors) {
      return res.status(400).json({
        success: false,
        error: err.errors.map(e => e.message).join(', ')
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/incidents
 * Retrieve past incident list (Supabase with SQLite fallback)
 */
router.get('/incidents', authenticateToken, async (req, res) => {
  try {
    if (supabase) {
      try {
        const { data: supaIncidents, error } = await supabase
          .from('incidents')
          .select('id, incident_code, title, severity, service, status, confidence_score, created_at, resolved_at')
          .order('id', { ascending: false })
          .limit(25);

        if (!error && supaIncidents && supaIncidents.length > 0) {
          return res.json({ success: true, source: 'supabase_cloud', incidents: supaIncidents });
        }
      } catch (err) {
        // Fallback to SQLite seamlessly
      }
    }

    const incidents = db.prepare(`
      SELECT id, incident_code, title, severity, service, status, confidence_score, created_at, resolved_at
      FROM incidents
      ORDER BY id DESC
      LIMIT 25
    `).all();

    return res.json({ success: true, source: 'local_sqlite', incidents });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/incidents/:id
 * Retrieve single incident with trace logs & RCA
 */
router.get('/incidents/:id', authenticateToken, (req, res) => {
  try {
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const traces = db.prepare('SELECT * FROM agent_executions WHERE incident_id = ? ORDER BY id ASC').all(req.params.id);

    return res.json({
      success: true,
      incident: {
        ...incident,
        initial_metrics: incident.initial_metrics ? JSON.parse(incident.initial_metrics) : null,
        final_metrics: incident.final_metrics ? JSON.parse(incident.final_metrics) : null
      },
      traces
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
