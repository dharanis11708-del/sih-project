import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle2, AlertTriangle, ShieldAlert,
  Calendar, MessageSquare, ArrowRight, UserPlus, Shield, XCircle, FileCheck
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Application, DocumentItem, DeficiencyItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [application, setApplication] = useState<Application | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [deficiencies, setDeficiencies] = useState<DeficiencyItem[]>([]);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents' | 'deficiencies' | 'remarks'>('overview');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [defCategory, setDefCategory] = useState('Land Lease & Safety Norms');
  const [defDescription, setDefDescription] = useState('');

  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [targetStage, setTargetStage] = useState('SCRUTINY');
  const [transitionRemarks, setTransitionRemarks] = useState('');

  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [verifyRemarks, setVerifyRemarks] = useState('');

  const [newRemarkText, setNewRemarkText] = useState('');
  const [isInternalRemark, setIsInternalRemark] = useState(false);

  const fetchApplicationData = async () => {
    if (!id) return;
    try {
      const [appRes, timeRes, docRes, defRes, remRes] = await Promise.all([
        api.get(`/applications/${id}`),
        api.get(`/applications/${id}/timeline`),
        api.get('/documents', { params: { application_id: id } }),
        api.get(`/applications/${id}/deficiencies`),
        api.get(`/applications/${id}/remarks`),
      ]);

      setApplication(appRes.data);
      setTimeline(timeRes.data);
      setDocuments(docRes.data);
      setDeficiencies(defRes.data);
      setRemarks(remRes.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationData();
  }, [id]);

  const handleRaiseDeficiency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/applications/${id}/deficiencies`, {
        category: defCategory,
        description: defDescription,
        due_days: 5,
      });
      setShowDeficiencyModal(false);
      setDefDescription('');
      fetchApplicationData();
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to raise deficiency');
    }
  };

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/applications/${id}/transition`, {
        target_stage_code: targetStage,
        outcome: 'ADVANCED',
        remarks: transitionRemarks,
      });
      setShowTransitionModal(false);
      setTransitionRemarks('');
      fetchApplicationData();
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Transition failed');
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await api.post(`/documents/${docId}/verify`, {
        status,
        remarks: verifyRemarks || 'Verified via officer scrutiny workbench',
      });
      setSelectedDoc(null);
      setVerifyRemarks('');
      fetchApplicationData();
    } catch (e: any) {
      alert('Failed to update verification status');
    }
  };

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemarkText.trim()) return;
    try {
      await api.post(`/applications/${id}/remarks`, {
        text: newRemarkText,
        is_internal: isInternalRemark,
      });
      setNewRemarkText('');
      fetchApplicationData();
    } catch (e: any) {
      alert('Failed to add remark');
    }
  };

  if (loading || !application) {
    return (
      <div className="py-20 text-center text-slate-400">
        Loading comprehensive application file...
      </div>
    );
  }

  const canScrutinize = ['SUPER_ADMIN', 'SENIOR_OFFICER', 'AICTE_OFFICER'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {application.application_no}
              </span>
              <StatusBadge status={application.status} />
              <StatusBadge status={application.risk_label} type="risk" />
              {application.is_overdue && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  SLA Breached
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {application.institution_name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {application.type_name} &bull; Academic Cycle 2026-2027 &bull; Assigned: {application.assigned_officer_name}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {canScrutinize && (
              <>
                <button
                  onClick={() => setShowDeficiencyModal(true)}
                  className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition shadow-sm flex items-center space-x-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Raise Deficiency</span>
                </button>
                <button
                  onClick={() => setShowTransitionModal(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Advance Stage</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-t border-slate-100 dark:border-slate-800 mt-6 pt-4 text-xs font-bold overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Details' },
            { id: 'timeline', label: `Timeline (${timeline.length})` },
            { id: 'documents', label: `Documents (${documents.length})` },
            { id: 'deficiencies', label: `Deficiencies (${deficiencies.length})` },
            { id: 'remarks', label: `Remarks (${remarks.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Institutional Programme Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-500">Approved Intake</span>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {application.details?.intake_capacity || 480} Seats
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-500">Built-Up Area</span>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {application.details?.built_up_area_sqm || 24500} Sq.m
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-500">Processing Priority</span>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {application.priority}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500">Applied Academic Disciplines:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {(application.details?.courses || ['Computer Engineering', 'Mechanical', 'AI & ML']).map((c: string) => (
                  <span key={c} className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* AI Risk Score Sidebar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>AI Delay Risk Assessment</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {Math.round(application.risk_score * 100)}%
              </span>
              <p className="text-xs font-bold text-slate-500 mt-1">Probability of Processing Breach</p>
              <div className="mt-2">
                <StatusBadge status={application.risk_label} type="risk" />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contributing Factors</p>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {application.risk_factors.map((rf, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-6">
            Stage Progression Audit History
          </h3>
          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timeline.map((h, i) => (
              <div key={i} className="relative">
                <span className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${h.is_breached ? 'bg-rose-500' : 'bg-indigo-600'}`} />
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{h.stage_name}</span>
                    <span className="text-slate-400">{new Date(h.entered_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-500">Action Officer: <span className="font-semibold text-slate-700 dark:text-slate-300">{h.actor_name}</span></p>
                  {h.remarks && <p className="text-slate-600 dark:text-slate-400 mt-2 italic">&ldquo;{h.remarks}&rdquo;</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Documents with OCR Side-by-Side Panel */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Uploaded Regulatory Evidence</h3>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedDoc?.id === doc.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FileCheck className="w-8 h-8 text-indigo-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{doc.document_type_name}</p>
                      <p className="text-[11px] text-slate-500">{doc.original_name} &bull; {(doc.file_size / 1024).toFixed(1)} KB</p>
                      {doc.expiry_date && (
                        <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={doc.status} />
                    <span className="text-xs text-indigo-600 font-bold hover:underline">Inspect OCR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OCR Side-by-Side Verification Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>OCR Extraction Workbench</span>
            </h3>

            {selectedDoc ? (
              <div className="space-y-4 text-xs animate-fadeIn">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedDoc.original_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">SHA256: {selectedDoc.sha256.slice(0, 16)}...</p>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Extracted Metadata</span>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1">
                    <p><span className="text-slate-500">Issue Date:</span> <span className="font-semibold">{selectedDoc.extracted_fields?.issue_date || 'N/A'}</span></p>
                    <p><span className="text-slate-500">Expiry Date:</span> <span className="font-semibold">{selectedDoc.extracted_fields?.expiry_date || 'N/A'}</span></p>
                    <p><span className="text-slate-500">Lease Tenure:</span> <span className="font-semibold">{selectedDoc.extracted_fields?.lease_years ? `${selectedDoc.extracted_fields.lease_years} Years` : 'N/A'}</span></p>
                    <p><span className="text-slate-500">OCR Confidence:</span> <span className="font-semibold font-mono">{Math.round(selectedDoc.ocr_confidence * 100)}%</span></p>
                  </div>
                </div>

                {canScrutinize && selectedDoc.status !== 'VERIFIED' && (
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Verification remarks..."
                      value={verifyRemarks}
                      onChange={(e) => setVerifyRemarks(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleVerifyDocument(selectedDoc.id, 'VERIFIED')}
                        className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center justify-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify OK</span>
                      </button>
                      <button
                        onClick={() => handleVerifyDocument(selectedDoc.id, 'REJECTED')}
                        className="py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center justify-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject Doc</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-10 text-center">
                Select an uploaded document on the left to review OCR dates and verify authenticity.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Deficiencies */}
      {activeTab === 'deficiencies' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active &amp; Resolved Deficiencies</h3>
            {canScrutinize && (
              <button
                onClick={() => setShowDeficiencyModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition"
              >
                + Raise Deficiency
              </button>
            )}
          </div>

          <div className="space-y-3">
            {deficiencies.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No deficiencies recorded on this application.</p>
            ) : (
              deficiencies.map((d) => (
                <div key={d.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{d.category}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{d.description}</p>
                  <p className="text-[11px] text-slate-400">Raised on {new Date(d.created_at).toLocaleDateString()} &bull; Response Due: {new Date(d.due_at).toLocaleDateString()}</p>
                  {d.response_text && (
                    <div className="mt-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-indigo-600">Institution Response:</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">{d.response_text}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Remarks */}
      {activeTab === 'remarks' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Discussion &amp; Scrutiny Notes</h3>
          <form onSubmit={handleAddRemark} className="space-y-3">
            <textarea
              rows={3}
              placeholder="Add observation or clarification..."
              value={newRemarkText}
              onChange={(e) => setNewRemarkText(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-between">
              {canScrutinize && (
                <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalRemark}
                    onChange={(e) => setIsInternalRemark(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Internal Note (AICTE officials only)</span>
                </label>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
              >
                Post Remark
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-4">
            {remarks.map((r) => (
              <div key={r.id} className="py-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{r.author_name} ({r.author_role})</span>
                  <span className="text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{r.text}</p>
                {r.is_internal && (
                  <span className="inline-block text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded">
                    Internal AICTE Scrutiny Note
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Raise Deficiency */}
      <Modal isOpen={showDeficiencyModal} onClose={() => setShowDeficiencyModal(false)} title="Raise Formal Deficiency">
        <form onSubmit={handleRaiseDeficiency} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Category</label>
            <input
              type="text"
              required
              value={defCategory}
              onChange={(e) => setDefCategory(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Description</label>
            <textarea
              rows={4}
              required
              placeholder="State the non-compliance or missing regulatory document clearly..."
              value={defDescription}
              onChange={(e) => setDefDescription(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition">
            Issue Deficiency Notice
          </button>
        </form>
      </Modal>

      {/* Modal: Advance Stage */}
      <Modal isOpen={showTransitionModal} onClose={() => setShowTransitionModal(false)} title="Advance Approval Workflow Stage">
        <form onSubmit={handleTransition} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Target Stage</label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              <option value="SCRUTINY">Document Scrutiny</option>
              <option value="EVC">Expert Visit Committee (EVC)</option>
              <option value="EVC_COMPLETED">EVC Report Review</option>
              <option value="SENIOR_REVIEW">Senior Officer Review</option>
              <option value="APPROVED">Final Decision: Approve</option>
              <option value="REJECTED">Final Decision: Reject</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Transition Remarks</label>
            <textarea
              rows={3}
              placeholder="Reason for stage transition..."
              value={transitionRemarks}
              onChange={(e) => setTransitionRemarks(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition">
            Confirm Stage Transition
          </button>
        </form>
      </Modal>
    </div>
  );
};

