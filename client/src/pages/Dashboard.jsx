import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import TelemetryGauges from '../components/TelemetryGauges';
import AgentPipeline from '../components/AgentPipeline';
import ApprovalCard from '../components/ApprovalCard';
import RcaViewer from '../components/RcaViewer';
import { api } from '../context/AuthContext';
import { 
  Database, Cpu, Radio, Play, RefreshCw, 
  Terminal, History, PlusCircle, X, Check, ArrowRight
} from 'lucide-react';

const DEMO_SCENARIOS = [
  {
    id: 'postgres_pool',
    title: 'PostgreSQL Pool Saturation',
    subtitle: 'HTTP 500 Spike @ 84%',
    desc: 'Unreleased connection handles in retry middleware caused pool exhaustion and cascading 500 errors.',
    service: 'db-proxy-service',
    severity: 'P1-CRITICAL',
    icon: <Database className="w-4 h-4 text-cyan-400" />,
    badge: 'Pool Exhaustion',
    metrics: { errorRate: 84.2, p99Latency: 2850, podHealth: 34, cpuUsage: 92 },
    logs: `[11:34:02 ERROR] [db-proxy-service] PoolAcquisitionTimeoutException: Timeout waiting for idle connection from pool 'aurora-primary'.
[11:34:03 ERROR] [db-proxy-service] Max pool size (500) exhausted. Active: 500, Idle: 0, Pending: 1420 requests.
[11:34:05 WARN]  [ingress-nginx] Upstream response 500 Internal Server Error returned to 4,200 clients.
[11:34:08 FATAL] [health-check] Liveness probe failed on db-proxy-service-7f89d (HTTP 503 Service Unavailable).`
  },
  {
    id: 'oom_killed',
    title: 'Payment Consumer OOMKilled',
    subtitle: 'CrashLoopBackOff (sha-8f92a)',
    desc: 'Unbounded heap accumulator in message batch handler breached container cgroup memory limits.',
    service: 'payment-consumer-worker',
    severity: 'P1-CRITICAL',
    icon: <Cpu className="w-4 h-4 text-amber-400" />,
    badge: 'Memory Leak',
    metrics: { errorRate: 72.8, p99Latency: 4120, podHealth: 18, cpuUsage: 98 },
    logs: `[11:36:12 CRIT]  [payment-consumer] cgroup memory threshold exceeded (512MiB). Sending SIGKILL.
[11:36:13 K8S]   Container payment-consumer-worker terminated with exit code 137 (OOMKilled).
[11:36:14 K8S]   Pod entering CrashLoopBackOff: back-off 5m0s restarting failed container.
[11:36:18 WARN]  [kafka-cluster] Consumer group 'payment-ingest' has 28,490 uncommitted offset lag.`
  },
  {
    id: 'api_gateway_timeout',
    title: 'API Gateway Circuit Breaker',
    subtitle: 'P99 Latency > 3800ms',
    desc: 'Erroneous YAML throttle dropped max pending requests to 50, triggering upstream socket timeouts.',
    service: 'api-gateway-envoy',
    severity: 'P1-CRITICAL',
    icon: <Radio className="w-4 h-4 text-rose-400" />,
    badge: 'Socket Starvation',
    metrics: { errorRate: 88.6, p99Latency: 3820, podHealth: 45, cpuUsage: 89 },
    logs: `[11:39:41 ERROR] [envoy-proxy] upstream connect timeout or disconnection before resp headers.
[11:39:42 WARN]  [envoy-proxy] CircuitBreaker: max_pending_requests (50) exceeded on cluster 'auth_cluster'.
[11:39:45 ERROR] [envoy-proxy] HTTP 504 Gateway Timeout dispatched to public edge client IPs.
[11:39:49 CRIT]  [slo-monitor] P99 Latency SLA breached by 7,540% (Threshold: 50ms, Actual: 3820ms).`
  }
];

const SEED_INCIDENTS = [
  {
    id: 101,
    incident_code: 'INC-849102',
    title: 'PostgreSQL Connection Pool Saturation',
    severity: 'P1-CRITICAL',
    service: 'db-proxy-service',
    status: 'RESOLVED',
    confidence_score: 98.7,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    resolved_at: new Date(Date.now() - 3600000 * 2 + 180000).toISOString()
  },
  {
    id: 102,
    incident_code: 'INC-783291',
    title: 'Kafka Consumer Group Lag Explosion',
    severity: 'P2-HIGH',
    service: 'payment-consumer-worker',
    status: 'RESOLVED',
    confidence_score: 99.2,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    resolved_at: new Date(Date.now() - 3600000 * 5 + 240000).toISOString()
  }
];

