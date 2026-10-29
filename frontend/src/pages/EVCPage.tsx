import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle2, XCircle, AlertTriangle,
  UserCheck, FileText, ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { EVCVisitItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export const EVCPage: React.FC = () => {
  const { user } = useAuthStore();
  const [visits, setVisits] = useState<EVCVisitItem[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<EVCVisitItem | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [recommendation, setRecommendation] = useState('APPROVE');
  const [reportRemarks, setReportRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVisits = async () => {
    try {
      const res = await api.get('/evc/visits');
      setVisits(res.data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleMemberResponse = async (visitId: string, response: 'ACCEPTED' | 'DECLINED') => {
    try {
      await api.post(`/evc/visits/${visitId}/respond`, {
        response,
        conflict_of_interest: false,
      });
      fetchVisits();
      alert(`Visit invitation marked as ${response}`);
    } catch (e) {
      alert('Failed to submit response');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    setIsSubmitting(true);
    try {
      await api.post(`/evc/visits/${selectedVisit.id}/report`, {
        recommendation,
        findings_checklist: {
          instructional_area: 'Satisfactory',
          faculty_ratio: 'Compliant with 1:15',
          laboratories: 'Fully functional and licensed',
        },
        remarks: reportRemarks,
      });
      setShowReportModal(false);
      setSelectedVisit(null);
      setReportRemarks('');
      fetchVisits();
      alert('EVC Inspection Report submitted successfully!');
    } catch (e) {
      alert('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Expert Visit Committee (EVC) Inspections
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Peer review panel scheduling, conflict of interest screenings, and digital visit reporting
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Scheduled &amp; Completed Inspection Visits ({visits.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Application</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Committee Chairperson</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visits.map((v) => {
                const chair = v.members.find((m) => m.role === 'CHAIRPERSON');
                return (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                      {v.application_no}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                      {v.institution_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {new Date(v.scheduled_date).toLocaleDateString()} ({v.start_time} - {v.end_time})
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {chair?.name || 'Nominated Expert'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {user?.role === 'EVC_MEMBER' && v.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => handleMemberResponse(v.id, 'ACCEPTED')}
                            className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVisit(v);
                              setShowReportModal(true);
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
                          >
                            Submit Report
                          </button>
                        </>
                      )}
                      {['SUPER_ADMIN', 'SENIOR_OFFICER'].includes(user?.role || '') && (
                        <button
                          onClick={() => {
                            setSelectedVisit(v);
                            setShowReportModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 transition"
                        >
                          Record Report
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Submit EVC Report */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Submit EVC Inspection Report">
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Final Recommendation
            </label>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              <option value="APPROVE">Approve Institutional Extension</option>
              <option value="APPROVE_WITH_CONDITIONS">Approve with Time-Bound Conditions</option>
              <option value="REJECT">Reject Application (Severe Deficiencies)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Inspection Observations &amp; Findings
            </label>
            <textarea
              rows={4}
              required
              placeholder="Record notes on faculty verification, laboratory safety, built-up area adequacy, and student amenities..."
              value={reportRemarks}
              onChange={(e) => setReportRemarks(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting Inspection Finding...' : 'Submit Final EVC Report'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

