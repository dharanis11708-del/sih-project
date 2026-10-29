export type Role =
  | 'SUPER_ADMIN'
  | 'AICTE_OFFICER'
  | 'SENIOR_OFFICER'
  | 'EVC_MEMBER'
  | 'COLLEGE_ADMIN'
  | 'AUDITOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  region_id?: string;
  institution_id?: string;
  institution_name?: string;
  region_name?: string;
  is_active: boolean;
}

export interface Application {
  id: string;
  application_no: string;
  institution_id: string;
  type_id: string;
  academic_year_id: string;
  current_stage_id?: string;
  status: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  assigned_officer_id?: string;
  details: Record<string, any>;
  submitted_at?: string;
  due_at?: string;
  completed_at?: string;
  risk_score: number;
  risk_label: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_factors: string[];
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
  institution_name?: string;
  type_name?: string;
  stage_name?: string;
  assigned_officer_name?: string;
}

export interface DocumentItem {
  id: string;
  application_id?: string;
  institution_id: string;
  type_id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  status: 'UPLOADED' | 'OCR_PENDING' | 'OCR_DONE' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  issue_date?: string;
  expiry_date?: string;
  ocr_confidence: number;
  extracted_fields: Record<string, any>;
  ocr_text?: string;
  verified_at?: string;
  verification_remarks?: string;
  document_type_name?: string;
  created_at: string;
}

export interface DeficiencyItem {
  id: string;
  application_id: string;
  raised_by_id: string;
  category: string;
  description: string;
  status: 'OPEN' | 'RESPONDED' | 'RESOLVED' | 'REJECTED';
  due_at: string;
  response_text?: string;
  responded_at?: string;
  resolved_at?: string;
  created_at: string;
  raised_by_name?: string;
}

export interface EVCVisitItem {
  id: string;
  application_id: string;
  application_no?: string;
  institution_name?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  report_due_at: string;
  report_submitted_at?: string;
  coordinator_name?: string;
  members: Array<{
    user_id: string;
    name: string;
    role: string;
    response: string;
    conflict_of_interest: boolean;
  }>;
}

export interface ComplianceItem {
  id: string;
  institution_id: string;
  rule_id: string;
  status: 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'OVERDUE' | 'WAIVED';
  due_date?: string;
  last_evaluated_at: string;
  evaluation_result: Record<string, any>;
  rule_title?: string;
  rule_code?: string;
  severity?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  severity: 'INFO' | 'WARNING' | 'DANGER';
  entity_type?: string;
  entity_id?: string;
  status: 'UNREAD' | 'READ';
  created_at: string;
  read_at?: string;
}

export interface DashboardSummary {
  total_applications: number;
  pending_applications: number;
  overdue_applications: number;
  approved_applications: number;
  rejected_applications: number;
  sla_compliance_rate: number;
  avg_processing_days: number;
  high_risk_count: number;
}

