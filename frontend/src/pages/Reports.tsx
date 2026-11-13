import React, { useState } from 'react';
import {
  FileText,
  Download,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  FileCode2,
  FileBadge,
  ShieldCheck
} from 'lucide-react';
import { MonitoredDirectory, SystemStatus } from '../types';
import { api } from '../services/api';

interface ReportsProps {
  directories: MonitoredDirectory[];
  status: SystemStatus | null;
}

export const Reports: React.FC<ReportsProps> = ({ directories, status }) => {
  const [selectedDir, setSelectedDir] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportMessage, setLastExportMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setLastExportMessage(null);
    try {
      await api.exportReport(format, {
        directory_id: selectedDir || undefined,
        severity: selectedSeverity || undefined
      });
      setLastExportMessage(`Successfully compiled and downloaded ${format.toUpperCase()} report!`);
    } catch (err: any) {
      alert(`Report export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-400" />
          <span>Security Audit & Integrity Reports</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Export tamper-evident audit reports in executive PDF, SIEM CSV, or programmatic JSON formats.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Form */}
        <div className="lg:col-span-2 bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-5">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
            Configure Report Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Scope / Monitored Directory
              </label>
              <select
                value={selectedDir}
                onChange={(e) => setSelectedDir(e.target.value)}
                className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Monitored Directories</option>
                {directories.map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Severity Filter
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Severities (Full Audit)</option>
                <option value="CRITICAL">Critical Incidents Only</option>
                <option value="HIGH">High & Critical</option>
                <option value="MEDIUM">Medium & Above</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Select Export Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* PDF Option */}
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  format === 'pdf'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white'
                    : 'bg-[#080D1A] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileBadge className={`h-6 w-6 mb-2 ${format === 'pdf' ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div className="font-bold text-xs">Executive PDF</div>
                <div className="text-[11px] text-slate-400 mt-1">Formal formatted audit report with compliance sections</div>
              </button>

              {/* CSV Option */}
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  format === 'csv'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white'
                    : 'bg-[#080D1A] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileSpreadsheet className={`h-6 w-6 mb-2 ${format === 'csv' ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div className="font-bold text-xs">Tabular CSV</div>
                <div className="text-[11px] text-slate-400 mt-1">Spreadsheet and SIEM ingestion ready</div>
              </button>

              {/* JSON Option */}
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  format === 'json'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white'
                    : 'bg-[#080D1A] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileCode2 className={`h-6 w-6 mb-2 ${format === 'json' ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div className="font-bold text-xs">Raw JSON</div>
                <div className="text-[11px] text-slate-400 mt-1">Full cryptographic payload for automation and API consumers</div>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 shadow-md"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Generating Report...' : `Export ${format.toUpperCase()} Report`}</span>
            </button>
          </div>

          {lastExportMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{lastExportMessage}</span>
            </div>
          )}
        </div>

        {/* Report Preview Metadata Card */}
        <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span>Report Contents Summary</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Generated reports are cryptographically signed with report IDs and UTC timestamps.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-[#080D1A] border border-slate-800">
                <span className="text-slate-400">Total Monitored Files:</span>
                <span className="text-white font-bold">{status?.total_monitored_files ?? 0}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#080D1A] border border-slate-800">
                <span className="text-slate-400">Active Baselines:</span>
                <span className="text-purple-400 font-bold">{status?.active_baselines_count ?? 0}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#080D1A] border border-slate-800">
                <span className="text-slate-400">Open Incidents:</span>
                <span className="text-red-400 font-bold">{status?.open_alerts_count ?? 0}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#080D1A] border border-slate-800">
                <span className="text-slate-400">Baseline Tamper State:</span>
                <span className="text-emerald-400 font-bold">{status?.baseline_tamper_detected ? 'TAMPERED' : 'VALID'}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Note: In accordance with NIST SP 800-115, integrity reports capture metadata, cryptographic checksums, and incident timestamps without exposing sensitive file contents.
          </div>
        </div>
      </div>
    </div>
  );
};

