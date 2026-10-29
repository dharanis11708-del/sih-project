import React, { useState, useEffect } from 'react';
import {
  History, ShieldCheck, AlertTriangle, CheckCircle2,
  Lock, RefreshCw, Search
} from 'lucide-react';
import { api } from '../lib/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit-logs?limit=50');
      setLogs(res.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await api.get('/audit-logs/verify');
      setIntegrityStatus(res.data);
    } catch (e) {
      alert('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Cryptographic Audit Trail &amp; Transparency
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident append-only ledger with SHA-256 hash chaining (Block-0 to Block-N)
          </p>
        </div>

        <button
          onClick={handleVerifyIntegrity}
          disabled={isVerifying}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-2 disabled:opacity-50"
        >
          <ShieldCheck className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>{isVerifying ? 'Recalculating Hashes...' : 'Verify Cryptographic Integrity'}</span>
        </button>
      </div>

      {/* Verification Result Banner */}
      {integrityStatus && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between animate-fadeIn ${
            integrityStatus.is_intact
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            {integrityStatus.is_intact ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold">
                Audit Chain Status: {integrityStatus.status} (Verified {integrityStatus.total_records_verified} records)
              </p>
              <p className="text-[11px] opacity-80">
                {integrityStatus.is_intact
                  ? 'Zero tampering detected. All previous hash pointers strictly match recalculations.'
                  : 'Tampering detected! Inconsistency found in hash chaining pointers.'}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold uppercase">{integrityStatus.algorithm}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Cryptographic Hash (SHA-256)</th>
                <th className="py-3 px-4">Previous Hash Pointer</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-sans font-bold text-indigo-600 dark:text-indigo-400">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-700 dark:text-slate-300">
                    {log.actor_name} ({log.actor_role})
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-500">
                    {log.entity_type} #{log.entity_id.slice(0, 8)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 dark:text-white">
                    {log.hash.slice(0, 18)}...
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {log.prev_hash ? `${log.prev_hash.slice(0, 18)}...` : 'GENESIS'}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-500 text-right">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

