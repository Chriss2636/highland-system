import React, { useState } from 'react';
import { useRequisitionsApi, useSettingsApi } from '../api/hooks';
import { Card, CardBody, Loading, Button, Badge, Modal } from '../components/common';
import { Plus, Trash2, Check, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatCurrency, maskTZS, cleanTZS, formatDate } from '../utils';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * OFFICIAL REQUISITION TEMPLATE (A4)
 * Matches the 3-Section PDF Structure
 */
const RequisitionVoucher = React.forwardRef(({ data, settings }: { data: any, settings: any }, ref: any) => {
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginBottom: '15px' };
  const cellStyle: React.CSSProperties = { border: '1px solid #000', padding: '8px', fontSize: '11px', textAlign: 'left' };
  const labelStyle: React.CSSProperties = { ...cellStyle, fontWeight: 'bold', backgroundColor: '#f9fafb', width: '35%' };

  return (
    <div ref={ref} className="requisition-export-node" style={{ 
      width: '210mm', minHeight: '297mm', padding: '20mm', backgroundColor: '#ffffff', fontFamily: 'serif', color: '#000' 
    }}>
      {/* HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ width: '80px', marginBottom: '10px' }} />}
        <h1 style={{ fontSize: '18pt', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
          {settings?.name || 'HIGHLAND PROPERTY COMPANY LIMITED'}
        </h1>
        <h2 style={{ fontSize: '15pt', fontWeight: 'bold', margin: '5px 0', textDecoration: 'underline' }}>CASH REQUISITION FORM</h2>
      </div>

      <div style={{ marginBottom: '20px', fontSize: '11pt' }}>
        <p><b>Project Reference:</b> {data.projectName}</p>
        <p><b>Date:</b> {formatDate(data.preparedByDate)}</p>
      </div>

      {/* 1. REQUEST DETAILS */}
      <h3 style={{ fontSize: '12pt', fontWeight: '900', marginBottom: '8px', borderLeft: '4px solid #B91C1C', paddingLeft: '10px' }}>1. REQUEST DETAILS</h3>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={labelStyle}>Requested By</td><td style={cellStyle}>{data.cashRequestedBy}</td></tr>
          <tr><td style={labelStyle}>Department/Section</td><td style={cellStyle}>{data.department}</td></tr>
          <tr><td style={labelStyle}>Amount Required (Figures)</td><td style={{ ...cellStyle, fontWeight: '900' }}>TZS {formatCurrency(data.amount)}</td></tr>
          <tr><td style={labelStyle}>Amount Required (Words)</td><td style={cellStyle}>{data.amountWords}</td></tr>
          <tr><td style={{ ...labelStyle, height: '60px' }}>Purpose / Details</td><td style={cellStyle}>{data.purpose}</td></tr>
          <tr><td style={labelStyle}>Payment Code(s)</td><td style={cellStyle}>{data.paymentCodes || '---'}</td></tr>
        </tbody>
      </table>

      {/* 2. APPROVAL SECTION */}
      <h3 style={{ fontSize: '12pt', fontWeight: '900', marginBottom: '8px', marginTop: '25px', borderLeft: '4px solid #B91C1C', paddingLeft: '10px' }}>2. APPROVAL SECTION</h3>
      <table style={tableStyle}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={cellStyle}>Approval Stage</th>
            <th style={cellStyle}>Name & Signature</th>
            <th style={cellStyle}>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={labelStyle}>Prepared By</td><td style={cellStyle}>{data.preparedBy}</td><td style={cellStyle}>{formatDate(data.preparedByDate)}</td></tr>
          <tr><td style={labelStyle}>Checked By (Assistant Dir)</td><td style={cellStyle}>{data.assistantName || '________________'}</td><td style={cellStyle}>{data.assistantDate ? formatDate(data.assistantDate) : '________________'}</td></tr>
          <tr><td style={labelStyle}>Approved By (General Dir)</td><td style={cellStyle}>{data.directorName || '________________'}</td><td style={cellStyle}>{data.directorDate ? formatDate(data.directorDate) : '________________'}</td></tr>
        </tbody>
      </table>

      <h3 style={{ fontSize: '12pt', fontWeight: '900', marginBottom: '8px', marginTop: '25px', borderLeft: '4px solid #B91C1C', paddingLeft: '10px' }}>3. DIRECTOR CONFIRMATION</h3>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={labelStyle}>Confirmed By</td><td style={cellStyle}>{data.directorName || '________________'}</td></tr>
          <tr><td style={labelStyle}>Date</td><td style={cellStyle}>{data.directorDate ? formatDate(data.directorDate) : '________________'}</td></tr>
          <tr><td style={labelStyle}>Director Stamp</td><td style={cellStyle}>________________________</td></tr>
        </tbody>
      </table>

      <div style={{ marginTop: '40px', fontSize: '11pt', borderTop: '1.5px solid #eee', paddingTop: '15px' }}>
        <p><b>Declaration:</b> I confirm that the requested funds will be used strictly for the purpose stated above.</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
           <p>Applicant: {data.preparedBy}</p>
           <p>Date: {formatDate(data.preparedByDate)}</p>
        </div>
        <p style={{ marginTop: '16px', fontSize: '10pt', color: '#666' }}>Applicant signature and date are pre-filled; stamp to be added manually after printing.</p>
      </div>
    </div>
  );
});