const formatTimestamp = (dateStr) => {
  if (!dateStr) return 'Just now';
  try {
    const formatted = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
    const date = new Date(formatted);
    return isNaN(date.getTime()) ? 'Recently' : date.toLocaleTimeString();
  } catch (e) {
    return 'Recently';
  }
};

export default function Dashboard() {
  const [currentMetrics, setCurrentMetrics] = useState({
    errorRate: 0.02,
    p99Latency: 42,
    podHealth: 100,
    cpuUsage: 28
  });

  const [activeIncident, setActiveIncident] = useState(null);
  const [activeIncidentId, setActiveIncidentId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [actionCard, setActionCard] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [executionCompleted, setExecutionCompleted] = useState(false);
  const [rcaMarkdown, setRcaMarkdown] = useState(null);

  const [incidentHistory, setIncidentHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('ops_sentinel_incident_history');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached incidents:', e);
    }
    return SEED_INCIDENTS;
  });

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customService, setCustomService] = useState('');
  const [customLogs, setCustomLogs] = useState('');

  const loadIncidents = async () => {
    try {
      const res = await api.get('/agents/incidents');
      if (res.data?.success && Array.isArray(res.data.incidents) && res.data.incidents.length > 0) {
        setIncidentHistory(prev => {
          const serverItems = res.data.incidents;
          const existingIds = new Set(prev.map(i => i.incident_code || i.id));
          const toAdd = serverItems.filter(i => !existingIds.has(i.incident_code) && !existingIds.has(i.id));
          const updated = prev.map(localItem => {
            const match = serverItems.find(s => s.id === localItem.id || s.incident_code === localItem.incident_code);
            return match ? { ...localItem, ...match } : localItem;
          });
          const merged = [...toAdd, ...updated];
          try {
            localStorage.setItem('ops_sentinel_incident_history', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    } catch (err) {
      console.warn('Could not load historical incidents:', err?.message);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const triggerScenario = async (scenario) => {
    setCurrentMetrics(scenario.metrics);
    setActiveIncident(scenario);
    setAgents([]);
    setActionCard(null);
    setTerminalLogs([]);
    setExecutionCompleted(false);
    setRcaMarkdown(null);
    setIsResolving(true);

    try {
      const payload = {
        scenarioId: scenario.id,
        title: scenario.title,
        service: scenario.service,
        severity: scenario.severity,
        errorLogs: scenario.logs,
        gitDiff: `git diff HEAD~1 on ${scenario.service}`,
        metrics: scenario.metrics
      };

      const response = await api.post('/agents/resolve', payload);
      if (response.data.success) {
        setActiveIncidentId(response.data.incidentId);
        setAgents(response.data.agents);
        setActionCard(response.data.actionCard);

        const newRecord = response.data.incident || {
          id: response.data.incidentId,
          incident_code: response.data.incidentCode || `INC-${Math.floor(100000 + Math.random() * 900000)}`,
          title: scenario.title,
          severity: scenario.severity,
          service: scenario.service,
          status: 'PENDING_APPROVAL',
          confidence_score: response.data.actionCard?.confidenceScore || 98.4,
          created_at: new Date().toISOString()
        };

        setIncidentHistory(prev => {
          const filtered = prev.filter(i => i.id !== newRecord.id && i.incident_code !== newRecord.incident_code);
          const updated = [newRecord, ...filtered];
          try {
            localStorage.setItem('ops_sentinel_incident_history', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.error('Error resolving incident:', err);
    } finally {
      setIsResolving(false);
      loadIncidents();
    }
  };

  const handleCustomIncidentSubmit = async (e) => {
    e.preventDefault();
    if (!customTitle || !customService || !customLogs) return;

    const customScenario = {
      id: 'custom_incident',
      title: customTitle,
      subtitle: `Degradation in ${customService}`,
      desc: `Telemetry anomaly detected in ${customService}.`,
      service: customService,
      severity: 'P1-CRITICAL',
      metrics: { errorRate: 79.5, p99Latency: 3400, podHealth: 25, cpuUsage: 91 },
      logs: customLogs
    };

    setShowCustomModal(false);
    triggerScenario(customScenario);
  };

  const handleAuthorize = async () => {
    if (!activeIncidentId || !actionCard) return;

    setIsExecuting(true);
    setTerminalLogs([
      `[SENTINEL-AUTH] Cryptographic token verified for operator.`,
      `[SENTINEL-EXEC] Target microservice: ${actionCard.service}`,
      `[SENTINEL-EXEC] Payload: ${actionCard.proposedCommand}`
    ]);

    try {
      const response = await api.post('/agents/approve', {
        incidentId: activeIncidentId,
        action: 'approve',
        resolutionPlan: {
          command: actionCard.proposedCommand,
          service: actionCard.service,
          blastRadius: actionCard.blastRadius,
          confidenceScore: actionCard.confidenceScore
        }
      });

      if (response.data.success) {
        const fullLogs = response.data.terminalLogs;
        let lineIdx = 0;
        
        const streamInterval = setInterval(() => {
          if (lineIdx < fullLogs.length) {
            setTerminalLogs(prev => [...prev, fullLogs[lineIdx]]);
            lineIdx++;
          } else {
            clearInterval(streamInterval);
            setIsExecuting(false);
            setExecutionCompleted(true);
            setCurrentMetrics(response.data.healthyMetrics);
            setRcaMarkdown(response.data.rcaMarkdown);

            setIncidentHistory(prev => {
              const updated = prev.map(inc => {
                if (inc.id === activeIncidentId || inc.incident_code === activeIncidentId) {
                  return { ...inc, status: 'RESOLVED', resolved_at: new Date().toISOString() };
                }
                return inc;
              });
              try {
                localStorage.setItem('ops_sentinel_incident_history', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });

            loadIncidents();
          }
        }, 140);
      }
    } catch (err) {
      console.error('Remediation error:', err);
      setIsExecuting(false);
    }
  };

  const handleReject = async () => {
    if (!activeIncidentId) return;
    try {
      await api.post('/agents/approve', {
        incidentId: activeIncidentId,
        action: 'reject'
      });
      setActionCard(null);
      setExecutionCompleted(false);
      setTerminalLogs(prev => [
        ...prev,
        `[SENTINEL-GATEKEEPER] Remediation aborted by operator.`
      ]);

      setIncidentHistory(prev => {
        const updated = prev.map(inc => {
          if (inc.id === activeIncidentId || inc.incident_code === activeIncidentId) {
            return { ...inc, status: 'REJECTED' };
          }
          return inc;
        });
        try {
          localStorage.setItem('ops_sentinel_incident_history', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      loadIncidents();
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleResetHUD = () => {
    setActiveIncident(null);
    setActiveIncidentId(null);
    setAgents([]);
    setActionCard(null);
    setTerminalLogs([]);
    setExecutionCompleted(false);
    setRcaMarkdown(null);
    setCurrentMetrics({
      errorRate: 0.02,
      p99Latency: 42,
      podHealth: 100,
      cpuUsage: 28
    });
  };

  const isIncidentActive = !!activeIncident && !executionCompleted;

  // Linear Step (1 to 4)
  let activeStep = 1;
  if (isResolving) activeStep = 2;
  else if (actionCard && !executionCompleted) activeStep = 3;
  else if (executionCompleted) activeStep = 4;

  const STEPS = [
    { num: 1, label: 'Trigger Scenario' },
    { num: 2, label: 'Multi-Agent Triage' },
    { num: 3, label: 'Human Authorization' },
    { num: 4, label: 'Convergence & RCA' }
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar 
        incidentActive={isIncidentActive} 
        incidentResolved={executionCompleted}
        onRunDemo={() => triggerScenario(DEMO_SCENARIOS[0])}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-5 space-y-5">
        
        {/* ======================================================== */}
        {/* COMPACT WORKFLOW STEPPER & DEMO ACTION BAR               */}
        {/* ======================================================== */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Sleek Segmented Pipeline Breadcrumb */}
          <div className="flex items-center gap-1.5 sm:gap-3 w-full md:w-auto overflow-x-auto">
            {STEPS.map((step, idx) => {
              const isCurrent = activeStep === step.num;
              const isDone = activeStep > step.num;
              
              return (
                <React.Fragment key={step.num}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-medium transition-colors ${
                      isCurrent 
                        ? 'bg-cyan-500 text-slate-950 font-bold' 
                        : isDone 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : step.num}
                    </span>
                    <span className={`text-xs font-medium ${
                      isCurrent ? 'text-slate-100' : isDone ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <span className="text-slate-700 select-none">/</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={handleResetHUD}
              className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => triggerScenario(DEMO_SCENARIOS[0])}
              disabled={isResolving || isExecuting}
              className="px-3.5 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-slate-950" />
              <span>Run Guided Demo</span>
            </button>
          </div>

        </section>

        {/* ======================================================== */}
        {/* INCIDENT SCENARIOS (CLEAN DATADOG/VERCEL CARDS)          */}
        {/* ======================================================== */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-300 tracking-wide uppercase font-mono">
              Production Incidents
            </h2>
            <button
              onClick={() => setShowCustomModal(true)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Custom Injector</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DEMO_SCENARIOS.map((sc) => {
              const isSelected = activeIncident?.id === sc.id;
              
              return (
                <div
                  key={sc.id}
                  className={`p-4 rounded-xl border bg-slate-900/60 transition-colors flex flex-col justify-between gap-3 ${
                    isSelected 
                      ? 'border-cyan-500/50 bg-slate-900/90' 
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-800/80 border border-slate-700/60">
                          {sc.icon}
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-300">
                          {sc.service}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/80">
                        {sc.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        {sc.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {sc.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] font-mono text-rose-400 font-medium">
                      {sc.subtitle}
                    </span>
                    <button
                      onClick={() => triggerScenario(sc)}
                      disabled={isResolving || isExecuting}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <span>Simulate</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* LIVE TELEMETRY GAUGES (UNIFIED RADIAL GAUGES)            */}
        {/* ======================================================== */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-300 tracking-wide uppercase font-mono">
              Live Cluster Telemetry
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Ingress & K8s Metrics
            </span>
          </div>
          <TelemetryGauges metrics={currentMetrics} />
        </section>

        {/* ======================================================== */}
        {/* HUMAN-IN-THE-LOOP AUTHORIZATION CARD                     */}
        {/* ======================================================== */}
        {actionCard && (
          <section className="pt-1">
            <ApprovalCard 
              actionCard={actionCard}
              onAuthorize={handleAuthorize}
              onReject={handleReject}
              isExecuting={isExecuting}
              terminalLogs={terminalLogs}
              executionCompleted={executionCompleted}
            />
          </section>
        )}

        {/* ======================================================== */}
        {/* MULTI-AGENT ORCHESTRATION PIPELINE                       */}
        {/* ======================================================== */}
        <section className="pt-1">
          <AgentPipeline 
            agents={agents} 
            isResolving={isResolving}
            activeIncident={activeIncident}
          />
        </section>

        {/* ======================================================== */}
        {/* POST-MORTEM ROOT CAUSE ANALYSIS (RCA)                    */}
        {/* ======================================================== */}
        {rcaMarkdown && (
          <section className="pt-1">
            <RcaViewer 
              rcaMarkdown={rcaMarkdown} 
              incidentCode={activeIncident?.id}
            />
          </section>
        )}

        {/* ======================================================== */}
        {/* INCIDENT AUDIT TRAIL TABLE                               */}
        {/* ======================================================== */}
        <section className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <h2 className="text-xs font-semibold text-slate-300 tracking-wide uppercase font-mono">
                Audit Trail & Historical Runs
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 font-medium">
                {incidentHistory.length} Recorded
              </span>
              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                Supabase & SQLite Audit Store
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">INCIDENT</th>
                    <th className="py-2.5 px-4 font-medium">TITLE</th>
                    <th className="py-2.5 px-4 font-medium">SERVICE</th>
                    <th className="py-2.5 px-4 font-medium">SEVERITY</th>
                    <th className="py-2.5 px-4 font-medium">STATUS</th>
                    <th className="py-2.5 px-4 font-medium">CONFIDENCE</th>
                    <th className="py-2.5 px-4 font-medium">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {incidentHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-500 font-sans text-xs">
                        No previous incident runs recorded. Select a scenario above to test.
                      </td>
                    </tr>
                  ) : (
                    incidentHistory.map((inc, idx) => (
                      <tr key={inc.incident_code || inc.id || idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 text-cyan-400 font-semibold">{inc.incident_code}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-200">{inc.title}</td>
                        <td className="py-2.5 px-4 text-slate-400">{inc.service}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            inc.status === 'RESOLVED' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : inc.status === 'REJECTED'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-emerald-400">
                          {inc.confidence_score ? `${inc.confidence_score}%` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {formatTimestamp(inc.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>

      {/* CUSTOM INCIDENT MODAL */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold font-mono text-slate-200">Inject Telemetry Payload</h3>
              </div>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCustomIncidentSubmit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Redis Cluster Replication Lag Spike"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Target Service</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. redis-cluster-node-0"
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Error Log Stream</label>
                <textarea
                  required
                  rows="4"
                  placeholder="[FATAL] [redis] READONLY You can't write against a read only replica..."
                  value={customLogs}
                  onChange={(e) => setCustomLogs(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs"
                >
                  Dispatch to Agents
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950/40 py-3 px-6 text-center text-[11px] text-slate-500 font-mono">
        <span>OpsSentinel • Production SRE Incident Command Platform</span>
      </footer>
    </div>
  );
}
