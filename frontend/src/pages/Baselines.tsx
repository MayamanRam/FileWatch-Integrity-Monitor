import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  Lock,
  RefreshCw,
  Plus,
  Eye,
  CheckCircle,
  AlertOctagon,
  X,
  FileText
} from 'lucide-react';
import {
  IntegrityBaseline,
  BaselineDetail,
  BaselineTamperCheckResult,
  BaselineVerificationResult,
  MonitoredDirectory
} from '../types';
import { api } from '../services/api';

interface BaselinesProps {
  baselines: IntegrityBaseline[];
  directories: MonitoredDirectory[];
  onRefresh: () => void;
  onCreateBaseline: (dirId: string, name: string, desc?: string) => Promise<void>;
  onActivateBaseline: (id: string) => Promise<void>;
}

export const Baselines: React.FC<BaselinesProps> = ({
  baselines,
  directories,
  onRefresh,
  onCreateBaseline,
  onActivateBaseline
}) => {
  const [selectedBaseline, setSelectedBaseline] = useState<BaselineDetail | null>(null);
  const [tamperResult, setTamperResult] = useState<BaselineTamperCheckResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<BaselineVerificationResult | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New baseline form
  const [targetDirId, setTargetDirId] = useState('');
  const [baselineName, setBaselineName] = useState('');
  const [baselineDesc, setBaselineDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInspectFiles = async (id: string) => {
    setLoadingAction(`inspect-${id}`);
    try {
      const detail = await api.getBaselineDetail(id);
      setSelectedBaseline(detail);
    } catch (err: any) {
      alert(`Error loading baseline files: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTamperCheck = async (id: string) => {
    setLoadingAction(`tamper-${id}`);
    try {
      const res = await api.checkBaselineTamper(id);
      setTamperResult(res);
      onRefresh();
    } catch (err: any) {
      alert(`Tamper check failed: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleVerifyAgainstDisk = async (id: string) => {
    setLoadingAction(`verify-${id}`);
    try {
      const res = await api.verifyBaseline(id);
      setVerifyResult(res);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDirId || !baselineName.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateBaseline(targetDirId, baselineName.trim(), baselineDesc.trim());
      setShowCreateModal(false);
      setBaselineName('');
      setBaselineDesc('');
      onRefresh();
    } catch (err: any) {
      alert(`Failed to create baseline: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Cryptographic Integrity Baselines</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident baseline records signed with HMAC-SHA256 and root aggregate checksums.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Establish New Baseline</span>
        </button>
      </div>

      {/* Baselines Table */}
      <div className="bg-[#0D1527] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080D1A] text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Baseline Name</th>
                <th className="py-3 px-4">Directory</th>
                <th className="py-3 px-4">Files / Size</th>
                <th className="py-3 px-4">Tamper Status</th>
                <th className="py-3 px-4">Aggregate Root Hash</th>
                <th className="py-3 px-4">Established</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {baselines.map((b) => {
                const dir = directories.find(d => d.id === b.directory_id);
                const isTampered = b.tamper_status === 'TAMPERED';

                return (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{b.name}</span>
                        {b.is_active && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {b.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">{b.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {dir?.label || b.directory_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-white font-bold">{b.file_count}</span> files
                      <span className="text-slate-500 block text-[11px]">
                        {(b.total_size_bytes / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold border ${
                        isTampered
                          ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {isTampered ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                        {b.tamper_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      <span className="bg-[#080D1A] px-2 py-1 rounded text-[11px] border border-slate-800 block max-w-[140px] truncate" title={b.baseline_hash}>
                        {b.baseline_hash.slice(0, 16)}...
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleInspectFiles(b.id)}
                        disabled={loadingAction === `inspect-${b.id}`}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                        title="View Tracked Files"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleTamperCheck(b.id)}
                        disabled={loadingAction === `tamper-${b.id}`}
                        className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-[11px] font-semibold"
                        title="Check Tamper Signatures"
                      >
                        Tamper Check
                      </button>

                      <button
                        onClick={() => handleVerifyAgainstDisk(b.id)}
                        disabled={loadingAction === `verify-${b.id}`}
                        className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold"
                        title="Verify Current Files Against Baseline"
                      >
                        Verify
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Establish New Baseline Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-400" />
              <span>Establish New Baseline</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Creates a signed snapshot of the authorized directory state.
            </p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Monitored Directory *
                </label>
                <select
                  value={targetDirId}
                  onChange={(e) => setTargetDirId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">Select a directory...</option>
                  {directories.map(d => (
                    <option key={d.id} value={d.id}>{d.label} ({d.path})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Baseline Name *
                </label>
                <input
                  type="text"
                  value={baselineName}
                  onChange={(e) => setBaselineName(e.target.value)}
                  placeholder="e.g. Post-Patch v1.2 Baseline"
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description / Authorization Note
                </label>
                <textarea
                  value={baselineDesc}
                  onChange={(e) => setBaselineDesc(e.target.value)}
                  placeholder="e.g. Authorized baseline update after approved maintenance window."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Hashing & Signing...' : 'Seal & Activate Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Files Modal */}
      {selectedBaseline && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedBaseline(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Tracked Baseline Files: {selectedBaseline.name}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Aggregate Hash: {selectedBaseline.baseline_hash}
            </p>

            <div className="mt-4 flex-1 overflow-y-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#080D1A] text-slate-400 uppercase text-[10px] font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">File Name & Relative Path</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">SHA-256 Hash</th>
                    <th className="py-2.5 px-3">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                  {selectedBaseline.files.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-white max-w-xs truncate" title={f.relative_path}>
                        {f.relative_path}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-sans font-semibold bg-slate-800 text-slate-300">
                          {f.file_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{f.file_size} B</td>
                      <td className="py-2 px-3 text-cyan-400 truncate max-w-[180px]" title={f.sha256_hash}>
                        {f.sha256_hash}
                      </td>
                      <td className="py-2 px-3 text-slate-500">{f.file_permissions || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedBaseline(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tamper Check Results Modal */}
      {tamperResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setTamperResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              {tamperResult.is_tampered ? (
                <ShieldAlert className="h-6 w-6 text-red-400" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              )}
              <h3 className="text-base font-bold text-white">Cryptographic Tamper Verification</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Target Baseline: {tamperResult.name}
            </p>

            <div className="mt-4 space-y-3">
              <div className={`p-4 rounded-lg border ${
                tamperResult.is_tampered
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              }`}>
                <div className="font-bold text-sm">
                  {tamperResult.is_tampered ? 'TAMPERING DETECTED!' : 'INTEGRITY VERIFIED: ALL SIGNATURES VALID'}
                </div>
                <p className="text-xs mt-1 text-slate-300">
                  {tamperResult.message}
                </p>
              </div>

              <div className="bg-[#080D1A] p-4 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Root HMAC-SHA256:</span>
                  <span className={tamperResult.root_hmac_valid ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {tamperResult.root_hmac_valid ? 'VALID' : 'INVALID / TAMPERED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tampered File Records:</span>
                  <span className={tamperResult.tampered_file_records.length === 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {tamperResult.tampered_file_records.length}
                  </span>
                </div>
              </div>

              {tamperResult.tampered_file_records.length > 0 && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded text-xs text-red-300 font-mono">
                  <div className="font-bold mb-1">Affected Records:</div>
                  <ul className="list-disc list-inside">
                    {tamperResult.tampered_file_records.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setTamperResult(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Verification Results Modal */}
      {verifyResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setVerifyResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Baseline Comparison Diff</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono break-all">
              {verifyResult.directory_path}
            </p>

            <div className="grid grid-cols-4 gap-3 my-4">
              <div className="bg-[#080D1A] p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">Unchanged</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{verifyResult.unchanged_files}</span>
              </div>
              <div className="bg-[#080D1A] p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">Modified</span>
                <span className="text-lg font-bold text-orange-400 font-mono">{verifyResult.modified_files}</span>
              </div>
              <div className="bg-[#080D1A] p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">New</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">{verifyResult.new_files}</span>
              </div>
              <div className="bg-[#080D1A] p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">Deleted</span>
                <span className="text-lg font-bold text-red-400 font-mono">{verifyResult.deleted_files}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-lg">
              {verifyResult.discrepancies.length > 0 ? (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#080D1A] text-slate-400 uppercase text-[10px] font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Path</th>
                      <th className="py-2.5 px-3">Previous SHA-256</th>
                      <th className="py-2.5 px-3">Current SHA-256</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                    {verifyResult.discrepancies.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === 'MODIFIED' ? 'bg-orange-500/20 text-orange-400' :
                            d.status === 'NEW' ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white max-w-xs truncate">{d.relative_path}</td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]">
                          {d.previous_hash ? `${d.previous_hash.slice(0, 16)}...` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-cyan-400 truncate max-w-[140px]">
                          {d.current_hash ? `${d.current_hash.slice(0, 16)}...` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-emerald-400 font-medium">
                  ✓ Perfect match! Baseline matches disk state exactly.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setVerifyResult(null)}
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

