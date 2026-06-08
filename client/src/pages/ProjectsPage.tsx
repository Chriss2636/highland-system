import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProjectsApi, useClientsApi, useInvoicesApi, useReceiptsApi } from '../api/hooks';
import { usePermissions } from '../hooks/permissions';
import { Card, CardBody, Button, Badge, Modal } from '../components/common';
import {
  Plus,
  Trash2,
  CheckCircle,
  ImageIcon,
  MapPin,
  Users,
  X,
  Edit3,
  Camera,
  Maximize2,
  UserCheck,
  CalendarClock,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency, maskTZS, cleanTZS } from '../utils';

const ProjectsPage: React.FC = () => {
  const { getProjects, createProject, updateProject, deleteProject } = useProjectsApi();
  const { getClients } = useClientsApi();
  const { getInvoices } = useInvoicesApi();
  const { getReceipts } = useReceiptsApi();

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [stage, setStage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingMap, setViewingMap] = useState<string | null>(null);
  const [quickAttachId, setQuickAttachId] = useState<string | null>(null);
  const [selectedFullProject, setSelectedFullProject] = useState<any>(null);
  const [companyValueMode, setCompanyValueMode] = useState<'cash' | 'installment'>('cash');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);

  const [mapPreview, setMapPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ location: '', description: '', sellerId: '', plots: [] as any[] });
  const [tempPlot, setTempPlot] = useState({ plotNumber: '', block: '', sqm: '', pricePerSqm: '', installmentSqm: '', ownerValue: '' });
  const [startingPercentage, setStartingPercentage] = useState('20');

  const { data: projData } = getProjects({ page: currentPage, limit: pageSize });
  const { data: clientsData } = getClients({ page: 1, limit: 1000 });
  const { data: invData } = getInvoices({});
  const { data: receiptsData } = getReceipts({});
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateProjects = canCreate('projects');
  const canEditProjects = canEdit('projects');
  const canDeleteProjects = canDelete('projects');

  const sellersOnly = useMemo(() => clientsData?.data?.filter((c: any) => c.type === 'seller') || [], [clientsData]);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('projectId');
    if (pid && projData?.data) {
      const project = projData.data.find((p: any) => p.id === pid);
      if (project) {
        handleOrodha(project);
        // remove query param to avoid re-opening
        params.delete('projectId');
        navigate({ pathname: '/projects', search: params.toString() }, { replace: true });
      }
    }
  }, [location.search, projData]);

  const handleOrodha = (project: any) => {
    const parsedDetails = typeof project.details === 'string' ? JSON.parse(project.details) : project.details;
    const rawPlots = parsedDetails.entries;
    const inventoryReport = rawPlots.map((p: any) => {
      const sale = invData?.data.find((inv: any) => {
        if (inv.projectId !== project.id) return false;
        const plotInfo = inv.plotInfo?.toLowerCase() || '';
        const plotNumber = p.plotNumber?.toString().toLowerCase() || '';
        const block = p.block?.toString().toLowerCase() || '';
        if (!plotNumber) return false;
        const numberMatch = plotInfo.includes(plotNumber);
        const blockMatch = block ? plotInfo.includes(block) : true;
        return numberMatch && blockMatch;
      });
      if (!sale) return { ...p, status: 'AVAILABLE' };

      const payments = receiptsData?.data.filter((r: any) => r.invoiceId === sale.id) || [];
      const totalPaid = payments.reduce((sum: number, r: any) => sum + r.amount, 0);
      const ownerShare = parseFloat(p.sqm) * parseFloat(p.pricePerSqm);
      const saleValue = sale.amount;
      const remaining = saleValue - totalPaid;
      const companyProfit = saleValue - ownerShare;
      const startDate = new Date(sale.invoiceDate);
      const diffDays = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...p,
        status: 'SOLD',
        buyer: sale.client?.name,
        buyerPhone: sale.client?.phone,
        ownerShare,
        saleValue,
        companyProfit,
        totalPaid,
        remaining,
        percent: saleValue > 0 ? Math.round((totalPaid / saleValue) * 100) : 0,
        installmentsLeft: Math.max(0, 10 - Math.floor(diffDays / 30))
      };
    });

    setSelectedFullProject({ ...project, details: parsedDetails, inventory: inventoryReport });
  };

  useEffect(() => {
    if (!selectedFullProject) {
      setCompanyValueMode('cash');
    }
  }, [selectedFullProject]);

  const handleMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setMapPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleEdit = (project: any) => {
    const projectDetails = typeof project.details === 'string' ? JSON.parse(project.details) : project.details;
    setEditingId(project.id);
    setForm({
      location: project.location,
      description: project.description || '',
      sellerId: project.sellerId,
      plots: projectDetails?.entries || []
    });
    setStartingPercentage(projectDetails?.startingPercentage?.toString() || '20');
    setMapPreview(project.mapUrl);
    setIsFormVisible(true);
    setStage(1);
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setEditingId(null);
    setStage(1);
    setMapPreview(null);
    setForm({ location: '', description: '', sellerId: '', plots: [] });
    setStartingPercentage('20');
  };

  const addPlotToInventory = () => {
    if (!tempPlot.plotNumber || !tempPlot.sqm) return;
    setForm({ ...form, plots: [...form.plots, { ...tempPlot, installmentSqm: tempPlot.installmentSqm || tempPlot.sqm }] });
    setTempPlot({ plotNumber: '', block: '', sqm: '', pricePerSqm: '', installmentSqm: '', ownerValue: '' });
  };

  const handleSave = async () => {
    if (editingId) {
      if (!canEditProjects) {
        alert('You are not authorized to update projects.');
        return;
      }
    } else if (!canCreateProjects) {
      alert('You are not authorized to create projects.');
      return;
    }

    const payload = {
      location: form.location,
      description: form.description,
      sellerId: form.sellerId,
      details: {
        entries: form.plots,
        startingPercentage: startingPercentage ? Number(startingPercentage) : 20
      },
      mapUrl: mapPreview
    };

    try {
      if (editingId) await updateProject.mutateAsync({ id: editingId, data: payload });
      else await createProject.mutateAsync(payload);
      closeForm();
    } catch (error) {
      console.error(error);
      alert('Unable to save project.');
    }
  };

  const downloadProjectsPDF = async () => {
    if (!projData?.data || projData.data.length === 0) {
      alert('No projects to download');
      return;
    }

    const headers = ['Location', 'Owner', 'Description', 'Plots', 'Created'];
    const rows = projData.data.map((p: any) => {
      const plotCount = typeof p.details === 'string' ? JSON.parse(p.details).entries.length : p.details.entries.length;
      return [p.location || '', p.seller?.name || 'N/A', (p.description || '').slice(0, 60), plotCount.toString(), new Date(p.createdAt).toLocaleDateString()];
    });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#fff';
    container.style.padding = '16px';
    container.style.color = '#000';

    const title = document.createElement('h2');
    title.innerText = 'PROJECT INVENTORY';
    title.style.textAlign = 'center';
    title.style.marginBottom = '12px';
    container.appendChild(title);

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.fontSize = '12px';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.innerText = header;
      th.style.border = '1px solid #ddd';
      th.style.padding = '8px';
      th.style.background = '#3b82f6';
      th.style.color = '#fff';
      th.style.textAlign = 'left';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((row: any[]) => {
      const tr = document.createElement('tr');
      row.forEach((cell: any) => {
        const td = document.createElement('td');
        td.innerText = String(cell);
        td.style.border = '1px solid #eee';
        td.style.padding = '8px';
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
      doc.save(`Projects_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Failed to generate PDF');
    } finally {
      document.body.removeChild(container);
    }
  };

  const downloadProjectPriceListPDF = async () => {
    if (!projData?.data || projData.data.length === 0) {
      alert('No project data available');
      return;
    }

    const headers = ['Plot No', 'Size (SQM)', 'Cash Price', 'Installment Price', 'Starting Amount'];
    const sortedProjects = [...projData.data].sort((a: any, b: any) => (a.location || '').localeCompare(b.location || ''));
    const projectSections: any[] = [];

    sortedProjects.forEach((project: any) => {
      const projectDetails = typeof project.details === 'string'
        ? JSON.parse(project.details)
        : project.details || {};
      const projectStarting = projectDetails?.startingPercentage !== undefined
        ? Number(projectDetails.startingPercentage)
        : Number(startingPercentage || '20');
      const plotEntries = projectDetails.entries || [];

      const rows = plotEntries.map((plot: any) => {
        const sqm = parseFloat(plot.sqm || '0');
        const pricePerSqm = parseFloat(plot.pricePerSqm || '0');
        const installmentPricePerSqm = parseFloat(plot.installmentSqm || plot.pricePerSqm || '0');
        const cashPrice = Math.round(sqm * pricePerSqm);
        const installmentPrice = Math.round(sqm * installmentPricePerSqm);
        const startingAmount = Math.round(installmentPrice * (projectStarting / 100));

        return {
          plotNumber: plot.plotNumber || 'N/A',
          sqm: sqm.toString(),
          cashPrice,
          installmentPrice,
          startingAmount
        };
      });

      if (rows.length > 0) {
        const totalCash = rows.reduce((sum: number, row: any) => sum + row.cashPrice, 0);
        const totalInstallment = rows.reduce((sum: number, row: any) => sum + row.installmentPrice, 0);
        const totalStarting = rows.reduce((sum: number, row: any) => sum + row.startingAmount, 0);

        projectSections.push({
          location: project.location || 'Unknown Location',
          seller: project.seller?.name || 'Unknown Seller',
          description: project.description || 'No description available.',
          plotCount: rows.length,
          rows,
          startingPercentage: projectStarting,
          totalCash,
          totalInstallment,
          totalStarting
        });
      }
    });

    if (projectSections.length === 0) {
      alert('No plot entries available for price list');
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#fff';
    container.style.padding = '16px';
    container.style.color = '#000';
    container.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '16px';

    const logo = document.createElement('div');
    logo.style.width = '140px';
    logo.style.height = '60px';
    logo.style.border = '2px solid #1d4ed8';
    logo.style.borderRadius = '16px';
    logo.style.display = 'flex';
    logo.style.alignItems = 'center';
    logo.style.justifyContent = 'center';
    logo.style.fontSize = '12px';
    logo.style.fontWeight = '800';
    logo.style.color = '#1d4ed8';
    logo.innerText = 'COMPANY LOGO';
    header.appendChild(logo);

    const titleGroup = document.createElement('div');
    titleGroup.style.textAlign = 'right';
    const title = document.createElement('h2');
    title.innerText = 'PROJECT PRICE LIST';
    title.style.margin = '0';
    title.style.fontSize = '22px';
    title.style.letterSpacing = '1px';
    titleGroup.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.innerText = 'Cash, installment and starting payment details per plot.';
    subtitle.style.margin = '4px 0 0';
    subtitle.style.fontSize = '12px';
    subtitle.style.color = '#4b5563';
    titleGroup.appendChild(subtitle);

    header.appendChild(titleGroup);
    container.appendChild(header);

    projectSections.forEach((section) => {
      const projectHeading = document.createElement('div');
      projectHeading.style.margin = '18px 0 8px';
      projectHeading.style.padding = '12px 16px';
      projectHeading.style.background = '#f8fafc';
      projectHeading.style.border = '1px solid #e2e8f0';
      projectHeading.style.borderRadius = '18px';

      const headingText = document.createElement('div');
      headingText.style.fontSize = '14px';
      headingText.style.fontWeight = '800';
      headingText.innerText = `${section.location} — ${section.plotCount} Plot${section.plotCount === 1 ? '' : 's'}`;
      projectHeading.appendChild(headingText);

      const subDetails = document.createElement('div');
      subDetails.style.fontSize = '11px';
      subDetails.style.color = '#6b7280';
      subDetails.style.marginTop = '6px';
      subDetails.innerText = `${section.seller} · ${section.description}`;
      projectHeading.appendChild(subDetails);

      const detailsText = document.createElement('div');
      detailsText.style.fontSize = '11px';
      detailsText.style.color = '#6b7280';
      detailsText.style.marginTop = '6px';
      detailsText.innerText = `Starting payment: ${section.startingPercentage}% of installment price`;
      projectHeading.appendChild(detailsText);

      container.appendChild(projectHeading);

      const table = document.createElement('table');
      table.style.borderCollapse = 'collapse';
      table.style.width = '100%';
      table.style.fontSize = '11px';
      table.style.marginBottom = '16px';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      headers.forEach((headerText) => {
        const th = document.createElement('th');
        th.innerText = headerText;
        th.style.border = '1px solid #d1d5db';
        th.style.padding = '10px';
        th.style.background = '#1d4ed8';
        th.style.color = '#fff';
        th.style.textAlign = 'left';
        th.style.fontSize = '10px';
        th.style.fontWeight = '700';
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      section.rows.forEach((row: any) => {
        const tr = document.createElement('tr');
        [row.plotNumber, row.sqm, formatCurrency(row.cashPrice), formatCurrency(row.installmentPrice), formatCurrency(row.startingAmount)].forEach((cell: any) => {
          const td = document.createElement('td');
          td.innerText = String(cell);
          td.style.border = '1px solid #e5e7eb';
          td.style.padding = '10px';
          td.style.verticalAlign = 'top';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      const totalsRow = document.createElement('tr');
      totalsRow.style.background = '#f8fafc';
      totalsRow.style.fontWeight = '700';
      ['Total', '', formatCurrency(section.totalCash), formatCurrency(section.totalInstallment), formatCurrency(section.totalStarting)].forEach((cell: any) => {
        const td = document.createElement('td');
        td.innerText = String(cell);
        td.style.border = '1px solid #e5e7eb';
        td.style.padding = '10px';
        td.style.verticalAlign = 'top';
        totalsRow.appendChild(td);
      });
      tbody.appendChild(totalsRow);

      table.appendChild(tbody);
      container.appendChild(table);
    });

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const imgProps = (doc as any).getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      doc.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      doc.save(`Project_Price_List_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Failed to generate price list');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 min-h-screen text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Project Inventory</h1>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-60">Manage plots, sellers and financial progress</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {!isFormVisible && (
            <>
              <Button onClick={downloadProjectsPDF} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-lg hover:bg-emerald-700"><Download size={18} className="mr-2"/> Download</Button>
              <Button onClick={downloadProjectPriceListPDF} className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-lg hover:bg-slate-700"><Download size={18} className="mr-2"/> Price List</Button>
            </>
          )}
          {canCreateProjects && (
            <Button onClick={() => setIsFormVisible((value) => !value)} className={`px-8 py-6 rounded-2xl font-bold shadow-xl ${isFormVisible ? 'bg-gray-100 text-gray-700 shadow-gray-100' : 'bg-blue-600 text-white shadow-blue-100'}`}>
              {isFormVisible ? <><X size={20} className="mr-2"/> Close</> : <><Plus size={20} className="mr-2"/> New Project</>}
            </Button>
          )}
        </div>
      </div>

      {canCreateProjects && isFormVisible ? (
        <div className="max-w-5xl mx-auto space-y-6 py-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-center gap-3">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-3xl flex items-center justify-center font-black ${stage >= step ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                    {stage > step ? <CheckCircle size={20} /> : step}
                  </div>
                  <span className={`text-[10px] uppercase tracking-[0.35em] ${stage >= step ? 'text-blue-600' : 'text-gray-300'}`}>
                    {['Details', 'Plots', 'Review'][step - 1]}
                  </span>
                </div>
                {step < 3 && <div className={`h-1 flex-1 rounded-full ${stage > step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <Card>
            <CardBody className="p-8">
              {stage === 1 && (
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Project Location</label>
                      <input type="text" className="w-full border border-gray-200 rounded-3xl px-5 py-4" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Owner / Seller</label>
                      <select className="w-full border border-gray-200 rounded-3xl px-5 py-4" value={form.sellerId} onChange={(e) => setForm({ ...form, sellerId: e.target.value })}>
                        <option value="">Choose seller</option>
                        {sellersOnly.map((seller: any) => (
                          <option key={seller.id} value={seller.id}>{seller.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
                    <textarea className="w-full border border-gray-200 rounded-3xl px-5 py-4 min-h-[140px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
              )}

              {stage === 2 && (
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Upload Survey Map</label>
                    <div className="relative rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                      {mapPreview ? (
                        <img src={mapPreview} alt="Map preview" className="mx-auto h-60 object-contain rounded-3xl" />
                      ) : (
                        <div className="space-y-4">
                          <div className="mx-auto w-20 h-20 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center"><Camera size={32} /></div>
                          <p className="text-sm text-gray-500">Select a map image to attach to the project.</p>
                        </div>
                      )}
                      <label className="mt-6 inline-flex cursor-pointer items-center rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700">
                        Upload Map
                        <input type="file" accept="image/*" className="hidden" onChange={handleMapUpload} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Add Plot</label>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Plot Number" className="border border-gray-200 rounded-3xl px-4 py-3" value={tempPlot.plotNumber} onChange={(e) => setTempPlot({ ...tempPlot, plotNumber: e.target.value })} />
                        <input type="text" placeholder="Block" className="border border-gray-200 rounded-3xl px-4 py-3" value={tempPlot.block} onChange={(e) => setTempPlot({ ...tempPlot, block: e.target.value })} />
                        <input type="text" placeholder="SQM" className="border border-gray-200 rounded-3xl px-4 py-3" value={tempPlot.sqm} onChange={(e) => setTempPlot({ ...tempPlot, sqm: e.target.value })} />
                        <input type="text" placeholder="Price/SQM (TZS)" className="border border-gray-200 rounded-3xl px-4 py-3" value={tempPlot.pricePerSqm} onChange={(e) => setTempPlot({ ...tempPlot, pricePerSqm: maskTZS(e.target.value) })} />
                        <input type="text" placeholder="Installment SQM" className="border border-gray-200 rounded-3xl px-4 py-3" value={tempPlot.installmentSqm} onChange={(e) => setTempPlot({ ...tempPlot, installmentSqm: e.target.value })} />
                        <input type="text" placeholder="Owner Value (TZS)" className="border border-gray-200 rounded-3xl px-4 py-3" value={tempPlot.ownerValue} onChange={(e) => setTempPlot({ ...tempPlot, ownerValue: maskTZS(e.target.value) })} />
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="text-sm text-gray-500">If installment SQM is left blank, it will use standard SQM for the installment calculation.</div>
                        <div className="grid grid-cols-2 gap-3 items-end">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Starting Amount %</label>
                            <input type="number" min="1" max="100" className="w-full border border-gray-200 rounded-3xl px-4 py-3" value={startingPercentage} onChange={(e) => setStartingPercentage(e.target.value)} />
                          </div>
                          <Button onClick={addPlotToInventory} className="w-full bg-blue-600 text-white">Add Plot</Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[260px] overflow-y-auto rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                      {form.plots.length ? form.plots.map((plot, index) => (
                        <div key={index} className="flex items-center justify-between rounded-3xl border border-gray-100 bg-gray-50 px-4 py-3">
                          <div>
                            <div className="font-black text-sm">Plot {plot.plotNumber}</div>
                            <div className="text-xs text-gray-500">{plot.block} / {plot.sqm} SQM · Owner: {plot.ownerValue ? `TZS ${formatCurrency(cleanTZS(plot.ownerValue))}` : 'Not set'}</div>
                          </div>
                          <button className="text-rose-500 font-black" onClick={() => setForm({ ...form, plots: form.plots.filter((_, idx) => idx !== index) })}>Remove</button>
                        </div>
                      )) : <div className="text-sm text-gray-400">No plots added yet.</div>}
                    </div>
                  </div>
                </div>
              )}

              {stage === 3 && (
                <div className="space-y-6 text-center">
                  <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm"><CheckCircle size={34} /></div>
                  <h2 className="text-2xl font-black">Ready to save your project?</h2>
                  <p className="text-sm text-gray-500">Review the summary below and submit to add the project into inventory.</p>
                  <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 text-left">
                    <div className="flex justify-between text-sm text-gray-600"><span>Location</span><span>{form.location || 'Not set'}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>Owner</span><span>{sellersOnly.find((s: any) => s.id === form.sellerId)?.name || 'Not selected'}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>Plots</span><span>{form.plots.length}</span></div>
                  </div>
                </div>
              )}

              <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Button variant="ghost" onClick={() => setStage(Math.max(1, stage - 1))} className="px-8 py-4">Back</Button>
                <div className="flex gap-3 flex-wrap">
                  <Button variant="secondary" onClick={closeForm} className="px-8 py-4">Cancel</Button>
                  <Button onClick={() => stage < 3 ? setStage(stage + 1) : handleSave()} className="px-8 py-4 bg-blue-600 text-white">
                    {stage === 3 ? (editingId ? 'Update Project' : 'Save Project') : 'Continue'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projData?.data?.map((project: any) => {
              const plotCount = typeof project.details === 'string' ? JSON.parse(project.details).entries.length : project.details.entries.length;
              return (
                <Card key={project.id} className="group overflow-hidden hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-2xl">
                  <div className="h-48 bg-gray-100 relative">
                    {project.mapUrl ? (
                      <>
                        <img src={project.mapUrl} alt="Project map" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        <button onClick={() => setViewingMap(project.mapUrl)} className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 hover:bg-black/20 hover:opacity-100 transition-all">
                          <div className="rounded-full bg-white p-2 shadow-lg"><Maximize2 size={20} className="text-blue-600"/></div>
                        </button>
                      </>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-300 bg-white border-b border-gray-200">
                        <ImageIcon size={40} />
                        {canEditProjects && (
                          <button onClick={() => setQuickAttachId(project.id)} className="text-[11px] font-black uppercase tracking-widest text-blue-600">Attach Survey Map</button>
                        )}
                      </div>
                    )}
                    <div className="absolute top-4 right-4"><Badge variant="info">{plotCount} PLOTS</Badge></div>
                  </div>

                  <CardBody className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-blue-600"><MapPin size={18} /><h3 className="font-black text-gray-900 uppercase tracking-tight text-lg">{project.location}</h3></div>
                      <p className="text-xs text-gray-400 line-clamp-2 italic">{project.description || 'No description available.'}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] uppercase font-black tracking-widest text-gray-500"><Users size={12} className="inline-block mr-1" />{project.seller?.name || 'Unknown'}</div>
                      <div className="flex gap-2">
                        {canEditProjects && (
                          <button onClick={() => handleEdit(project)} className="p-2 text-gray-400 hover:text-blue-600"><Edit3 size={18} /></button>
                        )}
                        {canDeleteProjects && (
                          <button onClick={() => { if (window.confirm('Delete project?')) deleteProject.mutate(project.id); }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <button onClick={() => handleOrodha(project)} className="text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 px-4 py-2 rounded-full hover:bg-blue-600 hover:text-white transition-all">Orodha</button>
                      <div className="text-[10px] text-gray-500">{plotCount} units</div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {projData?.pages && projData.pages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-600 font-bold">Showing {Math.min((currentPage - 1) * pageSize + 1, projData.total)} to {Math.min(currentPage * pageSize, projData.total)} of {projData.total} projects</div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-2xl border border-gray-200 bg-white text-gray-700 disabled:opacity-50">← Previous</button>
                <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-2">
                  {Array.from({ length: projData.pages }, (_, i) => i + 1).map((page) => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-full ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-200'}`}>{page}</button>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(Math.min(projData.pages, currentPage + 1))} disabled={currentPage === projData.pages} className="px-4 py-2 rounded-2xl border border-gray-200 bg-white text-gray-700 disabled:opacity-50">Next →</button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={!!viewingMap} onClose={() => setViewingMap(null)} title="Survey Map">
        <img src={viewingMap || ''} alt="Survey Map" className="w-full h-auto rounded-3xl shadow-2xl" />
      </Modal>

      <Modal isOpen={!!selectedFullProject} onClose={() => setSelectedFullProject(null)} title={`Project Ledger: ${selectedFullProject?.location}`}>
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-5">
              <p className="text-[9px] uppercase tracking-widest text-blue-400">Project Location</p>
              <p className="font-black text-blue-900 text-lg">{selectedFullProject?.location}</p>
              <p className="text-sm text-gray-500 mt-2">{selectedFullProject?.description || 'No description available.'}</p>
            </div>
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
              <p className="text-[9px] uppercase tracking-widest text-slate-400">Owner / Seller</p>
              <p className="font-black text-slate-900 text-lg">{selectedFullProject?.seller?.name}</p>
              <p className="text-sm text-gray-500 mt-2">{selectedFullProject?.seller?.phone || 'No phone'} | {selectedFullProject?.seller?.email || 'No email'}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5"><p className="text-[9px] uppercase tracking-widest text-amber-400">Available</p><p className="font-black text-amber-900 text-lg">{selectedFullProject?.inventory?.filter((item:any) => item.status === 'AVAILABLE').length} plots</p></div>
            <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5"><p className="text-[9px] uppercase tracking-widest text-emerald-400">Sold</p><p className="font-black text-emerald-900 text-lg">{selectedFullProject?.inventory?.filter((item:any) => item.status === 'SOLD').length} plots</p></div>
            <div className="rounded-[2rem] bg-gray-900 p-5 text-white"><p className="text-[9px] uppercase tracking-widest text-gray-400">Capacity</p><p className="font-black text-2xl">{selectedFullProject?.inventory?.length}</p></div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
              <p className="text-[9px] uppercase tracking-widest text-slate-400">Total Owner Value</p>
              <p className="mt-2 font-black text-slate-900 text-lg">TZS {formatCurrency(
                (() => {
                  const totalByPlot = selectedFullProject?.inventory?.reduce((sum:any, unit:any) => {
                    try {
                      return sum + cleanTZS(unit.ownerValue?.toString() || '0');
                    } catch (e) {
                      return sum;
                    }
                  }, 0) || 0;
                  const fallbackTotal = cleanTZS(selectedFullProject?.details?.ownerValue?.toString() || '0');
                  return totalByPlot > 0 ? totalByPlot : fallbackTotal;
                })()
              )}</p>
              <p className="text-[10px] text-gray-400 mt-2">Sum of owner values entered per plot</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div
              onDoubleClick={() => setCompanyValueMode(companyValueMode === 'cash' ? 'installment' : 'cash')}
              title="Double-click to toggle cash/installment"
              className="rounded-[2rem] border border-slate-200 bg-white p-5 cursor-pointer select-none"
            >
              <p className="text-[9px] uppercase tracking-widest text-slate-400">Company Value ({companyValueMode === 'cash' ? 'Cash' : 'Installment'})</p>
              <p className="font-black text-slate-900 text-lg">{formatCurrency(
                (companyValueMode === 'cash'
                  ? (selectedFullProject?.inventory?.reduce((s:any, u:any) => s + (parseFloat(u.sqm || '0') * cleanTZS(u.pricePerSqm || '0')), 0) || 0)
                  : (selectedFullProject?.inventory?.reduce((s:any, u:any) => s + (parseFloat(u.sqm || '0') * cleanTZS(u.installmentSqm || u.pricePerSqm || '0')), 0) || 0))
              )}</p>
              <p className="text-[10px] text-gray-400 mt-2">Double-click to switch view</p>
              <button
                onClick={() => setCompanyValueMode(companyValueMode === 'cash' ? 'installment' : 'cash')}
                className="mt-3 w-full rounded-3xl bg-blue-600 px-4 py-3 text-white font-black"
              >
                Switch to {companyValueMode === 'cash' ? 'Installment' : 'Cash'} Mode
              </button>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
              <p className="text-[9px] uppercase tracking-widest text-slate-400">Total Company Value</p>
              <p className="mt-2 font-black text-slate-900 text-lg">TZS {formatCurrency(
                (companyValueMode === 'cash'
                  ? (selectedFullProject?.inventory?.reduce((s:any, u:any) => s + (parseFloat(u.sqm || '0') * cleanTZS(u.pricePerSqm || '0')), 0) || 0)
                  : (selectedFullProject?.inventory?.reduce((s:any, u:any) => s + (parseFloat(u.sqm || '0') * cleanTZS(u.installmentSqm || u.pricePerSqm || '0')), 0) || 0))
              )}</p>
              <p className="text-[10px] text-gray-400 mt-2">Mode: {companyValueMode === 'cash' ? 'Cash' : 'Installment'}</p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
                <th className="px-6 py-3">Unit</th>
                <th className="px-6 py-3">SQM</th>
                <th className="px-6 py-3">Price/SQM</th>
                <th className="px-6 py-3">SQM (Installment)</th>
                <th className="px-6 py-3">Status / Buyer</th>
                <th className="px-6 py-3">Owner Value</th>
                  <th
                    className="px-6 py-3 cursor-pointer"
                    title="Double-click to toggle company value mode"
                    onDoubleClick={() => setCompanyValueMode(companyValueMode === 'cash' ? 'installment' : 'cash')}
                  >
                    Company Value ({companyValueMode === 'cash' ? 'Cash' : 'Installment'})
                  </th>
                <th className="px-6 py-3">Profit</th>
                <th className="px-6 py-3 text-right">Payment</th>
              </tr>
            </thead>
            <tbody>
              {selectedFullProject?.inventory?.map((unit: any, idx: number) => (
                <tr key={idx} className="bg-white rounded-3xl shadow-sm">
                  <td className="px-6 py-5 border border-gray-100">
                    <div className="font-black">Plot {unit.plotNumber}</div>
                    <div className="text-[9px] text-gray-400 uppercase">Blk {unit.block}</div>
                  </td>
                  <td className="px-6 py-5 border border-gray-100">
                    <div className="font-black">{unit.sqm} SQM</div>
                    {unit.installmentSqm && unit.installmentSqm !== unit.sqm && <div className="text-[9px] text-gray-400">Inst: {unit.installmentSqm} SQM</div>}
                  </td>
                  <td className="px-6 py-5 border border-gray-100 font-black text-gray-700">{formatCurrency(cleanTZS(unit.pricePerSqm || '0'))}</td>
                  <td className="px-6 py-5 border border-gray-100 font-black text-gray-700">{unit.installmentSqm || unit.sqm} SQM</td>
                  <td className="px-6 py-5 border border-gray-100">
                    {unit.status === 'AVAILABLE' ? <Badge variant="info">VACANT</Badge> : <div className="space-y-1"><div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600"><UserCheck size={12} />{unit.buyer}</div><div className="text-[9px] text-gray-400">{unit.buyerPhone}</div></div>}
                  </td>
                  <td className="px-6 py-5 border border-gray-100 font-black text-gray-700">{formatCurrency((() => {
                    try {
                      const plotOwner = cleanTZS(unit.ownerValue?.toString() || '0');
                      if (plotOwner > 0) return plotOwner;
                      const ownerTotal = cleanTZS(selectedFullProject?.details?.ownerValue?.toString() || '0');
                      const totalNormal = selectedFullProject?.inventory?.reduce((s:any, u:any) => s + parseFloat(u.sqm || '0'), 0) || 1;
                      const sqm = parseFloat(unit.sqm || '0');
                      if (ownerTotal > 0) return (ownerTotal * (sqm / totalNormal));
                      return (unit.ownerShare || (cleanTZS(unit.pricePerSqm || '0') * sqm));
                    } catch (e) { return 0; }
                  })())}</td>
                  <td className="px-6 py-5 border border-gray-100 font-black text-gray-700">{formatCurrency((() => {
                      try {
                        const sqm = parseFloat(unit.sqm || '0');
                        const price = cleanTZS(unit.pricePerSqm || '0');
                        const installmentPrice = cleanTZS(unit.installmentSqm || unit.pricePerSqm || '0');
                        return companyValueMode === 'cash' ? (sqm * price) : (sqm * installmentPrice);
                      } catch (e) { return 0; }
                    })())}</td>
                  <td className="px-6 py-5 border border-gray-100">{unit.status === 'SOLD' ? <div className="text-blue-500 font-black">+{formatCurrency((() => {
                    try {
                      const sqm = parseFloat(unit.sqm || '0');
                      const price = cleanTZS(unit.pricePerSqm || '0');
                      const installmentPrice = cleanTZS(unit.installmentSqm || unit.pricePerSqm || '0');
                      const companyUnit = companyValueMode === 'cash' ? (sqm * price) : (sqm * installmentPrice);
                      const ownerTotal = cleanTZS(selectedFullProject?.details?.ownerValue?.toString() || '0');
                      const totalNormal = selectedFullProject?.inventory?.reduce((s:any, u:any) => s + parseFloat(u.sqm || '0'), 0) || 1;
                      const ownerPerUnit = ownerTotal > 0 ? (ownerTotal * (sqm / totalNormal)) : 0;
                      return companyUnit - ownerPerUnit;
                    } catch (e) { return 0; }
                  })())}</div> : <span className="text-gray-300">---</span>}</td>
                  <td className="px-6 py-5 border border-gray-100 text-right">
                    {unit.status === 'SOLD' ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] uppercase font-black"><span className="text-emerald-500">Invoiced</span><span className="text-rose-400">-{formatCurrency(unit.remaining)}</span></div>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${unit.percent}%` }} /></div>
                        <div className="flex items-center justify-end gap-1 text-[8px] uppercase tracking-[0.3em] text-gray-400"><CalendarClock size={10} /> Est: {unit.installmentsLeft} mo</div>
                      </div>
                    ) : (
                      <div className="text-[9px] uppercase font-black text-slate-500">Not invoiced</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!quickAttachId} onClose={() => setQuickAttachId(null)} title="Quick Map Upload">
        <div className="py-8 text-center space-y-6">
          <div className="mx-auto w-24 h-24 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner"><ImageIcon size={40} /></div>
          <input id="quick-attach" type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = async () => {
              await updateProject.mutateAsync({ id: quickAttachId!, data: { mapUrl: reader.result } });
              setQuickAttachId(null);
            };
            reader.readAsDataURL(file);
          }} />
          <label htmlFor="quick-attach" className="block w-full rounded-3xl bg-blue-600 px-6 py-4 text-sm font-black text-white cursor-pointer hover:bg-blue-700">Select Map Image</label>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
