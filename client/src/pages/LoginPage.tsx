import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsApi } from '../api/hooks';
import { Button, Card, CardBody, Modal } from '../components/common';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Building2 } from 'lucide-react';
import { formatNidaInput } from '../utils';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [flow, setFlow] = useState<'login' | 'recover'>('login');
  const [recoverStage, setRecoverStage] = useState<'nida' | 'questions' | 'reset'>('nida');
  const [tinNumber, setTinNumber] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState<string[]>([]);
  const [recoveryAnswers, setRecoveryAnswers] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const NIDA_FORMAT_REGEX = /^\d{8}-\d{5}-\d{5}-\d{2}$/;
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string>((location.state as any)?.message || '');
  const { getSettings } = useSettingsApi();
  const { data: settings } = getSettings();

  const resetRecoveryState = () => {
    setRecoverStage('nida');
    setTinNumber('');
    setSecurityQuestions([]);
    setRecoveryAnswers([]);
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMessage('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await axios.post('http://localhost:5000/api/login', { email: normalizedEmail, password });
      const user = res.data.user;
      const token = res.data.token;

      // Defensive: if response shape is unexpected, log it and show modal
      if (!user || !token) {
        console.warn('Login response missing user or token', res.data);
        setError('Login succeeded but server returned unexpected data.');
        return;
      }

      // If server indicates password must be changed, redirect to force-reset flow
      if (user.mustChangePassword) {
        // Pass userId to force reset page via location state
        navigate('/force-reset', { state: { userId: user.id } });
        return;
      }

      // Login and navigate directly
      try {
        login(user, token);
        // If profile is incomplete and not admin, go to complete profile
        if (user.role?.toLowerCase() !== 'admin' && !user.isProfileComplete) {
          navigate('/complete-profile', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
        return;
      } catch (e) {
        console.error('Auth.login failed:', e);
        setError('Login succeeded but failed to initialize session.');
        return;
      }
    } catch (err: any) {
      console.error('Login request failed:', err?.response || err);
      const status = err.response?.status;
      const data = err.response?.data;
      const serverMsg = data?.error || data?.message || (typeof data === 'string' ? data : null);
      setError(serverMsg ? `Login Failed (${status}): ${serverMsg}` : 'Login Failed: Unable to reach server');
    }
  };

  const handleRecoverNida = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!tinNumber.trim()) {
      setError('Please enter your NIDA number.');
      return;
    }

    const formattedTin = formatNidaInput(tinNumber.trim());
    if (!NIDA_FORMAT_REGEX.test(formattedTin)) {
      setError('Please enter your NIDA in the format 19981226-59421-00001-20.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/users/recover-password', { tinNumber: formattedTin });
      const questions: string[] = res.data.securityQuestions || [];
      if (!questions.length) {
        setError('No recovery questions were set for this account. Contact your administrator.');
        return;
      }
      setSecurityQuestions(questions);
      setRecoveryAnswers(Array(questions.length).fill(''));
      setRecoverStage('questions');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to find your account.');
    }
  };

  const handleVerifyAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const provided = recoveryAnswers.map((answer) => answer.trim());
    if (provided.some((answer) => !answer)) {
      setError('Please answer all recovery questions.');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/users/recover-password', {
        tinNumber: tinNumber.trim(),
        answers: provided
      });
      setRecoverStage('reset');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Recovery answers did not match.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/users/recover-password', {
        tinNumber: tinNumber.trim(),
        answers: recoveryAnswers,
        newPassword
      });
      setSuccessMessage('Password reset successful. Return to login with your new password.');
      setFlow('login');
      resetRecoveryState();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to reset your password.');
    }
  };

  const handleStartRecovery = () => {
    setFlow('recover');
    resetRecoveryState();
  };

  const handleBackToLogin = () => {
    setFlow('login');
    resetRecoveryState();
  };

  const getStageMessage = () => {
    if (flow === 'login') {
      return 'Enter your email and password to sign in.';
    }
    if (recoverStage === 'nida') {
      return 'Enter your NIDA to begin account recovery.';
    }
    if (recoverStage === 'questions') {
      return 'Answer the recovery questions to verify your identity.';
    }
    if (recoverStage === 'reset') {
      return 'Set a new password and confirm it to complete recovery.';
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-yellow-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-200 rounded-full blur-3xl" />
      <div className="absolute top-12 right-[-8%] w-72 h-72 bg-yellow-200 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-white rounded-full blur-3xl opacity-80" />

      <div className="w-full max-w-md z-10 animate-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl border border-red-200">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Company logo" className="w-16 h-16 object-contain" />
            ) : (
              <Building2 size={40} className="text-red-600" />
            )}
          </div>
          <h1 className="text-4xl font-black text-red-900 tracking-tight">Highland PMS</h1>
          <p className="text-yellow-700 mt-2 uppercase text-[10px] font-black tracking-[0.3em]">Management Portal v4.0</p>
        </div>

        <Card className="border-none shadow-2xl">
          <CardBody className="p-10">
            {flow === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center border border-red-100">
                      <ShieldCheck size={16} className="mr-2" /> {error}
                    </div>
                  )}
                  {successMessage && (
                    <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl text-xs font-bold border border-yellow-200">
                      {successMessage}
                    </div>
                  )}
                  {getStageMessage() && (
                    <div className="bg-white text-red-900 p-3 rounded-xl text-xs font-semibold border border-red-100">
                      {getStageMessage()}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-red-700 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-red-300" size={18} />
                    <input
                      type="email"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-red-100 rounded-2xl focus:border-red-400 outline-none transition-all shadow-sm"
                      placeholder="name@highland.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase text-red-700 ml-1">Secret Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-red-300" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-12 pr-12 py-4 bg-white border-2 border-red-100 rounded-2xl focus:border-red-400 outline-none transition-all shadow-sm"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full py-5 bg-red-700 text-white font-black rounded-2xl shadow-xl shadow-red-500/20">
                  Authorize Access
                </Button>
                <button
                  type="button"
                  onClick={handleStartRecovery}
                  className="w-full py-4 text-center text-red-700 font-bold rounded-2xl border border-red-200 bg-yellow-50 hover:bg-yellow-100 transition"
                >
                  Forgot Password?
                </button>
              </form>
            ) : (
              <form
                onSubmit={
                  recoverStage === 'nida'
                    ? handleRecoverNida
                    : recoverStage === 'questions'
                      ? handleVerifyAnswers
                      : handleResetPassword
                }
                className="space-y-6"
              >
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center">
                    <ShieldCheck size={16} className="mr-2" /> {error}
                  </div>
                )}
                {successMessage && (
                  <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-bold">
                    {successMessage}
                  </div>
                )}

                {recoverStage === 'nida' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Enter NIDA Number</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                          type="text"
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
                          placeholder="19981226-59421-00001-20"
                          value={tinNumber}
                          onChange={(e) => setTinNumber(formatNidaInput(e.target.value))}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20">
                      Continue
                    </Button>
                  </>
                )}

                {recoverStage === 'questions' && (
                  <>
                    <div className="space-y-4">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Answer the recovery questions</p>
                      {securityQuestions.map((question, index) => (
                        <div key={`${question}-${index}`} className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{question}</label>
                          <input
                            type="text"
                            required
                            className="w-full pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
                            placeholder="Your answer"
                            value={recoveryAnswers[index] || ''}
                            onChange={(e) => {
                              const nextAnswers = [...recoveryAnswers];
                              nextAnswers[index] = e.target.value;
                              setRecoveryAnswers(nextAnswers);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <Button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20">
                      Verify Answers
                    </Button>
                  </>
                )}

                {recoverStage === 'reset' && (
                  <>
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">New Password</label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Confirm Password</label>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <Button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20">
                      Reset Password
                    </Button>
                  </>
                )}

                <button
                  type="button"
                  className="w-full py-4 text-center text-slate-500 font-bold rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition"
                  onClick={handleBackToLogin}
                >
                  Back to login
                </button>
              </form>
            )}
          </CardBody>
        </Card>
        
        <p className="text-center mt-8 text-slate-500 text-xs font-bold uppercase tracking-widest">
          Secure Internal System — Unauthorized access prohibited
        </p>
      </div>
    </div>
  );
};

export default LoginPage;