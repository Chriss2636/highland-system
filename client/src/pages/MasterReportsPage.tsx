import { useState, useMemo } from 'react';
import { useReportsApi } from '../api/hooks';
import { Card, CardBody, Loading, Badge } from '../components/common';
import { Map, Search, MapPin } from 'lucide-react';
import { formatCurrency } from '../utils';

const MasterReportsPage = () => {
  const [activeTab, setActiveTab] = useState<'buyers' | 'projects'>('buyers');
  const [search, setSearch] = useState('');
  const { getBuyersLedger, getProjectsAnalysis } = useReportsApi();

  const { data: buyersData, isLoading: loadingBuyers } = getBuyersLedger();
  const { data: projectsData, isLoading: loadingProjects } = getProjectsAnalysis();

  // --- BUYER CALCULATIONS ---
  const filteredBuyers = useMemo(() => {
    if (!buyersData?.data) return [];
    return buyersData.data.filter((b: any) => 
        b.type === 'buyer' && b.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [buyersData, search]);

  // --- PROJECT CALCULATIONS ---
  const filteredProjects = useMemo(() => {
    if (!projectsData?.data) return [];
    return projectsData.data.filter((p: any) => 
        p.location.toLowerCase().includes(search.toLowerCase())
    );
  }, [projectsData, search]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Master Ledger</h1>
          <p className="text-gray-500 mt-1 font-bold text-xs uppercase tracking-[0.2em] opacity-60">Highland Property Analytics</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('buyers')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'buyers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
          >
            Buyers Ledger
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'projects' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
          >
            Project Inventory
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          placeholder={activeTab === 'buyers' ? "Search buyers..." : "Search locations..."}
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl shadow-sm outline-none transition-all font-bold"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* --- TAB 1: BUYERS LEDGER --- */}
      {activeTab === 'buyers' && (
        <div className="space-y-6">
          {loadingBuyers ? <Loading /> : filteredBuyers.map((buyer: any) => {
            let totalOwed = 0;
            let totalPaid = 0;
            buyer.invoices.forEach((inv: any) => {
                totalOwed += inv.amount;
                inv.receipts.forEach((r: any) => totalPaid += r.amount);
            });
            const remaining = totalOwed - totalPaid;
            const buyerStatus = remaining <= 0 ? 'SETTLED' : totalPaid > 0 ? 'IN PROGRESS' : 'ASSIGNED';

            return (
              <Card key={buyer.id} className="rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all">
                <CardBody className="p-8">
                  <div className="flex flex-col md:flex-row justify-between gap-6 text-left">
                    <div className="flex items-center space-x-6">
                       <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-200">
                          {buyer.name.charAt(0)}
                       </div>
                       <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{buyer.name}</h2>
                            <Badge variant={buyerStatus === 'SETTLED' ? 'success' : 'info'}>{buyerStatus}</Badge>
                          </div>
                          <p className="text-sm font-bold text-gray-400">{buyer.phone} • {buyer.email}</p>
                       </div>
                    </div>

                    <div className="flex gap-8 border-l border-gray-100 pl-8">
                       <div className="text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Assets</p>
                          <p className="font-black text-gray-900 text-lg">TZS {formatCurrency(totalOwed)}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Total Paid</p>
                          <p className="font-black text-emerald-600 text-lg">TZS {formatCurrency(totalPaid)}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-rose-400 uppercase mb-1">Balance</p>
                          <p className="font-black text-rose-600 text-lg">TZS {formatCurrency(remaining)}</p>
                       </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-50 text-left">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Assigned Property Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {buyer.invoices.map((inv: any) => {
                         const invPaid = inv.receipts.reduce((s: any, r: any) => s + r.amount, 0);
                         const invRemain = inv.amount - invPaid;
                         return (
                           <div key={inv.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex justify-between items-center">
                              <div className="text-left">
                                 <div className="font-black text-gray-800 flex items-center gap-2">
                                    <MapPin size={14} className="text-blue-500" />
                                    {inv.project?.location || 'General'} — Plot {inv.plotInfo?.match(/plot no (.*?),/)?.[1] || 'Assigned'}
                                 </div>
                                 <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase">INV: {inv.invoiceNo}</div>
                              </div>
                              <div className="text-right">
                                 <Badge variant={invRemain <= 0 ? "success" : "info"}>{invRemain <= 0 ? "FULLY PAID" : "PARTIAL"}</Badge>
                                 <div className="text-xs font-black mt-1 text-rose-500">-{formatCurrency(invRemain)}</div>
                              </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* --- TAB 2: PROJECTS ANALYSIS --- */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 gap-6">
           {loadingProjects ? <Loading /> : filteredProjects.map((proj: any) => {
              // Ensure details is parsed (some records store JSON as string)
              const detailsObj = typeof proj.details === 'string'
                ? (() => { try { return JSON.parse(proj.details); } catch { return proj.details; } })()
                : proj.details || { entries: [] };

              const plots = detailsObj?.entries || [];
              const totalPlots = Array.isArray(plots) ? plots.length : 0;

              // Determine sold plots by unique plot identifiers found in invoices (handles multiple receipts/payments per invoice)
              const soldPlotSet = new Set<string>();
              proj.invoices?.forEach((inv: any) => {
                const plotInfo = inv.plotInfo || '';
                // try to extract explicit plot number using common formats
                const match = plotInfo.match(/plot\s*no\s*([A-Za-z0-9-]+)/i) || plotInfo.match(/plot\s*([A-Za-z0-9-]+)/i);
                if (match && match[1]) soldPlotSet.add(match[1].toString().toLowerCase());
                else if (inv.plotNumber) soldPlotSet.add(String(inv.plotNumber).toLowerCase());
              });
              const soldPlots = soldPlotSet.size;

              const projectRevenue = proj.invoices?.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0) || 0;
              const projectCollected = proj.invoices?.reduce((sum: number, inv: any) => {
                 return sum + (inv.receipts?.reduce((s: number, r: any) => s + (r.amount || 0), 0) || 0);
              }, 0) || 0;

              return (
                <Card key={proj.id} className="rounded-[2rem] border-none shadow-sm overflow-hidden">
                   <div className="bg-gray-900 p-8 text-white flex justify-between items-center text-left">
                      <div className="flex items-center space-x-4">
                         <div className="p-3 bg-blue-600 rounded-2xl"><Map size={24}/></div>
                         <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{proj.location}</h2>
                            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Owner: {proj.seller?.name || 'Highland'}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Sales Potential</p>
                         <p className="text-2xl font-black">TZS {formatCurrency(projectRevenue)}</p>
                      </div>
                   </div>
                   <CardBody className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Inventory Status</p>
                            <div className="flex items-end gap-2">
                               <span className="text-2xl font-black">{soldPlots}</span>
                               <span className="text-gray-400 font-bold text-sm mb-1">/ {totalPlots} Sold</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                               <div className="bg-blue-600 h-full" style={{ width: `${(soldPlots / Math.max(1, totalPlots)) * 100}%` }} />
                            </div>
                         </div>

                         <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Collection Status</p>
                            <div className="flex items-end gap-2">
                               <span className="text-2xl font-black text-emerald-600">{projectRevenue > 0 ? ((projectCollected / projectRevenue) * 100).toFixed(0) : 0}%</span>
                               <span className="text-gray-400 font-bold text-sm mb-1">Collected</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                               <div className="bg-emerald-500 h-full" style={{ width: `${(projectCollected / Math.max(1, projectRevenue)) * 100}%` }} />
                            </div>
                         </div>

                         <div className="md:col-span-2 flex justify-end items-center space-x-4">
                            <div className="text-right">
                               <p className="text-[10px] font-black text-gray-400 uppercase">Actual Cash Received</p>
                               <p className="text-xl font-black text-emerald-600">TZS {formatCurrency(projectCollected)}</p>
                            </div>
                            <div className="w-px h-10 bg-gray-100" />
                            <div className="text-right">
                               <p className="text-[10px] font-black text-gray-400 uppercase">Total Owed</p>
                               <p className="text-xl font-black text-rose-500">TZS {formatCurrency(projectRevenue - projectCollected)}</p>
                            </div>
                         </div>
                      </div>
                   </CardBody>
                </Card>
              );
           })}
        </div>
      )}
    </div>
  );
};

export default MasterReportsPage;