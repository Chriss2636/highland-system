import React from 'react';
import { Loading } from './index';

interface TableProps<T> {
  columns: { key: string; label: string; render?: (value: any, row: T) => React.ReactNode }[];
  data: T[];
  loading?: boolean;
  keyExtractor: (item: T) => string;
  pagination?: { page: number; total: number; pageSize: number; onPageChange: (p: number) => void };
}

export function Table<T>({ columns, data, loading, keyExtractor, pagination }: TableProps<T>) {
  if (loading) return <Loading />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map(col => <th key={col.key} className="p-4 text-sm font-semibold text-gray-600">{col.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map(item => (
            <tr key={keyExtractor(item)} className="hover:bg-gray-50">
              {columns.map(col => (
                <td key={col.key} className="p-4 text-sm text-gray-700">
                  {col.render ? col.render((item as any)[col.key], item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}