import React, { useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from '../components/common';
import { Eye, EyeOff } from 'lucide-react';

const ForceResetPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = (location.state as any)?.userId;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Missing user information. Return to login.</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword || !confirmPassword) return setError('Enter and confirm password');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');

    try {
      await axios.put(`http://localhost:5000/api/users/setup-security/${userId}`, { newPassword });
      alert('Password set successfully. Please login with your new password.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to set password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardBody className="p-8">
            <h2 className="text-xl font-black mb-4">Set a New Password</h2>
            {error && <div className="text-red-600 mb-3">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border p-3 rounded" />
                <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-3">{showNew ? <EyeOff/> : <Eye/>}</button>
              </div>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border p-3 rounded" />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-3">{showConfirm ? <EyeOff/> : <Eye/>}</button>
              </div>
              <Button type="submit" className="w-full bg-blue-600 text-white py-3 rounded">Save Password</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default ForceResetPage;
