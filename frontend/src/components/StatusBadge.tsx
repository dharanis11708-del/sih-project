import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'stage' | 'risk' | 'severity';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'stage' }) => {
  let color = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

  if (type === 'risk') {
    if (status === 'HIGH') color = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800';
    else if (status === 'MEDIUM') color = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
    else color = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
  } else if (type === 'severity') {
    if (status === 'CRITICAL') color = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
    else if (status === 'HIGH') color = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400';
    else color = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400';
  } else {
    // Stage status
    switch (status) {
      case 'APPROVED':
        color = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
        break;
      case 'REJECTED':
        color = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
        break;
      case 'DEFICIENCY':
      case 'DEFICIENCY_RAISED':
        color = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
        break;
      case 'EVC':
      case 'EVC_SCHEDULED':
      case 'EVC_COMPLETED':
        color = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
        break;
      case 'SCRUTINY':
      case 'UNDER_SCRUTINY':
        color = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
        break;
      case 'SUBMITTED':
        color = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
        break;
      case 'DRAFT':
        color = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
        break;
      default:
        color = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
    }
  }

  const formatText = (txt: string) => {
    return txt.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {formatText(status)}
    </span>
  );
};

