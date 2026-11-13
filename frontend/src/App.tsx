import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { FileMonitoring } from './pages/FileMonitoring';
import { Directories } from './pages/Directories';
import { Baselines } from './pages/Baselines';
import { SecurityEvents } from './pages/SecurityEvents';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { About } from './pages/About';

import {
  SystemStatus,
  MonitoredDirectory,
  IntegrityBaseline,
  SecurityEvent,
  SecurityAlert,
  AuditLog,
  DirectoryCreateInput,
  BaselineVerificationResult
} from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [directories, setDirectories] = useState<MonitoredDirectory[]>([]);
  const [baselines, setBaselines] = useState<IntegrityBaseline[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      const [s, dirs, bsls, evts, alrts, logs] = await Promise.all([
        api.getSystemStatus().catch(() => null),
        api.getDirectories().catch(() => []),
        api.getBaselines().catch(() => []),
        api.getEvents({ limit: 100 }).catch(() => []),
        api.getAlerts().catch(() => []),
        api.getAuditLogs().catch(() => [])
      ]);
      if (s) setStatus(s);
      setDirectories(dirs);
      setBaselines(bsls);
      setEvents(evts);
      setAlerts(alrts);
      setAuditLogs(logs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // Actions
  const handleAddDirectory = async (data: DirectoryCreateInput) => {
    await api.createDirectory(data);
    await loadAllData();
  };

  const handleDeleteDirectory = async (id: string) => {
    await api.deleteDirectory(id);
    await loadAllData();
  };

  const handlePauseDirectory = async (id: string) => {
    await api.pauseDirectory(id);
    await loadAllData();
  };

  const handleResumeDirectory = async (id: string) => {
    await api.resumeDirectory(id);
    await loadAllData();
  };

  const handleScanDirectory = async (id: string): Promise<BaselineVerificationResult> => {
    const res = await api.triggerDirectoryScan(id);
    await loadAllData();
    return res;
  };

  const handleCreateBaseline = async (dirId: string, name: string, desc?: string) => {
    await api.createBaseline(dirId, name, desc);
    await loadAllData();
  };

  const handleActivateBaseline = async (id: string) => {
    await api.activateBaseline(id);
    await loadAllData();
  };

  const handleUpdateAlert = async (id: string, st?: string, notes?: string) => {
    await api.updateAlert(id, st, notes);
    await loadAllData();
  };

  const handleQuickScan = async () => {
    if (directories.length === 0) {
      setActiveTab('directories');
      return;
    }
    try {
      await api.triggerDirectoryScan(directories[0].id);
      await loadAllData();
      alert(`Integrity verification scan completed for ${directories[0].label}!`);
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    }
  };

  const handleQuickTamperCheck = async () => {
    if (baselines.length === 0) {
      setActiveTab('baselines');
      return;
    }
    try {
      const res = await api.checkBaselineTamper(baselines[0].id);
      await loadAllData();
      alert(`Tamper Check Result: ${res.message} (Status: ${res.status})`);
    } catch (err: any) {
      alert(`Tamper check failed: ${err.message}`);
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      status={status}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          status={status}
          events={events}
          alerts={alerts}
          onNavigate={setActiveTab}
          onRefresh={loadAllData}
          onQuickScan={handleQuickScan}
          onQuickTamperCheck={handleQuickTamperCheck}
        />
      )}
      {activeTab === 'monitoring' && (
        <FileMonitoring
          events={events}
          onRefresh={loadAllData}
        />
      )}
      {activeTab === 'directories' && (
        <Directories
          directories={directories}
          onAddDirectory={handleAddDirectory}
          onDeleteDirectory={handleDeleteDirectory}
          onPauseDirectory={handlePauseDirectory}
          onResumeDirectory={handleResumeDirectory}
          onScanDirectory={handleScanDirectory}
          onCreateBaseline={handleCreateBaseline}
        />
      )}
      {activeTab === 'baselines' && (
        <Baselines
          baselines={baselines}
          directories={directories}
          onRefresh={loadAllData}
          onCreateBaseline={handleCreateBaseline}
          onActivateBaseline={handleActivateBaseline}
        />
      )}
      {activeTab === 'events' && (
        <SecurityEvents
          events={events}
          onRefresh={loadAllData}
        />
      )}
      {activeTab === 'alerts' && (
        <Alerts
          alerts={alerts}
          onUpdateAlert={handleUpdateAlert}
          onRefresh={loadAllData}
        />
      )}
      {activeTab === 'reports' && (
        <Reports
          directories={directories}
          status={status}
        />
      )}
      {activeTab === 'audit' && (
        <AuditLogs
          logs={auditLogs}
          onRefresh={loadAllData}
        />
      )}
      {activeTab === 'settings' && <Settings />}
      {activeTab === 'about' && <About />}
    </AppLayout>
  );
};

