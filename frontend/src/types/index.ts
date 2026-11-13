export interface SystemStatus {
  system_status: 'OPERATIONAL' | 'DEGRADED' | 'STOPPED';
  is_monitoring_active: boolean;
  monitored_directories_count: number;
  active_baselines_count: number;
  total_monitored_files: number;
  open_alerts_count: number;
  critical_alerts_count: number;
  events_last_24h: number;
  last_verification_time: string | null;
  baseline_tamper_detected: boolean;
}

export interface MonitoredDirectory {
  id: string;
  path: string;
  label: string;
  recursive: boolean;
  include_extensions: string[];
  exclude_extensions: string[];
  exclude_subdirectories: string[];
  max_file_size_mb: number;
  is_active: boolean;
  status: 'active' | 'paused' | 'error';
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
  file_count: number;
  active_baseline_id: string | null;
}

export interface DirectoryCreateInput {
  path: string;
  label: string;
  recursive: boolean;
  include_extensions?: string[];
  exclude_extensions?: string[];
  exclude_subdirectories?: string[];
  max_file_size_mb?: number;
}

export interface BaselineFile {
  id: string;
  relative_path: string;
  file_name: string;
  file_size: number;
  sha256_hash: string;
  file_type: string;
  file_permissions: string;
  modified_time: string;
}

export interface IntegrityBaseline {
  id: string;
  directory_id: string;
  name: string;
  description: string;
  file_count: number;
  total_size_bytes: number;
  baseline_hash: string;
  is_active: boolean;
  tamper_status: 'VALID' | 'TAMPERED' | 'UNVERIFIED';
  created_at: string;
}

export interface BaselineDetail extends IntegrityBaseline {
  files: BaselineFile[];
}

export interface BaselineDiffItem {
  relative_path: string;
  status: 'NEW' | 'MODIFIED' | 'DELETED' | 'UNCHANGED' | 'METADATA_CHANGED';
  previous_hash: string | null;
  current_hash: string | null;
  previous_size: number | null;
  current_size: number | null;
  severity: string;
}

export interface BaselineVerificationResult {
  baseline_id: string;
  directory_id: string;
  directory_path: string;
  verified_at: string;
  total_baseline_files: number;
  current_disk_files: number;
  unchanged_files: number;
  modified_files: number;
  new_files: number;
  deleted_files: number;
  tamper_status: string;
  discrepancies: BaselineDiffItem[];
}

export interface BaselineTamperCheckResult {
  baseline_id: string;
  name: string;
  is_tampered: boolean;
  status: 'VALID' | 'TAMPERED';
  root_hmac_valid: boolean;
  tampered_file_records: string[];
  message: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  directory_id: string | null;
  directory_path: string;
  relative_path: string;
  file_name: string;
  event_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  previous_hash: string | null;
  current_hash: string | null;
  previous_metadata: Record<string, any>;
  current_metadata: Record<string, any>;
  details: string;
  verification_status: string;
  baseline_id: string | null;
  investigation_status: string;
}

export interface SecurityAlert {
  id: string;
  event_id: string | null;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  status: 'open' | 'acknowledged' | 'resolved';
  investigation_notes: string;
  directory_path: string;
  file_path: string;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  actor: string;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  hmac_signature: string;
}

