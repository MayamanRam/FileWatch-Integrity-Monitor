import React from 'react';
import {
  Shield,
  Info,
  CheckCircle2,
  Lock,
  Radio,
  FileText,
  AlertTriangle,
  Github,
  Terminal,
  Cpu
} from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Brand Hero */}
      <div className="bg-[#0D1527] border border-slate-800 p-8 rounded-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">FileWatch</h2>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                v1.0.0 Production Release
              </span>
            </div>
            <p className="text-sm text-cyan-300 font-medium mt-0.5">
              Professional File Integrity Monitoring & Tamper Detection System
            </p>
            <p className="text-xs text-slate-400 mt-2 font-mono">
              "Monitor. Detect. Verify."
            </p>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Lock className="h-4 w-4" />
            <span>Cryptographic Content Hashing</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Streaming SHA-256 buffer reads ensure memory-safe hashing of small and large files alike. Content integrity is verified cryptographically rather than relying solely on easily spoofed file timestamps.
          </p>
        </div>

        <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Shield className="h-4 w-4" />
            <span>Tamper-Evident Baselines</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every baseline record and individual file checksum is signed with HMAC-SHA256 using an isolated secret key. Any direct, unauthorized alteration of database rows is immediately detected as baseline tampering.
          </p>
        </div>

        <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Radio className="h-4 w-4" />
            <span>Real-Time OS Event Monitoring</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Leveraging Python Watchdog with debouncing and duplicate coalescing, FileWatch captures real-time file creation, modification, deletion, and renaming events without drowning in OS buffer floods.
          </p>
        </div>

        <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <FileText className="h-4 w-4" />
            <span>Multi-Format Incident Reporting</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Export comprehensive integrity audits in executive PDF, SIEM-ingestible CSV, or automated JSON formats, filtered by directory, severity, and timestamp ranges.
          </p>
        </div>
      </div>

      {/* Security Architecture & Compliance Alignment */}
      <div className="bg-[#0D1527] border border-slate-800 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Cybersecurity Framework Alignment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800">
            <span className="text-cyan-400 font-bold block mb-1">NIST CSF 2.0</span>
            <span className="text-slate-300">DE.CM-01: Networks and physical environment monitored</span>
          </div>
          <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800">
            <span className="text-purple-400 font-bold block mb-1">MITRE ATT&CK</span>
            <span className="text-slate-300">T1565.001: Data Manipulation, Stored Data</span>
          </div>
          <div className="p-3 bg-[#080D1A] rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">OWASP ASVS 4.0</span>
            <span className="text-slate-300">V10: Malicious Code Search & Integrity Verification</span>
          </div>
        </div>
      </div>

      {/* Responsible Security Disclaimer */}
      <div className="bg-amber-950/20 border border-amber-600/40 p-6 rounded-xl space-y-2 text-xs text-amber-200">
        <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Operational Boundary & Threat Model Notice</span>
        </div>
        <p className="leading-relaxed">
          FileWatch operates as a user-space file integrity monitoring and tamper detection system. While HMAC signatures protect database records against offline manipulation, no local host application can guarantee integrity if an adversary gains root/administrator privileges and compromises the underlying operating system kernel or filesystem drivers.
        </p>
      </div>
    </div>
  );
};

