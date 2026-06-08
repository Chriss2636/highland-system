import React, { useState } from 'react';
import { useSettingsApi, useUsersApi } from '../api/hooks';
import { Card, CardBody, Loading, Button, Badge, Modal } from '../components/common';
import { Building2, Users, MessageSquare, Save, Trash2, Camera, UserPlus, Key } from 'lucide-react';
import { formatNidaInput } from '../utils';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const initialUserForm = {
    fullName: '',
    email: '',
    password: '',
    role: 'Staff',
    tinNumber: '',
    securityQuestions: ['', '', ''],
    avatar: ''
  };
  const NIDA_FORMAT_REGEX = /^\d{8}-\d{5}-\d{5}-\d{2}$/;
  const formatTinNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 20) return value;
    return `${digits.slice(0, 8)}-${digits.slice(8, 13)}-${digits.slice(13, 18)}-${digits.slice(18)}`;
  };
  const [newUser, setNewUser] = useState(initialUserForm);
  
  const { getSettings, updateSettings } = useSettingsApi();
  const { getUsers, createUser, deleteUser, fetchUser, updateUser, forceResetUser } = useUsersApi();

  const handlePassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPassportPreview(result);
      setNewUser((prev) => ({ ...prev, avatar: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditPassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setEditPassportPreview(result);
      setEditForm((prev: any) => ({ ...prev, avatar: result }));
    };
    reader.readAsDataURL(file);
  };

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editPassportPreview, setEditPassportPreview] = useState<string | null>(null);

  const { data: settings } = getSettings();
  const { data: usersData, isLoading: usersLoading } = getUsers();

  // Roles formatting for Badge colors
  const getRoleBadgeVariant = (role: string) => {
    if (role === 'General Director') return 'success';
    if (role === 'Assistant Director') return 'warning';
    if (role === 'Finance Manager') return 'info';
    if (role === 'Admin') return 'danger';
    return 'info';
  };

  // --- HANDLERS ---
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    await updateSettings.mutateAsync({
      ...data,
      logoUrl: logoPreview || settings?.logoUrl
    });
    alert("✅ Company profile updated!");
  };

  const handleUpdateSmsSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    await updateSettings.mutateAsync({
      ...settings,
      ...data,
      logoUrl: logoPreview || settings?.logoUrl
    });
    alert("✅ SMS gateway settings saved!");
  };

  const resetRegistrationForm = () => {
    setNewUser(initialUserForm);
    setPassportPreview(null);
    setRegistrationStep(1);
  };

  const openUserModal = () => {
    resetRegistrationForm();
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    resetRegistrationForm();
    setIsUserModalOpen(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.tinNumber.trim()) {
      alert('Please enter the user NIDA before proceeding.');
      setRegistrationStep(1);
      return;
    }

    const formattedTin = formatTinNumber(newUser.tinNumber);
    if (registrationStep === 1) {
      if (!NIDA_FORMAT_REGEX.test(formattedTin)) {
        alert('Please enter the user NIDA in the format 19981226-59421-00001-20');
        return;
      }
      setNewUser({ ...newUser, tinNumber: formattedTin });
      setRegistrationStep(2);
      return;
    }

    const questions = newUser.securityQuestions.map((question) => question.trim());
    if (questions.some((question) => !question)) {
      alert('Please set all three security questions.');
      return;
    }

    const payload = {
      ...newUser,
      tinNumber: formatTinNumber(newUser.tinNumber),
      securityQuestions: questions,
      avatar: newUser.avatar || null
    };

    try {
      const created = await createUser.mutateAsync(payload);
      closeUserModal();
      setSelectedUser(created.user || created);
      alert('✅ User registered successfully. They will answer these questions on first login.');
    } catch (err) {
      alert("❌ Email is already registered or system error.");
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Administration</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Global configuration & System Access Control</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* SIDEBAR TABS */}
        <div className="lg:w-1/4 space-y-3 no-print">
          {[
            { id: 'company', label: 'Company Profile', icon: <Building2 size={18}/> },
            { id: 'users', label: 'Access Control', icon: <Users size={18}/> },
            { id: 'sms', label: 'SMS Gateway', icon: <MessageSquare size={18}/> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-4 px-6 py-5 rounded-[1.5rem] font-black transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-[1.02]' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {tab.icon} <span className="text-sm uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1">
          {activeTab === 'company' && (
            <Card className="rounded-[2.5rem] border-none shadow-sm animate-in slide-in-from-right-4">
              <CardBody className="p-10">
                <form onSubmit={handleUpdateSettings} className="space-y-10">
                  <div className="flex items-center space-x-8 border-b pb-8 border-gray-50">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                        {(logoPreview || settings?.logoUrl) ? (
                          <img src={logoPreview || settings?.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                          <Building2 size={40} className="text-gray-200" />
                        )}
                      </div>
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer rounded-[2rem] transition-all">
                        <Camera size={24} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Entity Branding</h3>
                      <p className="text-gray-400 text-sm mt-1">Logo used for Invoices and Agreements.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Official Name</label>
                      <input name="name" defaultValue={settings?.name} className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:border-blue-500 outline-none font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">TIN / VRN</label>
                      <input name="tin" defaultValue={settings?.tin} className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone</label>
                      <input name="phone" defaultValue={settings?.phone} className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Physical Address</label>
                      <input name="address" defaultValue={settings?.address} className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:border-blue-500 outline-none" />
                    </div>
                  </div>

                  <Button type="submit" className="bg-blue-600 px-12 py-5 text-white font-black rounded-2xl shadow-lg shadow-blue-100 uppercase text-xs tracking-widest">
                    <Save size={18} className="mr-2"/> Save Profile
                  </Button>
                </form>
              </CardBody>
            </Card>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-gray-100">
                 <div>
                   <h2 className="text-xl font-black text-gray-900 uppercase">Registered Users</h2>
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Access Levels & Permissions</p>
                 </div>
                 <Button onClick={openUserModal} className="bg-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-xl shadow-blue-100 tracking-widest">
                   <UserPlus size={18} className="mr-2"/> Register New User
                 </Button>
              </div>
              
              <Card className="rounded-[2.5rem] border-none shadow-sm">
                <CardBody>
                    {usersLoading ? <Loading /> : (
                      <div className="overflow-x-auto -mx-6">
                        <table className="w-full text-left border-separate border-spacing-y-3">
                      <thead>
                        <tr className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] px-8">
                          <th className="px-8 py-2">User Identity</th>
                          <th className="px-8 py-2">Access Role</th>
                          <th className="px-8 py-2">NIDA</th>
                          <th className="px-8 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersData?.data?.map((u: any) => (
                          <tr key={u.id} onDoubleClick={async () => {
                              try {
                                const res = await fetchUser(u.id);
                                setSelectedUser(res.user || res);
                              } catch (e) {
                                // fallback to list item
                                setSelectedUser(u);
                              }
                            }} className="group hover:translate-x-1 transition-all duration-300 cursor-pointer">
                            <td className="px-8 py-6 bg-gray-50/50 first:rounded-l-3xl border-y border-l border-gray-100">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  {u.avatar ? (
                                    <img src={u.avatar} alt={u.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="text-xs font-black text-gray-400 uppercase">N/A</div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-black text-gray-900 text-sm uppercase">{u.fullName}</div>
                                  <div className="text-[10px] text-gray-400 font-bold tracking-tight">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 bg-gray-50/50 border-y border-gray-100">
                              <Badge variant={getRoleBadgeVariant(u.role)}>{u.role.toUpperCase()}</Badge>
                            </td>
                            <td className="px-8 py-6 bg-gray-50/50 border-y border-gray-100">
                              <span className="font-bold text-slate-900 text-sm">{u.tinNumber || 'N/A'}</span>
                            </td>
                            <td className="px-8 py-6 bg-gray-50/50 last:rounded-r-3xl border-y border-r border-gray-100 text-right">
                              {String(u.role || '').toLowerCase() !== 'admin' && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm('Force-reset this user password?')) return;
                                    try {
                                      const res = await forceResetUser.mutateAsync({ id: u.id });
                                      alert(`✅ Password reset. New password: ${res.newPassword}`);
                                    } catch (err) {
                                      console.error(err);
                                      alert('❌ Password reset failed');
                                    }
                                  }}
                                  className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm border mr-2"
                                >
                                  <Key size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => { if(window.confirm('Remove this user?')) deleteUser.mutate(u.id) }} 
                                className="p-3 text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm border"
                              >
                                <Trash2 size={18}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {activeTab === 'sms' && (
            <Card className="rounded-[2.5rem] border-none shadow-sm animate-in slide-in-from-right-4">
              <CardBody className="p-10">
                <div className="space-y-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-black text-gray-900 uppercase">SMS Gateway</h2>
                    <p className="text-sm text-gray-500">Configure the SMS API credentials used for customer messaging and bulk campaigns.</p>
                  </div>

                  <form onSubmit={handleUpdateSmsSettings} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">SMS API Key</label>
                        <input
                          name="smsApiKey"
                          defaultValue={settings?.smsApiKey || ''}
                          className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:border-blue-500 outline-none"
                          placeholder="Enter SMS API key"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">SMS Secret</label>
                        <input
                          name="smsSecret"
                          defaultValue={settings?.smsSecret || ''}
                          className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:border-blue-500 outline-none"
                          placeholder="Enter SMS API secret"
                        />
                      </div>
                    </div>


                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
                      <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Save API credentials for future SMS campaigns.</p>
                      <Button type="submit" className="bg-blue-600 px-10 py-4 rounded-2xl text-white font-bold shadow-xl shadow-blue-100">
                        Save SMS Settings
                      </Button>
                    </div>
                  </form>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* USER REGISTRATION MODAL */}
      <Modal isOpen={isUserModalOpen} onClose={closeUserModal} title="System Access Control">
        <form onSubmit={handleCreateUser} className="space-y-6 py-4 text-left">
          {registrationStep === 1 ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">User NIDA</label>
                <input
                  value={newUser.tinNumber}
                  onChange={(e) => setNewUser({ ...newUser, tinNumber: formatNidaInput(e.target.value) })}
                  required
                  className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-blue-500 outline-none"
                  placeholder="19981226-59421-00001-20"
                />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Enter the user's national ID number before defining security questions.</p>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-50">
                <Button variant="ghost" fullWidth type="button" onClick={closeUserModal} className="py-4">Cancel</Button>
                <Button type="submit" fullWidth className="bg-blue-600 text-white font-black py-4 shadow-xl" disabled={createUser.isPending}>
                  Continue to Security Questions
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Holder Name</label>
                  <input
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    required
                    className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-blue-500 outline-none"
                    placeholder="e.g. Careen Benny"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    type="email"
                    required
                    className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-blue-500"
                    placeholder="user@highland.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Password</label>
                  <input
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    type="password"
                    required
                    className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Permission Level</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none bg-white font-bold h-[60px]"
                  >
                    <option value="General Director">General Director</option>
                    <option value="Assistant Director">Assistant Director</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Admin">System Administrator</option>
                    <option value="Staff">Regular Staff</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Passport Photo</label>
                  <div className="flex items-center gap-4">
                    <label className="w-24 h-24 rounded-3xl border-2 border-dashed border-gray-200 bg-white flex items-center justify-center cursor-pointer overflow-hidden">
                      {passportPreview ? (
                        <img src={passportPreview} alt="Passport preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] uppercase text-gray-400 font-black text-center">Upload</span>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePassportChange} />
                    </label>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Passport picture for user profile display.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Security Questions</label>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">3 questions required</span>
                </div>
                {newUser.securityQuestions.map((question, index) => (
                  <input
                    key={index}
                    value={question}
                    onChange={(e) => {
                      const updatedQuestions = [...newUser.securityQuestions];
                      updatedQuestions[index] = e.target.value;
                      setNewUser({ ...newUser, securityQuestions: updatedQuestions });
                    }}
                    required
                    className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-blue-500"
                    placeholder={`Security question ${index + 1}`}
                  />
                ))}
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">These questions will be presented to the user on first login.</p>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-50">
                <Button variant="ghost" fullWidth type="button" onClick={() => setRegistrationStep(1)} className="py-4">Back to NIDA</Button>
                <Button type="submit" fullWidth className="bg-blue-600 text-white font-black py-4 shadow-xl" disabled={createUser.isPending}>
                  {createUser.isPending ? 'Syncing...' : 'Register User'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>
      <Modal isOpen={!!selectedUser} onClose={() => { setSelectedUser(null); setEditMode(false); setEditForm(null); }} title="Registered User Details">
        {selectedUser ? (
          !editMode ? (
            <div className="space-y-4 text-sm text-slate-700">
              {selectedUser.avatar && (
                <div className="flex justify-center">
                  <div className="w-28 h-28 rounded-3xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={selectedUser.avatar} alt={selectedUser.fullName} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Name</h3>
                  <p className="font-bold text-slate-900">{selectedUser.fullName}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Email</h3>
                  <p className="font-bold text-slate-900">{selectedUser.email}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Role</h3>
                  <p className="font-bold text-slate-900">{selectedUser.role}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Status</h3>
                  <p className="font-bold text-slate-900">{selectedUser.status || 'Active'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">NIDA</h3>
                  <p className="font-bold text-slate-900">{selectedUser.tinNumber || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Phone</h3>
                  <p className="font-bold text-slate-900">{selectedUser.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Bank</h3>
                  <p className="font-bold text-slate-900">{selectedUser.bankName || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Bank Account</h3>
                  <p className="font-bold text-slate-900">{selectedUser.bankAccountName ? `${selectedUser.bankAccountName} • ${selectedUser.bankAccountNumber}` : 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Kin Name</h3>
                  <p className="font-bold text-slate-900">{selectedUser.kinName || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Kin Relation</h3>
                  <p className="font-bold text-slate-900">{selectedUser.kinRelation || 'N/A'}</p>
                </div>
                <div className="sm:col-span-2">
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Kin Phone</h3>
                  <p className="font-bold text-slate-900">{selectedUser.kinPhone || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Security Questions</h3>
                {selectedUser.securityQuestions?.length > 0 ? (
                  <ul className="list-disc list-inside text-slate-900 space-y-2">
                    {selectedUser.securityQuestions.map((q: string, idx: number) => (
                      <li key={idx} className="text-sm font-bold">{q}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-bold text-slate-900">No questions set</p>
                )}
              </div>
              <div className="mt-6 text-right">
                <Button type="button" onClick={() => { setEditMode(true); setEditForm({ ...selectedUser }); setEditPassportPreview(selectedUser.avatar || null); }} className="mr-3 bg-yellow-500 text-white py-3 px-4 rounded-2xl uppercase tracking-widest text-xs">Edit</Button>
                <Button type="button" onClick={() => setSelectedUser(null)} className="bg-slate-900 text-white py-3 px-6 rounded-2xl uppercase tracking-widest text-xs">Close</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-400">Name</label>
                  <input value={editForm.fullName || ''} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Email</label>
                  <input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Role</label>
                  <input value={editForm.role || ''} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Status</label>
                  <input value={editForm.status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full border p-2 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-400">NIDA</label>
                  <input value={editForm.tinNumber || ''} onChange={(e) => setEditForm({ ...editForm, tinNumber: formatNidaInput(e.target.value) })} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Phone</label>
                  <input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border p-2 rounded" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase text-slate-400">Passport Photo</label>
                <div className="flex items-center gap-4">
                  <label className="w-24 h-24 rounded-3xl border-2 border-dashed border-gray-200 bg-white flex items-center justify-center cursor-pointer overflow-hidden">
                    {editPassportPreview ? (
                      <img src={editPassportPreview} alt="Passport preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] uppercase text-gray-400 font-black text-center">Upload</span>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditPassportChange} />
                  </label>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Update the user's profile photo.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-400">Bank</label>
                  <input value={editForm.bankName || ''} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Bank Account Name</label>
                  <input value={editForm.bankAccountName || ''} onChange={(e) => setEditForm({ ...editForm, bankAccountName: e.target.value })} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Bank Account Number</label>
                  <input value={editForm.bankAccountNumber || ''} onChange={(e) => setEditForm({ ...editForm, bankAccountNumber: e.target.value })} className="w-full border p-2 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-400">Next of Kin Name</label>
                  <input value={editForm.kinName || ''} onChange={(e) => setEditForm({ ...editForm, kinName: e.target.value })} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">Kin Relation</label>
                  <input value={editForm.kinRelation || ''} onChange={(e) => setEditForm({ ...editForm, kinRelation: e.target.value })} className="w-full border p-2 rounded" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase text-slate-400">Kin Phone</label>
                  <input value={editForm.kinPhone || ''} onChange={(e) => setEditForm({ ...editForm, kinPhone: e.target.value })} className="w-full border p-2 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest">Security Questions (optional)</h3>
                {(editForm.securityQuestions || []).concat(['','','']).slice(0,3).map((_: any, idx: number) => (
                  <input key={idx} value={editForm.securityQuestions?.[idx] || ''} onChange={(e) => {
                    const sq = Array.isArray(editForm.securityQuestions) ? [...editForm.securityQuestions] : [];
                    sq[idx] = e.target.value;
                    setEditForm({ ...editForm, securityQuestions: sq });
                  }} className="w-full border p-2 rounded" placeholder={`Security question ${idx+1}`} />
                ))}
              </div>
              <div className="mt-6 text-right">
                <Button type="button" onClick={async () => {
                  try {
                    if (editForm?.tinNumber && !NIDA_FORMAT_REGEX.test(editForm.tinNumber)) {
                      alert('NIDA must be in the format 19981226-59421-00001-20.');
                      return;
                    }
                    const dataToSend = { ...editForm };
                    await updateUser.mutateAsync({ id: selectedUser.id, data: dataToSend });
                    const res = await fetchUser(selectedUser.id);
                    setSelectedUser(res.user || res);
                    setEditMode(false);
                    setEditForm(null);
                    setEditPassportPreview(null);
                    alert('✅ User updated');
                  } catch (e) {
                    console.error(e);
                    alert('❌ Update failed');
                  }
                }} className="mr-3 bg-green-600 text-white py-3 px-4 rounded-2xl uppercase tracking-widest text-xs">Save</Button>
                <Button type="button" onClick={() => { setEditMode(false); setEditForm(null); setEditPassportPreview(null); }} className="bg-slate-400 text-white py-3 px-4 rounded-2xl uppercase tracking-widest text-xs">Cancel</Button>
              </div>
            </div>
          )
        ) : null}
      </Modal>
    </div>
  );
};

export default SettingsPage;