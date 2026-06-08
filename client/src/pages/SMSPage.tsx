import React, { useState, useMemo } from 'react';
import { useSmsApi, useClientsApi, useSettingsApi } from '../api/hooks';
import { Card, CardBody, Loading, Button, Badge, Modal } from '../components/common';
import { Plus, Trash2, Edit2, Send, MessageSquare, Eye, CheckCircle2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SmsPage = () => {
  const { createSms, getSms, updateSms, deleteSms, sendBulkSmsByType } = useSmsApi();
  const { getClients } = useClientsApi();
  const { getSettings } = useSettingsApi();
  const { user } = useAuth();
  const role = user?.role || '';
  const isBulkSending = sendBulkSmsByType.status === 'pending';
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [recipientType, setRecipientType] = useState('buyer');
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkCategory, setBulkCategory] = useState('Boost Adds');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const [form, setForm] = useState({
    fullName: '',
    location: '',
    phone: '+255',
    category: 'Boost Adds',
    message: ''
  });

  const customersQuery = getClients({ type: recipientType, page: 1, limit: 1 });
  const customerCount = customersQuery.data?.total || 0;

  const { data: settings } = getSettings();
  const isGatewayConnected = !!settings?.smsApiKey && !!settings?.smsSecret;

  const { data: smsData, isLoading } = getSms();
  const messages = smsData?.data || [];

  const categories = ['Boost Adds', 'Tenting to Offices', 'Flying'];

  const closeModal = () => {
    setIsFormVisible(false);
    setEditingId(null);
    setForm({
      fullName: '',
      location: '',
      phone: '+255',
      category: 'Boost Adds',
      message: ''
    });
  };

  const useTemplateForBulk = (sms: any) => {
    setSelectedTemplate(sms);
    setBulkMessage(sms.message || '');
    setBulkCategory(sms.category || 'Boost Adds');
  };

  const clearSelectedTemplate = () => setSelectedTemplate(null);

  const handleEdit = (sms: any) => {
    setEditingId(sms.id);
    setForm({
      fullName: sms.fullName,
      location: sms.location,
      phone: sms.phone,
      category: sms.category,
      message: sms.message || ''
    });
    setIsFormVisible(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userRole = role.toLowerCase();

    if (!form.message.trim()) {
      alert('Please enter message content.');
      return;
    }

    if (userRole !== 'general director' && (!form.phone.startsWith('+255') || form.phone.length < 10)) {
      alert('Phone must start with +255 and be at least 10 digits');
      return;
    }

    const payload = {
      ...form,
      fullName: userRole === 'general director' ? (form.fullName || 'General Director Message') : form.fullName,
      location: userRole === 'general director' ? (form.location || '') : form.location,
      phone: userRole === 'general director' ? (form.phone.startsWith('+255') ? form.phone : '+255000000000') : form.phone
    };

    if (editingId) {
      // Update mode
      await updateSms.mutateAsync({
        id: editingId,
        data: form
      });
    } else {
      // Create mode - Staff or General Director
      await createSms.mutateAsync(payload);
    }

    closeModal();
  };

  const handleSendBulkSms = async () => {
    if (role.toLowerCase() === 'general director') {
      alert('General Director cannot send directly to customers. Send this message to an admin for customer selection and delivery.');
      return;
    }

    if (!bulkMessage.trim()) {
      alert('Please enter a message to send');
      return;
    }

    if (!isGatewayConnected) {
      alert('SMS gateway is not connected. Configure it first in Settings > SMS Gateway.');
      return;
    }

    const confirmed = window.confirm(
      `Send this message to ${customerCount} ${recipientType === 'all' ? 'customers' : `${recipientType}s`}?`
    );
    if (!confirmed) return;

    await sendBulkSmsByType.mutateAsync({
      type: recipientType,
      category: bulkCategory,
      message: bulkMessage
    });

    if (selectedTemplate && role.toLowerCase() === 'admin') {
      try {
        await updateSms.mutateAsync({ id: selectedTemplate.id, data: { status: 'Sent' } });
      } catch (error) {
        console.warn('Failed to update template status after sending', error);
      }
      clearSelectedTemplate();
    }

    alert(`SMS gateway sent message to ${customerCount} ${recipientType === 'all' ? 'customers' : `${recipientType}s`}.`);
    setBulkMessage('');
  };

  const filteredMessages = useMemo(
    () => messages.filter((sms: any) =>
      sms.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sms.phone.includes(searchTerm) ||
      sms.location.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [messages, searchTerm]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Written': return 'warning';
      case 'Approved': return 'success';
      case 'Sent': return 'success';
      default: return 'secondary';
    }
  };

  const canEdit = (sms: any) => {
    if (sms.status === 'Draft' && role === 'staff') return true;
    if (sms.status === 'Draft' && ['Assistant Director', 'General Director'].includes(role)) return true;
    if (sms.status === 'Written' && role === 'General Director') return true;
    if (sms.status === 'Approved' && role === 'Admin') return true;
    return false;
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm no-print">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">SMS Communications</h1>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-60">
            Customer Messages • Approval Workflow
          </p>
        </div>
        {(role === 'staff' || role.toLowerCase() === 'general director') && (
          <Button 
            onClick={() => setIsFormVisible(true)} 
            className="bg-blue-600 px-8 py-6 rounded-2xl text-white font-bold shadow-xl shadow-blue-100"
          >
            <Plus size={20} className="mr-2"/> {role.toLowerCase() === 'general director' ? 'Compose Message for Admin' : 'New SMS Campaign'}
          </Button>
        )}
      </div>

      <div className="relative max-w-md no-print">
        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          placeholder="Search by name, phone, or location..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl shadow-sm outline-none font-bold"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* Role Information Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] font-bold text-blue-900 uppercase tracking-widest">
        <p>Your Role: {role || 'Guest'} • {getAccessLevel(role)}</p>
      </div>

      <Card>
        <CardBody>
          <div className="space-y-6 mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">SMS Gateway by Customer Type</h2>
                <p className="text-gray-500 text-sm mt-1">Send a single message to all buyers, sellers, or every customer in one click.</p>
              </div>
              <Badge variant={customerCount > 0 ? 'success' : 'secondary'}>
                {customersQuery.isLoading ? 'Loading customers...' : `${customerCount} ${recipientType === 'all' ? 'customers' : `${recipientType}s`}`}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Customer Type</label>
                <select
                  className="w-full border-2 border-gray-100 p-4 rounded-xl bg-white outline-none focus:border-blue-500"
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value)}
                >
                  <option value="buyer">Buyers</option>
                  <option value="seller">Sellers</option>
                  <option value="all">All Customers</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Campaign Category</label>
                <select
                  className="w-full border-2 border-gray-100 p-4 rounded-xl bg-white outline-none focus:border-blue-500"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Gateway Status</label>
                <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50 text-sm text-gray-700">
                  {!isGatewayConnected ? (
                    'SMS gateway is not connected. Go to Settings > SMS Gateway to configure API credentials.'
                  ) : customersQuery.isLoading ? (
                    'Checking customer segment...'
                  ) : customerCount > 0 ? (
                    `Ready to send to ${customerCount} customers.`
                  ) : (
                    'No matching customers found.'
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Bulk SMS Message</label>
              <textarea
                className="w-full border-2 border-gray-100 p-4 rounded-xl font-bold outline-none focus:border-blue-500 min-h-[120px]"
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder="Write the SMS text to send to selected customer type..."
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-gray-100">
              <p className="text-xs uppercase tracking-[0.35em] text-gray-400">This gateway sends SMS records to customers grouped by type.</p>
              <Button
                onClick={handleSendBulkSms}
                disabled={isBulkSending || customerCount === 0 || !isGatewayConnected || role.toLowerCase() === 'general director'}
                className="bg-emerald-600 px-8 py-5 rounded-2xl text-white font-bold shadow-xl shadow-emerald-100"
              >
                {role.toLowerCase() === 'general director' ? 'Admin only: Send to customers' : isBulkSending ? 'Sending...' : 'Send to Selected Type'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {isLoading ? (
            <Loading />
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">No SMS messages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left border-separate border-spacing-y-3 px-8">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-8">
                    <th className="px-8 py-2">Customer</th>
                    <th className="px-8 py-2">Category</th>
                    <th className="px-8 py-2">Phone</th>
                    <th className="px-8 py-2">Status</th>
                    <th className="px-8 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {filteredMessages.map((sms: any) => (
                    <tr 
                      key={sms.id}
                      onDoubleClick={() => setSelectedDetail(sms)}
                      className="group hover:translate-x-1 transition-all duration-300 cursor-pointer"
                    >
                      <td className="px-8 py-6 bg-white first:rounded-l-2xl border-y border-l border-gray-100">
                        <div className="font-black text-blue-600">{sms.fullName}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase">{sms.location}</div>
                      </td>
                      <td className="px-8 py-6 bg-white border-y border-gray-100">
                        <div className="font-bold text-xs text-gray-700">{sms.category}</div>
                      </td>
                      <td className="px-8 py-6 bg-white border-y border-gray-100">
                        <div className="font-mono text-sm text-gray-800">{sms.phone}</div>
                      </td>
                      <td className="px-8 py-6 bg-white border-y border-gray-100">
                        <Badge variant={getStatusColor(sms.status)}>{sms.status}</Badge>
                      </td>
                      <td className="px-8 py-6 bg-white last:rounded-r-2xl border-y border-r border-gray-100 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedDetail(sms)}
                            className="p-3 text-blue-600 bg-white border border-gray-100 rounded-xl hover:bg-blue-50 shadow-sm transition-all"
                          >
                            <Eye size={18}/>
                          </button>
                          {canEdit(sms) && (
                            <button 
                              onClick={() => handleEdit(sms)}
                              className="p-3 text-amber-500 bg-white border border-gray-100 rounded-xl hover:bg-amber-50 shadow-sm transition-all"
                            >
                              <Edit2 size={18}/>
                            </button>
                          )}
                          {role.toLowerCase() === 'admin' && ['Written', 'Approved'].includes(sms.status) && (
                            <button
                              onClick={() => useTemplateForBulk(sms)}
                              className="p-3 text-blue-600 bg-white border border-gray-100 rounded-xl hover:bg-blue-50 shadow-sm transition-all"
                              title="Prepare this message for customer send"
                            >
                              <Send size={18} />
                            </button>
                          )}
                          {role === 'admin' && sms.status === 'Approved' && (
                            <button 
                              onClick={() => updateSms.mutateAsync({ id: sms.id, data: { status: 'Sent' } })}
                              className="p-3 text-green-600 bg-white border border-gray-100 rounded-xl hover:bg-green-50 shadow-sm transition-all"
                            >
                              <Send size={18}/>
                            </button>
                          )}
                          {role === 'staff' && sms.status === 'Draft' && (
                            <button 
                              onClick={() => deleteSms.mutate(sms.id)}
                              className="p-3 text-rose-500 bg-white border border-gray-100 rounded-xl hover:bg-rose-50 shadow-sm transition-all"
                            >
                              <Trash2 size={18}/>
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

      {/* Detail Modal */}
      <Modal isOpen={!!selectedDetail} onClose={() => setSelectedDetail(null)} title="SMS Message Details">
        <div className="space-y-6">
          <div className="bg-gray-900 p-6 rounded-2xl text-white space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Name</p>
                <p className="text-xl font-black">{selectedDetail?.fullName}</p>
              </div>
              <Badge variant={getStatusColor(selectedDetail?.status)}>{selectedDetail?.status}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                <p className="font-mono font-bold">{selectedDetail?.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</p>
                <p className="font-bold">{selectedDetail?.location}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</p>
                <p className="font-bold">{selectedDetail?.category}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Message Content</h4>
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap">
              {selectedDetail?.message || '(No message content)'}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Workflow Status</h4>
            <div className="space-y-2">
              {selectedDetail?.preparedBy && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                  <User size={16} className="text-blue-600" />
                  <span className="text-xs font-bold">Created by: {selectedDetail?.preparedBy}</span>
                </div>
              )}
              {selectedDetail?.writtenBy && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold">Written by: {selectedDetail?.writtenBy}</span>
                </div>
              )}
              {selectedDetail?.approvedBy && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span className="text-xs font-bold">Approved by: {selectedDetail?.approvedBy}</span>
                </div>
              )}
              {selectedDetail?.sentBy && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                  <Send size={16} className="text-purple-600" />
                  <span className="text-xs font-bold">Sent by: {selectedDetail?.sentBy}</span>
                </div>
              )}
            </div>
          </div>

          {user?.role?.toLowerCase() === 'admin' && selectedDetail && !selectedDetail.isPublic && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={async ()=>{
                  try {
                    await updateSms.mutateAsync({ id: selectedDetail.id, data: { isPublic: true } });
                    alert('Message made visible to other users');
                  } catch (e:any) { alert('Failed to update visibility'); }
                }} className="bg-yellow-500 text-white">Allow Visibility</Button>
                {['Written', 'Approved'].includes(selectedDetail.status) && (
                  <Button onClick={() => {
                    useTemplateForBulk(selectedDetail);
                    setSelectedDetail(null);
                  }} className="bg-blue-600 text-white">Use for Customer Send</Button>
                )}
              </div>
            </div>
          )}

          <Button onClick={() => setSelectedDetail(null)} fullWidth className="py-3 font-black">Close</Button>
        </div>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={isFormVisible} onClose={closeModal} title={editingId ? "Edit SMS Message" : role.toLowerCase() === 'general director' ? "Compose Message for Admin" : "New SMS Campaign"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {role.toLowerCase() === 'general director' && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              General Director messages are drafted here and sent to admin for customer selection and delivery.
            </div>
          )}

          {role.toLowerCase() !== 'general director' && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Full Name *</label>
                <input 
                  className="w-full border-2 border-gray-100 p-4 rounded-xl font-bold outline-none focus:border-blue-500"
                  required
                  value={form.fullName}
                  onChange={e => setForm({...form, fullName: e.target.value})}
                  placeholder="Customer full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Location *</label>
                  <input 
                    className="w-full border-2 border-gray-100 p-4 rounded-xl font-bold outline-none focus:border-blue-500"
                    required
                    value={form.location}
                    onChange={e => setForm({...form, location: e.target.value})}
                    placeholder="City / Area"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Category *</label>
                  <select 
                    className="w-full border-2 border-gray-100 p-4 rounded-xl font-bold bg-white outline-none focus:border-blue-500"
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Phone Number (+255) *</label>
                <input 
                  className="w-full border-2 border-gray-100 p-4 rounded-xl font-mono font-bold outline-none focus:border-blue-500"
                  required
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="+255..."
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Message Content</label>
            <textarea 
              className="w-full border-2 border-gray-100 p-4 rounded-xl font-bold outline-none focus:border-blue-500 min-h-[120px]"
              value={form.message}
              onChange={e => setForm({...form, message: e.target.value})}
              placeholder="SMS message content..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={closeModal} type="button" className="px-8 py-4">Discard</Button>
            <Button 
              type="submit" 
              className={editingId ? 'bg-amber-600 px-12 py-4 text-white font-black shadow-lg' : 'bg-blue-600 px-12 py-4 text-white font-black shadow-lg'}
            >
              {editingId ? 'Update Message' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function getAccessLevel(role: string): string {
  switch (role) {
    case 'staff':
      return '📝 Can create messages';
    case 'Assistant Director':
      return '✏️ Can write and modify messages';
    case 'General Director':
      return '✍️ Can compose messages for admin to send';
    case 'Admin':
      return '📤 Can send approved messages';
    default:
      return '👁️ View only';
  }
}

export default SmsPage;