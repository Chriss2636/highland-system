import React from 'react';
import { Home, Box, Users, FileText, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={18} /> },
    { name: 'Projects', path: '/projects', icon: <Box size={18} /> },
    { name: 'Clients', path: '/clients', icon: <Users size={18} /> },
    { name: 'Invoices', path: '/invoices', icon: <FileText size={18} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={18} /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg px-2 py-2 flex justify-between items-center">
        {items.map(it => {
          const active = location.pathname === it.path;
          return (
            <button
              key={it.path}
              onClick={() => navigate(it.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${active ? 'text-blue-600' : 'text-slate-600'}`}
            >
              {it.icon}
              <span className="text-[10px]">{it.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
