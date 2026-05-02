import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { useUpdateProfileMutation } from '../api/auth.api';
import { setUser } from '../store/auth.slice';
import Avatar from '../../../shared/components/Avatar';
import { Conversation } from '../../../types/chat';

interface ProfileModalProps {
  onClose: () => void;
  blockedUsers?: Conversation[];
  onUnblock?: (userId: string) => void;
}

export default function ProfileModal({ onClose, blockedUsers = [], onUnblock }: ProfileModalProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [updateProfile, { isLoading: loading }] = useUpdateProfileMutation();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [about, setAbout] = useState(user?.about || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const updatedUser = await updateProfile({
        displayName: displayName.trim() || undefined,
        about: about.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined
      }).unwrap();
      dispatch(setUser(updatedUser));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.data?.message || 'Failed to update profile');
    }
  };

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId);
    try {
      await onUnblock?.(userId);
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0"
      style={{ background: 'var(--overlay)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="pop-in relative w-full sm:max-w-md rounded-2xl flex flex-col overflow-hidden max-h-[90vh]"
        style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--border)',
          boxShadow: '0 12px 50px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>Profile Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--hover)] transition-colors" style={{ color: 'var(--subtext)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSave} className="p-6 flex flex-col gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-2">
              <Avatar name={user?.username} color={user?.avatar_color} size="xl" />
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>@{user?.username}</p>
            </div>

            <div className="space-y-4">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--text)' }}>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How others see you"
                  className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all"
                  style={{ background: 'var(--input-bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
                />
              </div>

              {/* About */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--text)' }}>About</label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={2}
                  placeholder="Tell us about yourself"
                  className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all resize-none"
                  style={{ background: 'var(--input-bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--text)' }}>Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 234 567 890"
                  className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all"
                  style={{ background: 'var(--input-bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            {success && <p className="text-sm text-[var(--teal)] text-center font-medium">Profile updated successfully! ✨</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-[var(--teal)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>

          {/* ── Blocked Contacts Section ─────────────────────────────── */}
          <div className="px-6 pb-6">
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ background: 'var(--hover)', borderBottom: blockedUsers.length > 0 ? '1px solid var(--border)' : undefined }}
              >
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--subtext)' }}>
                  Blocked Contacts
                </span>
                <span
                  className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: blockedUsers.length > 0 ? 'rgba(239,68,68,0.15)' : 'var(--input-bg)', color: blockedUsers.length > 0 ? '#ef4444' : 'var(--subtext)' }}
                >
                  {blockedUsers.length}
                </span>
              </div>

              {blockedUsers.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs" style={{ color: 'var(--subtext)' }}>No blocked contacts</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {blockedUsers.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ background: 'var(--modal-bg)' }}
                    >
                      <Avatar name={u.display_name || u.username} color={u.avatar_color} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          {u.display_name || u.username}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--subtext)' }}>
                          @{u.username}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblock(u.id)}
                        disabled={unblockingId === u.id}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: 'rgba(37,211,102,0.12)',
                          color: 'var(--teal)',
                          border: '1px solid rgba(37,211,102,0.3)',
                        }}
                      >
                        {unblockingId === u.id ? 'Unblocking…' : 'Unblock'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
