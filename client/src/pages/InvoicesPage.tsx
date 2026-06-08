import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInvoicesApi, useClientsApi, useProjectsApi, useSettingsApi } from '../api/hooks';
import { usePermissions } from '../hooks/permissions';
import { Card, CardBody, Loading, Button, Modal } from '../components/common';
import { 
  Plus, Trash2, Search, Download, Edit2, MapPin
} from 'lucide-react';
import { formatCurrency, formatDate, maskTZS, cleanTZS } from '../utils';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * EXACT PDF REPLICA TEMPLATE
 * Replicates the Highland Property Company Ltd Document exactly.
 */
const InvoiceVoucher = React.forwardRef(({ data, settings }: { data: any, settings: any }, ref: any) => {
  const invoiceTotal = cleanTZS(data.amount || data.totalPlotPrice || "0");
  const paymentAmount = typeof data.paymentAmount === 'number'
    ? data.paymentAmount
    : cleanTZS(data.paymentAmount || data.thisPayment || "0");
  const totalPlotValue = cleanTZS(data.totalPlotPrice || invoiceTotal.toString());
  const totalSqm = parseFloat(data.fullSqm || "1");
  
  // LOGIC: (Current Payment / Total Plot Price) * Total SQM
  const billedSqm = totalPlotValue > 0 ? ((paymentAmount / totalPlotValue) * totalSqm).toFixed(2) : '0.00';
  const pricePerUnit = totalPlotValue / totalSqm;
  const displayAmount = paymentAmount > 0 ? paymentAmount : invoiceTotal;

  return (
    <div ref={ref} className="invoice-export-node" style={{ 
      width: '210mm', minHeight: '297mm', padding: '15mm', 
      backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#000000' 
    }}>
      {/* 1. Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px' }}>
        <div style={{ width: '55%' }}>
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ width: '130px', height: '130px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '100px', height: '100px', backgroundColor: '#B91C1C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold' }}>H</div>
          )}
          <h1 style={{ fontSize: '18px', fontWeight: '900', marginTop: '15px', textTransform: 'uppercase' }}>
            {settings?.name || 'HIGHLAND PROPERTY COMPANY LTD'}
          </h1>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '5px', lineHeight: '1.4' }}>
            <p>DODOMA, TANZANIA</p>
            <p>{settings?.address || 'Goodwill, House, Ghorofa no, 1'}</p>
            <p>{settings?.phone || '0768913750 / 0782224138'}</p>
          </div>
        </div>

        <div style={{ textAlign: 'right', width: '40%' }}>
          <h2 style={{ color: '#FF0000', fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px' }}>INVOICE</h2>
          <div style={{ fontSize: '12px', lineHeight: '1.5', fontWeight: 'bold' }}>
            <p>Please Remit to <span style={{ fontWeight: '900' }}>{settings?.bankName || 'CRDB Bank'}</span></p>
            <p>A/C NO: <span style={{ fontWeight: '900' }}>{settings?.bankAccount || '10121703276'}</span></p>
            <p style={{ marginTop: '5px', textTransform: 'uppercase' }}>A/C NAME: {settings?.name || 'HIGHLAND PROPERTY COMPANY LIMITED'}</p>
          </div>
        </div>
      </div>

      {/* 2. Billing & Meta Box */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px' }}>
        <div style={{ width: '55%' }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ backgroundColor: '#FBBF24', padding: '4px 12px', fontWeight: '900', fontSize: '12px' }}>BILL TO</span>
          </div>
          <div style={{ paddingLeft: '5px' }}>
            <p style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>{data.buyerName?.toUpperCase()}</p>
            <p style={{ fontSize: '12px', fontWeight: 'bold' }}>DODOMA</p>
            <p style={{ fontSize: '12px', fontWeight: 'bold' }}>{data.buyerPhone || '---'}</p>
          </div>
        </div>

        <div style={{ border: '2px solid #000', padding: '15px', width: '240px', fontSize: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '5px 0' }}>DATE:</td>
                <td style={{ textAlign: 'right', fontWeight: '900' }}>{formatDate(new Date())}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '5px 0' }}>DUE DATE:</td>
                <td style={{ textAlign: 'right', fontWeight: '900' }}>{formatDate(new Date(Date.now() + 172800000))}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '5px 0' }}>TIN NO:</td>
                <td style={{ textAlign: 'right', fontWeight: '900' }}>{settings?.tin || '186875192'}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 0' }}>INVOICE NO:</td>
                <td style={{ textAlign: 'right', fontWeight: '900', color: '#FF0000' }}>{data.invoiceNo || 'INV-NEW'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Main Data Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
        <thead>
          <tr style={{ backgroundColor: '#FF0000', color: '#fff', fontSize: '11px', fontWeight: '900' }}>
            <th style={{ borderRight: '1px solid #000', padding: '12px', textAlign: 'center' }}>DESCRIPTION</th>
            <th style={{ padding: '12px' }} colSpan={3}>PAYMENT TO BE DONE</th>
          </tr>
          <tr style={{ backgroundColor: '#FF0000', color: '#fff', fontSize: '10px', fontWeight: '900', borderTop: '1px solid #000' }}>
            <th style={{ borderRight: '1px solid #000', width: '50%' }}></th>
            <th style={{ borderRight: '1px solid #000', padding: '8px', width: '15%' }}>QUALITY(SQM)</th>
            <th style={{ borderRight: '1px solid #000', padding: '8px', width: '15%' }}>PRICE/UNIT</th>
            <th style={{ padding: '8px', width: '20%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '12px', fontWeight: 'bold' }}>
          <tr style={{ minHeight: '450px' }}>
            <td style={{ borderRight: '1px solid #000', padding: '20px', verticalAlign: 'top', lineHeight: '1.8' }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{data.plotInfo}</div>
            </td>
            <td style={{ borderRight: '1px solid #000', padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>{billedSqm}</td>
            <td style={{ borderRight: '1px solid #000', padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>TZS {formatCurrency(pricePerUnit)}</td>
            <td style={{ padding: '10px', textAlign: 'right', verticalAlign: 'top' }}>TZS {formatCurrency(displayAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <div style={{ backgroundColor: '#F3F4F6', padding: '18px 20px', borderRadius: '16px', fontSize: '16px', fontWeight: '900' }}>
          TOTAL INVOICE AMOUNT: TZS {formatCurrency(invoiceTotal)}
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '15px', fontSize: '11px', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'center' }}>
        If you have any question about this invoice please contact {settings?.phone || '0768913750 / 0782224138'}
      </div>

      <div style={{ marginTop: '80px', textAlign: 'center' }}>
        <p style={{ color: '#D97706', fontWeight: '900', letterSpacing: '5px', fontSize: '15px', textTransform: 'uppercase' }}>
          {settings?.name || 'HIGHLAND PROPERTY COMPANY LTD'}
        </p>
      </div>
    </div>
  );
});

const InvoicesPage = () => {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateInvoices = canCreate('invoices');
  const canEditInvoices = canEdit('invoices');
  const canDeleteInvoices = canDelete('invoices');
  const { getInvoices, createInvoice, deleteInvoice, updateInvoice } = useInvoicesApi();
  const { getClients } = useClientsApi();
  const { getProjects } = useProjectsApi();
  const { getSettings } = useSettingsApi();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'buyer' | 'seller'>('buyer');
  const [companyValueMode, setCompanyValueMode] = useState<'cash' | 'installment'>('cash');
  const [selectedPlot, setSelectedPlot] = useState<any>(null);
  const [exportData, setExportData] = useState<any>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientId: '', buyerName: '', buyerPhone: '',
    plotNo: '', block: '', sqm: '', totalPlotPrice: '',
    thisPayment: '', installments: '12', location: '',
    comments: 'Monthly installment'
  });

  const { data: invData, isLoading: invLoading } = getInvoices({});
  const { data: clientsData } = getClients({ page: 1, limit: 1000 });
  const { data: projectsData } = getProjects();
  const { data: settings } = getSettings();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const invoiceId = params.get('invoiceId');
    if (invoiceId && invData?.data) {
      const invoice = invData.data.find((inv: any) => inv.id === invoiceId);
      if (invoice) {
        setSelectedInvoiceDetail(invoice);
        setIsModalOpen(true);
        params.delete('invoiceId');
        navigate({ pathname: '/invoices', search: params.toString() }, { replace: true });
      }
    }
  }, [location.search, invData, navigate]);

  useEffect(() => {
    if (!selectedInvoiceDetail?.id || !invData?.data) return;
    const freshInvoice = invData.data.find((inv: any) => inv.id === selectedInvoiceDetail.id);
    if (freshInvoice) {
      setSelectedInvoiceDetail(freshInvoice);
    }
  }, [selectedInvoiceDetail?.id, invData?.data]);

  const buyersOnly = useMemo(() => 
    clientsData?.data?.filter((c: any) => c.type === 'buyer') || [], 
    [clientsData]
  );

  const sellersOnly = useMemo(() => 
    clientsData?.data?.filter((c: any) => c.type === 'seller') || [], 
    [clientsData]
  );

  const isSellerInvoice = invoiceType === 'seller';
  const isBuyerInvoice = invoiceType === 'buyer';

  const currentProject = useMemo(() => 
    projectsData?.data?.find((p: any) => p.id === selectedProjectId),
    [projectsData, selectedProjectId]
  );

  // Buyer account totals for detail modal
  const selectedInvoicePaid = selectedInvoiceDetail?.receipts?.reduce((s: number, r: any) => s + r.amount, 0) || 0;
  const selectedInvoiceOutstanding = Math.max(0, (selectedInvoiceDetail?.amount || 0) - selectedInvoicePaid);
  const selectedInvoicePaymentPercent = selectedInvoiceDetail?.amount ? Math.round((selectedInvoicePaid / selectedInvoiceDetail.amount) * 100) : 0;
  const selectedInvoicePlotNumber = useMemo(() => {
    const plotInfo = selectedInvoiceDetail?.plotInfo || '';
    const match = plotInfo.match(/plot\s*(?:no\s*)?([A-Za-z0-9-]+)/i);
    return match ? match[1].trim() : '';
  }, [selectedInvoiceDetail?.plotInfo]);
  const selectedInvoiceProjectLabel = selectedInvoiceDetail?.project?.location
    ? selectedInvoiceDetail.project.location
    : (selectedInvoiceDetail?.projectId ? `Project ${selectedInvoiceDetail.projectId}` : '');

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProjectId('');
    setSelectedPlot(null);
    setCompanyValueMode('cash');
    setEditingId(null);
    setForm({ 
      clientId: '', buyerName: '', buyerPhone: '', plotNo: '', 
      block: '', sqm: '', totalPlotPrice: '', thisPayment: '', 
      installments: '12', location: '', comments: 'Monthly installment' 
    });
  };

  const handleEdit = (invoice: any) => {
    if (!canEditInvoices) return;
    setEditingId(invoice.id);
    setInvoiceType(invoice.client?.type === 'seller' ? 'seller' : 'buyer');
    setForm({
      clientId: invoice.clientId,
      buyerName: invoice.client?.name || '',
      buyerPhone: invoice.client?.phone || '',
      plotNo: invoice.plotNo || '',
      block: invoice.block || '',
      sqm: invoice.sqm?.toString() || '',
      totalPlotPrice: invoice.amount?.toString() || '',
      thisPayment: invoice.amount?.toString() || '',
      installments: '10',
      location: invoice.location || '',
      comments: invoice.comments || 'Monthly installment'
    });
    setIsModalOpen(true);
  };

  const handleDownloadPDF = async (targetData: any) => {
    setExportData(targetData);
    await new Promise(r => setTimeout(r, 800));
    const element = document.querySelector('.invoice-export-node') as HTMLElement;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Invoice-${targetData.invoiceNo || 'New'}.pdf`);
    } catch (e) { console.error(e); }
    setExportData(null);
  };

  const getPlotCompanyValue = (plot: any, mode: 'cash' | 'installment') => {
    const sqm = parseFloat(String(plot.sqm || '0'));
    const unitPrice = mode === 'cash'
      ? cleanTZS(plot.pricePerSqm || '0')
      : cleanTZS(plot.installmentSqm || plot.pricePerSqm || '0');
    return Math.round(sqm * unitPrice);
  };

  const handlePlotSelection = (plotNum: string) => {
    const details = typeof currentProject?.details === 'string' ? JSON.parse(currentProject.details) : currentProject?.details;
    const plot = details?.entries?.find((e: any) => e.plotNumber === plotNum);
    if (plot) {
      const total = getPlotCompanyValue(plot, companyValueMode);
      setSelectedPlot(plot);
      setForm(prev => ({
        ...prev,
        plotNo: plot.plotNumber,
        block: plot.block,
        sqm: plot.sqm.toString(),
        totalPlotPrice: total.toString(),
        location: currentProject.location,
        thisPayment: (total * 0.2).toString()
      }));
    }
  };

  const updateCompanyValueMode = (mode: 'cash' | 'installment') => {
    setCompanyValueMode(mode);
    if (!selectedPlot) return;
    const total = getPlotCompanyValue(selectedPlot, mode);
    setForm(prev => {
      const prevTotal = cleanTZS(prev.totalPlotPrice || '0');
      const prevDefaultPayment = Math.round(prevTotal * 0.2);
      const currentPayment = cleanTZS(prev.thisPayment || '0');
      const newDefaultPayment = Math.round(total * 0.2);
      const adjustedPayment = Math.min(currentPayment, total);
      return {
        ...prev,
        totalPlotPrice: total.toString(),
        thisPayment: (currentPayment === prevDefaultPayment ? newDefaultPayment : adjustedPayment).toString()
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      if (!canEditInvoices) {
        alert('You are not authorized to edit invoices.');
        return;
      }
      // Update existing invoice - only allow comments update
      await updateInvoice.mutateAsync({ id: editingId, data: { comments: form.comments } });
      closeModal();
      return;
    }
    if (!canCreateInvoices) {
      alert('You are not authorized to create invoices.');
      return;
    }

    // Validation: Sellers require project/plot selection
    if (isSellerInvoice) {
      if (!selectedProjectId || !form.plotNo) {
        alert('Sellers must select both a project and a plot.');
        return;
      }
    } else {
      // Buyers validation
      if (!form.clientId) {
        alert('Please select a buyer.');
        return;
      }
    }

if (isSellerInvoice || (isBuyerInvoice && selectedProjectId && form.plotNo)) {
      // Project-based invoice with plot information
      const fullPrice = cleanTZS(form.totalPlotPrice);
      const thisPay = cleanTZS(form.thisPayment);
      if (thisPay > fullPrice) {
        alert('Starting amount cannot exceed the total targeted amount.');
        return;
      }
      const percentage = ((thisPay / fullPrice) * 100).toFixed(0);
      const remaining = fullPrice - thisPay;
      const monthly = Math.round(remaining / parseInt(form.installments));

      const unitPrice = fullPrice / (parseFloat(form.sqm || '1') || 1);
      const priceModeLabel = companyValueMode === 'cash' ? 'Cash' : 'Installment';
      const plotInfo = `Purchasing surveyed plot no ${form.plotNo}, Block ${form.block} with area coverage of SQM ${form.sqm} found at ${form.location} City.
Company value mode: ${priceModeLabel}
Unit company price: TZS ${formatCurrency(unitPrice)}
Total company value: TZS ${formatCurrency(fullPrice)}

This invoice records an initial payment of TZS ${formatCurrency(thisPay)} which is equivalent to ${percentage}% of the total company value.

The remaining amount TZS ${formatCurrency(remaining)} will be paid in installments within ${form.installments} months. The first installment is ${formatCurrency(monthly)}.`;

      const payload = {
        clientId: form.clientId,
        amount: fullPrice,
        sqm: parseFloat(form.sqm),
        plotInfo,
        projectId: selectedProjectId,
        comments: `Due Date: 48 Hours\n${form.comments}`
      };

      try {
        const result = await createInvoice.mutateAsync(payload);
        const invoiceNum = result.data?.invoiceNo;
        handleDownloadPDF({
          ...payload,
          amount: fullPrice,
          paymentAmount: thisPay,
          invoiceNo: invoiceNum,
          buyerName: form.buyerName,
          buyerPhone: form.buyerPhone,
          fullSqm: form.sqm,
          totalPlotPrice: form.totalPlotPrice
        });
        closeModal();
      } catch (err) { alert("Save error"); }
    } else {
      // Buyer invoice without plot information
      const payload = {
        clientId: form.clientId,
        amount: cleanTZS(form.thisPayment),
        sqm: 0,
        plotInfo: form.comments,
        projectId: null,
        comments: `Due Date: 48 Hours\n${form.comments}`
      };

      try {
        const result = await createInvoice.mutateAsync(payload);
        const invoiceNum = result.data?.invoiceNo;
        handleDownloadPDF({ ...payload, invoiceNo: invoiceNum, buyerName: form.buyerName, buyerPhone: form.buyerPhone, fullSqm: '0', totalPlotPrice: form.thisPayment });
        closeModal();
      } catch (err) { alert("Save error"); }
    }
  };

  const filteredInvoices = useMemo(() => 
    invData?.data?.filter((inv: any) =>
      inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [], [invData, searchTerm]
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {exportData && (
        <div style={{ position: 'absolute', left: '-5000px', top: 0 }}>
          <InvoiceVoucher data={exportData} settings={settings} />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm no-print">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Invoice Directory</h1>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-60">Highland Sales Management</p>
        </div>
        {canCreateInvoices && (
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 px-8 py-6 rounded-2xl text-white font-bold shadow-xl shadow-blue-100 transition-all hover:-translate-y-1">
            <Plus size={20} className="mr-2"/> New Invoice
          </Button>
        )}
      </div>

      <div className="relative max-w-md no-print">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input placeholder="Search invoices..." className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl shadow-sm outline-none font-bold"
               value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <Card>
        <CardBody>
          {invLoading ? <Loading /> : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left border-separate border-spacing-y-3 px-8">
                <thead>
                  <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    <th className="px-8 py-2">Invoice #</th>
                    <th className="px-8 py-2">Buyer</th>
                    <th className="px-8 py-2">Ledger Progress</th>
                    <th className="px-8 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {filteredInvoices.map((inv: any) => {
                    const paid = inv.receipts?.reduce((s: any, r: any) => s + r.amount, 0) || 0;
                    const remain = inv.amount - paid;
                    return (
                      <tr key={inv.id} onDoubleClick={() => setSelectedInvoiceDetail(inv)} className="group hover:translate-x-1 transition-all duration-300 cursor-pointer">
                        <td className="px-8 py-6 bg-white first:rounded-l-2xl border-y border-l">
                           <div className="font-black text-blue-600 text-lg">{inv.invoiceNo}</div>
                           <div className="text-[9px] font-bold text-gray-400 uppercase">{formatDate(inv.invoiceDate)}</div>
                        </td>
                        <td className="px-8 py-6 bg-white border-y font-bold uppercase text-xs">{inv.client?.name}</td>
                        <td className="px-8 py-6 bg-white border-y">
                           <div className="text-[9px] font-black uppercase mb-1 flex justify-between">
                              <span className={remain <= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                                {remain <= 0 ? 'FULLY PAID' : `DUE: TZS ${formatCurrency(remain)}`}
                              </span>
                              <span className="text-slate-400">{inv.amount > 0 ? `${Math.min(100, Math.round((paid / inv.amount) * 100))}%` : '0%'}</span>
                           </div>
                           <div className="w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${inv.amount > 0 ? Math.min(100, Math.round((paid / inv.amount) * 100)) : 0}%` }} />
                           </div>
                        </td>
                        <td className="px-8 py-6 bg-white last:rounded-r-2xl border-y border-r border-gray-100 text-right">
                           <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              {canEditInvoices && (
                                <button onClick={() => handleEdit(inv)} className="p-3 text-amber-500 bg-white border border-gray-100 rounded-xl hover:bg-amber-50 shadow-sm transition-all"><Edit2 size={18}/></button>
                              )}
                                    <button onClick={() => handleDownloadPDF({...inv, buyerName: inv.client?.name, buyerPhone: inv.client?.phone, fullSqm: inv.sqm, totalPlotPrice: inv.amount})} 
                                      className="p-3 text-blue-600 bg-white border border-gray-100 rounded-xl hover:bg-blue-50 shadow-sm transition-all"><Download size={18}/></button>
                                    {inv.projectId && (
                                <button onClick={() => window.location.href = `/projects?projectId=${inv.projectId}`} className="p-3 text-slate-700 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 shadow-sm transition-all" title="Open project ledger"><MapPin size={16}/></button>
                                    )}
                              {canDeleteInvoices && (
                                <button onClick={() => deleteInvoice.mutate(inv.id)} 
                                        className="p-3 text-rose-500 bg-white border border-gray-100 rounded-xl hover:bg-rose-50 shadow-sm transition-all"><Trash2 size={18}/></button>
                              )}
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={!!selectedInvoiceDetail} onClose={() => setSelectedInvoiceDetail(null)} title="Invoice Details & History">
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Invoice Amount</p>
                  <p className="text-lg font-black">TZS {formatCurrency(selectedInvoiceDetail?.amount || 0)}</p>
               </div>
               <div className="bg-emerald-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-400 uppercase">Total Paid</p>
                  <p className="text-lg font-black text-emerald-700">TZS {formatCurrency(selectedInvoicePaid)}</p>
               </div>
               <div className="bg-blue-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-blue-400 uppercase">Outstanding</p>
                  <p className="text-lg font-black text-blue-700">TZS {formatCurrency(selectedInvoiceOutstanding)}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Paid %</p>
                  <p className="text-lg font-black text-slate-800">{selectedInvoicePaymentPercent}%</p>
               </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {selectedInvoicePlotNumber && (
                <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-black">Plot {selectedInvoicePlotNumber}</span>
              )}
              {selectedInvoiceProjectLabel && (
                <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-black">{selectedInvoiceProjectLabel}</span>
              )}
            </div>

            <div className="p-4 border rounded-2xl">
               <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Internal Description</h4>
               <p className="text-sm whitespace-pre-wrap">{selectedInvoiceDetail?.plotInfo}</p>
            </div>

            {selectedInvoiceDetail?.receipts?.length ? (
              <div className="space-y-4 p-4 border rounded-2xl bg-slate-50">
                <h4 className="text-sm font-black uppercase text-slate-500">Receipt Payment History</h4>
                <div className="grid gap-3">
                  {selectedInvoiceDetail.receipts.map((receipt: any) => (
                    <div key={receipt.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex justify-between items-center gap-2">
                        <p className="font-black text-slate-800">{receipt.receiptNo}</p>
                        <span className="text-xs uppercase text-slate-500">{receipt.paymentMethod}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mt-2">
                        <div>
                          <p className="font-black">Amount Paid</p>
                          <p>TZS {formatCurrency(receipt.amount)}</p>
                        </div>
                        <div>
                          <p className="font-black">Date</p>
                          <p>{new Date(receipt.createdAt).toLocaleDateString('en-GB')}</p>
                        </div>
                      </div>
                      {receipt.plotNumber && (
                        <p className="text-xs uppercase text-slate-500 mt-2">Plot: {receipt.plotNumber}</p>
                      )}
                      {receipt.referenceCode && (
                        <p className="text-xs text-slate-500 mt-2">Ref: {receipt.referenceCode}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-2xl bg-yellow-50 text-sm text-slate-700">
                No receipts linked to this invoice yet.
              </div>
            )}

            <Button onClick={() => setSelectedInvoiceDetail(null)} fullWidth>Close Detail View</Button>
         </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Invoice Comments" : "Register Property Sale"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!editingId ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Client Type</label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="clientType" value="buyer" checked={!isSellerInvoice} onChange={() => {
                      setInvoiceType('buyer');
                      setForm({ ...form, clientId: '', buyerName: '', buyerPhone: '' });
                      setSelectedProjectId('');
                      setSelectedPlot(null);
                      setCompanyValueMode('cash');
                    }} />
                    <span className="font-bold">Buyer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="clientType" value="seller" checked={isSellerInvoice} onChange={() => {
                      setInvoiceType('seller');
                      setForm({ ...form, clientId: '', buyerName: '', buyerPhone: '' });
                      setSelectedProjectId('');
                      setSelectedPlot(null);
                      setCompanyValueMode('cash');
                    }} />
                    <span className="font-bold">Seller</span>
                  </label>
                </div>
              </div>

              <select className="w-full border-2 border-gray-100 p-4 rounded-xl font-bold bg-white outline-none focus:border-blue-500" required
                value={form.clientId} onChange={e => {
                  const clients = isSellerInvoice ? sellersOnly : buyersOnly;
                  const c = clients.find((x:any) => x.id === e.target.value);
                  setForm(prev => ({...prev, clientId: e.target.value, buyerName: c?.name, buyerPhone: c?.phone}));
                }}>
                <option value="">{isSellerInvoice ? 'Select Seller...' : 'Select Buyer...'}</option>
                {(isSellerInvoice ? sellersOnly : buyersOnly).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {(isSellerInvoice || isBuyerInvoice) && (
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select className="border-2 border-white p-3 rounded-xl outline-none bg-white" 
                            value={selectedProjectId} onChange={e => {
                              setSelectedProjectId(e.target.value);
                              setSelectedPlot(null);
                              setForm(prev => ({ ...prev, plotNo: '', block: '', sqm: '', totalPlotPrice: '', thisPayment: '' }));
                            }}>
                      <option value="">Select Project...</option>
                      {projectsData?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.location}</option>)}
                    </select>
                    <select className="border-2 border-white p-3 rounded-xl outline-none bg-white" 
                            disabled={!selectedProjectId} onChange={e => handlePlotSelection(e.target.value)}>
                      <option value="">Select Plot...</option>
                      {(() => {
                        const project = projectsData?.data?.find((p: any) => p.id === selectedProjectId);
                        let details = project?.details;
                        if (typeof details === 'string') {
                          try {
                            details = JSON.parse(details);
                          } catch {
                            details = null;
                          }
                        }
                        const entries = details?.entries;
                        return Array.isArray(entries) ? entries.map((e: any) => <option key={e.plotNumber} value={e.plotNumber}>Plot {e.plotNumber} (Blk {e.block})</option>) : [];
                      })()}
                    </select>
                  </div>

                  {selectedPlot && (
                    <div className="rounded-3xl border border-gray-200 bg-white p-4">
                      <p className="text-sm font-bold uppercase tracking-[0.3em] text-gray-500 mb-3">Company Value Selection</p>
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => updateCompanyValueMode('cash')} className={`px-4 py-3 rounded-3xl font-black ${companyValueMode === 'cash' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                          Cash
                        </button>
                        <button type="button" onClick={() => updateCompanyValueMode('installment')} className={`px-4 py-3 rounded-3xl font-black ${companyValueMode === 'installment' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                          Installment
                        </button>
                      </div>
                      <div className="mt-4 text-sm text-gray-700">
                        Selected company value mode: <span className="font-black uppercase">{companyValueMode}</span>
                      </div>
                      <div className="mt-2 text-sm font-black">Company value total: TZS {formatCurrency(parseFloat(form.totalPlotPrice || '0'))}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <input className="border-2 p-4 rounded-xl font-black text-blue-600 outline-none" value={form.thisPayment} onChange={e => {
                  const value = maskTZS(e.target.value);
                  const numericValue = cleanTZS(value || '0');
                  const target = cleanTZS(form.totalPlotPrice || '0');
                  setForm(prev => ({
                    ...prev,
                    thisPayment: numericValue > target ? target.toString() : value
                  }));
                }} placeholder="Starting Amount (TZS)" />
                <input className="border-2 p-4 rounded-xl bg-gray-50 font-bold" value={form.sqm} readOnly placeholder="SQM" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Installment Months</label>
                <input type="number" min="1" max="60" className="w-full border-2 border-gray-100 p-4 rounded-xl font-bold outline-none focus:border-blue-500" value={form.installments} onChange={e => setForm(prev => ({...prev, installments: e.target.value}))} placeholder="Number of months for installments" />
              </div>
            </>
          ) : (
            <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
              <p className="text-sm text-blue-900 font-bold mb-2">Editing Invoice - Only Comments Can Be Updated</p>
              <p className="text-xs text-blue-700">Invoice #: {editingId.slice(0, 5).toUpperCase()}</p>
            </div>
          )}

          <textarea className="w-full border-2 p-4 rounded-xl outline-none focus:border-blue-500" rows={3} value={form.comments} onChange={e => setForm(prev => ({...prev, comments: e.target.value}))} placeholder="Comments / Notes" />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={closeModal} type="button" className="px-8 py-4">Discard</Button>
            <Button type="submit" className={editingId ? 'bg-amber-600 px-12 py-4 text-white font-black shadow-lg' : 'bg-blue-600 px-12 py-4 text-white font-black shadow-lg'}>{editingId ? 'Update Invoice' : 'Save & Download PDF'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InvoicesPage;