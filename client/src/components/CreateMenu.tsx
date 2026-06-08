import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/permissions';
import { PlusCircle, FileText, Users, Receipt, DollarSign, Handshake, ClipboardList, X } from 'lucide-react';

export const CreateMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const { canCreate } = usePermissions();

  const createOptions = useMemo(() => [
    { label: 'New Client', icon: Users, color: 'bg-blue-600', navigate: '/clients', resource: 'clients' },
    { label: 'New Invoice', icon: FileText, color: 'bg-green-600', navigate: '/invoices', resource: 'invoices' },
    { label: 'New Receipt', icon: Receipt, color: 'bg-purple-600', navigate: '/receipts', resource: 'receipts' },
    { label: 'New Project', icon: DollarSign, color: 'bg-orange-600', navigate: '/projects', resource: 'projects' },
    { label: 'New Agreement', icon: Handshake, color: 'bg-pink-600', navigate: '/agreements', resource: 'agreements' },
    { label: 'New Lead', icon: ClipboardList, color: 'bg-yellow-600', navigate: '/leads', resource: 'leads' }
  ].filter(option => canCreate(option.resource)), [canCreate]);

  if (!isOpen || createOptions.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <PlusCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Create New</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {createOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.label}
                onClick={() => {
                  navigate(option.navigate);
                  onClose();
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-red-50 rounded-xl border border-gray-200 hover:border-red-300 transition group"
              >
                <div className={`${option.color} p-3 rounded-lg group-hover:scale-110 transition`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="font-semibold text-gray-900">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
