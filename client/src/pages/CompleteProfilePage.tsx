import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common';
import { ShieldAlert, Lock, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const CompleteProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityAnswers, setSecurityAnswers] = useState(['', '', '']);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return null;
  }

  const fallbackQuestion = 'Your administrator has not set a recovery question yet.';
  const recoveryQuestions = user.securityQuestions?.length
    ? user.securityQuestions
    : user.securityQuestion
      ? [user.securityQuestion]
      : [fallbackQuestion];
  const isFallbackQuestion = recoveryQuestions.length === 1 && recoveryQuestions[0] === fallbackQuestion;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const answersForQuestions = securityAnswers.slice(0, recoveryQuestions.length);
    if (!isFallbackQuestion) {
      const unanswered = answersForQuestions.filter((answer) => !answer.trim());
      if (unanswered.length > 0) {
        setError('Please answer all recovery questions before continuing.');
        return;
      }
    }

    setIsSaving(true);

    try {
      await axios.put(`http://localhost:5000/api/users/setup-security/${user.id}`, {
        newPassword,
        securityAnswers: isFallbackQuestion ? [] : answersForQuestions
      });

      logout();
      navigate('/login', {
        replace: true,
        state: {
          message: 'Setup complete. Please use your new password to log in.'
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete security setup.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Banner */}
        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-black uppercase tracking-tight">Security Onboarding</h1>
            <p className="text-blue-400 text-sm mt-2 font-bold uppercase tracking-widest">User: {user?.name}</p>
            <p className="text-slate-400 text-xs mt-1">Confirm your account details, set a secure password, and save your recovery answers.</p>
          </div>
          <div className="absolute right-[-20px] top-[-20px] opacity-10">
            <ShieldAlert size={150} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-start">
          <div className="rounded-[2rem] border border-slate-700 bg-slate-950/80 p-6">
            <h2 className="text-sm uppercase tracking-[0.3em] text-cyan-300 font-black mb-4">Your profile</h2>
            <div className="space-y-3 text-sm text-slate-200">
              <div className="flex justify-between"><span className="text-slate-400">Name</span><span>{user.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Role</span><span>{user.role}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Status</span><span>{user.isProfileComplete ? 'Complete' : 'Incomplete'}</span></div>
              {user.passport && (
                <div className="flex justify-between"><span className="text-slate-400">Passport</span><span>On file</span></div>
              )}
              {user.avatar && (
                <div className="flex justify-between"><span className="text-slate-400">Avatar</span><span>Uploaded</span></div>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-700 bg-slate-950/80 p-6">
            <h2 className="text-sm uppercase tracking-[0.3em] text-slate-300 font-black mb-4">Recovery plan</h2>
            <p className="text-slate-400 text-sm leading-6">Your administrator sets the recovery questions that will allow you to reset your password if you forget it. Please answer these questions carefully.</p>
          </div>
        </div>

        <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-8">
          {error && (
            <div className="rounded-3xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-100 text-sm font-semibold">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-3xl border border-slate-700 bg-slate-950/80 py-4 pl-14 pr-4 text-white outline-none focus:border-cyan-500"
                    placeholder="Enter your new password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-3xl border border-slate-700 bg-slate-950/80 py-4 pl-14 pr-4 text-white outline-none focus:border-cyan-500"
                    placeholder="Repeat your new password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full rounded-3xl bg-blue-600 py-4 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20">
                Continue <ArrowRight className="inline-block ml-2" size={18} />
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-slate-700 bg-slate-950/80 p-6">
                <div className="flex items-center gap-3 mb-4 text-xs uppercase tracking-[0.3em] text-cyan-300 font-black">
                  <ShieldCheck size={18} /> Recovery Questions
                </div>
                <p className="text-sm leading-7 text-slate-200">Answer the questions configured by your administrator.</p>
                {isFallbackQuestion && (
                  <div className="mt-4 rounded-xl bg-yellow-50/10 border border-yellow-300/20 p-3 text-yellow-200 text-sm font-semibold">
                    Your administrator has not set recovery questions yet. No answers are required now — you may continue and finalize setup. An administrator can configure questions later from Settings.
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {recoveryQuestions.map((question, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">Question {index + 1}</label>
                    <div className="rounded-3xl border border-slate-700 bg-slate-950/80">
                      <div className="px-4 py-3 text-sm text-slate-300">{question}</div>
                      <input
                        type="text"
                        value={securityAnswers[index]}
                        onChange={(e) => {
                          const updated = [...securityAnswers];
                          updated[index] = e.target.value;
                          setSecurityAnswers(updated);
                        }}
                        className="w-full rounded-b-3xl border-t border-slate-700 bg-slate-950/90 py-4 px-4 text-white outline-none focus:border-cyan-500"
                        placeholder={isFallbackQuestion ? 'No answer required yet' : 'Type your answer'}
                        disabled={isFallbackQuestion}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">
                Your answers are used to recover access if you forget your password.
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-900/80 py-4 text-slate-200"
                >
                  <ArrowLeft className="inline-block mr-2" size={18} /> Back
                </Button>
                <Button
                  type="submit"
                  className="w-full rounded-3xl bg-emerald-600 py-4 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20"
                >
                  {isSaving ? 'Saving...' : 'Finalize Setup'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CompleteProfilePage;