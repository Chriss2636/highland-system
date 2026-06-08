import React from 'react';

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className || ''}`.trim()}>{children}</div>
);

export const CardHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="px-6 py-4 border-b border-gray-100">
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
  </div>
);

export const CardBody = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className || ''}`.trim()}>{children}</div>
);

export const CardFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">{children}</div>
);