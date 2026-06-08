import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardFooter } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Stat, Loading } from '../components/common';
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useInvoicesApi, useReceiptsApi, useStatsApi } from '../api/hooks';
import { usePermissions } from '../hooks/permissions';
import { formatDate, formatCurrency } from '../utils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { getInvoices } = useInvoicesApi();
  const { getReceipts } = useReceiptsApi();
  const { getStats } = useStatsApi();

  // Fetch data with default empty objects to prevent crashes
  const { data: invoicesData, isLoading: invoicesLoading } = getInvoices({ page: 1, limit: 5 });
  const { data: receiptsData, isLoading: receiptsLoading } = getReceipts({ page: 1, limit: 5 });
  const { data: statsData } = getStats();
  
  // Safety checks for total counts
  const totalClients = statsData?.clients ?? 0;
  const totalInvoices = statsData?.invoices ?? 0;
  const totalProjects = statsData?.projects ?? 0;
  const totalReports = statsData?.reports ?? 0;
  
  const recentReceipts = receiptsData?.data || [];
  const recentInvoices = invoicesData?.data || [];  const { canView } = usePermissions();
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Highland Property Management System</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Stat
          label="Total Clients"
          value={totalClients.toString()}
          icon={<Users className="w-8 h-8" />}
        />
        <Stat
          label="Total Projects"
          value={totalProjects.toString()}
          icon={<FileText className="w-8 h-8" />}
        />
        <Stat
          label="Total Invoices"
          value={totalInvoices.toString()}
          icon={<TrendingUp className="w-8 h-8" />}
        />
        <Stat
          label="Total Reports"
          value={totalReports.toString()}
          icon={<Clock className="w-8 h-8" />}
        />
      </div>

      {canView('financial') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader title="Financial Manager" subtitle="Access all pending approvals and financial workflows" />
            <CardBody>
              <p className="text-gray-600">Open the Financial Manager workspace to review approvals, invoices, receipts, and requisitions.</p>
            </CardBody>
            <CardFooter>
              <Button variant="primary" onClick={() => navigate('/financial-manager')}>
                Open Financial Manager
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Receipts */}
        <Card>
          <CardHeader title="Recent Receipts" subtitle="Latest 5 receipts" />
          <CardBody>
            {receiptsLoading ? (
              <Loading size="sm" />
            ) : recentReceipts.length > 0 ? (
              <div className="space-y-3">
                {recentReceipts.map((receipt: any) => (
                  <div key={receipt.id} className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">Receipt #{receipt.receiptNo}</p>
                      <p className="text-sm text-gray-500">{formatDate(receipt.createdAt)}</p>
                    </div>
                    <p className="font-semibold text-gray-900">TZS {formatCurrency(receipt.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No receipts yet</p>
            )}
          </CardBody>
          <CardFooter>
            <Button variant="ghost" onClick={() => navigate('/receipts')}>
              View All
            </Button>
          </CardFooter>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader title="Recent Invoices" subtitle="Latest 5 invoices" />
          <CardBody>
            {invoicesLoading ? (
              <Loading size="sm" />
            ) : recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice: any) => (
                  <div key={invoice.id} className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">Invoice #{invoice.invoiceNo}</p>
                      <p className="text-sm text-gray-500">{formatDate(invoice.invoiceDate)}</p>
                    </div>
                    <p className="font-semibold text-gray-900">TZS {formatCurrency(invoice.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No invoices yet</p>
            )}
          </CardBody>
          <CardFooter>
            <Button variant="ghost" onClick={() => navigate('/invoices')}>
              View All
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;