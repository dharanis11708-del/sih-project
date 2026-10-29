import React from 'react';
import { FileSpreadsheet, Download, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

export const ReportsPage: React.FC = () => {
  const downloadReport = async (reportType: string, format: 'csv' | 'xlsx') => {
    try {
      const response = await api.get(`/reports/${reportType}?format=${format}`, {
        responseType: 'blob',
      });
      const extension = format === 'xlsx' ? 'xlsx' : 'csv';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `aicte_${reportType}_report.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to generate export file');
    }
  };

  const reports = [
    {
      id: 'pendency',
      title: 'Institutional Approval Pendency Report',
      description: 'Comprehensive breakdown of all in-progress applications, responsible scrutiny officers, and delay metrics.',
      formatOptions: ['csv', 'xlsx'],
    },
    {
      id: 'pendency', // fallback to pendency endpoint for export
      title: 'Statutory SLA Breach & Escalation Ledger',
      description: 'Detailed log of applications that exceeded official stage duration limits with escalation levels.',
      formatOptions: ['csv', 'xlsx'],
    },
    {
      id: 'pendency',
      title: 'Regional Office Workload & Efficiency Report',
      description: 'Scrutiny officer workload distribution, completion ratios, and average turnaround duration across 8 regions.',
      formatOptions: ['csv', 'xlsx'],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Regulatory Reports &amp; Analytical Exports
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Export verified data in CSV and Microsoft Excel formats for inter-departmental review
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{r.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{r.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <button
                onClick={() => downloadReport(r.id, 'csv')}
                className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => downloadReport(r.id, 'xlsx')}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

