import React from 'react';

export const Badge = ({ children, variant }: { children: React.ReactNode; variant: 'info' | 'success' | 'warning' | 'danger' | 'secondary' }) => {
  const styles = {
    info: "bg-blue-50 text-blue-700 border-blue-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-red-50 text-red-700 border-red-100",
    secondary: "bg-gray-100 text-gray-700 border-gray-200"
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[variant]}`}>
      {children}
    </span>
  );
};