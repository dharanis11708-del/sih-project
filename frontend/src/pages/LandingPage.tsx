import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Clock, FileCheck2, Cpu, ArrowRight,
  Search, CheckCircle2, Building, AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';

export const LandingPage: React.FC = () => {
  const [appNo, setAppNo] = useState('');
  const [email, setEmail] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [trackingError, setTrackingError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError('');
    setTrackingResult(null);
    setIsSearching(true);

    try {
      const res = await api.post('/public/track', {
        application_no: appNo.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
      });
      setTrackingResult(res.data);
    } catch (err: any) {
      setTrackingError(
        err.response?.data?.error?.message ||
          'Application not found. Please verify the Application Number and Registered Email.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
              AT
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Approval<span className="text-indigo-600">Track</span></span>
              <span className="hidden sm:inline-block ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                AICTE Smart Automation SIH26262
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
            >
              Register College
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6">
            <span>Official AICTE Smart India Hackathon 2026 Solution</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight max-w-4xl mx-auto">
            AICTE Approval Workflow Automation &amp; Compliance Monitoring
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-normal">
            An end-to-end regulatory platform eliminating manual tracking delays with automated SLA enforcement, OCR document validation, predictive risk scoring, and tamper-evident audit trails.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition"
            >
              <span>Access System Portal</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#track"
              className="px-6 py-3.5 rounded-xl font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Track Application (No Login)
            </a>
          </div>

          {/* KPI Ticker */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-3xl font-extrabold text-indigo-600">60%+</p>
              <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Turnaround Time Reduction</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-3xl font-extrabold text-emerald-600">100%</p>
              <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">SLA Accountability</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-3xl font-extrabold text-amber-600">OCR &amp; AI</p>
              <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Date &amp; Lease Extraction</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-3xl font-extrabold text-purple-600">SHA-256</p>
              <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Cryptographic Audit Chain</p>
            </div>
          </div>
        </section>

        {/* Public Status Tracker Section */}
        <section id="track" className="py-16 bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Public Application Status Tracker</h2>
              <p className="text-sm text-slate-500 mt-2">Check the real-time stage of your AICTE approval without logging in</p>
            </div>

            <form onSubmit={handleTrack} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Application Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APP-2026-000001"
                    value={appNo}
                    onChange={(e) => setAppNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Registered Contact Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin_0@approvaltrack.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>{isSearching ? 'Verifying with Portal...' : 'Track Application Status'}</span>
              </button>
            </form>

            {/* Error Result */}
            {trackingError && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center space-x-3 text-red-800 dark:text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{trackingError}</span>
              </div>
            )}

            {/* Success Result */}
            {trackingResult && (
              <div className="mt-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{trackingResult.institution_name}</h3>
                    <p className="text-xs text-slate-500">{trackingResult.application_no} &bull; {trackingResult.type}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {trackingResult.current_status}
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress Stepper</p>
                  <div className="space-y-2">
                    {trackingResult.timeline.map((h: any, i: number) => (
                      <div key={i} className="flex items-center space-x-3 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{h.stage}</span>
                        <span className="text-slate-400">({new Date(h.entered_at).toLocaleDateString()})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 px-4 text-center text-xs">
        <p className="font-bold text-white text-sm">AICTE ApprovalTrack Platform</p>
        <p className="mt-1">Developed for Smart India Hackathon 2026 &bull; Problem Statement SIH26262 &bull; Team Tech Spark</p>
      </footer>
    </div>
  );
};

