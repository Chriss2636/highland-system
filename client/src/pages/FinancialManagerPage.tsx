import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useInvoicesApi,
  useReceiptsApi,
  useRequisitionsApi,
  useReportsApi,
  useAgreementsApi,
  useSettingsApi,
  useClientsApi,
  useProjectsApi
} from '../api/hooks';
import { Card, CardBody, Button, Badge, Modal, Table, SearchBar } from '../components/common';
import {
  DollarSign,
  FileText,
  Receipt,
  Briefcase,
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  Plus,
  Edit2,
  Download,
  Eye,
  Clock,
  PieChart,
  Wallet,
  Landmark,
  Calculator,
  Settings
} from 'lucide-react';
import { formatCurrency, formatDate, cleanTZS } from '../utils';
import { usePermissions } from '../hooks/permissions';

const FinancialManagerPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'overview' | 'clients' | 'projects' | 'invoices' | 'receipts' | 'requisitions' | 'reports' | 'agreements' | 'settings'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // API Hooks
  const { getInvoices } = useInvoicesApi();
  const { getReceipts } = useReceiptsApi();
  const { getRequisitions } = useRequisitionsApi();
  const { getBuyersLedger, getProjectsAnalysis } = useReportsApi();
  const { getAgreements } = useAgreementsApi();
  const { getSettings } = useSettingsApi();
  const { getClients } = useClientsApi();
  const { getProjects } = useProjectsApi();

  // Data fetching
  const { data: invoicesData, isLoading: loadingInvoices } = getInvoices({});
  const { data: receiptsData, isLoading: loadingReceipts } = getReceipts({});
  const { data: requisitionsData, isLoading: loadingRequisitions } = getRequisitions();
  const { data: buyersData } = getBuyersLedger();
  const { data: projectsData } = getProjectsAnalysis();
  const { data: agreementsData, isLoading: loadingAgreements } = getAgreements();
  const { data: settingsData } = getSettings();
  const { data: clientsData } = getClients({});
  const { data: projectsList } = getProjects();

  const navigateTo = (path: string) => navigate(path);
  const { canCreate, canEdit } = usePermissions();

  const canCreateRequisition = canCreate('requisitions');
  const canCreateInvoice = canCreate('invoices');
  const canCreateReceipt = canCreate('receipts');
  const canCreateAgreement = canCreate('agreements');
  const canEditInvoice = canEdit('invoices');
  const canEditAgreement = canEdit('agreements');

  // Financial Calculations
  const financialMetrics = useMemo(() => {
    const invoices = invoicesData?.data || [];
    const receipts = receiptsData?.data || [];
    const requisitions = requisitionsData?.data || [];

    const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + cleanTZS(inv.amount || 0), 0);
    const totalReceived = receipts.reduce((sum: number, rec: any) => sum + cleanTZS(rec.amount || 0), 0);
    const totalRequisitions = requisitions.reduce((sum: number, req: any) => sum + cleanTZS(req.amount || 0), 0);
    const pendingRequisitions = requisitions.filter((req: any) => req.status !== 'approved').reduce((sum: number, req: any) => sum + cleanTZS(req.amount || 0), 0);

    return {
      totalInvoiced,
      totalReceived,
      outstandingBalance: totalInvoiced - totalReceived,
      totalRequisitions,
      pendingRequisitions,
      approvedRequisitions: totalRequisitions - pendingRequisitions
    };
  }, [invoicesData, receiptsData, requisitionsData]);

  // Filtered data based on search
  const filteredInvoices = useMemo(() => {
    if (!invoicesData?.data) return [];
    return invoicesData.data.filter((inv: any) =>
      inv.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoicesData, searchTerm]);

  const filteredReceipts = useMemo(() => {
    if (!receiptsData?.data) return [];
    return receiptsData.data.filter((rec: any) =>
      rec.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [receiptsData, searchTerm]);

  const filteredRequisitions = useMemo(() => {
    if (!requisitionsData?.data) return [];
    return requisitionsData.data.filter((req: any) =>
      req.cashRequestedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requisitionsData, searchTerm]);

  const filteredAgreements = useMemo(() => {
    if (!agreementsData?.data) return [];
    return agreementsData.data.filter((agr: any) =>
      agr.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agr.agreementNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agreementsData, searchTerm]);

  const navigationItems = [
    { id: 'overview', label: 'Financial Overview', icon: BarChart3, color: 'blue' },
    { id: 'clients', label: 'Clients', icon: Users, color: 'cyan' },
    { id: 'projects', label: 'Projects', icon: MapPin, color: 'emerald' },
    { id: 'invoices', label: 'Invoice Management', icon: FileText, color: 'green' },
    { id: 'receipts', label: 'Payment Receipts', icon: Receipt, color: 'purple' },
    { id: 'requisitions', label: 'Cash Requisitions', icon: Briefcase, color: 'orange' },
    { id: 'reports', label: 'Financial Reports', icon: PieChart, color: 'indigo' },
    { id: 'agreements', label: 'Agreements', icon: Landmark, color: 'teal' },
    { id: 'settings', label: 'Financial Settings', icon: Settings, color: 'gray' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold uppercase tracking-wide">Total Invoiced</p>
                <p className="text-2xl font-bold text-blue-900">TZS {formatCurrency(financialMetrics.totalInvoiced)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-semibold uppercase tracking-wide">Payments Received</p>
                <p className="text-2xl font-bold text-green-900">TZS {formatCurrency(financialMetrics.totalReceived)}</p>
              </div>
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-semibold uppercase tracking-wide">Outstanding Balance</p>
                <p className="text-2xl font-bold text-orange-900">TZS {formatCurrency(financialMetrics.outstandingBalance)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-semibold uppercase tracking-wide">Pending Requisitions</p>
                <p className="text-2xl font-bold text-purple-900">TZS {formatCurrency(financialMetrics.pendingRequisitions)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Recent Invoices
            </h3>
            <Button onClick={() => navigateTo('/invoices')} className="mb-4 bg-green-600 hover:bg-green-700 text-white">
              Go to Invoices
            </Button>
            <div className="space-y-3">
              {filteredInvoices.slice(0, 5).map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{invoice.invoiceNo}</p>
                    <p className="text-sm text-gray-600">{invoice.buyerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">TZS {formatCurrency(invoice.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDate(invoice.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-purple-600" />
              Recent Payments
            </h3>
            <div className="space-y-3">
              {filteredReceipts.slice(0, 5).map((receipt: any) => (
                <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{receipt.receiptNo}</p>
                    <p className="text-sm text-gray-600">{receipt.buyerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">TZS {formatCurrency(receipt.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDate(receipt.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mt-6">
        <h3 className="text-lg font-bold mb-4">Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Button onClick={() => navigateTo('/invoices')} className="bg-green-600 hover:bg-green-700">
            Invoices
          </Button>
          <Button onClick={() => navigateTo('/receipts')} className="bg-purple-600 hover:bg-purple-700">
            Receipts
          </Button>
          <Button onClick={() => navigateTo('/requisitions')} className="bg-orange-600 hover:bg-orange-700">
            Requisitions
          </Button>
          <Button onClick={() => navigateTo('/agreements')} className="bg-teal-600 hover:bg-teal-700">
            Agreements
          </Button>
          <Button onClick={() => navigateTo('/clients')} className="bg-cyan-600 hover:bg-cyan-700">
            Clients
          </Button>
          <Button onClick={() => navigateTo('/projects')} className="bg-emerald-600 hover:bg-emerald-700">
            Projects
          </Button>
          <Button onClick={() => navigateTo('/reports')} className="bg-indigo-600 hover:bg-indigo-700">
            Reports
          </Button>
          <Button onClick={() => navigateTo('/settings')} className="bg-slate-600 hover:bg-slate-700 text-white">
            Settings
          </Button>
        </div>
      </div>
    </div>
  );

  const renderInvoices = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Invoice Management</h2>
        {canCreateInvoice && (
          <Button onClick={() => setActiveSection('invoices')} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        )}
      </div>

      <SearchBar
        placeholder="Search invoices by buyer name or invoice number..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <Table
        columns={[
          { key: 'invoiceNo', label: 'Invoice No' },
          { key: 'buyerName', label: 'Buyer' },
          { key: 'amount', label: 'Amount (TZS)', render: (value) => `TZS ${formatCurrency(value)}` },
          { key: 'createdAt', label: 'Date', render: (value) => formatDate(value) },
          { key: 'status', label: 'Status', render: (value) => <Badge variant={value === 'paid' ? 'success' : 'warning'}>{value}</Badge> },
          { key: 'actions', label: 'Actions', render: (_, row) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(row)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => {/* Download PDF */}}>
                <Download className="h-4 w-4" />
              </Button>
              {canEditInvoice && (
                <Button size="sm" variant="outline">
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        ]}
        data={filteredInvoices}
        loading={loadingInvoices}
        keyExtractor={(item: any) => item.id}
      />
    </div>
  );

  const renderReceipts = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payment Receipts</h2>
        {canCreateReceipt && (
          <Button onClick={() => setActiveSection('receipts')} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            New Receipt
          </Button>
        )}
      </div>

      <SearchBar
        placeholder="Search receipts by buyer name or receipt number..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <Table
        columns={[
          { key: 'receiptNo', label: 'Receipt No' },
          { key: 'buyerName', label: 'Buyer' },
          { key: 'amount', label: 'Amount (TZS)', render: (value) => `TZS ${formatCurrency(value)}` },
          { key: 'paymentMethod', label: 'Payment Method' },
          { key: 'createdAt', label: 'Date', render: (value) => formatDate(value) },
          { key: 'actions', label: 'Actions', render: (_, row) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(row)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => {/* Download PDF */}}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        ]}
        data={filteredReceipts}
        loading={loadingReceipts}
        keyExtractor={(item: any) => item.id}
      />
    </div>
  );

  const renderRequisitions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cash Requisitions</h2>
        {canCreateRequisition && (
          <Button onClick={() => setActiveSection('requisitions')} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            New Requisition
          </Button>
        )}
      </div>

      <SearchBar
        placeholder="Search requisitions by requester or purpose..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <Table
        columns={[
          { key: 'cashRequestedBy', label: 'Requester' },
          { key: 'amount', label: 'Amount (TZS)', render: (value) => `TZS ${formatCurrency(value)}` },
          { key: 'purpose', label: 'Purpose', render: (value) => value?.substring(0, 50) + '...' },
          { key: 'status', label: 'Status', render: (value) => (
            <Badge key={value} variant={
              value === 'approved' ? 'success' :
              value === 'pending' ? 'warning' :
              value === 'rejected' ? 'danger' : 'secondary'
            }>
              {value}
            </Badge>
          )},
          { key: 'createdAt', label: 'Date', render: (value) => formatDate(value) },
          { key: 'actions', label: 'Actions', render: (_, row) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(row)}>
                <Eye className="h-4 w-4" />
              </Button>
                  <Button size="sm" variant="outline" onClick={() => {/* Download PDF */}}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        ]}
        data={filteredRequisitions}
        loading={loadingRequisitions}
        keyExtractor={(item: any) => item.id}
      />
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Financial Reports & Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateTo('/reports')}>
          <CardBody className="p-6 text-center">
            <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Buyers Ledger</h3>
            <p className="text-gray-600">Comprehensive buyer payment tracking</p>
          </CardBody>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateTo('/projects')}>
          <CardBody className="p-6 text-center">
            <MapPin className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Projects Analysis</h3>
            <p className="text-gray-600">Project-wise financial performance</p>
          </CardBody>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateTo('/financial-manager')}>
          <CardBody className="p-6 text-center">
            <Calculator className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Financial Statements</h3>
            <p className="text-gray-600">Profit & Loss, Balance Sheet reports</p>
          </CardBody>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Total Buyers</p>
                <p className="text-2xl font-bold">{buyersData?.data?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{projectsData?.data?.length || 0}</p>
              </div>
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Total Agreements</p>
                <p className="text-2xl font-bold">{agreementsData?.data?.length || 0}</p>
              </div>
              <Landmark className="h-8 w-8 text-purple-600" />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );

  const renderClients = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Client Management</h2>
        <Button onClick={() => navigateTo('/clients')} className="bg-cyan-600 hover:bg-cyan-700">
          <Eye className="h-4 w-4 mr-2" />
          View Clients
        </Button>
      </div>

      <Table
        columns={[
          { key: 'name', label: 'Client Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'type', label: 'Type' },
          { key: 'createdAt', label: 'Joined', render: (value) => formatDate(value) }
        ]}
        data={clientsData?.data || []}
        loading={!clientsData}
        keyExtractor={(item: any) => item.id}
      />
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Portfolio</h2>
        <Button onClick={() => navigateTo('/projects')} className="bg-emerald-600 hover:bg-emerald-700">
          <Eye className="h-4 w-4 mr-2" />
          View Projects
        </Button>
      </div>

      <Table
        columns={[
          { key: 'location', label: 'Location' },
          { key: 'description', label: 'Description', render: (value) => value?.substring(0, 40) + '...' },
          { key: 'seller.name', label: 'Seller' },
          { key: 'createdAt', label: 'Created', render: (value) => formatDate(value) }
        ]}
        data={projectsList?.data || []}
        loading={!projectsList}
        keyExtractor={(item: any) => item.id}
      />
    </div>
  );

  const renderAgreements = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agreement Management</h2>
        {canCreateAgreement && (
          <Button onClick={() => setActiveSection('agreements')} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            New Agreement
          </Button>
        )}
      </div>

      <SearchBar
        placeholder="Search agreements by client name or agreement number..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <Table
        columns={[
          { key: 'agreementNo', label: 'Agreement No' },
          { key: 'clientName', label: 'Client' },
          { key: 'agreementType', label: 'Type' },
          { key: 'amount', label: 'Amount (TZS)', render: (value) => `TZS ${formatCurrency(value)}` },
          { key: 'status', label: 'Status', render: (value) => (
            <Badge key={value} variant={value === 'active' ? 'success' : 'secondary'}>
              {value}
            </Badge>
          )},
          { key: 'createdAt', label: 'Date', render: (value) => formatDate(value) },
          { key: 'actions', label: 'Actions', render: (_, row) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(row)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => {/* Download PDF */}}>
                <Download className="h-4 w-4" />
              </Button>
              {canEditAgreement && (
                <Button size="sm" variant="outline">
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        ]}
        data={filteredAgreements}
        loading={loadingAgreements}
        keyExtractor={(item: any) => item.id}
      />
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Financial Settings</h2>

      <Card>
        <CardBody>
          <h3 className="text-lg font-bold mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={settingsData?.name || ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={settingsData?.phone || ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                defaultValue={settingsData?.address || ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={settingsData?.bankAccount || ''}
              />
            </div>
          </div>
          <div className="mt-6">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Save Settings
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase mb-2">
          Financial Manager
        </h1>
        <p className="text-gray-500 font-bold text-sm uppercase tracking-[0.2em] opacity-60">
          Complete Financial Management System
        </p>
      </div>

      {/* Navigation */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeSection === item.id
                    ? `bg-${item.color}-100 text-${item.color}-700 border-2 border-${item.color}-200`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="animate-in fade-in duration-300">
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'clients' && renderClients()}
        {activeSection === 'projects' && renderProjects()}
        {activeSection === 'invoices' && renderInvoices()}
        {activeSection === 'receipts' && renderReceipts()}
        {activeSection === 'requisitions' && renderRequisitions()}
        {activeSection === 'reports' && renderReports()}
        {activeSection === 'agreements' && renderAgreements()}
        {activeSection === 'settings' && renderSettings()}
      </div>

      {/* Modal for viewing details */}
      {showModal && selectedItem && (
        <Modal onClose={() => setShowModal(false)} title="Details">
          <div className="space-y-4">
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(selectedItem, null, 2)}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FinancialManagerPage;