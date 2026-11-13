import {
  SystemStatus,
  MonitoredDirectory,
  DirectoryCreateInput,
  IntegrityBaseline,
  BaselineDetail,
  BaselineVerificationResult,
  BaselineTamperCheckResult,
  SecurityEvent,
  SecurityAlert,
  AuditLog
} from '../types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      errMsg = errData.detail || errMsg;
    } catch {
      // Non-json error
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // System
  getSystemStatus: () => fetchJson<SystemStatus>(`${API_BASE}/system/status`),

  // Directories
  getDirectories: () => fetchJson<MonitoredDirectory[]>(`${API_BASE}/directories`),
  createDirectory: (data: DirectoryCreateInput) =>
    fetchJson<MonitoredDirectory>(`${API_BASE}/directories`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteDirectory: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/directories/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete directory');
  },
  pauseDirectory: (id: string) =>
    fetchJson<{ message: string }>(`${API_BASE}/directories/${id}/pause`, { method: 'POST' }),
  resumeDirectory: (id: string) =>
    fetchJson<{ message: string }>(`${API_BASE}/directories/${id}/resume`, { method: 'POST' }),
  triggerDirectoryScan: (id: string) =>
    fetchJson<BaselineVerificationResult>(`${API_BASE}/directories/${id}/scan`, { method: 'POST' }),

  // Baselines
  getBaselines: (directoryId?: string) => {
    const query = directoryId ? `?directory_id=${directoryId}` : '';
    return fetchJson<IntegrityBaseline[]>(`${API_BASE}/baselines${query}`);
  },
  createBaseline: (directoryId: string, name: string, description?: string) =>
    fetchJson<IntegrityBaseline>(`${API_BASE}/baselines`, {
      method: 'POST',
      body: JSON.stringify({ directory_id: directoryId, name, description })
    }),
  getBaselineDetail: (id: string) =>
    fetchJson<BaselineDetail>(`${API_BASE}/baselines/${id}`),
  verifyBaseline: (id: string) =>
    fetchJson<BaselineVerificationResult>(`${API_BASE}/baselines/${id}/verify`),
  checkBaselineTamper: (id: string) =>
    fetchJson<BaselineTamperCheckResult>(`${API_BASE}/baselines/${id}/tamper-check`),
  activateBaseline: (id: string) =>
    fetchJson<{ message: string }>(`${API_BASE}/baselines/${id}/activate`, { method: 'POST' }),

  // Security Events
  getEvents: (params?: { directory_id?: string; event_type?: string; severity?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.directory_id) q.set('directory_id', params.directory_id);
    if (params?.event_type) q.set('event_type', params.event_type);
    if (params?.severity) q.set('severity', params.severity);
    if (params?.limit) q.set('limit', String(params.limit));
    return fetchJson<SecurityEvent[]>(`${API_BASE}/events?${q.toString()}`);
  },

  // Security Alerts
  getAlerts: (params?: { status?: string; severity?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.severity) q.set('severity', params.severity);
    return fetchJson<SecurityAlert[]>(`${API_BASE}/alerts?${q.toString()}`);
  },
  updateAlert: (id: string, status?: string, investigation_notes?: string) =>
    fetchJson<SecurityAlert>(`${API_BASE}/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, investigation_notes })
    }),

  // Audit Logs
  getAuditLogs: (action?: string) => {
    const q = action ? `?action=${action}` : '';
    return fetchJson<AuditLog[]>(`${API_BASE}/audit-logs${q}`);
  },

  // Report Export
  exportReport: async (format: 'json' | 'csv' | 'pdf', filters?: { directory_id?: string; severity?: string }) => {
    const res = await fetch(`${API_BASE}/reports/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, ...filters })
    });
    if (!res.ok) throw new Error('Failed to generate report export');

    if (format === 'json') {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `filewatch_audit_report_${Date.now()}.json`);
    } else if (format === 'csv') {
      const blob = await res.blob();
      downloadBlob(blob, `filewatch_audit_report_${Date.now()}.csv`);
    } else if (format === 'pdf') {
      const blob = await res.blob();
      downloadBlob(blob, `filewatch_audit_report_${Date.now()}.pdf`);
    }
  }
};

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

