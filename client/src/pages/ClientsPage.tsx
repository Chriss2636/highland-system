import React, { useState, useMemo } from 'react';
import { useClientsApi, useProjectsApi, useInvoicesApi } from '../api/hooks';
import { Card, CardBody, Loading, Button, Modal, Badge } from '../components/common';
import { 
  Plus, Mail, Phone, Search, Edit2, Trash2, CheckCircle2, Link2, Download, MapPin, MessageSquare
} from 'lucide-react';
import { useSmsApi } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/permissions';
import { jsPDF } from 'jspdf';
import 'jspdf/dist/jspdf.umd.min.js';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../utils';


export default function ClientsPage() {
  const { getClients, createClient, updateClient, deleteClient } = useClientsApi();
  const { getProjects } = useProjectsApi();
  const { createInvoice } = useInvoicesApi();


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientToAssign, setClientToAssign] = useState<any>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 10 clients per page

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', type: 'buyer',
    address: '', city: '', state: '', zipCode: '',
    assignedProjectId: '', 
    selectedPlot: ''
  });

  // 1. FETCH DATA
  const { data: clientsData, isLoading } = getClients({ page: currentPage, limit: pageSize });
  const { data: projectsData } = getProjects({ page: 1, limit: 1000 });
  
  const clients = clientsData?.data || [];
  const { sendCustomSms } = useSmsApi();
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateClients = canCreate('clients');
  const canEditClients = canEdit('clients');
  const canDeleteClients = canDelete('clients');
  const isGeneralDirector = user?.role?.toLowerCase() === 'general director';
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [messageCategory, setMessageCategory] = useState('General');
  const [messageText, setMessageText] = useState('');
  const projects = projectsData?.data || [];

  // Map of sellerId -> total ownerValue across their projects
  const sellerOwnerTotals = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p: any) => {
      const details = typeof p.details === 'string' ? (() => { try { return JSON.parse(p.details); } catch { return p.details; } })() : p.details;
      const ownerVal = details?.ownerValue ? Number(details.ownerValue) : 0;
      if (p.sellerId) map[p.sellerId] = (map[p.sellerId] || 0) + ownerVal;
    });
    return map;
  }, [projects]);

  // 2. FILTER LOGIC (client-side filtering on current page)
  const filteredClients = useMemo(() => {
    return clients.filter((client: any) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  // Handle search term change - reset to page 1
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // 3. SQLITE SAFETY: Parse available plots from the selected project
  const availablePlots = useMemo(() => {
    const proj = projects.find((p: any) => p.id === formData.assignedProjectId);
    if (!proj) return [];

    // FIX: SQLite stores JSON as a string. We must parse it safely.
    let detailsObj = proj.details;
    if (typeof detailsObj === 'string') {
      try {
        detailsObj = JSON.parse(detailsObj);
      } catch (e) {
        console.error("JSON Parse Error", e);
        return [];
      }
    }
    return Array.isArray(detailsObj?.entries) ? detailsObj.entries : [];
  }, [formData.assignedProjectId, projects]);

  // 4. HANDLERS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      if (!canEditClients) {
        alert('You are not authorized to edit clients.');
        return;
      }
    } else if (!canCreateClients) {
      alert('You are not authorized to add clients.');
      return;
    }

    try {
      const clientPayload = {
        name: formData.name, 
        email: formData.email && formData.email.trim() ? formData.email : null, // Convert empty to null
        phone: formData.phone && formData.phone.trim() ? formData.phone : null, // Convert empty to null
        type: formData.type, 
        address: formData.address && formData.address.trim() ? formData.address : null,
        city: formData.city && formData.city.trim() ? formData.city : null,
        state: formData.state && formData.state.trim() ? formData.state : null,
        zipCode: formData.zipCode && formData.zipCode.trim() ? formData.zipCode : null
      };

      let newClient: any;
      if (editingId) {
        // Update existing client
        await updateClient.mutateAsync({ id: editingId, data: clientPayload });
        setEditingId(null);
      } else {
        // Create new client
        newClient = await createClient.mutateAsync(clientPayload);
      }

      // If buyer + project selected AND creating new client, auto-create assignment invoice
      if (!editingId && formData.type === 'buyer' && formData.assignedProjectId && formData.selectedPlot) {
        const plot = availablePlots.find((p: any) => p.plotNumber === formData.selectedPlot);
        if (plot) {
          const totalPrice = parseFloat(plot.sqm) * parseFloat(plot.pricePerSqm);
          await createInvoice.mutateAsync({
            clientId: newClient?.data?.id || newClient?.id,
            projectId: formData.assignedProjectId,
            amount: totalPrice,
            sqm: parseFloat(plot.sqm),
            plotInfo: `Initial Assignment: Plot ${plot.plotNumber}, Block ${plot.block}`,
            comments: 'Auto-assigned during registration'
          });
        }
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) { alert("Registration failed."); }
  };

  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assignedProjectId || !formData.selectedPlot) return;

    try {
      const plot = availablePlots.find((p: any) => p.plotNumber === formData.selectedPlot);
      await createInvoice.mutateAsync({
        clientId: clientToAssign.id,
        projectId: formData.assignedProjectId,
        amount: parseFloat(plot.sqm) * parseFloat(plot.pricePerSqm),
        sqm: parseFloat(plot.sqm),
        plotInfo: `Manual Assignment: Plot ${plot.plotNumber}, Block ${plot.block}`,
        comments: 'Assigned via System Directory'
      });
      setIsAssignModalOpen(false);
      setClientToAssign(null);
      resetForm();
    } catch (err) { alert("Assignment failed."); }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', type: 'buyer', address: '', city: '', state: '', zipCode: '', assignedProjectId: '', selectedPlot: '' });
    setEditingId(null);
  };

  // SELECTED CLIENT AGGREGATES (include Owner Manual Value for sellers)
  const selectedInvoicesTotal = selectedClientDetail?.invoices?.reduce((sum: number, inv: any) => sum + inv.amount, 0) || 0;
  const selectedTotalPaid = selectedClientDetail?.invoices?.reduce((sum: number, inv: any) => sum + (inv.receipts?.reduce((s: number, r: any) => s + r.amount, 0) || 0), 0) || 0;
  const selectedOwnerTotal = selectedClientDetail && selectedClientDetail.type === 'seller' ? (sellerOwnerTotals[selectedClientDetail.id] || 0) : 0;

  const downloadClientsCSV = async () => {
    if (!clients || clients.length === 0) {
      alert('No clients to download');
      return;
    }

    // Build an offscreen HTML table
    const headers = ['Name', 'Type', 'Email', 'Phone', 'City', 'Invoices', 'Status'];
    const rows = clients.map((client: any) => {
      const paid = client.invoices?.reduce((sum: number, inv: any) => sum + (inv.receipts?.reduce((s: number, r: any) => s + r.amount, 0) || 0), 0) || 0;
      const owed = client.invoices?.reduce((sum: number, inv: any) => sum + inv.amount, 0) || 0;
      const isSettled = owed > 0 && paid >= owed;
      const status = client.type === 'buyer' ? (client.invoices?.length > 0 ? (isSettled ? 'SETTLED' : 'ASSIGNED') : 'UNASSIGNED') : 'OWNER';
      return [client.name || '', client.type === 'buyer' ? 'Buyer' : 'Seller', client.email || 'N/A', client.phone || 'N/A', client.city || 'N/A', (client.invoices?.length || 0).toString(), status];
    });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#fff';
    container.style.padding = '16px';

    const title = document.createElement('h2');
    title.innerText = 'SYSTEM DIRECTORY - CLIENT LIST';
    title.style.textAlign = 'center';
    container.appendChild(title);

    const date = document.createElement('div');
    date.innerText = `Generated: ${new Date().toLocaleDateString()}`;
    date.style.textAlign = 'center';
    date.style.fontSize = '12px';
    date.style.marginBottom = '8px';
    container.appendChild(date);

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.fontSize = '12px';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      th.innerText = h;
      th.style.border = '1px solid #ddd';
      th.style.padding = '6px';
      th.style.background = '#3b82f6';
      th.style.color = '#fff';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((r: any[]) => {
      const tr = document.createElement('tr');
      r.forEach((cell: any) => {
        const td = document.createElement('td');
        td.innerText = String(cell);
        td.style.border = '1px solid #eee';
        td.style.padding = '6px';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const imgProps = (doc as any).getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      doc.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      doc.save(`Clients_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Failed to generate PDF');
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleEdit = (client: any) => {
    if (!canEditClients) return;
    setEditingId(client.id);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      type: client.type,
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zipCode: client.zipCode || '',
      assignedProjectId: '',
      selectedPlot: ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 min-h-screen text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm no-print">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Directory</h1>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-60">Highland Management Hub</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={downloadClientsCSV}
            className="bg-emerald-600 px-8 py-6 rounded-2xl text-white font-bold shadow-xl shadow-emerald-100 transition-all hover:-translate-y-1"
          >
            <Download size={20} className="mr-2" /> Download
          </Button>
          {isGeneralDirector && (
            <Button 
              onClick={() => {
                const count = Object.keys(selectedIds).filter(k=>selectedIds[k]).length;
                if (count === 0) { alert('Select at least one client to message'); return; }
                setIsMessageModalOpen(true);
              }} className="bg-blue-600 px-6 py-4 rounded-2xl text-white font-bold shadow-xl shadow-blue-100 transition-all hover:-translate-y-1">
              <MessageSquare size={18} className="mr-2" /> Message Selected
            </Button>
          )}
          {canCreateClients && (
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 px-8 py-6 rounded-2xl text-white font-bold shadow-xl shadow-blue-100 transition-all hover:-translate-y-1">
              <Plus size={20} className="mr-2" /> New Registration
            </Button>
          )}
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          placeholder="Search by name or email..."
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl shadow-sm outline-none transition-all font-bold"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <Card>
        <CardBody>
          {isLoading ? <Loading /> : (
            <div className="overflow-x-auto -mx-6">
              <table className="min-w-[900px] md:w-full text-left border-separate border-spacing-y-3 px-6">
                <thead>
                  <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[2px]">
                    <th className="px-4">
                      <input type="checkbox" onChange={(e)=>{
                        const checked = e.target.checked;
                        const newSel: Record<string, boolean> = {};
                        clients.forEach((c:any)=> newSel[c.id] = checked);
                        setSelectedIds(newSel);
                      }} checked={clients.length>0 && clients.every((c:any)=>selectedIds[c.id])} />
                    </th>
                    <th className="px-6">Profile</th>
                    <th className="px-6">Contact</th>
                    <th className="px-6">Ledger Status</th>
                    <th className="px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {filteredClients.map((client: any) => {
                    // Calculation for settled status
                    const paid = client.invoices?.reduce((sum: number, inv: any) => sum + (inv.receipts?.reduce((s: number, r: any) => s + r.amount, 0) || 0), 0) || 0;
                    const owed = client.invoices?.reduce((sum: number, inv: any) => sum + inv.amount, 0) || 0;
                    const isSettled = owed > 0 && paid >= owed;

                      return (
                      <tr key={client.id} onDoubleClick={() => setSelectedClientDetail(client)} className="group hover:translate-x-1 transition-all duration-300 cursor-pointer">
                        <td className="px-6 py-5 bg-white first:rounded-l-2xl border-y border-l border-gray-100">
                          <div className="flex items-center space-x-4">
                            <div className="mr-2"><input type="checkbox" checked={!!selectedIds[client.id]} onChange={(e)=>{
                                setSelectedIds(prev => ({ ...prev, [client.id]: e.target.checked }));
                            }} /></div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 text-base">{client.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={client.type === 'buyer' ? 'info' : 'success'}>{client.type}</Badge>
                                {client.type === 'seller' && sellerOwnerTotals[client.id] !== undefined && (
                                  <div className="text-xs text-gray-500 font-bold">Owner Value: TZS {formatCurrency(sellerOwnerTotals[client.id] || 0)}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 bg-white border-y border-gray-100">
                          <div className="text-sm font-bold text-gray-700 flex items-center"><Mail className="w-3.5 h-3.5 mr-2 text-blue-500" /> {client.email}</div>
                          <div className="text-[10px] text-gray-400 font-bold flex items-center mt-1 uppercase"><Phone className="w-3.5 h-3.5 mr-2" /> {client.phone || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-5 bg-white border-y border-gray-100">
                          {client.type === 'buyer' ? (
                            client.invoices?.length > 0 ? (
                              <div className={`flex items-center text-xs font-black uppercase tracking-tighter ${isSettled ? 'text-emerald-600' : 'text-blue-500'}`}>
                                <CheckCircle2 size={14} className="mr-1"/> {isSettled ? 'SETTLED' : 'ASSIGNED'}
                              </div>
                            ) : (
                              <button 
                                onClick={() => { setClientToAssign(client); setIsAssignModalOpen(true); }}
                                className="flex items-center text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                              >
                                <Link2 size={12} className="mr-1"/> Link Project
                              </button>
                            )
                          ) : (
                            <div className="text-gray-300 text-[10px] font-black uppercase tracking-widest">Inventory Owner</div>
                          )}
                        </td>
                        <td className="px-6 py-5 bg-white last:rounded-r-2xl border-y border-r border-gray-100 text-right">
                          <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {client.invoices?.some((inv: any) => inv.projectId) && (
                              <button onClick={() => window.location.href = `/projects?projectId=${client.invoices.find((inv: any) => inv.projectId).projectId}`} className="p-3 text-slate-700 bg-white border rounded-xl" title="Open project ledger"><MapPin size={18}/></button>
                            )}
                            {canEditClients && (
                            <button onClick={() => handleEdit(client)} className="p-3 text-gray-400 hover:text-blue-600 bg-white border rounded-xl"><Edit2 size={18}/></button>
                          )}
                          {canDeleteClients && (
                            <button onClick={() => deleteClient.mutate(client.id)} className="p-3 text-rose-500 bg-white border rounded-xl"><Trash2 size={18}/></button>
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

      {/* PAGINATION CONTROLS */}
      {clientsData?.pages && clientsData.pages > 1 && (
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-600 font-bold">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, clientsData.total)} of {clientsData.total} clients
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              {Array.from({ length: clientsData.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded flex items-center justify-center font-bold transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(Math.min(clientsData.pages, currentPage + 1))}
              disabled={currentPage === clientsData.pages}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={!!selectedClientDetail} onClose={() => setSelectedClientDetail(null)} title="Client Full Detail">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-2xl font-black">{selectedClientDetail?.name}</h3>
              <p className="text-sm text-gray-500">{selectedClientDetail?.email || 'No email available'}</p>
              <p className="text-sm text-gray-500">{selectedClientDetail?.phone || 'No phone available'}</p>
              <p className="text-sm text-gray-500">{selectedClientDetail?.address || 'No address provided'}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant={selectedClientDetail?.type === 'buyer' ? 'info' : 'success'}>{selectedClientDetail?.type || 'Unknown'}</Badge>
                <Badge variant="success">{selectedClientDetail?.invoices?.length || 0} invoices</Badge>
                <Badge variant="info">{selectedClientDetail?.invoices?.reduce((sum: number, inv: any) => sum + (inv.receipts?.length || 0), 0) || 0} receipts</Badge>
              </div>
              {selectedClientDetail?.type === 'seller' && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-2">Owned Projects:</p>
                  <div className="flex flex-col gap-2">
                    {projects.filter((p: any) => p.sellerId === selectedClientDetail.id).map((proj: any) => {
                      const details = typeof proj.details === 'string' ? (() => { try { return JSON.parse(proj.details); } catch { return proj.details; } })() : proj.details;
                      const ownerVal = details?.ownerValue ? Number(details.ownerValue) : 0;
                      return (
                        <div key={proj.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                          <div className="font-bold">{proj.location}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-600">Owner Value: TZS {formatCurrency(ownerVal)}</div>
                            <button onClick={() => window.location.href = `/projects?projectId=${proj.id}`} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold">Open <MapPin size={12} className="inline-block ml-1"/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedClientDetail?.invoices?.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-2">Assigned Projects:</p>
                  <div className="flex flex-wrap gap-2">
                    {[...new Map(selectedClientDetail.invoices.filter((inv: any) => inv.projectId).map((inv: any) => [inv.projectId, inv.project?.location || `Project ${inv.projectId}`]))].map(([pid, loc]: any) => (
                      <button key={pid} onClick={() => window.location.href = `/projects?projectId=${pid}`} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-bold hover:bg-slate-200">{loc} <MapPin size={12} className="inline-block ml-2"/></button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6">
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black mb-3">
                <span>Total Owed</span>
                <span>TZS {formatCurrency(selectedInvoicesTotal + selectedOwnerTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black mb-3">
                <span>Total Paid</span>
                <span>TZS {formatCurrency(selectedTotalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black">
                <span>Balance</span>
                <span>TZS {formatCurrency((selectedInvoicesTotal + selectedOwnerTotal) - selectedTotalPaid)}</span>
              </div>
            </div>
          </div>

          {selectedClientDetail?.invoices?.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-lg font-black">Invoices</h4>
              <div className="space-y-3">
                {selectedClientDetail.invoices.map((inv: any) => {
                  const paid = inv.receipts?.reduce((s: number, r: any) => s + r.amount, 0) || 0;
                  return (
                    <div key={inv.id} className="rounded-3xl border border-gray-100 bg-white p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-black uppercase text-xs text-slate-400">{inv.invoiceNo}</p>
                          <p className="font-bold text-gray-900">TZS {formatCurrency(inv.amount)} total</p>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                          <p>TZS {formatCurrency(paid)} paid</p>
                          <p>TZS {formatCurrency(Math.max(0, inv.amount - paid))} due</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{inv.plotInfo || inv.comments || 'No invoice notes available.'}</p>
                      {inv.projectId && (
                        <div className="mt-3 text-right">
                          <button onClick={() => window.location.href = `/projects?projectId=${inv.projectId}`} className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold">View Project <MapPin size={12} className="inline-block ml-2"/></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              This client has no invoice activity to show yet.
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: MESSAGE SELECTED */}
      <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title="Send Message to Selected">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Sending to {Object.keys(selectedIds).filter(k=>selectedIds[k]).length} selected clients.</p>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Category</label>
            <select className="w-full border-2 border-gray-100 p-4 rounded-xl bg-white outline-none" value={messageCategory} onChange={e=>setMessageCategory(e.target.value)}>
              <option>General</option>
              <option>Boost Adds</option>
              <option>Tenting to Offices</option>
              <option>Flying</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Message</label>
            <textarea className="w-full border-2 border-gray-100 p-4 rounded-xl min-h-[120px]" value={messageText} onChange={e=>setMessageText(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsMessageModalOpen(false)} className="px-6">Cancel</Button>
            <Button onClick={async () => {
              const recipients = Object.keys(selectedIds).filter(k=>selectedIds[k]).map(id => {
                const c = clients.find((x:any)=>x.id===id);
                return { name: c?.name || '', phone: c?.phone || '', location: [c?.city, c?.state, c?.address].filter(Boolean).join(', ') };
              });
              if (!messageText.trim()) { alert('Enter a message'); return; }
              try {
                await sendCustomSms.mutateAsync({ recipients, category: messageCategory, message: messageText });
                alert(`Sent to ${recipients.length} clients`);
                setIsMessageModalOpen(false);
                setMessageText('');
                setSelectedIds({});
              } catch (err:any) { alert('Failed to send message'); }
            }} className="bg-emerald-600 text-white px-6 py-3">Send</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: REGISTRATION */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "Edit Client" : "System Registration"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-left">
            <div className="md:col-span-2 space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
               <input type="text" required className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-blue-500 outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
               <input type="email" className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none" onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label>
               <input type="text" className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none" onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Category</label>
              <select className="w-full border-2 border-gray-100 p-4 rounded-xl bg-white font-bold" onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="buyer">Buyer (Acquiring Plots)</option>
                <option value="seller">Seller (Inventory Owner)</option>
              </select>
            </div>

            {/* INTEGRATED PROJECT ASSIGNMENT */}
            {formData.type === 'buyer' && projects.length > 0 && (
               <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-[2rem] border-2 border-dashed border-blue-100 space-y-4">
                  <p className="text-[10px] font-black text-blue-400 uppercase text-center tracking-widest leading-none">Optional: Initial Project Assignment</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select className="w-full border-2 border-white p-3 rounded-xl outline-none font-bold" 
                            value={formData.assignedProjectId}
                            onChange={e => setFormData({...formData, assignedProjectId: e.target.value})}>
                        <option value="">Select Project...</option>
                        {projects.map((p: any) => <option key={p.id} value={p.id}>{p.location}</option>)}
                    </select>
                    <select className="w-full border-2 border-white p-3 rounded-xl outline-none font-bold" 
                            disabled={!formData.assignedProjectId}
                            value={formData.selectedPlot}
                            onChange={e => setFormData({...formData, selectedPlot: e.target.value})}>
                        <option value="">Choose Plot...</option>
                        {availablePlots.map((plt: any) => (
                           <option key={plt.plotNumber} value={plt.plotNumber}>Plot {plt.plotNumber} ({plt.sqm} SQM)</option>
                        ))}
                    </select>
                  </div>
               </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-8">Discard</Button>
            <Button type="submit" className="bg-blue-600 px-12 py-4 text-white font-black shadow-lg shadow-blue-100 rounded-xl">Complete Registration</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN LATER */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Project Map">
        <form onSubmit={handleQuickAssign} className="space-y-6 text-left py-2">
           <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">{clientToAssign?.name?.charAt(0)}</div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase">Selected Client</p><p className="font-black text-gray-900">{clientToAssign?.name}</p></div>
           </div>
           <div className="space-y-4">
              <select className="w-full border-2 border-gray-100 p-4 rounded-xl bg-white font-bold" required onChange={e => setFormData({...formData, assignedProjectId: e.target.value})}>
                  <option value="">Project Location...</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.location}</option>)}
              </select>
              <select className="w-full border-2 border-gray-100 p-4 rounded-xl bg-white font-bold" required disabled={!formData.assignedProjectId} onChange={e => setFormData({...formData, selectedPlot: e.target.value})}>
                  <option value="">Select Available Plot...</option>
                  {availablePlots.map((plt: any) => (
                    <option key={plt.plotNumber} value={plt.plotNumber}>Plot {plt.plotNumber} — {plt.sqm} SQM</option>
                  ))}
              </select>
           </div>
           <Button type="submit" fullWidth className="bg-blue-600 py-4 font-black text-white rounded-xl shadow-lg shadow-blue-100 mt-4">Assign Plot & Create Sale Record</Button>
        </form>
      </Modal>
    </div>
  );
};

