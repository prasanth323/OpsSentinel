import React, { useState } from 'react';
import { 
  Search, GitCommit, Wrench, ShieldAlert, CheckCircle2, 
  ChevronDown, ChevronUp, Cpu
} from 'lucide-react';

export default function AgentPipeline({ agents, isResolving, activeIncident }) {
  const [expandedAgent, setExpandedAgent] = useState('agent-4');

  const agentIcons = {
    'agent-1': <Search className="w-4 h-4 text-cyan-400" />,
    'agent-2': <GitCommit className="w-4 h-4 text-indigo-400" />,
    'agent-3': <Wrench className="w-4 h-4 text-amber-400" />,
    'agent-4': <ShieldAlert className="w-4 h-4 text-rose-400" />
  };

  const agentStages = {
    'agent-1': 'Stage 1 • Triage & Metric Correlation',
    'agent-2': 'Stage 2 • Git Diff & AST Blame',
    'agent-3': 'Stage 3 • Surgical Remediation Synthesis',
    'agent-4': 'Stage 4 • Blast Radius & SRE Gatekeeper'
  };

  if (!agents || agents.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 text-center">
        <Cpu className="w-5 h-5 text-slate-500 mx-auto mb-2" />
        <p className="text-xs font-medium text-slate-400">Agent Pipeline Standby</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Select an incident scenario to initiate multi-agent reasoning trace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">
            Multi-Agent Reasoning Pipeline
          </span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Sequential Trace
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {agents.map((agent) => {
          const isExpanded = expandedAgent === agent.id;
          const isHalted = agent.status === 'HALTED_AWAITING_HUMAN_APPROVAL';

          return (
            <div 
              key={agent.id}
              className={`rounded-xl border transition-colors bg-slate-900/70 overflow-hidden ${
                isHalted 
                  ? 'border-amber-500/40' 
                  : 'border-slate-800 hover:border-slate-700/80'
              }`}
            >
              {/* Header Bar */}
              <div 
                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    {agentIcons[agent.id] || <Cpu className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {agentStages[agent.id]}
                    </div>
                    <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                      <span>{agent.name}</span>
                      <span className="text-slate-500 font-normal">({agent.role})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {isHalted ? (
                    <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      Halted at Gatekeeper
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  )}
                  <button className="text-slate-500 hover:text-slate-300">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expandable Reasoning Details */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3 text-xs">
                  
                  {/* AGENT 1 Output */}
                  {agent.id === 'agent-1' && (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Triage Summary</span>
                        <p className="text-slate-200">{agent.output.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
                          <span className="text-slate-500 text-[10px] block">Target Epicenter:</span>
                          <span className="font-mono text-cyan-300 font-semibold">{agent.output.serviceIdentified}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
                          <span className="text-slate-500 text-[10px] block">Anomaly Signature:</span>
                          <span className="font-mono text-slate-300 font-semibold">{agent.output.anomaly}</span>
                        </div>
                      </div>

                      {agent.output.reasoningChain && (
                        <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-800/60">
                          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5">Inference Chain</span>
                          <ul className="space-y-1 list-disc list-inside text-slate-300 text-[11px]">
                            {agent.output.reasoningChain.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AGENT 2 Output */}
                  {agent.id === 'agent-2' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Target Commit:</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            {agent.output.commitSha}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[11px]">{agent.output.author}</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
                        <span className="text-[10px] uppercase text-slate-400 block mb-1">Pinpointed Regression</span>
                        <div className="p-2 rounded bg-black/60 border border-slate-800/80 text-rose-300 overflow-x-auto text-[11px] leading-relaxed">
                          {agent.output.faultyCode}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
                        <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Root Architectural Defect</span>
                        <p className="text-slate-300 text-[11px]">{agent.output.rootDefect}</p>
                      </div>
                    </div>
                  )}

                  {/* AGENT 3 Output */}
                  {agent.id === 'agent-3' && (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Remediation Strategy</span>
                        <p className="text-slate-200">{agent.output.strategy}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-black/60 border border-slate-800 font-mono text-xs">
                        <span className="text-[10px] uppercase text-slate-400 block mb-1">Generated CLI Payload</span>
                        <pre className="p-2 rounded bg-slate-950 border border-slate-800/80 text-amber-200/90 overflow-x-auto text-[11px] whitespace-pre-wrap">
                          {agent.output.remediationCommand}
                        </pre>
                      </div>

                      {agent.output.rollbackPlan && (
                        <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 font-mono text-[11px]">
                          <span className="text-slate-500 block text-[10px]">Automated Rollback Safeguard:</span>
                          <code className="text-slate-400">{agent.output.rollbackPlan}</code>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AGENT 4 Output */}
                  {agent.id === 'agent-4' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Impact Radius</span>
                          <span className="text-xs font-medium text-slate-200 mt-1 block">{agent.output.blastRadius}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Confidence Score</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-base font-bold font-mono text-emerald-400">{agent.output.confidenceScore}%</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              HIGH CONFIDENCE
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                        <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Gatekeeper Policy Evaluation</span>
                        <p className="text-slate-300 text-xs leading-relaxed">{agent.output.reasoning}</p>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
