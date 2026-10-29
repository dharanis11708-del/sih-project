import React, { useState, useEffect } from 'react';
import { Settings, Play, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

export const SettingsPage: React.FC = () => {
  const [jobRuns, setJobRuns] = useState<any[]>([]);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const fetchJobRuns = async () => {
    try {
      const res = await api.get('/jobs/runs');
      setJobRuns(res.data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchJobRuns();
  }, []);

  const triggerJob = async (jobName: string) => {
    setRunningJob(jobName);
    try {
      const res = await api.post(`/jobs/${jobName}/run`);
      alert(`Job ${jobName} triggered successfully: ${JSON.stringify(res.data.stats)}`);
      fetchJobRuns();
    } catch (e) {
      alert('Job trigger failed');
    } finally {
      setRunningJob(null);
    }
  };

  const scheduledJobs = [
    {
      name: 'SLA_BREACH_CHECK',
      title: 'Hourly SLA Breach & Auto-Escalation Check',
      desc: 'Scans non-terminal applications, flags SLA breaches, and triggers Level-1 escalations for overdue files.',
      frequency: 'Every 1 Hour',
    },
    {
      name: 'DOC_EXPIRY_SCAN',
      title: 'Daily Document Expiry Scanner',
      desc: 'Monitors validity of registered land lease deeds and fire safety NOCs; queues T-90, T-60, T-30 reminders.',
      frequency: 'Daily at 06:00 IST',
    },
    {
      name: 'COMPLIANCE_EVALUATION',
      title: 'Comprehensive Compliance Scoring Engine',
      desc: 'Re-evaluates AST JSON rule conditions across all 60+ institutions and updates compliance scores (0-100).',
      frequency: 'Daily at 02:00 IST',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          System Administration &amp; Automation Jobs
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor asynchronous Celery Beat tasks and manually trigger compliance evaluation sweeps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scheduledJobs.map((job) => (
          <div
            key={job.name}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {job.frequency}
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3">{job.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{job.desc}</p>
            </div>

            <button
              onClick={() => triggerJob(job.name)}
              disabled={runningJob === job.name}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${runningJob === job.name ? 'animate-spin' : ''}`} />
              <span>{runningJob === job.name ? 'Executing...' : 'Trigger Now'}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Historical Job Execution Log */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Automation Execution Runs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Job Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4">Finished At</th>
                <th className="py-3 px-4">Execution Summary Stats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {jobRuns.map((jr) => (
                <tr key={jr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400 font-sans">
                    {jr.job_name}
                  </td>
                  <td className="py-3.5 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {jr.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(jr.started_at).toLocaleTimeString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {jr.finished_at ? new Date(jr.finished_at).toLocaleTimeString() : 'In Progress'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                    {JSON.stringify(jr.stats)}
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

