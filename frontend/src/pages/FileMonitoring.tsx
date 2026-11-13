import React, { useState } from 'react';
import {
  Radio,
  Filter,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
  FileCode,
  FileDiff,
  Info
} from 'lucide-react';
import { SecurityEvent } from '../types';

interface FileMonitoringProps {
  events: SecurityEvent[];
  onRefresh: () => void;
}

export const FileMonitoring: React.FC<FileMonitoringProps> = ({ events, onRefresh }) => {
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  const filteredEvents = events.filter(e => {
    const matchesSearch =
      e.file_name.toLowerCase().includes(search.toLowerCase()) ||
      e.relative_path.toLowerCase().includes(search.toLowerCase()) ||
      e.details.toLowerCase().includes(search.toLowerCase());
    const matchesSev = filterSeverity === 'ALL' || e.severity === filterSeverity;
    const matchesType = filterType === 'ALL' || e.event_type === filterType;
    return matchesSearch && matchesSev && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="h-5 w-5 text-cyan-400 animate-pulse" />
            <span>Continuous Filesystem Event Stream</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time OS file event hooks debounced, coalesced, and classified through SHA-256 integrity checks.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0D1527] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name, relative path, or event details..."
            className="w-full bg-[#080D1A] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <span>Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#080D1A] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Types</option>
              <option value="FILE_CREATED">Created</option>
              <option value="FILE_MODIFIED">Modified</option>
              <option value="FILE_DELETED">Deleted</option>
              <option value="FILE_RENAMED">Renamed</option>
              <option value="METADATA_CHANGED">Metadata Changed</option>
              <option value="INTEGRITY_VERIFIED">Verified</option>
              <option value="BASELINE_TAMPERING_SUSPECTED">Tamper Suspected</option>
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
              <option value="INFORMATIONAL">Informational</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#0D1527] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080D1A] text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">File Name / Path</th>
                <th className="py-3 px-4">Details & Classification</th>
                <th className="py-3 px-4">Current SHA-256</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredEvents.map((e) => {
                const sevColor =
                  e.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  e.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                  e.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

                return (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedEvent(e)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${sevColor}`}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold text-white">
                        {e.event_type.replace('FILE_', '')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-200">{e.file_name}</div>
                      <div className="text-[11px] text-slate-500 max-w-xs truncate">{e.relative_path}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-sm truncate">
                      {e.details}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-cyan-400">
                      {e.current_hash ? (
                        <span title={e.current_hash}>{e.current_hash.slice(0, 16)}...</span>
                      ) : (
                        <span className="text-slate-600">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No events match the current search or filters.
          </div>
        )}
      </div>

      {/* Event Details Drawer Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-2">
              <FileDiff className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Event Telemetry Details</h3>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800 space-y-1.5 font-mono">
                <div><span className="text-slate-500">File Name:</span> <span className="text-white font-bold">{selectedEvent.file_name}</span></div>
                <div><span className="text-slate-500">Relative Path:</span> <span className="text-cyan-400">{selectedEvent.relative_path}</span></div>
                <div><span className="text-slate-500">Directory:</span> <span className="text-slate-300">{selectedEvent.directory_path}</span></div>
                <div><span className="text-slate-500">Event Type:</span> <span className="text-amber-400">{selectedEvent.event_type}</span></div>
                <div><span className="text-slate-500">Severity:</span> <span className="text-red-400 font-bold">{selectedEvent.severity}</span></div>
                <div><span className="text-slate-500">Recorded:</span> <span className="text-slate-300">{new Date(selectedEvent.timestamp).toLocaleString()}</span></div>
              </div>

              <div>
                <h4 className="text-[11px] uppercase font-bold text-slate-400 mb-1">Cryptographic Hash Verification:</h4>
                <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800 font-mono text-[11px] space-y-2">
                  <div>
                    <span className="text-slate-500 block">Baseline / Previous SHA-256:</span>
                    <span className="text-slate-400 break-all">{selectedEvent.previous_hash || 'None (New file)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Current SHA-256:</span>
                    <span className="text-cyan-400 break-all">{selectedEvent.current_hash || 'None (File deleted)'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] uppercase font-bold text-slate-400 mb-1">Classification Context:</h4>
                <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800 text-slate-300">
                  {selectedEvent.details}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
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

