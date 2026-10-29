import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, Filter, Download, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

export const PendencyDashboardPage: React.FC = () => {
  const [pendencyList, setPendencyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  const fetchPendency = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/pendency');
      setPendencyList(res.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendency();
  }, []);

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/reports/pendency?format=csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'aicte_pendency_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Export failed');
    }
  };

  const filteredList = pendencyList.filter((item) => {
    const matchesSearch =
      item.application_no.toLowerCase().includes(search.toLowerCase()) ||
      item.institution_name.toLowerCase().includes(search.toLowerCase()) ||
      item.responsible_officer.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter ? item.risk_label === riskFilter : true;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Real-Time Pendency Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking scrutinies, designated responsible officers, and overdue delays
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Pendency CSV</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by officer name, college, or application no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
        >
          <option value="">All AI Risk Ratings</option>
          <option value="HIGH">High Delay Risk</option>
          <option value="MEDIUM">Medium Delay Risk</option>
          <option value="LOW">Low Delay Risk</option>
        </select>
      </div>

      {/* Pendency Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Application No</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4">Responsible Officer</th>
                <th className="py-3 px-4">Total Days</th>
                <th className="py-3 px-4">Overdue Days</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading pendency data...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No pending applications matching criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                      <Link to={`/applications/${app.id}`}>{app.application_no}</Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                      {app.institution_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {app.state}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.stage_code} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {app.responsible_officer}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {app.days_in_pipeline} days
                    </td>
                    <td className="py-3.5 px-4">
                      {app.days_overdue > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>+{app.days_overdue} days</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Within SLA</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.risk_label} type="risk" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/applications/${app.id}`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-100 transition"
                      >
                        Inspect File
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

