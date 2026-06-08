import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/permissions';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  FileText, 
  Settings, 
  LogOut, 
  Map, 
  Clock, 
  Gavel, 
  Wallet, 
  BarChart3,
  Calculator
  , Menu, X 
} from 'lucide-react';
import MobileBottomNav from './common/MobileBottomNav';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { canView, getAllowedResources } = usePermissions();

  const allMenuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', resource: 'dashboard' },
    { name: 'Projects', icon: <Map size={20} />, path: '/projects', resource: 'projects' },
    { name: 'Clients', icon: <Users size={20} />, path: '/clients', resource: 'clients' },
    { name: 'Leads', icon: <Users size={20} />, path: '/leads', resource: 'leads' },
    { name: 'Invoices', icon: <FileText size={20} />, path: '/invoices', resource: 'invoices' },
    { name: 'Receipts', icon: <Receipt size={20} />, path: '/receipts', resource: 'receipts' },
    { name: 'Agreements', icon: <Gavel size={20} />, path: '/agreements', resource: 'agreements' },
    { name: 'Daily Reports', icon: <Clock size={20} />, path: '/reports', resource: 'reports' },
    { name: 'Requisitions', icon: <Wallet size={20} />, path: '/requisitions', resource: 'requisitions' },
    { name: 'Analytics', icon: <BarChart3 size={20} />, path: '/master-reports', resource: 'analytics' },
    { name: 'Financial Manager', icon: <Calculator size={20} />, path: '/financial-manager', resource: 'financial' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings', resource: 'settings' },
  ];

  // Role-based menu filtering: prefer the canonical allowed resources list
  const getVisibleMenuItems = () => {
    try {
      const allowed = getAllowedResources ? getAllowedResources() : [];
      if (Array.isArray(allowed) && allowed.length > 0) {
        return allMenuItems.filter(item => allowed.includes(item.resource));
      }
    } catch (err) {
      // fallback to per-resource checks
    }
    return allMenuItems.filter(item => canView(item.resource));
  };

  const menuItems = getVisibleMenuItems();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar - hidden on small screens */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 fixed h-full flex-col text-white no-print z-50">
        <div className="p-8">
          <h2 className="text-xl font-black tracking-tighter text-blue-400 uppercase">Highland PMS</h2>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Management Portal v4.0</p>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                location.pathname === item.path 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-bold' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`${location.pathname === item.path ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>
                {item.icon}
              </span>
              <span className="text-sm">{item.name}</span>
            </button>
          ))}
        </nav>
        
        {/* User Profile & Logout Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3 px-3 py-3 mb-2">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-800 shadow-lg">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{user?.role}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 text-rose-400 hover:bg-rose-500/10 px-4 py-3 w-full rounded-xl transition-all font-bold group"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="text-sm">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-slate-700 hover:bg-gray-100">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-tight truncate">Highland PMS</h3>
              <p className="text-[10px] text-slate-400 truncate">Management Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="p-2 rounded-lg text-rose-500 border border-rose-100 hover:bg-rose-50" title="Log out">
              <LogOut size={18} />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-100">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-sm text-slate-700">{user?.name?.charAt(0) || 'U'}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile slide-over menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-blue-400 uppercase">Highland PMS</h2>
                <p className="text-[10px] text-slate-400">Mobile Menu</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { setMobileOpen(false); navigate(item.path); }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-150 ${location.pathname === item.path ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <span className={`${location.pathname === item.path ? 'text-white' : 'text-slate-400'}`}>{item.icon}</span>
                  <span className="text-sm">{item.name}</span>
                </button>
              ))}
            </nav>
            <div className="mt-6 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-800">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white">{user?.name?.charAt(0) || 'U'}</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-300 truncate uppercase">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="px-3 py-2 rounded-lg bg-rose-500 text-white font-bold whitespace-nowrap"
                >
                  Log Out
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="ml-0 md:ml-64 flex-1 transition-all">
        <div className="min-h-screen pt-16 md:pt-0">
          {children}
        </div>
      </main>
      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
};

export default Layout;