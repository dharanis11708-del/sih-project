import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Clock, FileCheck, CheckSquare,
  Calendar, Bell, FileSpreadsheet, History, Users, Settings, PlusCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Applications', path: '/applications', icon: FileText },
    ...(role === 'COLLEGE_ADMIN'
      ? [{ label: 'New Application', path: '/applications/new', icon: PlusCircle }]
      : []),
    { label: 'Pendency Cockpit', path: '/pendency', icon: Clock },
    { label: 'Documents & OCR', path: '/documents', icon: FileCheck },
    { label: 'Compliance Hub', path: '/compliance', icon: CheckSquare },
    { label: 'EVC Inspections', path: '/evc', icon: Calendar },
    { label: 'Alerts & Escalations', path: '/alerts', icon: Bell },
    { label: 'Reports & Analytics', path: '/reports', icon: FileSpreadsheet },
    ...(['SUPER_ADMIN', 'AUDITOR', 'SENIOR_OFFICER'].includes(role || '')
      ? [{ label: 'Audit Trail', path: '/audit-logs', icon: History }]
      : []),
    ...(role === 'SUPER_ADMIN'
      ? [
          { label: 'User Directory', path: '/users', icon: Users },
          { label: 'System Settings', path: '/settings', icon: Settings },
        ]
      : []),
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div className="py-4">
        <div className="px-5 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </span>
        </div>

        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">ApprovalTrack Platform</p>
        <p className="text-[11px] mt-0.5">SIH 2026 | Team Tech Spark</p>
      </div>
    </aside>
  );
};

