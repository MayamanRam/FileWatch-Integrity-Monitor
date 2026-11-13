import React, { useState } from 'react';
import {
  FileCheck2,
  Search,
  Filter,
  Shield,
  KeyRound,
  CheckCircle,
  X
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ logs, onRefresh }) => {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = logs.filter(l => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.target_type.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === 'ALL' || l.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-cyan-400" />
          <span>Tamper-Evident System Audit Trail</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Every configuration change, baseline creation, and alert status transition is sealed with HMAC-SHA256.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0D1527] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit records by actor, action, or details..."
            className="w-full bg-[#080D1A] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <span>Action:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-[#080D1A] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0D1527] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080D1A] text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">HMAC Seal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelectedLog(l)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                    {l.action}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <span className="text-slate-500 text-[10px] block uppercase">{l.target_type}</span>
                    <span className="truncate block max-w-[140px]" title={l.target_id}>{l.target_id}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-md truncate">
                    {l.details}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {l.actor}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[10px] text-purple-400">
                    <span className="bg-[#080D1A] px-2 py-0.5 rounded border border-purple-900/40 block max-w-[130px] truncate" title={l.hmac_signature}>
                      {l.hmac_signature.slice(0, 16)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No audit log entries found.
          </div>
        )}
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Audit Log Integrity Inspection</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Log ID: {selectedLog.id}
            </p>

            <div className="mt-4 space-y-3 text-xs font-mono">
              <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800 space-y-2">
                <div><span className="text-slate-500">Action:</span> <span className="text-cyan-400 font-bold">{selectedLog.action}</span></div>
                <div><span className="text-slate-500">Actor:</span> <span className="text-white">{selectedLog.actor}</span></div>
                <div><span className="text-slate-500">Result:</span> <span className="text-emerald-400 font-bold">{selectedLog.result}</span></div>
                <div><span className="text-slate-500">Target Type:</span> <span className="text-slate-300">{selectedLog.target_type}</span></div>
                <div><span className="text-slate-500">Target ID:</span> <span className="text-slate-300">{selectedLog.target_id}</span></div>
                <div><span className="text-slate-500">Timestamp:</span> <span className="text-slate-300">{selectedLog.timestamp}</span></div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase mb-1">Details:</span>
                <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800 text-slate-300 font-sans">
                  {selectedLog.details}
                </div>
              </div>

              <div>
                <span className="text-purple-400 block text-[11px] font-bold uppercase mb-1">HMAC-SHA256 Cryptographic Signature:</span>
                <div className="p-3 bg-[#080D1A] rounded-lg border border-purple-900/40 text-purple-300 break-all text-[11px]">
                  {selectedLog.hmac_signature}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

