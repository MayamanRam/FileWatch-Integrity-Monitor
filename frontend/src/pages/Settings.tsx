import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Key,
  Sliders,
  Cpu,
  Save,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [debounceSec, setDebounceSec] = useState('1.0');
  const [scanInterval, setScanInterval] = useState('300');
  const [chunkSizeKb, setChunkSizeKb] = useState('64');
  const [maxSizeMb, setMaxSizeMb] = useState('100');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-cyan-400" />
          <span>System & Engine Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographic tuning, watchdog event debouncing, and integrity scan scheduling parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          {/* File Hashing Engine */}
          <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <span>Cryptographic File Hashing Engine</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Buffer Chunk Size (KB)
                </label>
                <input
                  type="number"
                  value={chunkSizeKb}
                  onChange={(e) => setChunkSizeKb(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Chunked streaming read buffer (default: 64 KB)</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Maximum File Size (MB)
                </label>
                <input
                  type="number"
                  value={maxSizeMb}
                  onChange={(e) => setMaxSizeMb(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Skip files exceeding threshold to prevent memory strain</p>
              </div>
            </div>
          </div>

          {/* Filesystem Watchdog */}
          <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="h-4 w-4 text-purple-400" />
              <span>Real-Time Event Monitoring & Debouncing</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Event Debounce Window (seconds)
                </label>
                <input
                  type="text"
                  value={debounceSec}
                  onChange={(e) => setDebounceSec(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Coalesces rapid write bursts before recalculating SHA-256</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Periodic Verification Interval (seconds)
                </label>
                <input
                  type="number"
                  value={scanInterval}
                  onChange={(e) => setScanInterval(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080D1A] border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Background full baseline reconciliation interval</p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Configuration</span>
              </button>

              {savedSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Settings updated successfully!</span>
                </span>
              )}
            </div>
          </div>
        </form>

        {/* Cryptographic Secrets & Key Health */}
        <div className="space-y-6">
          <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Key className="h-4 w-4 text-purple-400" />
              <span>Tamper-Detection Key Security</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Algorithm:</span>
                  <span className="text-white font-bold">HMAC-SHA256</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Key Status:</span>
                  <span className="text-emerald-400 font-bold">Sealed in data/.hmac_key</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Key Length:</span>
                  <span className="text-slate-300">256-bit entropy</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                The HMAC key is isolated from database records to ensure that attackers modifying SQLite database rows cannot forge valid signatures.
              </p>
            </div>
          </div>

          <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <HardDrive className="h-4 w-4 text-cyan-400" />
              <span>Risk Classification Rules</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-red-400 font-bold block text-[11px] uppercase">Critical Extensions:</span>
                <span className="font-mono text-slate-300 text-[11px]">.exe, .dll, .sys, .so, .bat, .ps1, .sh</span>
              </div>
              <div>
                <span className="text-orange-400 font-bold block text-[11px] uppercase">High Risk Extensions:</span>
                <span className="font-mono text-slate-300 text-[11px]">.env, .config, .yml, .ini, .key, .pem</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

