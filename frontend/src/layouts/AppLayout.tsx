import React from 'react';
import {
  Shield,
  Activity,
  FolderTree,
  Database,
  Radio,
  AlertTriangle,
  FileText,
  FileCheck2,
  Settings as SettingsIcon,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SystemStatus } from '../types';

interface AppLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: SystemStatus | null;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  setActiveTab,
  status,
  children
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'monitoring', label: 'File Monitoring', icon: Radio },
    { id: 'directories', label: 'Monitored Directories', icon: FolderTree },
    { id: 'baselines', label: 'Integrity Baselines', icon: Database },
    { id: 'events', label: 'Security Events', icon: Shield },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: status?.open_alerts_count },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'audit', label: 'Audit Logs', icon: FileCheck2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'about', label: 'About', icon: Info },
  ];

  const isDegraded = status?.system_status === 'DEGRADED';

  return (
    <div className="flex h-screen bg-[#070B14] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A101F] border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <div className="h-9 w-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
              <span>FILEWATCH</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">FIM</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Monitor. Detect. Verify.</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Status Indicator at bottom of sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080D1A]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Engine Status</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              isDegraded
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isDegraded ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              {status?.system_status || 'INITIALIZING'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>SHA-256 Engine: Sealed</span>
            <span>HMAC: Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 px-8 border-b border-slate-800/80 bg-[#0A101F]/80 backdrop-blur flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white tracking-tight capitalize">
              {activeTab.replace('-', ' ')}
            </h1>
            {status?.baseline_tamper_detected && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-300 border border-red-600 animate-pulse">
                <AlertCircle className="h-3.5 w-3.5" />
                CRITICAL: BASELINE TAMPER DETECTED
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-slate-500">Directories:</span>
              <span className="text-cyan-400 font-bold">{status?.monitored_directories_count ?? 0}</span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-500">Files:</span>
              <span className="text-white font-bold">{status?.total_monitored_files ?? 0}</span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-500">Alerts:</span>
              <span className="text-red-400 font-bold">{status?.open_alerts_count ?? 0}</span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span className="text-slate-500">Mode: </span>
              <span className="text-emerald-400 font-semibold">Active Guard</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

