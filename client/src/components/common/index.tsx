// src/components/common/index.tsx
import React from 'react';

// 1. Export components from other files
export * from './Card';
export * from './Button';
export * from './Badge';
export * from './Table';
export * from './Modal';
export * from './Badge';      // Make sure Badge.tsx exists
export * from './SearchBar';

// 2. Define and Export Stat
export const Stat = ({ label, value, icon }: any) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center space-x-4 shadow-sm">
    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">{icon}</div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

// 3. Define and Export Loading
export const Loading = ({ size = 'md' }: any) => (
  <div className="flex justify-center p-4">
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${size === 'sm' ? 'h-6 w-6' : 'h-10 w-10'}`}></div>
  </div>
);