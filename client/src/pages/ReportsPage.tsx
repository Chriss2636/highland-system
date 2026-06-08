import { useState } from 'react';
import { useDailyReportsApi } from '../api/hooks';
import { Card, CardBody, Loading, Button, Badge, Modal } from '../components/common';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import { usePermissions } from '../hooks/permissions';
import { useAuth } from '../context/AuthContext';

const ReportsPage = () => {
  const { getReports, createReport, updateReport, deleteReport, approveReportAssistant, approveReportDirector } = useDailyReportsApi();
  const { canCreate, canEdit, canDelete, canApprove } = usePermissions();
  const { user } = useAuth();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState<any>(null);
  const [approvalComments, setApprovalComments] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    arrivalTime: '',
    salesTeam: '',
    teamLeader: '',
    mainActivities: '',
    clientProgress: '',
    siteVisit: '',
    tomorrowPlan: '',
    status: 'submitted'
  });

  const { data: reportsData, isLoading } = getReports();

  const handleSubmit = async () => {
    if (!form.arrivalTime || !form.salesTeam || !form.teamLeader) {
      return alert('Please fill in all required fields');
    }

    try {
      if (editingId) {
        // If editing, just update the report (not submitted yet)
        await updateReport.mutateAsync({ id: editingId, data: form });
        setIsFormVisible(false);
        resetForm();
      } else {
        await createReport.mutateAsync(form);
        setIsFormVisible(false);
        resetForm();
      }
    } catch (error) {
      alert('Failed to save report');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this daily report?')) return;
    try {
      await deleteReport.mutateAsync(id);
    } catch (error: any) {
      console.error('Delete report failed:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to delete report';
      alert(`Failed to delete report: ${message}`);
    }
  };

  const handleAssistantDirectorApprove = async (id: string, approved: boolean) => {
    try {
      await approveReportAssistant.mutateAsync({ id, comments: approvalComments, approved });
      setSelectedReportDetail(null);
      setApprovalComments('');
    } catch (error) {
      alert('Failed to process approval');
    }
  };

  const handleGeneralDirectorApprove = async (id: string, approved: boolean) => {
    try {
      await approveReportDirector.mutateAsync({ id, comments: approvalComments, approved });
      setSelectedReportDetail(null);
      setApprovalComments('');
    } catch (error) {
      alert('Failed to process approval');
    }
  };


  const handleEdit = (report: any) => {
    setForm({
      date: report.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      arrivalTime: report.arrivalTime || '',
      salesTeam: report.salesTeam || '',
      teamLeader: report.teamLeader || '',
      mainActivities: report.mainActivities || '',
      clientProgress: report.clientProgress || '',
      siteVisit: report.siteVisit || '',
      tomorrowPlan: report.tomorrowPlan || '',
      status: report.status || 'submitted'
    });
    setEditingId(report.id);
    setIsFormVisible(true);
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      arrivalTime: '',
      salesTeam: '',
      teamLeader: '',
      mainActivities: '',
      clientProgress: '',
      siteVisit: '',
      tomorrowPlan: '',
      status: 'submitted'
    });
    setEditingId(null);
  };


  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'final_approved': return 'success';
      case 'director_approved': return 'success';
      case 'pending_director': return 'info';
      case 'pending_assistant': return 'info';
      case 'rejected': return 'danger';
      default: return 'info';
    }
  };

  const getWorkflowStageLabel = (status: string) => {
    switch (status) {
      case 'pending_assistant': return 'Pending Assistant Director';
      case 'pending_director': return 'Pending General Director';
      case 'director_approved': return 'Approved by Director';
      case 'final_approved': return 'Fully Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Daily Reports</h1>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-60">Team Activity Tracking</p>
        </div>
        {canCreate('reports') && (
          <Button 
            onClick={() => { 
              resetForm();
              setIsFormVisible(!isFormVisible); 
            }} 
            className={isFormVisible ? "bg-gray-100 text-gray-600 px-8 py-6 rounded-2xl font-bold shadow-lg" : "bg-blue-600 px-8 py-6 rounded-2xl text-white font-bold shadow-xl shadow-blue-100"}
          >
            {isFormVisible ? 'Cancel' : <><Plus size={20} className="mr-2" />New Report</>}
          </Button>
        )}
      </div>

      {canCreate('reports') && isFormVisible && (
        <Card className="max-w-4xl mx-auto">
          <CardBody>
            <h2 className="text-2xl font-black mb-6">{editingId ? 'Edit Report' : 'New Daily Report'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Report Date</label>
                <input 
                  type="date" 
                  className="w-full border-2 p-3 rounded-lg font-bold" 
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Arrival Time *</label>
                <input 
                  type="time" 
                  className="w-full border-2 p-3 rounded-lg font-bold" 
                  value={form.arrivalTime}
                  onChange={e => setForm({...form, arrivalTime: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Sales Team *</label>
                <input 
                  type="text" 
                  placeholder="Team name" 
                  className="w-full border-2 p-3 rounded-lg" 
                  value={form.salesTeam}
                  onChange={e => setForm({...form, salesTeam: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Team Leader *</label>
                <input 
                  type="text" 
                  placeholder="Leader name" 
                  className="w-full border-2 p-3 rounded-lg" 
                  value={form.teamLeader}
                  onChange={e => setForm({...form, teamLeader: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 mt-6">
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Main Activities</label>
                <textarea 
                  placeholder="Describe main activities..." 
                  className="w-full border-2 p-3 rounded-lg h-24" 
                  value={form.mainActivities}
                  onChange={e => setForm({...form, mainActivities: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Client Progress</label>
                <textarea 
                  placeholder="Progress update..." 
                  className="w-full border-2 p-3 rounded-lg h-24" 
                  value={form.clientProgress}
                  onChange={e => setForm({...form, clientProgress: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Site Visit</label>
                <textarea 
                  placeholder="Site visit details..." 
                  className="w-full border-2 p-3 rounded-lg h-24" 
                  value={form.siteVisit}
                  onChange={e => setForm({...form, siteVisit: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Tomorrow's Plan</label>
                <textarea 
                  placeholder="Plans for tomorrow..." 
                  className="w-full border-2 p-3 rounded-lg h-24" 
                  value={form.tomorrowPlan}
                  onChange={e => setForm({...form, tomorrowPlan: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2 text-gray-700">Status</label>
                <select 
                  className="w-full border-2 p-3 rounded-lg font-bold"
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                >
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button onClick={handleSubmit} className="flex-1 bg-emerald-600 text-white font-black py-3">
                {editingId ? 'Update Report' : 'Submit Report'}
              </Button>
              <Button 
                onClick={() => { resetForm(); setIsFormVisible(false); }} 
                variant="ghost" 
                className="flex-1 py-3"
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* REPORTS TABLE */}
      <Card>
        <CardBody>
          {isLoading ? <Loading /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Team Leader</th>
                    <th className="px-6 py-3">Team</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData?.data?.length > 0 ? reportsData.data.map((report: any) => (
                    <tr key={report.id} onDoubleClick={() => setSelectedReportDetail(report)} className="group hover:translate-x-1 transition-all cursor-pointer">
                      <td className="px-6 py-4 bg-white first:rounded-l-2xl border-y border-l border-gray-100">
                        <div className="font-bold text-gray-900">
                          {new Date(report.date).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-6 py-4 bg-white border-y border-gray-100">
                        <div className="font-bold text-gray-800">{report.teamLeader}</div>
                      </td>
                      <td className="px-6 py-4 bg-white border-y border-gray-100">
                        <div className="text-sm text-gray-600">{report.salesTeam}</div>
                      </td>
                      <td className="px-6 py-4 bg-white border-y border-gray-100">
                        <Badge variant={getStatusVariant(report.workflowStatus || 'pending_assistant')}>{getWorkflowStageLabel(report.workflowStatus || 'pending_assistant')}</Badge>
                      </td>
                      <td className="px-6 py-4 bg-white last:rounded-r-2xl border-y border-r border-gray-100 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit('reports') && (
                            <button 
                              onClick={() => handleEdit(report)}
                              className="p-3 text-blue-600 hover:bg-blue-50 border border-blue-50 rounded-xl transition-all shadow-sm bg-white"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          {canApprove('reports') && report.workflowStatus === 'pending_assistant' && user?.role?.toLowerCase() === 'assistant director' && (
                            <button 
                              onClick={() => setSelectedReportDetail(report)}
                              className="p-3 text-green-600 hover:bg-green-50 border border-green-50 rounded-xl transition-all shadow-sm bg-white"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {canApprove('reports') && report.workflowStatus === 'pending_director' && user?.role?.toLowerCase() === 'general director' && (
                            <button 
                              onClick={() => setSelectedReportDetail(report)}
                              className="p-3 text-green-600 hover:bg-green-50 border border-green-50 rounded-xl transition-all shadow-sm bg-white"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {canDelete('reports') && (
                            <button 
                              onClick={() => handleDelete(report.id)}
                              className="p-3 text-rose-500 hover:bg-rose-50 border border-rose-50 rounded-xl transition-all shadow-sm bg-white"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        No reports yet. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={!!selectedReportDetail} onClose={() => setSelectedReportDetail(null)} title="Daily Report Detail">
        <div className="space-y-6">
          {/* Header with workflow status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-[2px] text-gray-400 font-black">Report Date</p>
              <h3 className="text-2xl font-black text-gray-900">{new Date(selectedReportDetail?.date).toLocaleDateString('en-GB')}</h3>
              <p className="text-sm text-gray-500">Team Leader: {selectedReportDetail?.teamLeader}</p>
              <p className="text-sm text-gray-500">Sales Team: {selectedReportDetail?.salesTeam}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6">
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black mb-3">
                <span>Workflow Status</span>
                <Badge variant={getStatusVariant(selectedReportDetail?.workflowStatus || 'pending_assistant')}>{getWorkflowStageLabel(selectedReportDetail?.workflowStatus)}</Badge>
              </div>
              <div className="flex justify-between text-sm text-slate-500 uppercase font-black">
                <span>Arrival</span>
                <span>{selectedReportDetail?.arrivalTime}</span>
              </div>
            </div>
          </div>

          {/* Report Details */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
            <div>
              <h4 className="text-lg font-black">Main Activities</h4>
              <p className="text-sm text-slate-600 whitespace-pre-line">{selectedReportDetail?.mainActivities || 'No activity details available.'}</p>
            </div>
            <div>
              <h4 className="text-lg font-black">Client Progress</h4>
              <p className="text-sm text-slate-600 whitespace-pre-line">{selectedReportDetail?.clientProgress || 'No client progress recorded.'}</p>
            </div>
            <div>
              <h4 className="text-lg font-black">Site Visit</h4>
              <p className="text-sm text-slate-600 whitespace-pre-line">{selectedReportDetail?.siteVisit || 'No site visit details provided.'}</p>
            </div>
            <div>
              <h4 className="text-lg font-black">Tomorrow's Plan</h4>
              <p className="text-sm text-slate-600 whitespace-pre-line">{selectedReportDetail?.tomorrowPlan || 'No plan for tomorrow provided.'}</p>
            </div>
          </div>

          {/* Workflow Approval Trail */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
            <h4 className="text-lg font-black">Approval Workflow</h4>
            
            {/* Assistant Director Stage */}
            <div className={`p-4 border-l-4 rounded-lg ${selectedReportDetail?.assistantDirectorApprovedAt ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}>
              <p className="text-sm font-bold text-gray-700">Assistant Director Review</p>
              {selectedReportDetail?.assistantDirectorComments && (
                <p className="text-xs text-gray-600 mt-2">Comment: {selectedReportDetail.assistantDirectorComments}</p>
              )}
              {selectedReportDetail?.assistantDirectorApprovedAt && (
                <p className="text-xs text-gray-500 mt-1">Approved: {new Date(selectedReportDetail.assistantDirectorApprovedAt).toLocaleString()}</p>
              )}
            </div>

            {/* General Director Stage */}
            {selectedReportDetail?.workflowStatus !== 'pending_assistant' && (
              <div className={`p-4 border-l-4 rounded-lg ${selectedReportDetail?.generalDirectorApprovedAt ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'}`}>
                <p className="text-sm font-bold text-gray-700">General Director Review</p>
                {selectedReportDetail?.generalDirectorComments && (
                  <p className="text-xs text-gray-600 mt-2">Comment: {selectedReportDetail.generalDirectorComments}</p>
                )}
                {selectedReportDetail?.generalDirectorApprovedAt && (
                  <p className="text-xs text-gray-500 mt-1">Approved: {new Date(selectedReportDetail.generalDirectorApprovedAt).toLocaleString()}</p>
                )}
              </div>
            )}

          </div>

          {user?.role?.toLowerCase() === 'assistant director' && selectedReportDetail?.workflowStatus === 'pending_assistant' && (
            <div className="space-y-4 bg-blue-50 p-6 rounded-lg">
              <textarea
                placeholder="Add your approval comments..."
                className="w-full border-2 p-3 rounded-lg h-24"
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
              />
              <div className="flex gap-3">
                <Button 
                  onClick={() => handleAssistantDirectorApprove(selectedReportDetail.id, true)}
                  className="flex-1 bg-green-600 text-white"
                >
                  <Check size={16} className="mr-2" /> Approve with Comment
                </Button>
                <Button 
                  onClick={() => handleAssistantDirectorApprove(selectedReportDetail.id, false)}
                  className="flex-1 bg-red-600 text-white"
                >
                  Reject
                </Button>
                <Button 
                  onClick={() => setApprovalComments('')}
                  variant="ghost"
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
          {user?.role?.toLowerCase() === 'general director' && selectedReportDetail?.workflowStatus === 'pending_director' && (
            <div className="space-y-4 bg-blue-50 p-6 rounded-lg">
              <textarea
                placeholder="Add your approval comments..."
                className="w-full border-2 p-3 rounded-lg h-24"
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
              />
              <div className="flex gap-3">
                <Button 
                  onClick={() => handleGeneralDirectorApprove(selectedReportDetail.id, true)}
                  className="flex-1 bg-green-600 text-white"
                >
                  <Check size={16} className="mr-2" /> Approve with Comment
                </Button>
                <Button 
                  onClick={() => handleGeneralDirectorApprove(selectedReportDetail.id, false)}
                  className="flex-1 bg-red-600 text-white"
                >
                  Reject
                </Button>
                <Button 
                  onClick={() => setApprovalComments('')}
                  variant="ghost"
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ReportsPage;
