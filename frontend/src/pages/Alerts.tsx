import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  FileEdit,
  ExternalLink,
  X
} from 'lucide-react';
import { SecurityAlert } from '../types';

interface AlertsProps {
  alerts: SecurityAlert[];
  onUpdateAlert: (id: string, status?: string, notes?: string) => Promise<void>;
  onRefresh: () => void;
}

export const Alerts: React.FC<AlertsProps> = ({ alerts, onUpdateAlert, onRefresh }) => {
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Triage modal state
  const [notes, setNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState<'open' | 'acknowledged' | 'resolved'>('open');
  const [isSaving, setIsSaving] = useState(false);

  const openTriageModal = (alert: SecurityAlert) => {
    setSelectedAlert(alert);
    setNotes(alert.investigation_notes || '');
    setTargetStatus(alert.status);
  };

  const handleSaveTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setIsSaving(true);
    try {
      await onUpdateAlert(selectedAlert.id, targetStatus, notes);
      setSelectedAlert(null);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update alert: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.file_path.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesSeverity = filterSeverity === 'ALL' || a.severity === filterSeverity;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span>Security Incident & Alert Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized alert triage, investigation audit trail, and status resolution workflow.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0D1527] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts by title, file, or description..."
            className="w-full bg-[#080D1A] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#080D1A] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-[#080D1A] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#0D1527] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080D1A] text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Target File</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Investigation Notes</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredAlerts.map((a) => {
                const sevColor =
                  a.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  a.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                  a.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

                return (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${sevColor}`}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{a.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 max-w-sm truncate">{a.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 max-w-xs truncate">
                      {a.file_path || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        a.status === 'open' ? 'bg-red-500/20 text-red-300' :
                        a.status === 'acknowledged' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate">
                      {a.investigation_notes || 'No notes added'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openTriageModal(a)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition-colors"
                      >
                        Triage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAlerts.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No alerts found matching the active criteria.
          </div>
        )}
      </div>

      {/* Triage / Update Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedAlert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-cyan-400" />
              <span>Investigate Alert: {selectedAlert.title}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono break-all">
              File: {selectedAlert.file_path}
            </p>

            <form onSubmit={handleSaveTriage} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Incident Resolution Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['open', 'acknowledged', 'resolved'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTargetStatus(st)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold capitalize border transition-colors ${
                        targetStatus === st
                          ? st === 'resolved'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : st === 'acknowledged'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-red-600 text-white border-red-500'
                          : 'bg-[#080D1A] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Analyst Investigation Notes & Remediation Records
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document findings, root cause, confirmation from devops, or forensic artifacts..."
                  rows={4}
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                >
                  {isSaving ? 'Updating...' : 'Save Triage Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