const RequisitionsPage = () => {
  const { getRequisitions, createRequisition, deleteRequisition, approveRequisitionAssistant, approveRequisitionDirector } = useRequisitionsApi();
  const { getSettings } = useSettingsApi();
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();
  const { data: settings } = getSettings();
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null); // For Audit Modal
  const [approvalTarget, setApprovalTarget] = useState<any>(null); // For Approval Action

  const [form, setForm] = useState({
    projectName: '', department: 'Operations', cashRequestedBy: '', 
    amount: '', amountWords: '', purpose: '', paymentCodes: '', 
    preparedBy: user?.name || '', preparedByDate: new Date().toISOString().split('T')[0]
  });

  const { data: reqData, isLoading } = getRequisitions();
  const requisitions = reqData?.data || [];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_assistant': return 'Pending Assistant Director';
      case 'pending_director': return 'Pending General Director';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'pending_director': return 'warning';
      case 'pending_assistant': return 'info';
      default: return 'info';
    }
  };

  const handleDownload = async (data: any) => {
    const pdfData = data?.data || data;
    setExportData(pdfData);
    await new Promise(r => setTimeout(r, 600));
    const element = document.querySelector('.requisition-export-node') as HTMLElement;
    const canvas = await html2canvas(element, { scale: 3, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
    pdf.save(`Requisition-${pdfData.projectName}.pdf`);
    setExportData(null);
  };

  const handleProcessApproval = async (approved: boolean) => {
    try {
      let response: any;
      if (userRole === 'assistant director') {
        response = await approveRequisitionAssistant.mutateAsync({ id: approvalTarget.id, comments: '', approved });
      } else if (userRole === 'general director') {
        response = await approveRequisitionDirector.mutateAsync({ id: approvalTarget.id, comments: '', approved });
      }

      const updatedRequisition = response?.data || response;
      if (userRole === 'general director' && approved) {
        await handleDownload(updatedRequisition);
      }
      setApprovalTarget(null);
    } catch (e: any) {
      const message = e?.response?.data?.error || e?.message || 'Unknown error';
      alert(`Approval action failed: ${message}`);
    }
  };

  const resetForm = () => {
    setForm({
      projectName: '', department: 'Operations', cashRequestedBy: '', 
      amount: '', amountWords: '', purpose: '', paymentCodes: '', 
      preparedBy: user?.name || '', preparedByDate: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* HIDDEN EXPORT NODE */}
      {exportData && <div style={{ position: 'absolute', left: '-5000px', top: 0 }}><RequisitionVoucher data={exportData} settings={settings} /></div>}

      <div className="flex justify-between items-center bg-white p-8 rounded-2xl border shadow-sm no-print">
        <h1 className="text-3xl font-black">Requisition Hub</h1>
        <Button onClick={() => { setIsFormVisible(!isFormVisible); resetForm(); }} className="bg-blue-600 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-blue-100">
          {isFormVisible ? 'Discard' : <><Plus size={20} className="mr-2"/> New Fund Request</>}
        </Button>
      </div>

      {isFormVisible ? (
        <Card className="max-w-4xl mx-auto no-print shadow-2xl animate-in slide-in-from-bottom-4">
          <CardBody>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createRequisition.mutateAsync({...form, amount: cleanTZS(form.amount)});
                setIsFormVisible(false);
                resetForm();
              } catch (error) {
                alert("Failed to create requisition");
              }
            }} className="space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Department</label>
                  <input className="w-full border-2 border-gray-100 p-4 rounded-xl" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Requested By</label>
                  <input className="w-full border-2 border-gray-100 p-4 rounded-xl font-bold" required value={form.cashRequestedBy} onChange={e => setForm({...form, cashRequestedBy: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 text-blue-600">Amount Required (TZS)</label>
                  <input className="w-full border-2 border-blue-50 p-4 rounded-xl font-black text-blue-600 text-2xl" required value={form.amount} onChange={e => setForm({...form, amount: maskTZS(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Project Reference</label>
                  <input className="w-full border-2 border-gray-100 p-4 rounded-xl" placeholder="e.g. OFFICE_GENERAL or Project Name" value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Amount in Words</label>
                  <input className="w-full border-2 border-gray-100 p-4 rounded-xl italic font-bold bg-gray-50" value={form.amountWords} onChange={e => setForm({...form, amountWords: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Payment Codes</label>
                  <input className="w-full border-2 border-gray-100 p-4 rounded-xl font-mono" value={form.paymentCodes} onChange={e => setForm({...form, paymentCodes: e.target.value})} placeholder="e.g. 101, 205" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Justification / Purpose</label>
                  <textarea className="w-full border-2 border-gray-100 p-4 rounded-xl min-h-[100px] leading-relaxed" required value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} />
                </div>
                <div className="col-span-2 p-4 bg-gray-50 rounded-xl border-l-4 border-blue-600 font-bold text-blue-800 text-[10px] uppercase flex justify-between tracking-widest">
                   <span>PREPARED BY: {user?.name}</span>
                   <span>SYSTEM DATE: {form.preparedByDate}</span>
                </div>
              </div>
              <Button type="submit" fullWidth className="bg-blue-600 text-white font-black py-5 shadow-lg uppercase tracking-[0.2em]">Forward for Approval</Button>
            </form>
          </CardBody>
        </Card>
      ) : (
        /* TABLE LIST with Double Click Audit */
        <Card className="no-print">
          <CardBody>
            {isLoading ? <Loading /> : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left border-separate border-spacing-y-3 px-8">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-8">
                      <th className="px-8 py-2">ID / Ref</th>
                      <th className="px-8 py-2">Requested By</th>
                      <th className="px-8 py-2">Amount</th>
                      <th className="px-8 py-2">Status</th>
                      <th className="px-8 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent">
                    {requisitions.map((r: any) => (
                      <tr 
                        key={r.id} 
                        onDoubleClick={() => setSelectedDetail(r)}
                        className="group hover:translate-x-1 transition-all duration-300 cursor-pointer"
                      >
                        <td className="px-8 py-6 bg-white first:rounded-l-3xl border-y border-l border-gray-100">
                           <div className="font-black text-blue-600 uppercase text-xs">{r.projectName}</div>
                           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{formatDate(r.createdAt)}</div>
                        </td>
                        <td className="px-8 py-6 bg-white border-y border-gray-100">
                           <div className="font-bold text-gray-800 text-sm uppercase">{r.cashRequestedBy}</div>
                        </td>
                        <td className="px-8 py-6 bg-white border-y border-gray-100">
                           <div className="font-black text-gray-900 text-base">{formatCurrency(r.amount)}</div>
                        </td>
                        <td className="px-8 py-6 bg-white border-y border-gray-100">
                           <Badge variant={getStatusVariant(r.status)}>{getStatusLabel(r.status)}</Badge>
                        </td>
                        <td className="px-8 py-6 bg-white last:rounded-r-3xl border-y border-r border-gray-100 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {/* ROLE-BASED APPROVAL TRIGGER */}
                             {((r.status === 'pending_assistant' && userRole === 'assistant director') || 
                               (r.status === 'pending_director' && userRole === 'general director')) && (
                                <button onClick={() => setApprovalTarget(r)} className="p-3 bg-white text-emerald-600 border border-gray-100 rounded-xl shadow-sm hover:bg-emerald-50 transition-all"><Check size={18}/></button>
                             )}
                             
                             {/* STAFF CAN PRINT ONLY WHEN FULLY APPROVED */}
                             {r.status === 'approved' && (
                               <button onClick={() => handleDownload(r)} className="p-3 bg-white text-blue-600 border border-gray-100 rounded-xl shadow-sm hover:bg-blue-50 transition-all" title="Download approved requisition"><Download size={18}/></button>
                             )}
                             <button onClick={() => deleteRequisition.mutate(r.id)} className="p-3 bg-white text-rose-500 border border-gray-100 rounded-xl shadow-sm hover:bg-rose-50 transition-all"><Trash2 size={18}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* AUDIT MODAL (Double Click View) */}
      <Modal isOpen={!!selectedDetail} onClose={() => setSelectedDetail(null)} title="System Financial Audit">
         <div className="space-y-6">
            <div className="bg-gray-900 p-8 rounded-[2rem] text-white space-y-4">
               <div className="flex justify-between border-b border-white/10 pb-4">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Project Reference</span>
                  <b className="uppercase">{selectedDetail?.projectName}</b>
               </div>
               <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Amount Disbursing</p>
                    <p className="text-3xl font-black text-blue-400">TZS {formatCurrency(selectedDetail?.amount || 0)}</p>
                  </div>
                  <Badge variant="success">{(selectedDetail?.status?.toUpperCase() || '')}</Badge>
               </div>
               <div className="p-5 bg-white/5 rounded-2xl text-sm italic leading-relaxed text-gray-300">"{selectedDetail?.purpose}"</div>
            </div>
            
            <div className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] ml-2">Digital Signature Log</h4>
               <div className="space-y-3 px-2">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <div><p className="text-[10px] font-black text-gray-400 uppercase">Prepared By Staff</p><p className="font-bold text-gray-700">{selectedDetail?.preparedBy} — {formatDate(selectedDetail?.preparedByDate)}</p></div>
                  </div>
                  {selectedDetail?.assistantName && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <div><p className="text-[10px] font-black text-gray-400 uppercase">Verified Assistant Director</p><p className="font-bold text-gray-700">{selectedDetail?.assistantName} — {formatDate(selectedDetail?.assistantDate)}</p></div>
                    </div>
                  )}
                  {selectedDetail?.directorName && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <div><p className="text-[10px] font-black text-gray-400 uppercase">Authorized General Director</p><p className="font-bold text-gray-700">{selectedDetail?.directorName} — {formatDate(selectedDetail?.directorDate)}</p></div>
                    </div>
                  )}
               </div>
            </div>
            <Button onClick={() => setSelectedDetail(null)} fullWidth className="py-4 font-black bg-blue-600 text-white">Close Audit Ledger</Button>
         </div>
      </Modal>

      {/* APPROVAL MODAL (For Directors Only) */}
      <Modal isOpen={!!approvalTarget} onClose={() => setApprovalTarget(null)} title="Authorization Required">
         <div className="space-y-8 text-center p-4">
            <ShieldCheck size={80} className="mx-auto text-emerald-500" />
            <div className="space-y-2">
               <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Role Identification: {user?.role}</p>
               <p className="text-xl font-black text-gray-900">{userRole === 'assistant director' ? 'Forward to General Director' : 'Confirm Final Approval'}</p>
               <p className="text-sm text-gray-400 px-10">By clicking sign, you authorize the disbursement of <span className="font-black text-gray-700">TZS {formatCurrency(approvalTarget?.amount || 0)}</span> for {approvalTarget?.projectName}.</p>
            </div>
            <div className="flex gap-4 pt-6 border-t">
               <Button variant="ghost" onClick={() => handleProcessApproval(false)} className="w-1/3 py-4">Reject</Button>
               <Button onClick={() => handleProcessApproval(true)} className="flex-1 bg-emerald-600 text-white font-black py-4 shadow-xl shadow-emerald-100 transition-all active:scale-95">Sign & Commit</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default RequisitionsPage;