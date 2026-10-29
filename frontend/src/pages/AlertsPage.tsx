import React, { useState, useEffect } from 'react';
import {
  Bell, ShieldAlert, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, CheckCheck
} from 'lucide-react';
import { api } from '../lib/api';
import { NotificationItem } from '../types';

export const AlertsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'notifications' | 'escalations'>('notifications');

  const fetchAlerts = async () => {
    try {
      const [notifRes, escRes] = await Promise.all([
        api.get('/alerts/notifications?limit=100'),
        api.get('/alerts/escalations'),
      ]);
      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(notifRes.data.unread_count || 0);
      setEscalations(escRes.data || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/alerts/notifications/read-all');
      fetchAlerts();
    } catch (e) {
      // ignore
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      await api.patch(`/alerts/notifications/${id}/read`);
      fetchAlerts();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Alert &amp; Escalation Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated SLA notifications, document expiry alerts, and multi-tier escalation ladder
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 transition flex items-center space-x-2"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Notifications as Read</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-bold">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'notifications'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Notifications Inbox ({unreadCount} unread)
        </button>
        <button
          onClick={() => setActiveTab('escalations')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'escalations'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Active Escalations ({escalations.length})
        </button>
      </div>

      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No notifications currently in your inbox.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => n.status === 'UNREAD' && markSingleRead(n.id)}
                className={`p-4 transition flex items-start justify-between cursor-pointer ${
                  n.status === 'UNREAD'
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {n.severity === 'DANGER' ? (
                    <ShieldAlert className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                  ) : n.severity === 'WARNING' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{n.title}</p>
                      {n.status === 'UNREAD' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {n.entity_id && (
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    View Details &rarr;
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'escalations' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Overdue Escalations Ladder (Level 1 &amp; Level 2)
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {escalations.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No active escalations recorded. All scrutinies are progressing within statutory SLA limits.
              </div>
            ) : (
              escalations.map((esc) => (
                <div key={esc.id} className="p-4 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded-md font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[11px]">
                      Level {esc.level} Escalation
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{esc.reason}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Triggered on {new Date(esc.triggered_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                    Under Senior Review
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

