import React, { useState, useEffect } from 'react';
import {
  CheckSquare, ShieldCheck, AlertTriangle, RefreshCw,
  Award, AlertCircle, FileCheck
} from 'lucide-react';
import { api } from '../lib/api';
import { ComplianceItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const CompliancePage: React.FC = () => {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [highRisk, setHighRisk] = useState<any[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComplianceData = async () => {
    try {
      const [itemsRes, rulesRes, riskRes] = await Promise.all([
        api.get('/compliance/items'),
        api.get('/compliance/rules'),
        api.get('/compliance/high-risk'),
      ]);
      setItems(itemsRes.data);
      setRules(rulesRes.data);
      setHighRisk(riskRes.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const handleEvaluateAll = async () => {
    setIsEvaluating(true);
    try {
      const res = await api.post('/compliance/evaluate');
      alert(`Rule Engine evaluation completed: ${res.data.stats.institutions_evaluated} institutions graded.`);
      fetchComplianceData();
    } catch (e) {
      alert('Evaluation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Institutional Compliance &amp; Regulatory Vigilance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data-driven JSON-logic rule engine monitoring institutional conditions
          </p>
        </div>

        <button
          onClick={handleEvaluateAll}
          disabled={isEvaluating}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? 'Evaluating Rules...' : 'Re-Evaluate All Compliance Rules'}</span>
        </button>
      </div>

      {/* High-Risk Institutions Warning Bar */}
      {highRisk.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-900 dark:text-red-200">
                {highRisk.length} High-Risk Institutions Identified (Score &lt; 75%)
              </p>
              <p className="text-[11px] text-red-700 dark:text-red-300">
                These campuses have outstanding regulatory deficiencies or expired Fire/Lease clearances.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Active Rules & Compliance Item Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Sidebar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Active Declarative Rules</span>
          </h3>

          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{rule.code}</span>
                  <StatusBadge status={rule.severity} type="severity" />
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{rule.title}</p>
                <p className="text-slate-500 text-[11px]">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Items Ledger */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Institutional Compliance Status Ledger
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{items.length} Evaluated Rules</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Compliance Rule</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Evaluated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {item.rule_title}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.severity || 'HIGH'} type="severity" />
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.status === 'COMPLIANT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(item.last_evaluated_at).toLocaleDateString()}
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

