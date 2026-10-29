import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle2, ArrowRight, ArrowLeft, Upload,
  Building, BookOpen, ShieldCheck, AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export const NewApplicationWizard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [typeCode, setTypeCode] = useState('EOA');
  const [intake, setIntake] = useState('480');
  const [builtArea, setBuiltArea] = useState('24000');
  const [courses, setCourses] = useState('Computer Engineering, Artificial Intelligence, Electronics');
  const [declared, setDeclared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    setError('');
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declared) {
      setError('You must confirm the legal compliance declaration before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Create Application
      const courseList = courses.split(',').map((c) => c.trim()).filter(Boolean);
      const res = await api.post('/applications', {
        type_code: typeCode,
        academic_year: '2026-2027',
        details: {
          intake_capacity: parseInt(intake, 10),
          built_up_area_sqm: parseInt(builtArea, 10),
          courses: courseList,
        },
      });

      const newApp = res.data;

      // 2. Formally Submit (triggers WorkflowEngine auto-assignment & SLA timer)
      await api.post(`/applications/${newApp.id}/submit`);

      // 3. Redirect to Detail Page
      navigate(`/applications/${newApp.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          New Institutional Approval Application
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Submit regulatory approval for Academic Cycle 2026-2027
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        {[
          { num: 1, label: 'Approval Category' },
          { num: 2, label: 'Programmes & Intake' },
          { num: 3, label: 'Declaration & Submit' },
        ].map((s) => (
          <div key={s.num} className="flex items-center space-x-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step === s.num
                  ? 'bg-indigo-600 text-white'
                  : step > s.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </span>
            <span className={`font-semibold ${step === s.num ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Select Regulatory Application Category
          </h2>

          <div className="space-y-3">
            {[
              { code: 'EOA', title: 'Extension of Approval (EoA)', desc: 'Annual renewal for existing technical institutions with verified compliance.' },
              { code: 'INCREASE_INTAKE', title: 'Increase in Intake / Additional Course', desc: 'Requesting expansion of student admissions or introducing new disciplines.' },
              { code: 'NEW_INSTITUTION', title: 'Establishment of New Institution', desc: 'Comprehensive multi-disciplinary scrutiny for newly proposed campuses.' },
            ].map((cat) => (
              <label
                key={cat.code}
                className={`p-4 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                  typeCode === cat.code
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={cat.code}
                  checked={typeCode === cat.code}
                  onChange={(e) => setTypeCode(e.target.value)}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{cat.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{cat.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-2"
            >
              <span>Continue to Metrics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Intake & Courses */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Institutional Intake &amp; Infrastructure Capacity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Requested Total Intake (Seats)
              </label>
              <input
                type="number"
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Approved Built-Up Area (Sq. Metres)
              </label>
              <input
                type="number"
                value={builtArea}
                onChange={(e) => setBuiltArea(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Applied Degree / Diploma Programmes (Comma Separated)
            </label>
            <input
              type="text"
              value={courses}
              onChange={(e) => setCourses(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-2"
            >
              <span>Review &amp; Declare</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Declaration & Submit */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Statutory Legal Declaration
          </h2>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p>
              I hereby declare that all particulars furnished in this application are true, complete and correct to the best of my knowledge and belief.
            </p>
            <p>
              The institution possesses a clear registered land lease, verified fire safety certificate, and structural stability certifications in full compliance with the AICTE Approval Process Handbook (APH 2026-2027).
            </p>
          </div>

          <label className="flex items-start space-x-3 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              required
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>I accept the statutory compliance terms and submit for AICTE regional scrutiny.</span>
          </label>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Submitting to AICTE...' : 'Formally Submit Application'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

