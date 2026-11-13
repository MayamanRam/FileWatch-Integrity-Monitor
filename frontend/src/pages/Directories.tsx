import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Database,
  CheckCircle,
  AlertTriangle,
  FileCode,
  X,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import {
  MonitoredDirectory,
  DirectoryCreateInput,
  BaselineVerificationResult
} from '../types';

interface DirectoriesProps {
  directories: MonitoredDirectory[];
  onAddDirectory: (data: DirectoryCreateInput) => Promise<void>;
  onDeleteDirectory: (id: string) => Promise<void>;
  onPauseDirectory: (id: string) => Promise<void>;
  onResumeDirectory: (id: string) => Promise<void>;
  onScanDirectory: (id: string) => Promise<BaselineVerificationResult>;
  onCreateBaseline: (dirId: string, name: string) => Promise<void>;
}

export const Directories: React.FC<DirectoriesProps> = ({
  directories,
  onAddDirectory,
  onDeleteDirectory,
  onPauseDirectory,
  onResumeDirectory,
  onScanDirectory,
  onCreateBaseline
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanResult, setScanResult] = useState<BaselineVerificationResult | null>(null);
  const [isScanning, setIsScanning] = useState<string | null>(null);

  // Form state
  const [path, setPath] = useState('');
  const [label, setLabel] = useState('');
  const [recursive, setRecursive] = useState(true);
  const [includeExts, setIncludeExts] = useState('');
  const [excludeExts, setExcludeExts] = useState('.tmp, .bak, .log');
  const [excludeDirs, setExcludeDirs] = useState('.git, node_modules, __pycache__, venv');
  const [maxSizeMb, setMaxSizeMb] = useState(50);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!path.trim()) {
      setFormError('Directory path is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddDirectory({
        path: path.trim(),
        label: label.trim() || path.trim().split(/[\\/]/).pop() || 'Monitored Folder',
        recursive,
        include_extensions: includeExts ? includeExts.split(',').map(s => s.trim()).filter(Boolean) : [],
        exclude_extensions: excludeExts ? excludeExts.split(',').map(s => s.trim()).filter(Boolean) : [],
        exclude_subdirectories: excludeDirs ? excludeDirs.split(',').map(s => s.trim()).filter(Boolean) : [],
        max_file_size_mb: maxSizeMb
      });
      setShowAddModal(false);
      setPath('');
      setLabel('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to register directory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = async (dirId: string) => {
    setIsScanning(dirId);
    try {
      const res = await onScanDirectory(dirId);
      setScanResult(res);
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setIsScanning(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Monitored Filesystem Directories</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure authorized filesystem boundaries, recursive filters, and file scanning scope.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Register Directory</span>
        </button>
      </div>

      {/* Directory Cards */}
      <div className="grid grid-cols-1 gap-4">
        {directories.map((dir) => {
          const isActive = dir.status === 'active';
          return (
            <div
              key={dir.id}
              className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-white">{dir.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase border ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {dir.status}
                    </span>
                    {dir.recursive && (
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                        Recursive
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-400 break-all bg-[#080D1A] px-3 py-1.5 rounded border border-slate-800/80">
                    {dir.path}
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-xs text-slate-400 font-mono shrink-0">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Tracked Files</span>
                    <span className="text-white font-bold text-sm">{dir.file_count}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Max File Size</span>
                    <span className="text-slate-300 font-semibold">{dir.max_file_size_mb} MB</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Last Verification</span>
                    <span className="text-slate-300 font-semibold">
                      {dir.last_scanned_at ? new Date(dir.last_scanned_at).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleScan(dir.id)}
                    disabled={isScanning === dir.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isScanning === dir.id ? 'animate-spin' : ''}`} />
                    <span>{isScanning === dir.id ? 'Scanning...' : 'Scan Now'}</span>
                  </button>

                  {isActive ? (
                    <button
                      onClick={() => onPauseDirectory(dir.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-colors"
                      title="Pause Monitoring"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onResumeDirectory(dir.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
                      title="Resume Monitoring"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Remove directory "${dir.label}" from monitoring?`)) {
                        onDeleteDirectory(dir.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-red-400 border border-slate-700 hover:border-red-800 transition-colors"
                    title="Remove Directory"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {directories.length === 0 && (
          <div className="p-12 text-center bg-[#0D1527] border border-slate-800 rounded-xl">
            <FolderTree className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No Monitored Directories</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Register a directory to start continuous cryptographic integrity monitoring and baseline tracking.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Register First Directory
            </button>
          </div>
        )}
      </div>

      {/* Add Directory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-cyan-400" />
              <span>Register Directory For Integrity Monitoring</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Path must be an existing, absolute directory path. Initial baseline will be established upon creation.
            </p>

            {formError && (
              <div className="mt-3 p-3 rounded bg-red-950/60 border border-red-600/50 text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Absolute Directory Path *
                </label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="e.g. D:\Projects\MySecureApp\bin or /var/www/html"
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Directory Label (Optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Production Web Binaries"
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recursive"
                  checked={recursive}
                  onChange={(e) => setRecursive(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                />
                <label htmlFor="recursive" className="text-xs text-slate-300 cursor-pointer">
                  Recursive monitoring (include subdirectories)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Exclude Extensions
                  </label>
                  <input
                    type="text"
                    value={excludeExts}
                    onChange={(e) => setExcludeExts(e.target.value)}
                    placeholder=".tmp, .bak, .log"
                    className="w-full px-3 py-1.5 bg-[#080D1A] border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Max File Size (MB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={maxSizeMb}
                    onChange={(e) => setMaxSizeMb(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-[#080D1A] border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exclude Subdirectories
                </label>
                <input
                  type="text"
                  value={excludeDirs}
                  onChange={(e) => setExcludeDirs(e.target.value)}
                  placeholder=".git, node_modules, __pycache__"
                  className="w-full px-3 py-1.5 bg-[#080D1A] border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register & Create Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Scan Results Modal */}
      {scanResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-700 rounded-xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setScanResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Full Integrity Verification Results</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono break-all">
              Target: {scanResult.directory_path}
            </p>

            {/* Verification Stats */}
            <div className="grid grid-cols-4 gap-3 my-4">
              <div className="bg-[#080D1A] p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">Unchanged</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{scanResult.unchanged_files}</span>
              </div>
              <div className="bg-[#080D1A] p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">Modified</span>
                <span className="text-lg font-bold text-orange-400 font-mono">{scanResult.modified_files}</span>
              </div>
              <div className="bg-[#080D1A] p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">New Files</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">{scanResult.new_files}</span>
              </div>
              <div className="bg-[#080D1A] p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">Deleted</span>
                <span className="text-lg font-bold text-red-400 font-mono">{scanResult.deleted_files}</span>
              </div>
            </div>

            {/* Discrepancies Table */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-lg">
              {scanResult.discrepancies.length > 0 ? (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#080D1A] text-slate-400 uppercase text-[10px] font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">File Relative Path</th>
                      <th className="py-2.5 px-3">Previous SHA-256</th>
                      <th className="py-2.5 px-3">Current SHA-256</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                    {scanResult.discrepancies.map((d, i) => (
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
                        <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]" title={d.previous_hash || ''}>
                          {d.previous_hash ? `${d.previous_hash.slice(0, 16)}...` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-cyan-400 truncate max-w-[140px]" title={d.current_hash || ''}>
                          {d.current_hash ? `${d.current_hash.slice(0, 16)}...` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-emerald-400 font-medium">
                  ✓ Perfect match! No filesystem changes detected relative to active baseline.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setScanResult(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

