import { useState, useMemo } from 'react';
import { useReceiptsApi, useClientsApi, useInvoicesApi, useProjectsApi, useSettingsApi } from '../api/hooks';
import { Card, CardBody, Loading, Button, Badge, Modal } from '../components/common';
import { Download, Trash2, Edit, Plus } from 'lucide-react';
import { formatCurrency, maskTZS, cleanTZS } from '../utils';
import { usePermissions } from '../hooks/permissions';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// TEMPLATE COMPONENT (Hidden from UI, used for PDF generation)
const ReceiptVoucher = ({ data, settings }: { data: any, settings: any }) => (
  <div className="receipt-export-node" style={{ width: '148mm', minHeight: '210mm', padding: '10mm', backgroundColor: '#ffffff', fontFamily: 'sans-serif', color: '#1a1a1a' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #F3F4F6', paddingBottom: '10px', marginBottom: '15px' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ width: '40px', height: '40px', backgroundColor: '#B91C1C', color: '#fff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>H</div>
        <div>
          <h1 style={{ color: '#B91C1C', fontSize: '11px', fontWeight: '900', margin: 0 }}>HIGHLAND PROPERTY CO. LTD</h1>
          <p style={{ fontSize: '8px', color: '#6B7280' }}>DODOMA | {settings?.phone || '0768913750'}</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <h2 style={{ color: '#B91C1C', fontSize: '18px', fontWeight: '900', margin: 0 }}>RECEIPT</h2>
        <p style={{ fontSize: '10px', fontWeight: '900' }}>{data.receiptNo || 'RCP-NEW'}</p>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
      <div style={{ backgroundColor: '#F9FAFB', borderLeft: '4px solid #B91C1C', padding: '8px' }}>
        <p style={{ fontSize: '7px', color: '#B91C1C', fontWeight: '900' }}>BANKING</p>
        <p style={{ fontSize: '9px', fontWeight: 'bold' }}>CRDB: 10121703276</p>
      </div>
      <div style={{ backgroundColor: '#F9FAFB', borderLeft: '4px solid #D97706', padding: '8px' }}>
        <p style={{ fontSize: '7px', color: '#D97706', fontWeight: '900' }}>TRANSACTION</p>
        <p style={{ fontSize: '9px', fontWeight: 'bold' }}>Mode: {data.paymentMethod}</p>
        {data.referenceCode && (
          <p style={{ fontSize: '8px', color: '#6B7280', marginTop: '4px' }}>Ref: {data.referenceCode}</p>
        )}
      </div>
    </div>

    <div style={{ marginBottom: '20px', borderBottom: '1px dashed #FDE68A', paddingBottom: '10px' }}>
      <p style={{ fontSize: '14px', fontWeight: '900' }}>NAME: {data.buyerName?.toUpperCase()}</p>
      <p style={{ fontSize: '10px', color: '#6B7280' }}>Phone: {data.buyerPhone}</p>
      {data.invoiceNo && (
        <p style={{ fontSize: '10px', color: '#1F2937', fontWeight: '900', marginTop: '6px' }}>INVOICE: {data.invoiceNo}</p>
      )}
      {data.invoiceUrl && (
        <p style={{ fontSize: '8px', color: '#2563EB', marginTop: '6px', wordBreak: 'break-all' }}>Invoice details: {data.invoiceUrl}</p>
      )}
      {data.invoiceAmount && (
        <p style={{ fontSize: '9px', color: '#6B7280', marginTop: '4px' }}>Invoice Amount: TZS {data.invoiceAmount}</p>
      )}
      {data.invoiceDue && (
        <p style={{ fontSize: '9px', color: '#6B7280', marginTop: '4px' }}>Invoice Due: TZS {data.invoiceDue}</p>
      )}
      {data.otherDetails && (
        <p style={{ fontSize: '9px', color: '#6B7280', marginTop: '6px' }}>Additional details: {data.otherDetails}</p>
      )}
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
      <tr style={{ backgroundColor: '#B91C1C', color: '#fff', fontSize: '9px', fontWeight: '900' }}>
        <th style={{ textAlign: 'left', padding: '8px' }}>DESCRIPTION</th>
        <th style={{ textAlign: 'right', padding: '8px' }}>AMOUNT</th>
      </tr>
      <tr style={{ fontSize: '11px' }}>
        <td style={{ padding: '15px 8px', borderBottom: '1px solid #F3F4F6' }}>
          <b>{data.description}</b>
          <p style={{ color: '#B91C1C', fontSize: '9px' }}>PLOT REF: {data.plotNumber}</p>
        </td>
        <td style={{ textAlign: 'right', padding: '15px 8px', borderBottom: '1px solid #F3F4F6', fontSize: '14px', fontWeight: '900' }}>
          TZS {typeof data.amount === 'string' ? data.amount : formatCurrency(data.amount)}
        </td>
      </tr>
    </table>

    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
      <div style={{ backgroundColor: '#B91C1C', color: '#fff', padding: '10px 20px', borderRadius: '4px', fontSize: '18px', fontWeight: '900' }}>
        TOTAL: TZS {typeof data.amount === 'string' ? data.amount : formatCurrency(data.amount)}
      </div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
      <div>
        <h4 style={{ color: '#D97706', fontSize: '20px', fontWeight: '900', fontStyle: 'italic', margin: 0 }}>THANK YOU!</h4>
        <p style={{ fontSize: '7px', color: '#9CA3AF' }}>Verified computerized receipt.</p>
      </div>
      <QRCodeSVG value={`HIGHLAND_${data.receiptNo}`} size={45} fgColor="#B91C1C" />
    </div>
  </div>
);

const ReceiptsPage = () => {
  const { getReceipts, createReceipt, updateReceipt, deleteReceipt } = useReceiptsApi();
  const { getClients } = useClientsApi();
  const { getInvoices } = useInvoicesApi();
  const { getProjects } = useProjectsApi();
  const { getSettings } = useSettingsApi();
  const { data: settings } = getSettings();
  const { canCreate, canEdit, canDelete } = usePermissions();
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [stage, setStage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [exportData, setExportData] = useState<any>(null);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedReceiptInvoice = selectedReceiptDetail?.invoice;
  const linkedInvoicePaid = selectedReceiptInvoice?.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
  const linkedInvoiceOutstanding = Math.max(0, (selectedReceiptInvoice?.amount || 0) - linkedInvoicePaid);

  const [form, setForm] = useState({
    clientId: '', buyerName: '', buyerPhone: '', amount: '',
    paymentMethod: 'Bank Transfer', plotNumber: '', description: 'Property Installment', sellerId: '', notes: '', referenceCode: ''
  });

  const { data: receiptsData, isLoading: receiptsLoading } = getReceipts({});
  const { data: clientsData } = getClients({ page: 1, limit: 1000 });
  const { data: invoicesData } = getInvoices({});
  const { data: projectsData } = getProjects({});

  const sellers = useMemo(
    () => clientsData?.data?.filter((c: any) => c.type === 'seller') || [],
    [clientsData]
  );

  const sellerPlotEntries = useMemo(() => {
    if (!form.sellerId) return [];
    const projects = projectsData?.data?.filter((p: any) => p.sellerId === form.sellerId) || [];
    return projects.flatMap((project: any) => {
      let details = project.details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { details = null; }
      }
      if (!Array.isArray(details?.entries)) return [];
      return details.entries.map((entry: any) => ({
        ...entry,
        projectId: project.id,
        projectLocation: project.location,
        project,
      }));
    });
  }, [projectsData, form.sellerId]);

  const clientInvoices = useMemo(() => 
    invoicesData?.data?.filter((inv: any) => inv.clientId === form.clientId) || [],
    [invoicesData, form.clientId]
  );

  // Get selected client and check if seller
  const selectedClient = useMemo(() =>
    clientsData?.data?.find((c: any) => c.id === form.clientId),
    [clientsData, form.clientId]
  );

  const isSellerClient = selectedClient?.type === 'seller';

  const selectedInvoice = useMemo(() => 
    clientInvoices.find((inv: any) => inv.id === selectedInvoiceId),
    [clientInvoices, selectedInvoiceId]
  );

  const parseInvoiceStartingPayment = (invoice: any) => {
    if (!invoice?.plotInfo || typeof invoice.plotInfo !== 'string') return null;
    const match = invoice.plotInfo.match(/initial payment of TZS\s*([\d,]+)/i);
    if (!match) return null;
    return cleanTZS(match[1]);
  };

  const selectedPlot = useMemo(
    () => sellerPlotEntries.find((entry: any) => entry.plotNumber === form.plotNumber),
    [sellerPlotEntries, form.plotNumber]
  );

  const selectedPlotInvoice = useMemo(() => {
    if (!selectedPlot || !invoicesData?.data) return null;
    return invoicesData.data.find((inv: any) => {
      if (!inv.projectId || inv.projectId !== selectedPlot.projectId) return false;
      if (!inv.plotInfo) return false;
      return inv.plotInfo.includes(selectedPlot.plotNumber);
    }) || null;
  }, [invoicesData, selectedPlot]);

  // Seller owner value calculation: sum of all plot prices for selected seller
  const sellerOwnerValue = useMemo(() => {
    if (!form.sellerId) return 0;
    return sellerPlotEntries.reduce((sum: number, plot: any) => {
      const plotTotal = Number(plot.sqm) * Number(plot.pricePerSqm);
      return sum + plotTotal;
    }, 0);
  }, [form.sellerId, sellerPlotEntries]);

  // Seller total receipts: sum of all receipts from invoices linked to seller's plots
  const sellerTotalReceipts = useMemo(() => {
    if (!form.sellerId || !invoicesData?.data) return 0;
    const sellerInvoices = invoicesData.data.filter((inv: any) => {
      const sellerProject = projectsData?.data?.find((p: any) => p.id === inv.projectId && p.sellerId === form.sellerId);
      return !!sellerProject;
    });
    return sellerInvoices.reduce((sum: number, inv: any) => {
      const paid = inv.receipts?.reduce((s: number, r: any) => s + r.amount, 0) || 0;
      return sum + paid;
    }, 0);
  }, [form.sellerId, invoicesData, projectsData]);

  // Seller remaining balance
  const sellerRemainingBalance = Math.max(0, sellerOwnerValue - sellerTotalReceipts);

  const selectedInvoiceTotal = selectedInvoice?.amount || 0;
  const selectedInvoicePaid = selectedInvoice?.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
  const selectedInvoiceOutstanding = Math.max(0, selectedInvoiceTotal - selectedInvoicePaid);

  const handleEdit = (receipt: any) => {
    setEditingId(receipt.id);
    setForm({
      clientId: receipt.clientId || '',
      buyerName: receipt.buyerName,
      buyerPhone: receipt.buyerPhone || '',
      amount: formatCurrency(receipt.amount),
      paymentMethod: receipt.paymentMethod,
      plotNumber: receipt.plotNumber || '',
      sellerId: receipt.invoice?.project?.sellerId || '',
      description: receipt.description,
      notes: '',
      referenceCode: receipt.referenceCode || ''
    });
    setSelectedInvoiceId(receipt.invoiceId || '');
    setIsFormVisible(true);
    setStage(3);
  };

  const handleDownload = async (data: any) => {
    setExportData(data);
    await new Promise(r => setTimeout(r, 500));
    const element = document.querySelector('.receipt-export-node') as HTMLElement;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 148, 210);
    pdf.save(`Receipt-${data.buyerName}.pdf`);
    setExportData(null);
  };

  const handleFinalize = async () => {
    const amt = cleanTZS(form.amount);
    if (amt <= 0) return alert("Enter amount");
    if (selectedInvoice && amt > selectedInvoiceOutstanding) {
      return alert(`Amount cannot exceed outstanding invoice balance of TZS ${formatCurrency(selectedInvoiceOutstanding)}`);
    }

    try {
      if (form.paymentMethod !== 'Cash' && !form.referenceCode.trim()) {
        return alert('Enter reference code for bank or mobile payments');
      }

      const payload = {
        clientId: form.clientId || null,
        amount: amt,
        buyerName: form.buyerName,
        buyerPhone: form.buyerPhone,
        paymentMethod: form.paymentMethod,
        plotNumber: form.plotNumber,
        description: form.description,
        invoiceId: selectedInvoiceId || null,
        date: new Date().toLocaleDateString('en-GB'),
        referenceCode: form.referenceCode || ''
      };

      if (editingId) {
        await updateReceipt.mutateAsync({ id: editingId, ...payload });
        setIsFormVisible(false);
        setStage(1);
        setSelectedInvoiceId('');
        setEditingId(null);
        setForm({ clientId: '', buyerName: '', buyerPhone: '', amount: '', paymentMethod: 'Bank Transfer', plotNumber: '', description: 'Property Installment', sellerId: '', notes: '', referenceCode: '' });
      } else {
        const result = await createReceipt.mutateAsync(payload);
        const createdReceipt = result?.data || result;

        // DOWNLOAD IMMEDIATELY
        handleDownload({
          ...payload,
          receiptNo: createdReceipt.receiptNo,
          amount: form.amount,
          otherDetails: form.notes,
          invoiceNo: selectedInvoice?.invoiceNo || undefined,
          invoiceUrl: selectedInvoice ? `${window.location.origin}/invoices?invoiceId=${selectedInvoice.id}` : undefined,
          invoiceAmount: selectedInvoice ? formatCurrency(selectedInvoiceTotal) : undefined,
          invoiceDue: selectedInvoice ? formatCurrency(selectedInvoiceOutstanding - amt) : undefined,
        });
        
        setIsFormVisible(false);
        setStage(1);
        setSelectedInvoiceId('');
        setForm({ clientId: '', buyerName: '', buyerPhone: '', amount: '', paymentMethod: 'Bank Transfer', plotNumber: '', description: 'Property Installment', sellerId: '', notes: '', referenceCode: '' });
      }
    } catch (e) { alert("Save error: Check connection"); }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* Hidden Portal for Export */}
      {exportData && <div style={{ position: 'absolute', left: '-5000px' }}><ReceiptVoucher data={exportData} settings={settings} /></div>}

      <div className="flex justify-between items-center bg-white p-8 rounded-2xl border shadow-sm">
        <h1 className="text-3xl font-black">Receipts & Payments</h1>
        {canCreate('receipts') && (
          <Button onClick={() => setIsFormVisible(!isFormVisible)} className={isFormVisible ? "bg-gray-100 text-gray-700 px-8 py-6 rounded-2xl font-bold shadow-lg shadow-gray-100" : "bg-blue-600 px-8 py-6 rounded-2xl text-white font-bold shadow-xl shadow-blue-100 transition-all hover:-translate-y-1"}>
            {isFormVisible ? 'Cancel' : <><Plus size={20} className="mr-2"/> New Receipt</>}
          </Button>
        )}
      </div>

      {canCreate('receipts') && isFormVisible ? (
        <Card className="max-w-2xl mx-auto shadow-2xl">
          <CardBody className="space-y-8">
            <div className="flex justify-center space-x-2">
              {[1, 2, 3].map(s => <div key={s} className={`h-2 w-20 rounded-full ${stage >= s ? 'bg-blue-600' : 'bg-gray-100'}`} />)}
            </div>

            {stage === 1 && (
              <div className="space-y-4 animate-in fade-in">
                <label className="text-[10px] font-black uppercase text-gray-400">Step 1: Select Buyer</label>
                <select className="w-full border-2 p-4 rounded-xl bg-white font-bold" onChange={e => {
                  const c = clientsData?.data.find((x:any) => x.id === e.target.value);
                  setForm({...form, clientId: c.id, buyerName: c.name, buyerPhone: c.phone || 'N/A'});
                }}>
                  <option value="">System Buyer...</option>
                  {clientsData?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input placeholder="Manual Name (Walk-in)" className="w-full border-2 p-4 rounded-xl" value={form.buyerName} onChange={e => setForm({...form, buyerName: e.target.value})} />
                <Button
                  fullWidth
                  onClick={() => {
                    if (isSellerClient) return setStage(2);
                    if (form.clientId) return setStage(3);
                    return setStage(2);
                  }}
                  disabled={!form.buyerName}
                >
                  Next: {isSellerClient ? 'Select Plot' : (form.clientId ? 'Payment' : 'Buyer Details')}
                </Button>
              </div>
            )}

            {stage === 2 && (
              isSellerClient ? (
                <div className="space-y-4 animate-in fade-in">
                  <label className="text-[10px] font-black uppercase text-gray-400">Step 2: Select Seller Owned Plot</label>
                  <select className="w-full border-2 p-4 rounded-xl bg-white font-bold" value={form.sellerId} onChange={e => setForm({...form, sellerId: e.target.value, plotNumber: '', amount: ''})}>
                    <option value="">Choose Seller...</option>
                    {sellers.map((seller: any) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
                  </select>
                  <select className="w-full border-2 p-4 rounded-xl bg-white font-bold" value={form.plotNumber} onChange={e => {
                    const plotNum = e.target.value;
                    const selection = sellerPlotEntries.find((plot: any) => plot.plotNumber === plotNum);
                    if (!selection) return;
                    const plotTotal = Number(selection.sqm) * Number(selection.pricePerSqm);
                    const invoice = invoicesData?.data?.find((inv: any) => {
                      if (!inv.projectId || inv.projectId !== selection.projectId) return false;
                      return inv.plotInfo?.includes(selection.plotNumber);
                    });
                    const invoicePaid = invoice?.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
                    const amountToUse = invoice ? Math.max(0, invoice.amount - invoicePaid) : plotTotal;
                    setSelectedInvoiceId(invoice?.id || '');
                    setForm({
                      ...form,
                      plotNumber: plotNum,
                      amount: maskTZS(amountToUse.toString()),
                      description: `Plot ${selection.plotNumber}, Block ${selection.block} — ${selection.sqm} SQM @ TZS ${formatCurrency(selection.pricePerSqm)}/SQM`,
                    });
                  }} disabled={!form.sellerId}>
                    <option value="">Choose Seller Plot...</option>
                    {sellerPlotEntries.map((plot: any) => (
                      <option key={`${plot.projectId}-${plot.plotNumber}`} value={plot.plotNumber}>
                        {plot.projectLocation} — Plot {plot.plotNumber} ({plot.block}) — {plot.sqm} SQM
                      </option>
                    ))}
                  </select>
                  {form.sellerId && (
                    <div className="space-y-3 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm text-slate-700">
                      <div className="flex justify-between">
                        <span className="font-black uppercase text-xs">Seller Total Owned Value</span>
                        <span className="text-lg font-black text-amber-700">TZS {formatCurrency(sellerOwnerValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-black uppercase text-xs">Total Received from Receipts</span>
                        <span className="text-lg font-black text-emerald-700">TZS {formatCurrency(sellerTotalReceipts)}</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-amber-200">
                        <span className="font-black uppercase text-xs">Remaining Balance</span>
                        <span className="text-xl font-black text-blue-600">TZS {formatCurrency(sellerRemainingBalance)}</span>
                      </div>
                    </div>
                  )}
                  {selectedPlot && (
                    <div className="space-y-3 rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
                      <div className="flex justify-between">
                        <span className="font-black uppercase text-xs">Plot total</span>
                        <span>TZS {formatCurrency(Number(selectedPlot.sqm) * Number(selectedPlot.pricePerSqm))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-black uppercase text-xs">Project</span>
                        <span>{selectedPlot.projectLocation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-black uppercase text-xs">Price/SQM</span>
                        <span>TZS {formatCurrency(Number(selectedPlot.pricePerSqm))}</span>
                      </div>
                      {selectedPlotInvoice ? (
                        <div className="rounded-2xl bg-white p-3 border border-blue-100 text-xs space-y-2">
                          <p className="font-black uppercase tracking-[1px] text-slate-500">Existing Invoice</p>
                          <p>Invoice: {selectedPlotInvoice.invoiceNo}</p>
                          <p>Outstanding: TZS {formatCurrency(Math.max(0, selectedPlotInvoice.amount - (selectedPlotInvoice.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0)))}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No invoice exists yet for this owned plot. Receipt amount will use plot calculation.</p>
                      )}
                    </div>
                  )}
                  <Button fullWidth onClick={() => setStage(3)} disabled={!form.plotNumber}>Next: Payment</Button>
                  <Button variant="ghost" fullWidth onClick={() => setStage(1)}>Back</Button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <label className="text-[10px] font-black uppercase text-gray-400">Step 2: Buyer Contact & Payment Details</label>
                  <input
                    className="w-full border-2 p-4 rounded-xl"
                    placeholder="Phone Number"
                    value={form.buyerPhone}
                    onChange={e => setForm({ ...form, buyerPhone: e.target.value })}
                  />
                  <textarea
                    className="w-full border-2 p-4 rounded-xl"
                    placeholder="Payment description"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                  <textarea
                    className="w-full border-2 p-4 rounded-xl"
                    placeholder="Other important details for the receipt PDF"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                  />
                  <Button fullWidth onClick={() => setStage(3)} disabled={!form.buyerPhone || !form.description}>Next: Payment</Button>
                  <Button variant="ghost" fullWidth onClick={() => setStage(1)}>Back</Button>
                </div>
              )
            )}

            {stage === 3 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-3">
                  {!isSellerClient && (
                    <>
                      <label className="text-[10px] font-black uppercase text-gray-400">Select Invoice (if linked)</label>
                      <select className="w-full border-2 p-4 rounded-xl bg-white font-bold" value={selectedInvoiceId} onChange={e => {
                        setSelectedInvoiceId(e.target.value);
                        if (e.target.value) {
                          const invoice = invoicesData?.data?.find((inv: any) => inv.id === e.target.value);
                          if (invoice) {
                            const paid = invoice.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
                            const outstanding = Math.max(0, invoice.amount - paid);
                            const startingPayment = invoice.receipts?.length === 0 ? parseInvoiceStartingPayment(invoice) : null;
                            const amountToUse = startingPayment != null ? Math.min(startingPayment, outstanding) : outstanding;
                            setForm(prev => ({...prev, amount: maskTZS(amountToUse.toString())}));
                          }
                        } else {
                          setForm(prev => ({...prev, amount: ''}));
                        }
                      }}>
                        <option value="">No Invoice (Walk-in Payment)</option>
                        {clientInvoices.map((inv: any) => {
                          const paid = inv.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
                          const outstanding = Math.max(0, inv.amount - paid);
                          const isFullyPaid = outstanding === 0;
                          const startingPayment = inv.receipts?.length === 0 ? parseInvoiceStartingPayment(inv) : null;
                          const label = isFullyPaid
                            ? '(FULLY PAID)'
                            : startingPayment != null
                              ? `— Starting: TZS ${formatCurrency(startingPayment)}`
                              : `— TZS ${formatCurrency(outstanding)} due`;
                          return <option key={inv.id} value={inv.id}>
                            {inv.invoiceNo} {label}
                          </option>;
                        })}
                      </select>
                    </>
                  )}

                  {selectedInvoice && (
                    <div className={`rounded-2xl p-4 border-2 space-y-3 ${selectedInvoiceOutstanding === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-blue-50 border-blue-300'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-gray-600">Linked Invoice</span>
                        <span className="text-xs font-black text-gray-600">{selectedInvoice.invoiceNo}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500 font-bold uppercase">Total Invoice</p>
                          <p className="font-black text-lg text-gray-900">TZS {formatCurrency(selectedInvoiceTotal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-bold uppercase">Paid So Far</p>
                          <p className="font-black text-lg text-emerald-600">TZS {formatCurrency(selectedInvoicePaid)}</p>
                        </div>
                      </div>
                      <div className={`bg-white rounded-xl p-3 border-2 ${selectedInvoiceOutstanding === 0 ? 'border-emerald-300' : 'border-blue-300'}`}>
                        <p className="text-xs text-gray-600">
                          <span className="font-black">Outstanding Balance:</span>
                          <span className="font-black text-lg text-blue-600 ml-2">TZS {formatCurrency(selectedInvoiceOutstanding)}</span>
                        </p>
                      </div>
                      {selectedInvoiceOutstanding === 0 ? (
                        <div className="bg-white rounded-xl p-3 border-2 border-emerald-300 text-center">
                          <p className="text-sm font-black text-emerald-700">✓ INVOICE FULLY PAID</p>
                          <p className="text-xs text-emerald-600 mt-1">No more payments needed for this invoice.</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Step {isSellerClient ? 3 : (form.clientId ? 2 : 3)}: Payment Amount</label>
                  <input 
                    className="w-full border-2 border-blue-100 p-6 rounded-2xl text-4xl font-black text-blue-600 outline-none focus:border-blue-500" 
                    value={form.amount} 
                    onChange={e => setForm({...form, amount: maskTZS(e.target.value)})} 
                    placeholder="0"
                    readOnly={selectedInvoiceId !== ''}
                  />
                  {selectedInvoiceId && (
                    <p className="text-xs text-gray-500 mt-2">Amount is auto-calculated from invoice balance</p>
                  )}
                </div>
                <select className="w-full border-2 p-4 rounded-xl bg-white font-bold" value={form.paymentMethod} onChange={e => {
                  const paymentMethod = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    paymentMethod,
                    referenceCode: paymentMethod === 'Cash' ? '' : prev.referenceCode,
                  }));
                }}>
                   <option>Bank Transfer</option><option>Mobile Money</option><option>Cash</option>
                </select>
                {form.paymentMethod !== 'Cash' && (
                  <input
                    className="w-full border-2 p-4 rounded-xl"
                    placeholder="Enter Reference Code"
                    value={form.referenceCode}
                    onChange={e => setForm({ ...form, referenceCode: e.target.value })}
                  />
                )}
                
                {selectedInvoiceId && selectedInvoiceOutstanding === 0 ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center">
                      <p className="text-sm font-black text-emerald-700 mb-2">✓ This invoice is fully paid!</p>
                      <p className="text-xs text-emerald-600">All payments have been received.</p>
                    </div>
                    <Button 
                      fullWidth 
                      disabled 
                      className="py-5 bg-gray-400 text-white font-black shadow-lg"
                    >
                      No More Payments Needed
                    </Button>
                    <Button 
                      variant="ghost" 
                      fullWidth 
                      onClick={() => window.location.href = `/invoices?invoiceId=${selectedInvoiceId}`}
                      className="py-4 border-2 border-blue-500 text-blue-600 font-black"
                    >
                      View Invoice Details
                    </Button>
                  </div>
                ) : (
                  <Button fullWidth onClick={handleFinalize} disabled={createReceipt.isPending} className="py-5 bg-emerald-600 text-white font-black shadow-lg shadow-emerald-100">
                     {createReceipt.isPending ? 'Saving...' : 'Save & Download A5 PDF'}
                  </Button>
                )}
                
                <Button variant="ghost" fullWidth onClick={() => isSellerClient ? setStage(2) : setStage(1)}>Back</Button>
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        /* TABLE LIST */
        <Card>
          <CardBody>
            {receiptsLoading ? <Loading /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-3 px-8">
                  <thead><tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><th className="px-8">ID</th><th className="px-8">Buyer</th><th className="px-8">Amount</th><th className="px-8 text-right">Action</th></tr></thead>
                  <tbody>{receiptsData?.data?.map((r: any) => {
                    const invoiceDue = Math.max(0, (r.invoice?.amount || 0) - (r.invoice?.receipts?.reduce((sum: number, rec: any) => sum + rec.amount, 0) || 0));
                    return (
                      <tr key={r.id} onDoubleClick={() => setSelectedReceiptDetail(r)} className="group hover:translate-x-1 transition-all cursor-pointer">
                        <td className="px-8 py-6 bg-white first:rounded-l-2xl border-y border-l font-black text-blue-600">{r.receiptNo}</td>
                        <td className="px-8 py-6 bg-white border-y font-bold uppercase text-xs">
                          {r.buyerName}
                          {r.invoice?.invoiceNo && (
                            <div className="flex flex-wrap gap-2 mt-2 items-center">
                              <button type="button" onClick={e => { e.stopPropagation(); window.location.href = `/invoices?invoiceId=${r.invoice.id}`; }} className="inline-flex items-center">
                                <Badge variant="info">{r.invoice.invoiceNo}</Badge>
                              </button>
                              <Badge variant={invoiceDue === 0 ? 'success' : 'info'}>{`Due: TZS ${formatCurrency(invoiceDue)}`}</Badge>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 bg-white border-y font-black text-lg">TZS {formatCurrency(r.amount)}</td>
                        <td className="px-8 py-6 bg-white last:rounded-r-2xl border-y border-r text-right">
                          <button onClick={() => handleDownload({
                            ...r,
                            amount: formatCurrency(r.amount),
                            date: new Date(r.createdAt).toLocaleDateString('en-GB'),
                            invoiceNo: r.invoice?.invoiceNo,
                            invoiceUrl: r.invoice ? `${window.location.origin}/invoices?invoiceId=${r.invoice.id}` : undefined,
                            invoiceAmount: r.invoice ? formatCurrency(r.invoice.amount) : undefined,
                            invoiceDue: r.invoice ? formatCurrency(Math.max(0, (r.invoice.amount || 0) - (r.invoice.receipts?.reduce((sum: number, rec: any) => sum + rec.amount, 0) || 0))) : undefined,
                          })} className="p-3 text-emerald-600 bg-white border rounded-xl hover:bg-emerald-50 shadow-sm"><Download size={18}/></button>
                          {r.invoice?.projectId && (
                            <button onClick={() => window.location.href = `/projects?projectId=${r.invoice.projectId}`} className="p-3 text-slate-700 bg-white border rounded-xl hover:bg-gray-50 shadow-sm ml-2" title="Open project ledger"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M21 10h-3.586l2.293-2.293-1.414-1.414L15 10.586V7h-2v6h6v-2z"/></svg></button>
                          )}
                          {canEdit('receipts') && (
                            <button onClick={() => handleEdit(r)} className="p-3 text-blue-600 bg-white border rounded-xl hover:bg-blue-50 shadow-sm ml-2"><Edit size={18}/></button>
                          )}
                          {canDelete('receipts') && (
                            <button onClick={() => deleteReceipt.mutate(r.id)} className="p-3 text-rose-500 bg-white border rounded-xl hover:bg-rose-50 shadow-sm ml-2"><Trash2 size={18}/></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Modal isOpen={!!selectedReceiptDetail} onClose={() => setSelectedReceiptDetail(null)} title="Receipt Full Detail">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-[2px] text-gray-400 font-black">Receipt</p>
              <h3 className="text-2xl font-black text-gray-900">{selectedReceiptDetail?.receiptNo}</h3>
              <p className="text-sm text-gray-500">Buyer: {selectedReceiptDetail?.buyerName}</p>
              <p className="text-sm text-gray-500">Payment: {selectedReceiptDetail?.paymentMethod}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black">
                <span>Amount</span>
                <span>TZS {formatCurrency(selectedReceiptDetail?.amount || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-500 uppercase font-black">
                <span>Linked Invoice</span>
                {selectedReceiptDetail?.invoice ? (
                  <button type="button" onClick={() => window.location.href = `/invoices?invoiceId=${selectedReceiptDetail.invoice.id}`} className="text-blue-600 font-black text-xs underline">
                    {selectedReceiptDetail.invoice.invoiceNo}
                  </button>
                ) : (
                  <span>N/A</span>
                )}
              </div>
              {selectedReceiptInvoice ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-500 uppercase font-black">
                    <span>Invoice Total</span>
                    <span>TZS {formatCurrency(selectedReceiptInvoice?.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 uppercase font-black">
                    <span>Paid on Invoice</span>
                    <span>TZS {formatCurrency(linkedInvoicePaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 uppercase font-black">
                    <span>Invoice Due</span>
                    <span>TZS {formatCurrency(linkedInvoiceOutstanding)}</span>
                  </div>
                  {selectedReceiptInvoice?.projectId && (
                    <div className="mt-3 text-right">
                      <button onClick={() => window.location.href = `/projects?projectId=${selectedReceiptInvoice.projectId}`} className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold">View Project Ledger</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No linked invoice. This is a standalone payment record.</div>
              )}
              {selectedReceiptDetail?.invoice?.project?.sellerId && (
                <div className="mt-4 pt-4 border-t border-slate-300 rounded-2xl bg-white p-3 space-y-2">
                  <p className="font-black uppercase text-xs text-slate-600">Seller Balance</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Seller Total Owned Value:</span>
                      <span className="font-black">TZS {formatCurrency(sellerOwnerValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Receipts:</span>
                      <span className="font-black text-emerald-600">TZS {formatCurrency(sellerTotalReceipts)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-black">Remaining Balance:</span>
                      <span className="font-black text-blue-600 text-lg">TZS {formatCurrency(sellerRemainingBalance)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
            <div>
              <h4 className="text-lg font-black mb-3">Description</h4>
              <p className="text-sm text-slate-600 whitespace-pre-line">{selectedReceiptDetail?.description || 'No receipt description available.'}</p>
            </div>
            {selectedReceiptInvoice && (
              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                <h4 className="text-sm font-black uppercase text-slate-500 mb-2">Linked Invoice Plot Details</h4>
                <p className="text-sm text-slate-700">Location: {selectedReceiptInvoice?.project?.location || selectedReceiptInvoice?.location || 'Unknown'}</p>
                <p className="text-sm text-slate-700">Invoice amount: TZS {formatCurrency(selectedReceiptInvoice?.amount || 0)}</p>
                <p className="text-sm text-slate-700 whitespace-pre-line mt-2">{selectedReceiptInvoice?.plotInfo || 'No invoice plot details available.'}</p>
              </div>
            )}
            {selectedReceiptDetail?.invoice?.client && (
              <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-4">
                <h4 className="text-sm font-black uppercase text-emerald-700 mb-3">Buyer Account Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Buyer:</span>
                    <span className="font-black">{selectedReceiptDetail.invoice.client.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 border-t border-emerald-200 pt-2 mt-2">
                    <span>Total Invoices for this buyer: {selectedReceiptDetail?.invoice?.client?.invoices?.length || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReceiptsPage;