import React from 'react';
import {
  FolderTree,
  Shield,
  AlertTriangle,
  Database,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  FileCheck,
  ShieldAlert,
  Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { SystemStatus, SecurityEvent, SecurityAlert } from '../types';

interface DashboardProps {
  status: SystemStatus | null;
  events: SecurityEvent[];
  alerts: SecurityAlert[];
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
  onQuickScan: () => void;
  onQuickTamperCheck: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  status,
  events,
  alerts,
  onNavigate,
  onRefresh,
  onQuickScan,
  onQuickTamperCheck
}) => {
  // Chart data: events by type
  const eventTypeCounts = events.reduce((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const eventChartData = Object.entries(eventTypeCounts).map(([type, count]) => ({
    name: type.replace('FILE_', '').replace('_', ' '),
    count
  }));

  // Alert severity data
  const severityCounts = {
    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
    HIGH: alerts.filter(a => a.severity === 'HIGH').length,
    MEDIUM: alerts.filter(a => a.severity === 'MEDIUM').length,
    LOW: alerts.filter(a => a.severity === 'LOW').length,
  };

  const alertPieData = [
    { name: 'Critical', value: severityCounts.CRITICAL, color: '#EF4444' },
    { name: 'High', value: severityCounts.HIGH, color: '#F97316' },
    { name: 'Medium', value: severityCounts.MEDIUM, color: '#F59E0B' },
    { name: 'Low', value: severityCounts.LOW, color: '#10B981' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D1527] border border-slate-800 p-6 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-cyan-950/20 to-transparent pointer-events-none" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Security Integrity Center</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              SHA-256 / HMAC-SHA256
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time file integrity monitoring, unauthorized tamper detection, and cryptographic baselines.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={onQuickScan}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Verify Baselines</span>
          </button>
          <button
            onClick={onQuickTamperCheck}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-purple-600/80 hover:bg-purple-600 text-white transition-colors border border-purple-500/40"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-purple-300" />
            <span>Tamper Check</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Directories & Files */}
        <div className="bg-[#0D1527] border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Monitored Scope</span>
            <FolderTree className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">
              {status?.monitored_directories_count ?? 0}
              <span className="text-sm text-slate-400 font-normal ml-2">dirs</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {status?.total_monitored_files ?? 0} files under continuous guard
            </p>
          </div>
          <button
            onClick={() => onNavigate('directories')}
            className="mt-4 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            <span>Manage directories</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Integrity Baselines */}
        <div className="bg-[#0D1527] border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Baselines</span>
            <Database className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">
              {status?.active_baselines_count ?? 0}
              <span className="text-sm text-purple-400 font-normal ml-2">sealed</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cryptographically signed state baselines
            </p>
          </div>
          <button
            onClick={() => onNavigate('baselines')}
            className="mt-4 flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            <span>Inspect baselines</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Tamper Detection Status */}
        <div className="bg-[#0D1527] border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Baseline Tamper Status</span>
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold font-mono ${status?.baseline_tamper_detected ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                {status?.baseline_tamper_detected ? 'TAMPERED' : 'INTACT / VALID'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {status?.baseline_tamper_detected ? 'Unauthorized database modification detected!' : 'HMAC signatures verified match'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('baselines')}
            className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            <span>Run integrity audit</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Security Alerts */}
        <div className="bg-[#0D1527] border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Security Alerts</span>
            <AlertTriangle className={`h-4 w-4 ${status && status.open_alerts_count > 0 ? 'text-red-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {status?.open_alerts_count ?? 0}
              <span className="text-xs text-red-400 font-normal ml-2">
                ({status?.critical_alerts_count ?? 0} Critical)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {status?.events_last_24h ?? 0} events observed past 24h
            </p>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="mt-4 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            <span>Review open alerts</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events by type bar chart */}
        <div className="lg:col-span-2 bg-[#0D1527] border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Filesystem Changes by Event Classification</h3>
              <p className="text-xs text-slate-400">Normalized events captured across all monitored trees</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
              Total: {events.length}
            </span>
          </div>

          <div className="h-56 w-full">
            {eventChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#070B14', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#0284C7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No filesystem events recorded yet. Changes will be classified automatically.
              </div>
            )}
          </div>
        </div>

        {/* Alert severity breakdown */}
        <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Alert Severity Distribution</h3>
            <p className="text-xs text-slate-400">Incident severity breakdown</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center my-2">
            {alertPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={40}
                    paddingAngle={4}
                  >
                    {alertPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#070B14', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto mb-1" />
                <span>Zero open security alerts</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-red-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>Critical: {severityCounts.CRITICAL}</span>
            </div>
            <div className="flex items-center gap-1.5 text-orange-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span>High: {severityCounts.HIGH}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Medium: {severityCounts.MEDIUM}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Low: {severityCounts.LOW}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts & Incident Queue */}
      <div className="bg-[#0D1527] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Active Incident & Alert Queue</h3>
            <p className="text-xs text-slate-400">Security triage requiring investigator attention</p>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            View all ({alerts.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          {alerts.length > 0 ? (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#080D1A] text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Alert Title</th>
                  <th className="py-3 px-4">Target File</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {alerts.slice(0, 5).map((a) => {
                  const sevColor =
                    a.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                    a.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                    a.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                    'bg-slate-700/20 text-slate-400 border-slate-700';

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${sevColor}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate">{a.title}</td>
                      <td className="py-3 px-4 font-mono text-slate-400 max-w-xs truncate">{a.file_path || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
                          a.status === 'open' ? 'bg-red-500/10 text-red-300' :
                          a.status === 'acknowledged' ? 'bg-amber-500/10 text-amber-300' :
                          'bg-emerald-500/10 text-emerald-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
              <span>No open alerts. All monitored filesystem assets match their integrity baselines.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

