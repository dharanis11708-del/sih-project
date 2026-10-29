import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, AlertTriangle, CheckCircle2, XCircle,
  TrendingUp, Users, ArrowUpRight, ShieldAlert, FileSpreadsheet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { DashboardSummary } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [ageingData, setAgeingData] = useState<any[]>([]);
  const [officerData, setOfficerData] = useState<any[]>([]);
  const [pendencyList, setPendencyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [sumRes, funRes, ageRes, offRes, penRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/funnel'),
        api.get('/dashboard/ageing'),
        api.get('/dashboard/officer-load'),
        api.get('/dashboard/pendency'),
      ]);

      setSummary(sumRes.data);
      setFunnelData(funRes.data);
      setAgeingData(ageRes.data);
      setOfficerData(offRes.data.slice(0, 6));
      setPendencyList(penRes.data.slice(0, 6));
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Compliance &amp; Workflow Intelligence Cockpit
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.name}</span> ({user?.role?.replace(/_/g, ' ')})
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/pendency"
            className="px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition flex items-center space-x-2"
          >
            <Clock className="w-4 h-4" />
            <span>Pendency Cockpit</span>
          </Link>
          <Link
            to="/reports"
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center space-x-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Reports</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={summary?.total_applications ?? 0}
          subtitle="Cycle 2026-2027"
          icon={FileText}
          color="indigo"
        />
        <StatCard
          title="Pending in Scrutiny"
          value={summary?.pending_applications ?? 0}
          subtitle="Active scrutiny pipeline"
          icon={Clock}
          color="amber"
          trend={`${summary?.high_risk_count ?? 0} High Risk`}
          trendType="negative"
        />
        <StatCard
          title="SLA Breached / Overdue"
          value={summary?.overdue_applications ?? 0}
          subtitle="Action required by officer"
          icon={AlertTriangle}
          color="rose"
          trend="Auto-Escalated"
          trendType="negative"
        />
        <StatCard
          title="SLA Compliance Rate"
          value={`${summary?.sla_compliance_rate ?? 100}%`}
          subtitle="Target: >= 95%"
          icon={CheckCircle2}
          color="emerald"
          trend={`${summary?.avg_processing_days ?? 14}d avg duration`}
          trendType="positive"
        />
      </div>

      {/* Middle Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Funnel Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Stage-Wise Application Distribution (Funnel)
              </h3>
              <p className="text-xs text-slate-500">Live count of applications across approval pipeline</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12, color: '#fff' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ageing Buckets Donut */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Ageing Analysis (Days in Stage)
          </h3>
          <p className="text-xs text-slate-500 mb-4">Application processing delay buckets</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ageingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {ageingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12, color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {ageingData.map((b) => (
              <div key={b.bucket} className="flex items-center space-x-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-slate-600 dark:text-slate-400">{b.bucket}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Officer Load & Top Delayed Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Officer Workload */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Scrutiny Officer Workload
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Active / Overdue</span>
          </div>
          <div className="space-y-3">
            {officerData.map((off) => (
              <div key={off.officer_id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                    {off.officer_name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {off.active_applications} active
                    </span>
                    {off.overdue_applications > 0 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        {off.overdue_applications} overdue
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{off.region}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Delayed Applications Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Delayed &amp; At-Risk Applications
              </h3>
              <p className="text-xs text-slate-500">Applications breaching SLA or flagged by ML delay model</p>
            </div>
            <Link to="/applications" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1">
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">App No</th>
                  <th className="py-2.5 px-3">Institution</th>
                  <th className="py-2.5 px-3">Stage</th>
                  <th className="py-2.5 px-3">Officer</th>
                  <th className="py-2.5 px-3">Overdue</th>
                  <th className="py-2.5 px-3">AI Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendencyList.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      <Link to={`/applications/${app.id}`}>{app.application_no}</Link>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                      {app.institution_name}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={app.stage_code} />
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                      {app.responsible_officer}
                    </td>
                    <td className="py-3 px-3">
                      {app.days_overdue > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          +{app.days_overdue} days
                        </span>
                      ) : (
                        <span className="text-slate-400">On Track</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={app.risk_label} type="risk" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

