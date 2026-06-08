import React, { useState, useMemo } from 'react';
import { useLeadsApi, useSettingsApi } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/permissions';
import { Card, CardBody, Loading, Button, Badge, Modal } from '../components/common';
import { Plus, Trash2, Edit2, Search, Eye, Download, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useSmsApi } from '../api/hooks';
import jsPDF from 'jspdf';

const LeadsPage = () => {
  const { getLeads, createLead, updateLead, deleteLead } = useLeadsApi();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const [form, setForm] = useState({
    fullName: '',
    phone: '+255',
    presentLocation: '',
    dateToVisit: '',
    numSitesToVisit: 1,
    locationToVisit: '',
    alreadyVisited: false,
    visitedSitesCount: 0
  });

  const { user } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateLeads = canCreate('leads');
  const canEditLeads = canEdit('leads');
  const canDeleteLeads = canDelete('leads');
  const canMessageLeads = ['general director', 'admin'].includes(user?.role?.toLowerCase() || '');
  const { getSettings } = useSettingsApi();
  const { data: settings } = getSettings();
  const { data: leadData, isLoading } = getLeads();
  const leads = leadData?.data || [];

  const regionOptions = [
    'Dar-Es-Salaam',
    'Dodoma',
    'Arusha',
    'Singida',
    'Manyara',
    'Iringa',
    'Tabora',
    'Njombe',
    'Ruvuma',
    'Mbeya',
    'Mwanza',
    'Moshi',
    'Kigoma',
    'Kagera',
    'Shinyanga',
    'Simiyu',
    'Geita',
    'Katavi',
    'Rukwa',
    'Lindi',
    'Mtwara',
  ];
  const [sortField, setSortField] = useState<'createdAt' | 'fullName' | 'createdByName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [staffFilter, setStaffFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageCategory, setMessageCategory] = useState('General');
  const [messageText, setMessageText] = useState('');
  const { sendCustomSms } = useSmsApi();

  const staffOptions = useMemo<string[]>(() => {
    const uniqueStaff = new Set<string>();
    leads.forEach((lead: any) => uniqueStaff.add(String(lead.createdByName || 'Unknown')));
    return ['All', ...uniqueStaff];
  }, [leads]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const downloadMyLeadsPdf = () => {
    if (!user) {
      alert('Unable to generate PDF: user session not found.');
      return;
    }

    const myLeads = visibleLeads.filter((lead: any) => lead.createdById === user.id);
    if (myLeads.length === 0) {
      alert('No leads found for your account.');
      return;
    }

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const companyName = settings?.name || 'Highland Property Company Limited';
    const companyAddress = settings?.address ? `${settings.address}` : '';
    const companyPhone = settings?.phone ? `Phone: ${settings.phone}` : '';
    const companyTin = settings?.tin ? `TIN: ${settings.tin}` : '';
    const headerTitle = 'Lead Report';
    const generatedDate = `Generated: ${new Date().toLocaleString()}`;
    const preparedBy = `Prepared for: ${user.name}`;
    const companyLogo = settings?.logoUrl;

    const columns = [
      { title: 'Lead', width: 120 },
      { title: 'Phone', width: 80 },
      { title: 'Staff', width: 100 },
      { title: 'Current Location', width: 120 },
      { title: 'Location to visit', width: 120 },
      { title: 'Visit Date', width: 80 },
      { title: 'Sites', width: 50 },
      { title: 'Status', width: 80 }
    ];

    const headerHeight = 80;
    const rowHeight = 28;
    const textPadding = 6;
    let y = margin;

    const renderHeader = () => {
      const logoSize = 56;
      if (companyLogo) {
        try {
          const imageType = companyLogo.startsWith('data:image/jpeg') || companyLogo.startsWith('data:image/jpg')
            ? 'JPEG'
            : 'PNG';
          pdf.addImage(companyLogo, imageType, margin, y, logoSize, logoSize);
        } catch (error) {
          // If the logo data cannot be added, continue without breaking the PDF.
        }
      }

      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(companyName, margin + (companyLogo ? logoSize + 16 : 0), y + 18);
      if (companyAddress) pdf.text(companyAddress, margin + (companyLogo ? logoSize + 16 : 0), y + 32);
      if (companyPhone) pdf.text(companyPhone, margin + (companyLogo ? logoSize + 16 : 0), y + 46);
      if (companyTin) pdf.text(companyTin, margin + (companyLogo ? logoSize + 16 : 0), y + 60);

      pdf.setFontSize(22);
      pdf.setTextColor(15, 23, 42);
      pdf.text(headerTitle, pageWidth - margin - pdf.getTextWidth(headerTitle), y + 20);

      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(preparedBy, pageWidth - margin - pdf.getTextWidth(preparedBy), y + 36);
      pdf.text(generatedDate, pageWidth - margin - pdf.getTextWidth(generatedDate), y + 50);

      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.75);
      pdf.line(margin, y + 72, pageWidth - margin, y + 72);
      y += headerHeight;
    };

    const renderTableHeader = () => {
      pdf.setFillColor(15, 23, 42);
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');

      let x = margin + textPadding;
      columns.forEach((column) => {
        pdf.text(column.title, x, y + 18);
        x += column.width;
      });

      pdf.setDrawColor(255, 255, 255);
      x = margin;
      columns.forEach((column) => {
        pdf.line(x + column.width, y, x + column.width, y + rowHeight);
        x += column.width;
      });
      y += rowHeight;
    };

    const renderRow = (lead: any) => {
      const rowData = [
        lead.fullName,
        lead.phone,
        lead.createdByName || 'Unknown',
        lead.presentLocation,
        lead.locationToVisit || 'Not Confirmed Yet',
        new Date(lead.dateToVisit).toLocaleDateString(),
        String(lead.numSitesToVisit),
        lead.alreadyVisited ? `Visited ${lead.visitedSitesCount}` : 'Not visited'
      ];

      const cellLines = rowData.map((text, index) =>
        pdf.splitTextToSize(String(text), columns[index].width - textPadding * 2)
      );
      const maxLines = Math.max(...cellLines.map((lines) => lines.length));
      const rowBoxHeight = Math.max(rowHeight, maxLines * 12 + textPadding * 2);

      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, pageWidth - margin * 2, rowBoxHeight, 'F');
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(margin, y, pageWidth - margin * 2, rowBoxHeight);

      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'normal');
      let x = margin + textPadding;

      cellLines.forEach((lines, index) => {
        lines.forEach((line: string, lineIndex: number) => {
          pdf.text(line, x, y + textPadding + 12 + lineIndex * 12);
        });
        x += columns[index].width;
      });

      y += rowBoxHeight;
    };

    const newPage = () => {
      pdf.addPage();
      y = margin;
      renderHeader();
      renderTableHeader();
    };

    renderHeader();
    renderTableHeader();

    myLeads.forEach((lead: any) => {
      const estimatedHeight = rowHeight;
      if (y + estimatedHeight > pageHeight - margin) {
        newPage();
      }
      renderRow(lead);
    });

    const filename = `highland_leads_${user.name.replace(/\s+/g, '_').toLowerCase()}.pdf`;
    pdf.save(filename);
  };

  const openForm = () => {
    setEditingId(null);
    setForm({
      fullName: '',
      phone: '+255',
      presentLocation: '',
      dateToVisit: '',
      numSitesToVisit: 1,
      locationToVisit: '',
      alreadyVisited: false,
      visitedSitesCount: 0
    });
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setSelectedLead(null);
  };

  const handleEdit = (lead: any) => {
    if (!canEditLeads) return;
    setEditingId(lead.id);
    setForm({
      fullName: lead.fullName,
      phone: lead.phone,
      presentLocation: lead.presentLocation,
      dateToVisit: lead.dateToVisit?.split('T')[0] || '',
      numSitesToVisit: lead.numSitesToVisit,
      locationToVisit: lead.locationToVisit,
      alreadyVisited: lead.alreadyVisited,
      visitedSitesCount: lead.visitedSitesCount || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editingId) {
      if (!canEditLeads) {
        alert('You are not authorized to edit leads.');
        return;
      }
    } else if (!canCreateLeads) {
      alert('You are not authorized to add leads.');
      return;
    }

    if (!form.fullName.trim()) {
      alert('Full name is required.');
      return;
    }
    if (!form.phone.trim()) {
      alert('Phone number is required.');
      return;
    }
    if (!form.presentLocation.trim()) {
      alert('Present location is required.');
      return;
    }
    if (!form.dateToVisit) {
      alert('Date to visit site is required.');
      return;
    }

    const payload = {
      ...form,
      numSitesToVisit: Number(form.numSitesToVisit),
      visitedSitesCount: form.alreadyVisited ? Number(form.visitedSitesCount || 0) : 0
    };

    try {
      if (editingId) {
        await updateLead.mutateAsync({ id: editingId, data: payload });
      } else {
        await createLead.mutateAsync(payload);
      }
      closeForm();
    } catch (error: any) {
      // Surface server error details when available to aid debugging
      const serverMsg = error?.response?.data?.error || error?.response?.data || error?.message || 'Unknown error';
      console.error('Lead save failed:', error, 'serverResponse=', error?.response?.data);
      alert(`Failed to save the lead: ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`);
    }
  };

  const visibleLeads = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = leads.filter((lead: any) => {
      const matchesSearch =
        lead.fullName.toLowerCase().includes(normalizedSearch) ||
        lead.phone.includes(normalizedSearch) ||
        lead.presentLocation.toLowerCase().includes(normalizedSearch) ||
        String(lead.locationToVisit || '').toLowerCase().includes(normalizedSearch) ||
        (lead.createdByName || 'Unknown').toLowerCase().includes(normalizedSearch);

      const matchesStaff =
        staffFilter === 'All' || (lead.createdByName || 'Unknown') === staffFilter;

      return matchesSearch && matchesStaff;
    });

    return filtered.sort((a: any, b: any) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      const aValue = sortField === 'createdAt'
        ? new Date(a.createdAt).getTime()
        : String(a[sortField] || '').toLowerCase();
      const bValue = sortField === 'createdAt'
        ? new Date(b.createdAt).getTime()
        : String(b[sortField] || '').toLowerCase();

      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });
  }, [leads, searchTerm, staffFilter, sortField, sortOrder]);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm no-print">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Boosted Social Media Leads</h1>
          <p className="text-gray-500 mt-2 uppercase text-[10px] font-black tracking-widest opacity-70">
            Capture new lead details from boosted social campaigns and site visit bookings.
          </p>
        </div>
        <div className="flex gap-3">
          {canMessageLeads && (
            <Button onClick={() => {
              const count = Object.keys(selectedIds).filter(k=>selectedIds[k]).length;
              if (count === 0) { alert('Select at least one lead to message'); return; }
              setIsMessageModalOpen(true);
            }} className="bg-blue-600 px-6 py-4 rounded-2xl text-white font-bold shadow-xl shadow-blue-100">
              <MessageSquare size={18} className="mr-2" /> Message Selected
            </Button>
          )}
          {canCreateLeads && (
            <Button
              onClick={openForm}
              className="bg-blue-600 px-8 py-6 rounded-2xl text-white font-bold shadow-xl shadow-blue-100"
            >
              <Plus size={20} className="mr-2" /> New Lead
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-md no-print">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          placeholder="Search by name, phone, location, or staff..."
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl shadow-sm outline-none font-bold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 w-full">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">Sort by</span>
            <select
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as 'createdAt' | 'fullName' | 'createdByName')}
            >
              <option value="createdAt">Date added</option>
              <option value="fullName">Lead name</option>
              <option value="createdByName">Staff name</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">Order</span>
            <button
              type="button"
              onClick={toggleSortOrder}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-left flex items-center justify-between"
            >
              <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
              {sortOrder === 'asc' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">Staff</span>
            <select
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
            >
              {staffOptions.map((staff) => (
                <option key={staff} value={staff}>{staff}</option>
              ))}
            </select>
          </label>
        </div>

        <Button
          onClick={downloadMyLeadsPdf}
          className="self-start bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl shadow-slate-200"
        >
          <Download size={18} className="mr-2" /> Download my leads
        </Button>
      </div>

      <Card>
        <CardBody>
          {isLoading ? (
            <Loading />
          ) : visibleLeads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Eye size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">No leads have been captured yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-8">
                    <th className="px-4 py-3"><input type="checkbox" onChange={(e)=>{
                      const checked = e.target.checked;
                      const newSel: Record<string, boolean> = {};
                      visibleLeads.forEach((l:any)=> newSel[l.id] = checked);
                      setSelectedIds(newSel);
                    }} checked={visibleLeads.length>0 && visibleLeads.every((l:any)=>selectedIds[l.id])} /></th>
                    <th className="px-8 py-3">Lead</th>
                    <th className="px-8 py-3">Phone</th>
                    <th className="px-8 py-3">Staff</th>
                    <th className="px-8 py-3">Current Location</th>
                    <th className="px-8 py-3">Visit Date</th>
                    <th className="px-8 py-3">Sites</th>
                    <th className="px-8 py-3">Status</th>
                    <th className="px-8 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {visibleLeads.map((lead: any) => (
                    <tr key={lead.id} className="group hover:translate-x-1 transition-all duration-300">
                      <td className="px-8 py-5 bg-white first:rounded-l-2xl border-y border-l border-gray-100">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={!!selectedIds[lead.id]} onChange={(e)=> setSelectedIds(prev => ({ ...prev, [lead.id]: e.target.checked }))} />
                          <div>
                            <div className="font-black text-slate-900">{lead.fullName}</div>
                            <div className="text-[10px] text-gray-500 uppercase">{lead.locationToVisit || 'Not Confirmed Yet'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 bg-white border-y border-gray-100 font-mono">{lead.phone}</td>
                      <td className="px-8 py-5 bg-white border-y border-gray-100">{lead.createdByName || 'Unknown'}</td>
                      <td className="px-8 py-5 bg-white border-y border-gray-100">{lead.presentLocation}</td>
                      <td className="px-8 py-5 bg-white border-y border-gray-100">{new Date(lead.dateToVisit).toLocaleDateString()}</td>
                      <td className="px-8 py-5 bg-white border-y border-gray-100">
                        {lead.numSitesToVisit} site{lead.numSitesToVisit === 1 ? '' : 's'}
                      </td>
                      <td className="px-8 py-5 bg-white border-y border-gray-100">
                        <Badge variant={lead.alreadyVisited ? 'success' : 'secondary'}>
                          {lead.alreadyVisited ? `Visited ${lead.visitedSitesCount}` : 'Not visited'}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 bg-white last:rounded-r-2xl border-y border-r border-gray-100 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-3 text-slate-700 bg-white border border-gray-100 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
                          >
                            <Eye size={18} />
                          </button>
                          {canEditLeads && (
                            <button
                              onClick={() => handleEdit(lead)}
                              className="p-3 text-amber-500 bg-white border border-gray-100 rounded-xl hover:bg-amber-50 shadow-sm transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          {canDeleteLeads && (
                            <button
                              onClick={() => deleteLead.mutate(lead.id)}
                              className="p-3 text-rose-500 bg-white border border-gray-100 rounded-xl hover:bg-rose-50 shadow-sm transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
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

      {/* MODAL: MESSAGE SELECTED */}
      <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title="Send Message to Selected Leads">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Sending to {Object.keys(selectedIds).filter(k=>selectedIds[k]).length} selected leads.</p>
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
            <Button onClick={async ()=>{
              const recipients = Object.keys(selectedIds).filter(k=>selectedIds[k]).map(id=>{
                const l = visibleLeads.find((x:any)=>x.id===id);
                return { name: l?.fullName || '', phone: l?.phone || '', location: l?.presentLocation || '' };
              });
              if (!messageText.trim()) { alert('Enter a message'); return; }
              try {
                await sendCustomSms.mutateAsync({ recipients, category: messageCategory, message: messageText });
                alert(`Sent to ${recipients.length} leads`);
                setIsMessageModalOpen(false);
                setMessageText('');
                setSelectedIds({});
              } catch (err:any) { alert('Failed to send message'); }
            }} className="bg-emerald-600 text-white px-6 py-3">Send</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeForm}
        title={editingId ? 'Edit Boosted Lead' : 'New Boosted Lead'}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-gray-700">Full name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Lead name"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-gray-700">Phone number</span>
              <input
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+255700123456"
                required
              />
            </label>

            <label className="block md:col-span-1">
              <span className="text-sm font-black text-gray-700">Present location</span>
              <select
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
                value={form.presentLocation}
                onChange={(e) => setForm({ ...form, presentLocation: e.target.value })}
                required
              >
                <option value="">Select present location</option>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-1">
              <span className="text-sm font-black text-gray-700">Location to visit</span>
              <input
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
                value={form.locationToVisit}
                onChange={(e) => setForm({ ...form, locationToVisit: e.target.value })}
                placeholder="Type location to visit or leave blank"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-gray-700">Date to visit site</span>
              <input
                type="date"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
                value={form.dateToVisit}
                onChange={(e) => setForm({ ...form, dateToVisit: e.target.value })}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-gray-700">Number of sites to visit</span>
              <input
                type="number"
                min={1}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
                value={form.numSitesToVisit}
                onChange={(e) => setForm({ ...form, numSitesToVisit: Number(e.target.value) })}
                required
              />
            </label>

            <label className="flex items-center gap-3 mt-2 md:col-span-2">
              <input
                type="checkbox"
                checked={form.alreadyVisited}
                onChange={(e) => setForm({ ...form, alreadyVisited: e.target.checked, visitedSitesCount: e.target.checked ? form.visitedSitesCount : 0 })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-black text-gray-700">Already visited before?</span>
            </label>

            {form.alreadyVisited && (
              <label className="block md:col-span-2">
                <span className="text-sm font-black text-gray-700">Number of sites already visited</span>
                <input
                  type="number"
                  min={0}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"
                  value={form.visitedSitesCount}
                  onChange={(e) => setForm({ ...form, visitedSitesCount: Number(e.target.value) })}
                  required={form.alreadyVisited}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={closeForm} className="px-6 py-3 rounded-2xl">
              Cancel
            </Button>
            <Button type="submit" className="px-6 py-3 rounded-2xl bg-blue-600 text-white">
              {editingId ? 'Update Lead' : 'Save Lead'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} title="Lead details">
        {selectedLead ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-black">Lead</p>
                <p className="mt-2 font-bold text-slate-900">{selectedLead.fullName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-black">Phone</p>
                <p className="mt-2 font-mono text-slate-900">{selectedLead.phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-black">Staff</p>
                <p className="mt-2 text-slate-900">{selectedLead.createdByName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-black">Current location</p>
                <p className="mt-2 text-slate-900">{selectedLead.presentLocation}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-black">Target visit</p>
                <p className="mt-2 text-slate-900">{new Date(selectedLead.dateToVisit).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-black">Sites planned</p>
                <p className="mt-2 text-slate-900">{selectedLead.numSitesToVisit}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-black">Location to visit</p>
                <p className="mt-2 text-slate-900">{selectedLead.locationToVisit || 'Not Confirmed Yet'}</p>
              </div>
            </div>
            <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-black">Previous visit status</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={selectedLead.alreadyVisited ? 'success' : 'secondary'}>
                  {selectedLead.alreadyVisited ? 'Visited before' : 'Not visited yet'}
                </Badge>
                {selectedLead.alreadyVisited && (
                  <span className="text-sm text-slate-700">Visited {selectedLead.visitedSitesCount} site{selectedLead.visitedSitesCount === 1 ? '' : 's'}</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default LeadsPage;
