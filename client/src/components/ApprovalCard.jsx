import React, { useState } from 'react';
import { 
  ShieldCheck, Terminal, CheckCircle2, 
  Copy, Check, AlertTriangle, Layers, Cpu, ArrowRight
} from 'lucide-react';

export default function ApprovalCard({ 
  actionCard, 
  onAuthorize, 
  onReject, 
  isExecuting, 
  terminalLogs = [], 
  executionCompleted 
}) {
  const [copied, setCopied] = useState(false);

  if (!actionCard) return null;

  const handleCopyCommand = () => {
    if (actionCard.proposedCommand) {
      navigator.clipboard.writeText(actionCard.proposedCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`rounded-xl border bg-slate-900/90 transition-all ${
      executionCompleted
        ? 'border-emerald-500/30'
        : 'border-slate-800'
    }`}>
      
      {/* Header Bar */}
      <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 rounded-t-xl ${
        executionCompleted 
          ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
          : 'bg-slate-900/60 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-2">
          {executionCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <span className="font-medium text-xs tracking-tight">
            {executionCompleted 
              ? 'Remediation Executed & Validated' 
              : 'Human Authorization Gate'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400">Policy:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-slate-300">
            MANDATORY_SRE_APPROVAL
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        
        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Target Service</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-mono font-semibold text-slate-200">{actionCard.service}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Calculated Blast Radius</span>
            <span className="text-xs text-slate-300 mt-1 block truncate" title={actionCard.blastRadius}>
              {actionCard.blastRadius}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Safety Score</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{actionCard.confidenceScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${actionCard.confidenceScore || 98}%` }}
              />
            </div>
          </div>

        </div>

        {/* Proposed Command Container */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
          <div className="px-3.5 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]">Remediation Payload</span>
            </div>
            <button
              onClick={handleCopyCommand}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-3 text-amber-200/90 overflow-x-auto select-all leading-relaxed text-[11px]">
            <code>{actionCard.proposedCommand}</code>
          </div>
        </div>

        {/* Live Terminal Output */}
        {(isExecuting || terminalLogs.length > 0) && (
          <div className="rounded-lg border border-slate-800 bg-black overflow-hidden font-mono text-xs">
            <div className="px-3.5 py-1.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Cluster Rollout Stream</span>
              </div>
              <span className="text-[10px] text-slate-500">k8s-us-east-1-prod</span>
            </div>
            
            <div className="p-3 space-y-1 max-h-52 overflow-y-auto text-[11px] leading-relaxed">
              {terminalLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={
                    log.includes('SUCCESS') 
                      ? 'text-emerald-400 font-medium' 
                      : log.includes('EXECUTING') || log.includes('$')
                      ? 'text-cyan-300'
                      : log.includes('error') || log.includes('dropped')
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }
                >
                  {log}
                </div>
              ))}
              {isExecuting && (
                <div className="text-cyan-400 flex items-center gap-1.5 pt-1 text-[11px]">
                  <Cpu className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying cluster patch & awaiting readiness convergence...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        {!executionCompleted && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Agent execution suspended at gatekeeper. Requires explicit operator authorization.
            </p>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={onReject}
                disabled={isExecuting}
                className="px-3.5 py-1.5 rounded-md border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Abort
              </button>

              <button
                onClick={onAuthorize}
                disabled={isExecuting}
                className="flex-1 sm:flex-initial px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <Cpu className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Authorize & Execute</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
