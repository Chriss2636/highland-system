import { useState, useEffect } from 'react';
import { useAgreementsApi, useClientsApi } from '../api/hooks';
import { Card, CardBody, Loading, Button, Badge, Modal } from '../components/common';
import { 
  Plus, Trash2, Edit3, Download 
} from 'lucide-react';
import { maskTZS, cleanTZS, formatCurrency, formatNidaInput } from '../utils';
import { usePermissions } from '../hooks/permissions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * REUSABLE 3-PAGE LEGAL TEMPLATE
 */
const AgreementTemplate = ({ data, clauses, muuzaji, mnunuzi }: { data: any, clauses: string[], muuzaji: string, mnunuzi: string }) => {
  const plotMatch = data.plotInfo?.match(/plot no ([^,]+), Block ([^,]+)/i);
  const extractedPlotNo = plotMatch ? plotMatch[1].trim() : data.plotNo || '---';
  const extractedBlock = plotMatch ? plotMatch[2].trim() : data.block || '---';

  const renderProcessedText = (text: string) => {
    const parts = text.split(/(\[PLOT\]|\[BLOCK\]|\[SIZE\]|\[LOCATION\]|\[PRICE\]|\[WORDS\])/g);
    return parts.map((part, i) => {
      const map: any = { 
        '[PLOT]': extractedPlotNo, 
        '[BLOCK]': extractedBlock, 
        '[SIZE]': data.size, 
        '[LOCATION]': data.location, 
        '[PRICE]': data.price, 
        '[WORDS]': data.priceWords?.toUpperCase() 
      };
      return map[part] ? <strong key={i} style={{ fontWeight: '900' }}>{map[part]}</strong> : part;
    });
  };

  const SignaturePart = ({ isHighland, role }: { isHighland: boolean, role: string }) => (
    <div style={{ flex: 1, textAlign: 'left' }}>
      <h3 style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>UPANDE WA {role}</h3>
      {isHighland ? (
        <div style={{ marginTop: '10px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '12px' }}>JINA: HIGHLAND PROPERTY COMPANY LIMITED</p>
          <p style={{ fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', opacity: 0.7 }}>MSIMAMIZI WA {role === 'MUUZAJI' ? 'MUUZAJI' : 'MNUNUZI'} KWA NIABA YA KAMPUNI</p>
        </div>
      ) : (
        <p style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '10px' }}>JINA: {data.buyerName?.toUpperCase()}</p>
      )}
      <div style={{ marginTop: '20px', fontSize: '12px', lineHeight: '2.5' }}>
        <p>Jina: ................................................................</p>
        <p>Cheo: ...............................................................</p>
        <p>Saini: ...............................................................</p>
        <p>Anuani: .............................................................</p>
        <p>Simu: .....................................................</p>
      </div>
    </div>
  );

  return (
    <div className="legal-export-portal font-serif" style={{ color: '#000' }}>
      {/* PAGE 1: COVER */}
      <div id="page-1" style={{ width: '210mm', height: '297mm', padding: '30mm', backgroundColor: '#eff6ff', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
         <h1 style={{ fontSize: '24pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '4px' }}>MKATABA WA MAUZIANO YA KIWANJA</h1>
         <div style={{ margin: '60px 0' }}>
            <p style={{ fontSize: '14pt', opacity: 0.6, letterSpacing: '3px' }}>KATI YA</p>
            <p style={{ fontSize: '18pt', fontWeight: '900', marginTop: '20px' }}>{muuzaji}</p>
         </div>
         <div>
            <p style={{ fontSize: '14pt', opacity: 0.6, letterSpacing: '3px' }}>NA</p>
            <p style={{ fontSize: '18pt', fontWeight: '900', marginTop: '20px' }}>{mnunuzi}</p>
         </div>
      </div>

      {/* PAGE 2: BODY */}
      <div id="page-2" style={{ width: '210mm', height: '297mm', padding: '25mm', backgroundColor: '#eff6ff', textAlign: 'justify' }}>
         <h2 style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt', textDecoration: 'underline', marginBottom: '20px' }}>MKATABA WA MAUZIANO YA KIWANJA</h2>
         <p style={{ fontSize: '12pt', marginBottom: '20px' }}>Mkataba huu umeingiwa Leo tarehe {data.date || '……./……../………….'}</p>
         
         <div style={{ fontSize: '12pt', lineHeight: '1.6', marginBottom: '25px' }}>
            <p style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '10px' }}>KATI YA</p>
            <p>
              <b style={{ textTransform: 'uppercase' }}>{muuzaji}</b> 
              {data.type === 'Kuuza' ? 'P.O.BOX 2883, DODOMA' : `Mwenye kitambulisho cha nida ${data.buyerNida || '……………………………'} Na namba ya simu ${data.buyerPhone || '………………………………'}`}
              {` Ambaye Kwa dhumuni ya mkataba huu atajulikana Kama MUUZAJI`}
            </p>
            <p style={{ fontWeight: 'bold', textAlign: 'center', margin: '15px 0' }}>NA</p>
            <p>
              <b style={{ textTransform: 'uppercase' }}>{mnunuzi}</b> 
              {data.type === 'Kununua' ? 'P.O.BOX 2883, DODOMA' : `Mwenye namba ya simu ${data.buyerPhone || '…………………………………...'}`}
              {` Ambaye atajulikana Kama MNUNUZI Kwa upande mwingine neno ambalo litamjumuisha yeye mwenyewe, wakala wake, Na warithi wake.`}
            </p>
         </div>

         <p style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '5px' }}>HIVYO PANDE ZOTE MBILI ZINAKUBALIANA</p>
         <p style={{ fontWeight: 'bold', fontSize: '11pt', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '20px' }}>
            KUSAINI MKATABA HUU KWA MASHARTI YALIOONESHWA HAPO CHINI KAMA IFUATAVYO;
         </p>

         <div style={{ marginTop: '10px' }}>
            {clauses.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '15px', fontSize: '12pt' }}>
                <span style={{ fontWeight: 'bold' }}>{i+1}.</span>
                <div>{renderProcessedText(c)}</div>
              </div>
            ))}
         </div>
      </div>

      {/* PAGE 3: SIGNATURES */}
      <div id="page-3" style={{ width: '210mm', height: '297mm', padding: '25mm', backgroundColor: '#eff6ff' }}>
         <p style={{ fontSize: '12pt', marginBottom: '40px' }}>Pande zote mbili zimeweka saini katika mkataba huu Leo Tarehe <b> ...../...../.......... </b></p>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '60px' }}>
            <SignaturePart isHighland={data.type === 'Kuuza'} role="MUUZAJI" />
            <div style={{ width: '120px', height: '150px', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>WEKA<br/>PASPORT<br/>HAPA</div>
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '60px' }}>
            <SignaturePart isHighland={data.type === 'Kununua'} role="MNUNUZI" />
            <div style={{ width: '120px', height: '150px', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>WEKA<br/>PASPORT<br/>HAPA</div>
         </div>
         <div style={{paddingTop: '20px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '12pt' }}>MBELE YANGU;</h3>
            <div style={{ marginTop: '20px', fontSize: '12pt', lineHeight: '2' }}>
               <p>Jina: ................................................................</p>
               <p>Saini: ...............................................................</p>
               <p>Anuani: .............................................................</p>
               <p>Wadhifa: <b>WAKILI</b></p>
            </div>
         </div>
      </div>
    </div>
  );
};

const AgreementsPage = () => {
  const { getAgreements, createAgreement, updateAgreement, deleteAgreement } = useAgreementsApi();
  const { getClients } = useClientsApi();
  const { canCreate, canEdit, canDelete } = usePermissions();
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stage, setStage] = useState(1);
  const [exportData, setExportData] = useState<any>(null);
  const [selectedAgreementDetail, setSelectedAgreementDetail] = useState<any>(null);

  const [form, setForm] = useState({
    clientId: '', buyerName: '', buyerPhone: '', buyerNida: '',
    type: 'Kuuza', plotNo: '', block: '', size: '', 
    price: '', priceWords: '', location: 'Dodoma', 
    date: new Date().toLocaleDateString('en-GB')
  });

  const [clauses, setClauses] = useState<string[]>([]);

  const getTemplate = (type: string) => {
    if (type === 'Kuuza') {
      return [
        "Kwamba, muuzaji yupo tayari kuuza kiwanja namba [PLOT] Kitalu [BLOCK] Chenye mita za mraba [SIZE] Kilichopo [LOCATION] kwa makubaliano ya bei kiasi cha malipo ya pesa taslimu shilingi za kitanzania [WORDS] (TZS [PRICE]/=) Ambazo zitajulikana kama bei ya kiwanja. Na kwamba mnunuzi tayari amesha lipa kiasi tajwa.",
        "Kwamba, Muuzaji anathibitisha kuwa kiwanja hicho ni mali yake mwenyewe na sio mali ya mtu mwingine Na kwamba hajakiweka lehani kwa mtu yeyote au kwenye taasisi yoyote ya kifedha.",
        "Kwamba, Mnunuzi amekagua kiwanja hicho kabla ya kusaini mkataba huu na ameridhika na kiwanja hicho kabla ya malipo kufanyika.",
        "Kwamba, Muuzaji atashirikiana na mnunuzi katika swala la ufuatiliaji wa hati miliki mpaka pale itakapo patikana.",
        "Kwamba, ikitokea kiwanja kinamgogoro au changamoto ya aina yoyote muuzaji anawajibika au atalazimika kumpa kiwanja kingine chenye thamani sawa na fedha aliyo toa au kama hatoridhika na eneo hilo kampuni itawajibika kurudisha fedha zake kwa kipindi cha muda wa miezi sita.",
        "Mkataba huu unalindwa na sheria ya Jamuhuri ya Muungano wa Tanzania."
      ];
    }
    return [
      "Kwamba muuzaji ameuza kiwanja namba [PLOT] kitalu [BLOCK] chenye ukubwa mita za mraba [SIZE] kilichopo [LOCATION] Kwa makubaliano ya bei kiasi cha malipo ya pesa taslimu shilingi za kitanzania [WORDS] (Tsh [PRICE]/=).",
      "Mkataba huu unalindwa na sheria ya Jamuhuri ya Muungano wa Tanzania."
    ];
  };

  useEffect(() => { if (!editingId) setClauses(getTemplate(form.type)); }, [form.type, editingId]);

  const { data: agData, isLoading } = getAgreements();
  const { data: clientsData } = getClients({ page: 1, limit: 1000 });

  const muuzaji = form.type === 'Kuuza' ? 'HIGHLAND PROPERTY COMPANY LIMITED' : (form.buyerName?.toUpperCase() || 'BUYER NAME');
  const mnunuzi = form.type === 'Kuuza' ? (form.buyerName?.toUpperCase() || 'BUYER NAME') : 'HIGHLAND PROPERTY COMPANY LIMITED';

  /**
   * PDF EXPORT LOGIC
   */
  const handleExportPDF = async (targetData: any, targetClauses: any) => {
    setExportData({ data: targetData, clauses: targetClauses });
    // Wait for render
    await new Promise(r => setTimeout(r, 800));

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pages = ['page-1', 'page-2', 'page-3'];

    for (let i = 0; i < pages.length; i++) {
      const element = document.getElementById(pages[i]) as HTMLElement;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    }

    pdf.save(`Contract-${targetData.buyerName || 'New'}.pdf`);
    setExportData(null);
  };

  const handleSave = async () => {
  try {
    // 1. Create a CLEAN payload with only the fields the database expects
    const payload = {
      clientId: form.clientId,
      type: form.type,
      plotNo: form.plotNo,
      block: form.block,
      size: form.size,
      price: cleanTZS(form.price), // Convert "20,000,000" to 20000000
      priceWords: form.priceWords,
      location: form.location,
      buyerNida: form.buyerNida,
      clauses: clauses // This is the array of strings
    };

    console.log("🚀 Sending Clean Payload:", payload);

    if (editingId) {
      await updateAgreement.mutateAsync({ id: editingId, data: payload });
    } else {
      await createAgreement.mutateAsync(payload);
    }

    // 2. Trigger Auto-Download
    handleExportPDF(form, clauses);

    // 3. Reset UI
    setIsFormVisible(false);
    setEditingId(null);
    setStage(1);

  } catch (error: any) {
    console.error("❌ Save Failed:", error.response?.data);
    alert("Error: " + (error.response?.data?.message || "Check your inputs"));
  }
};

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    const parsedClauses = typeof a.clauses === 'string' ? JSON.parse(a.clauses) : a.clauses;
    setForm({ ...a, price: a.price.toString(), buyerName: a.client?.name || '', buyerNida: a.buyerNida || '' });
    setClauses(parsedClauses);
    setIsFormVisible(true);
    setStage(1);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* HIDDEN PORTAL */}
      {exportData && (
        <div style={{ position: 'absolute', left: '-5000px', top: 0 }}>
          <AgreementTemplate 
            data={exportData.data} 
            clauses={exportData.clauses} 
            muuzaji={exportData.data.type === 'Kuuza' ? 'HIGHLAND PROPERTY COMPANY LIMITED' : (exportData.data.buyerName?.toUpperCase() || 'BUYER NAME')} 
            mnunuzi={exportData.data.type === 'Kuuza' ? (exportData.data.buyerName?.toUpperCase() || 'BUYER NAME') : 'HIGHLAND PROPERTY COMPANY LIMITED'} 
          />
        </div>
      )}

      <div className="flex justify-between items-center no-print">
        <h1 className="text-3xl font-black">Contract Hub</h1>
        {!isFormVisible && canCreate('agreements') && (
          <Button onClick={() => setIsFormVisible(true)} className="bg-blue-600 px-8 py-6 rounded-2xl text-white font-bold shadow-xl shadow-blue-100">
            <Plus size={20} className="mr-2"/> New Agreement
          </Button>
        )}
      </div>

      {canCreate('agreements') && isFormVisible ? (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 space-y-4 no-print">
            <Card>
              <CardBody className="space-y-6">
                <Badge variant="info">STAGE {stage}</Badge>
                {stage === 1 && (
                  <div className="space-y-4">
                    <select className="w-full border-2 p-3 rounded-xl bg-white font-bold" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                      <option value="Kuuza">Sale (Highland is Seller)</option>
                      <option value="Kununua">Purchase (Highland is Buyer)</option>
                    </select>
                    <select className="w-full border-2 p-3 rounded-xl bg-white" value={form.clientId} onChange={e => {
                      const c = clientsData?.data.find((x:any) => x.id === e.target.value);
                      setForm({...form, clientId: c?.id || '', buyerName: c?.name || '', buyerPhone: c?.phone || '', buyerNida: c?.nida || ''});
                    }}>
                      <option value="">Select client...</option>
                      {clientsData?.data.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input placeholder="19981226-59421-00001-20" className="w-full border-2 p-3 rounded-xl bg-white" value={form.buyerNida} onChange={e => setForm({...form, buyerNida: formatNidaInput(e.target.value)})} />
                    <Button fullWidth onClick={() => setStage(2)}>Next</Button>
                  </div>
                )}
                {stage === 2 && (
                  <div className="space-y-3">
                    <input placeholder="Plot" className="border-2 p-3 rounded-xl w-full" value={form.plotNo} onChange={e => setForm({...form, plotNo: e.target.value})} />
                    <input placeholder="Price Words" className="border-2 p-3 rounded-xl w-full" value={form.priceWords} onChange={e => setForm({...form, priceWords: e.target.value})} />
                    <input placeholder="Price TZS" className="border-2 p-3 rounded-xl w-full font-black" value={form.price} onChange={e => setForm({...form, price: maskTZS(e.target.value)})} />
                    <Button fullWidth onClick={() => setStage(3)}>Next</Button>
                  </div>
                )}
                {stage === 3 && (
                  <div className="space-y-4">
                    <div className="max-h-[350px] overflow-y-auto space-y-3">
                      {clauses.map((c, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl border group relative">
                          <textarea className="w-full bg-transparent text-xs outline-none" rows={3} value={c} onChange={e => { const n = [...clauses]; n[i] = e.target.value; setClauses(n); }} />
                          <div className="flex gap-2 mt-2">
                             <button onClick={() => setClauses([...clauses.slice(0, i+1), "Sharti Jipya...", ...clauses.slice(i+1)])} className="text-[9px] font-bold text-blue-600">+ INSERT</button>
                             <button onClick={() => setClauses(clauses.filter((_, idx) => idx !== i))} className="text-[9px] font-bold text-red-600">DELETE</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button fullWidth onClick={() => setStage(4)}>Preview</Button>
                  </div>
                )}
                {stage === 4 && (
                  <div className="space-y-3">
                    <Button fullWidth onClick={handleSave} className="bg-blue-600 py-6 text-white font-bold shadow-lg">Save & Download PDF</Button>
                    <Button variant="ghost" fullWidth onClick={() => setIsFormVisible(false)}>Cancel</Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="flex-1 bg-slate-300 p-10 overflow-y-auto h-[85vh] rounded-[2.5rem] flex flex-col items-center gap-12 shadow-inner">
             <AgreementTemplate data={form} clauses={clauses} muuzaji={muuzaji} mnunuzi={mnunuzi} />
          </div>
        </div>
      ) : (
        /* TABLE LISTING */
        <Card>
          <CardBody>
            {isLoading ? <Loading /> : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left border-separate border-spacing-y-3 px-8">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-8">
                      <th className="px-8">System ID</th><th className="px-8">Party Name</th><th className="px-8">Type</th><th className="px-8 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent">
                    {agData?.data.map((a: any) => (
                      <tr key={a.id} onDoubleClick={() => setSelectedAgreementDetail(a)} className="group hover:translate-x-1 transition-all duration-300 cursor-pointer">
                        <td className="px-8 py-6 bg-white first:rounded-l-2xl border-y border-l border-gray-100 font-black text-blue-600">#AGR-{a.id.slice(0,5).toUpperCase()}</td>
                        <td className="px-8 py-6 bg-white border-y border-gray-100 font-black text-stone-800">{a.client?.name}</td>
                        <td className="px-8 py-6 bg-white border-y border-gray-100"><Badge variant="info">{a.type.toUpperCase()}</Badge></td>
                        <td className="px-8 py-6 bg-white last:rounded-r-2xl border-y border-r border-gray-100 text-right">
                           <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {canEdit('agreements') && (
                               <button onClick={() => handleEdit(a)} className="p-3 text-amber-500 bg-white border rounded-xl shadow-sm"><Edit3 size={18}/></button>
                             )}
                             <button onClick={() => handleExportPDF(a, typeof a.clauses === 'string' ? JSON.parse(a.clauses) : a.clauses)} className="p-3 text-blue-500 bg-white border rounded-xl shadow-sm"><Download size={18}/></button>
                             {canDelete('agreements') && (
                               <button onClick={() => deleteAgreement.mutate(a.id)} className="p-3 text-rose-500 bg-white border rounded-xl shadow-sm"><Trash2 size={18}/></button>
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
      )}

      <Modal isOpen={!!selectedAgreementDetail} onClose={() => setSelectedAgreementDetail(null)} title="Agreement Full Detail">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-[2px] text-gray-400 font-black">Agreement</p>
              <h3 className="text-2xl font-black text-gray-900">#AGR-{selectedAgreementDetail?.id?.slice(0,5).toUpperCase()}</h3>
              <p className="text-sm text-gray-500">Party: {selectedAgreementDetail?.client?.name}</p>
              <p className="text-sm text-gray-500">Type: {selectedAgreementDetail?.type}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6">
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black mb-3">
                <span>Plot</span>
                <span>{selectedAgreementDetail?.plotNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black mb-3">
                <span>Size</span>
                <span>{selectedAgreementDetail?.size || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black">
                <span>Price</span>
                <span>TZS {formatCurrency(selectedAgreementDetail?.price || 0)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6">
            <h4 className="text-lg font-black mb-3">Contract Clauses</h4>
            <div className="space-y-2 text-sm text-slate-600">
              {(typeof selectedAgreementDetail?.clauses === 'string' ? JSON.parse(selectedAgreementDetail.clauses) : selectedAgreementDetail?.clauses || []).map((clause: string, idx: number) => (
                <p key={idx}>{idx + 1}. {clause}</p>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={() => handleExportPDF(selectedAgreementDetail, typeof selectedAgreementDetail?.clauses === 'string' ? JSON.parse(selectedAgreementDetail.clauses) : selectedAgreementDetail?.clauses)} className="bg-blue-600 text-white px-6 py-3">
              Download PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AgreementsPage;