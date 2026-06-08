import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardFooter } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Stat, Loading } from '../components/common';
import { Users, FileText, TrendingUp, Clock, Bell, PlusCircle } from 'lucide-react';
import { useInvoicesApi, useReceiptsApi, useStatsApi, useNotificationsApi } from '../api/hooks';
import { usePermissions } from '../hooks/permissions';
import { formatDate, formatCurrency } from '../utils';
import { NotificationsModal } from '../components/NotificationsModal';
import { CreateMenu } from '../components/CreateMenu';

const today = new Date().toLocaleDateString();

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const { getInvoices } = useInvoicesApi();
  const { getReceipts } = useReceiptsApi();
  const { getStats } = useStatsApi();
  const { data: unreadData } = useNotificationsApi().getUnreadCount();

  const { data: invoicesData, isLoading: invoicesLoading } = getInvoices({ page: 1, limit: 5 });
  const { data: receiptsData, isLoading: receiptsLoading } = getReceipts({ page: 1, limit: 5 });
  const { data: statsData } = getStats();

  const totalClients = statsData?.clients ?? 0;
  const totalInvoices = statsData?.invoices ?? 0;
  const totalProjects = statsData?.projects ?? 0;
  const totalReports = statsData?.reports ?? 0;

  const recentReceipts = receiptsData?.data || [];
  const recentInvoices = invoicesData?.data || [];
  const { canView, canCreate } = usePermissions();
  const unreadCount = unreadData?.count ?? 0;
  const canCreateDashboardItems = ['clients', 'invoices', 'receipts', 'projects', 'agreements', 'leads'].some(canCreate);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <CreateMenu isOpen={isCreateMenuOpen} onClose={() => setIsCreateMenuOpen(false)} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Highland Property Management System</p>
          <p className="text-sm text-gray-400 mt-1">Overview · {today}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-3 hover:bg-red-50 rounded-lg transition"
          >
            <Bell className="w-6 h-6 text-red-600" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          {canCreateDashboardItems && (
            <button
              onClick={() => setIsCreateMenuOpen(true)}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition flex items-center gap-2"
            >
              <PlusCircle className="w-5 h-5" /> New
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div
            onClick={() => navigate('/clients')}
            className="bg-white p-6 rounded-xl border border-gray-200 flex items-center space-x-4 shadow-sm hover:shadow-lg hover:border-red-300 cursor-pointer transition"
          >
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/projects')}
            className="bg-white p-6 rounded-xl border border-gray-200 flex items-center space-x-4 shadow-sm hover:shadow-lg hover:border-yellow-300 cursor-pointer transition"
          >
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{totalProjects}</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/invoices')}
            className="bg-white p-6 rounded-xl border border-gray-200 flex items-center space-x-4 shadow-sm hover:shadow-lg hover:border-red-300 cursor-pointer transition"
          >
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/reports')}
            className="bg-white p-6 rounded-xl border border-gray-200 flex items-center space-x-4 shadow-sm hover:shadow-lg hover:border-yellow-300 cursor-pointer transition"
          >
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{totalReports}</p>
            </div>
          </div>
        </div>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-yellow-50">
          <CardHeader title="Quick Access" subtitle="Navigate to sections" />
          <CardBody>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/invoices')}
                className="text-left px-4 py-2 hover:bg-white rounded-lg transition font-medium text-gray-700 flex justify-between items-center"
              >
                <span>Invoices</span>
                <span className="text-sm text-red-600 font-bold bg-red-100 px-2 py-1 rounded">
                  {totalInvoices}
                </span>
              </button>
              <button
                onClick={() => navigate('/receipts')}
                className="text-left px-4 py-2 hover:bg-white rounded-lg transition font-medium text-gray-700 flex justify-between items-center"
              >
                <span>Receipts</span>
                <span className="text-sm text-red-600 font-bold bg-red-100 px-2 py-1 rounded">
                  {recentReceipts.length}
                </span>
              </button>
              <button
                onClick={() => navigate('/clients')}
                className="text-left px-4 py-2 hover:bg-white rounded-lg transition font-medium text-gray-700 flex justify-between items-center"
              >
                <span>Clients</span>
                <span className="text-sm text-red-600 font-bold bg-red-100 px-2 py-1 rounded">
                  {totalClients}
                </span>
              </button>
              <button
                onClick={() => navigate('/leads')}
                className="text-left px-4 py-2 hover:bg-white rounded-lg transition font-medium text-gray-700 flex justify-between items-center"
              >
                <span>Leads</span>
                <span className="text-sm text-red-600 font-bold bg-red-100 px-2 py-1 rounded">0</span>
              </button>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition">
          <CardHeader title="Recent Receipts" subtitle="Latest transactions" />
          <CardBody>
            {receiptsLoading ? (
              <Loading size="sm" />
            ) : recentReceipts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentReceipts.map((r: any) => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/receipts/${r.id}`)}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded cursor-pointer transition"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">Receipt #{r.receiptNo}</p>
                      <p className="text-xs text-gray-500">{formatDate(r.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-red-600">TZS {formatCurrency(r.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No receipts yet</p>
            )}
          </CardBody>
          <CardFooter>
            <Button variant="ghost" onClick={() => navigate('/receipts')}>
              View All Receipts
            </Button>
          </CardFooter>
        </Card>

        <Card className="hover:shadow-lg transition">
          <CardHeader title="Recent Invoices" subtitle="Latest billing items" />
          <CardBody>
            {invoicesLoading ? (
              <Loading size="sm" />
            ) : recentInvoices.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentInvoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded cursor-pointer transition"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">Invoice #{inv.invoiceNo}</p>
                      <p className="text-xs text-gray-500">{formatDate(inv.invoiceDate)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-red-600">TZS {formatCurrency(inv.amount)}</p>
                        <p className="text-xs text-gray-400">{inv.status || 'Pending'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No invoices yet</p>
            )}
          </CardBody>
          <CardFooter>
            <Button variant="ghost" onClick={() => navigate('/invoices')}>
              View All Invoices
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
