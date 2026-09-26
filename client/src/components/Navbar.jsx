import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Timer, Play, Pause, RotateCcw, LogOut, Radio } from 'lucide-react';

export default function Navbar({ incidentActive, incidentResolved, onRunDemo }) {
  const { user, logout } = useAuth();
  
  // Hackathon Presentation Pitch Timer (Default 3 minutes = 180s)
  const [pitchTime, setPitchTime] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning && pitchTime > 0) {
      interval = setInterval(() => {
        setPitchTime((prev) => prev - 1);
      }, 1000);
    } else if (pitchTime === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, pitchTime]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setPitchTime(180);
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left Section: Brand & Unified Status Indicator */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm tracking-tight text-slate-100">
                Ops<span className="text-cyan-400 font-bold">Sentinel</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:inline">
                SRE Command
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Compact Telemetry State Badge */}
          <div className="flex items-center gap-2">
            {incidentActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>DEFCON-1 Active</span>
              </span>
            ) : incidentResolved ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>All Systems Nominal</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
                <Radio className="w-3 h-3 text-cyan-400" />
                <span>Monitoring Cluster</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Section: Pitch Controls, Guided Demo, User Badge */}
        <div className="flex items-center gap-3">
          
          {/* Pitch Countdown Timer */}
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1 rounded-md text-xs font-mono">
            <Timer className="w-3.5 h-3.5 text-slate-400" />
            <span className={`font-semibold tabular-nums ${pitchTime <= 30 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
              {formatTimer(pitchTime)}
            </span>
            <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1.5">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                title={isTimerRunning ? 'Pause timer' : 'Start pitch timer'}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                onClick={resetTimer}
                title="Reset timer (3:00)"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          {/* User Badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-mono text-[10px] text-cyan-400 uppercase font-semibold">
                {user.username ? user.username.slice(0, 2) : 'SR'}
              </div>
              <span className="text-slate-300 font-medium">{user.username}</span>
            </div>
          )}

          {/* Sign Out */}
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
}
