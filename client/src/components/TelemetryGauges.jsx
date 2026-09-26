import React from 'react';
import { Activity, Zap, Server } from 'lucide-react';

export default function TelemetryGauges({ metrics }) {
  const numErrorRate = Number(metrics?.errorRate ?? 0.02);
  const numP99Latency = Number(metrics?.p99Latency ?? 42);
  const numPodHealth = Number(metrics?.podHealth ?? 100);

  const radius = 42;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;

  // 1. Error Rate (0 - 100%)
  const errorNormalized = Math.min(Math.max(numErrorRate, 0), 100);
  const errorStrokeOffset = circumference - (errorNormalized / 100) * circumference;

  // 2. P99 Latency (Normalized to 5000ms max scale)
  const latencyNormalized = Math.min(Math.max(numP99Latency / 5000, 0), 1);
  const latencyStrokeOffset = circumference - (latencyNormalized * circumference);

  // 3. Pod Health (0 - 100%)
  const podNormalized = Math.min(Math.max(numPodHealth, 0), 100);
  const podStrokeOffset = circumference - (podNormalized / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      {/* GAUGE 1: HTTP 5XX ERROR RATE */}
      <div className={`p-4 rounded-xl border bg-slate-900/60 transition-colors ${
        numErrorRate > 10 ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${numErrorRate > 10 ? 'text-rose-400' : 'text-slate-400'}`} />
            <div>
              <span className="text-xs font-medium text-slate-200 block">HTTP Error Rate (5xx)</span>
              <span className="text-[11px] text-slate-500 font-mono">SLO Target: &lt; 0.05%</span>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
            numErrorRate > 10 
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {numErrorRate > 10 ? 'CRITICAL' : 'OPTIMAL'}
          </span>
        </div>

        <div className="flex items-center justify-center py-2 relative">
          <svg className="w-28 h-28 transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-slate-800/80"
            />
            <circle
              cx="56"
              cy="56"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={errorStrokeOffset}
              strokeLinecap="round"
              fill="transparent"
              className={`transition-all duration-700 ease-out ${
                numErrorRate > 10 ? 'text-rose-500' : 'text-emerald-400'
              }`}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold font-mono tracking-tight ${
              numErrorRate > 10 ? 'text-rose-400' : 'text-slate-100'
            }`}>
              {numErrorRate.toFixed(2)}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">5xx errors</span>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-slate-400 border-t border-slate-800/60 pt-2 font-mono text-[11px]">
          {numErrorRate > 10 ? (
            <span className="text-rose-400">Ingress threshold exceeded</span>
          ) : (
            <span className="text-slate-500">Within acceptable error budget</span>
          )}
        </div>
      </div>

      {/* GAUGE 2: P99 LATENCY */}
      <div className={`p-4 rounded-xl border bg-slate-900/60 transition-colors ${
        numP99Latency > 300 ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${numP99Latency > 300 ? 'text-amber-400' : 'text-slate-400'}`} />
            <div>
              <span className="text-xs font-medium text-slate-200 block">P99 Response Latency</span>
              <span className="text-[11px] text-slate-500 font-mono">SLA Threshold: &lt; 50ms</span>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
            numP99Latency > 300 
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {numP99Latency > 300 ? 'DEGRADED' : 'OPTIMAL'}
          </span>
        </div>

        <div className="flex items-center justify-center py-2 relative">
          <svg className="w-28 h-28 transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-slate-800/80"
            />
            <circle
              cx="56"
              cy="56"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={latencyStrokeOffset}
              strokeLinecap="round"
              fill="transparent"
              className={`transition-all duration-700 ease-out ${
                numP99Latency > 300 ? 'text-amber-400' : 'text-cyan-400'
              }`}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold font-mono tracking-tight ${
              numP99Latency > 300 ? 'text-amber-400' : 'text-slate-100'
            }`}>
              {Math.round(numP99Latency)}ms
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Roundtrip</span>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-slate-400 border-t border-slate-800/60 pt-2 font-mono text-[11px]">
          {numP99Latency > 300 ? (
            <span className="text-amber-400">Connection queue saturation</span>
          ) : (
            <span className="text-slate-500">Fast path convergence</span>
          )}
        </div>
      </div>

      {/* GAUGE 3: POD FLEET HEALTH */}
      <div className={`p-4 rounded-xl border bg-slate-900/60 transition-colors ${
        numPodHealth < 70 ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className={`w-4 h-4 ${numPodHealth < 70 ? 'text-rose-400' : 'text-slate-400'}`} />
            <div>
              <span className="text-xs font-medium text-slate-200 block">Active Replica Fleet</span>
              <span className="text-[11px] text-slate-500 font-mono">K8s Readiness Probes</span>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
            numPodHealth < 70 
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {numPodHealth < 70 ? 'OFFLINE' : 'OPTIMAL'}
          </span>
        </div>

        <div className="flex items-center justify-center py-2 relative">
          <svg className="w-28 h-28 transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-slate-800/80"
            />
            <circle
              cx="56"
              cy="56"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={podStrokeOffset}
              strokeLinecap="round"
              fill="transparent"
              className={`transition-all duration-700 ease-out ${
                numPodHealth < 70 ? 'text-rose-500' : 'text-emerald-400'
              }`}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold font-mono tracking-tight ${
              numPodHealth < 70 ? 'text-rose-400' : 'text-slate-100'
            }`}>
              {Math.round(numPodHealth)}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Available</span>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-slate-400 border-t border-slate-800/60 pt-2 font-mono text-[11px]">
          {numPodHealth < 70 ? (
            <span className="text-rose-400">CrashLoopBackOff detected</span>
          ) : (
            <span className="text-slate-500">100% of replicas passing probes</span>
          )}
        </div>
      </div>

    </div>
  );
}
