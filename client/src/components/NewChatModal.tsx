import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Avatar from './Avatar';
import { User } from '../types/chat';

interface NewChatModalProps {
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onCreateGroup: (name: string, memberIds: number[]) => void;
}

export default function NewChatModal({ onClose, onSelectUser, onCreateGroup }: NewChatModalProps) {
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim().length < 1) {
        const res = await api.get('/users');
        setUsers(res.data);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(search)}`);
        setUsers(res.data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleUser = (user: User) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    onCreateGroup(groupName.trim(), selectedUsers.map(u => u.id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'var(--overlay)' }}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="pop-in relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
            {tab === 'direct' ? '💬 New Chat' : '👥 New Group'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--hover)] transition-colors"
            style={{ color: 'var(--subtext)' }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['direct', 'group'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                tab === t ? '' : 'hover:bg-[var(--hover)]'
              }`}
              style={{ color: tab === t ? 'var(--teal)' : 'var(--subtext)' }}
            >
              {t === 'direct' ? 'Direct Chat' : 'New Group'}
              {tab === t && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--teal)' }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Group name */}
          {tab === 'group' && (
            <input
              type="text"
              placeholder="Group name…"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--input-bg)',
                color: 'var(--text)',
                border: `1.5px solid ${groupName ? 'var(--teal)' : 'var(--border)'}`,
              }}
            />
          )}

          {/* Search */}
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--subtext)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl pl-9 pr-4 py-2 text-sm outline-none"
              style={{
                background: 'var(--input-bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          {/* Selected user chips */}
          {tab === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(u => (
                <span
                  key={u.id}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(18,140,126,0.12)', color: 'var(--teal)' }}
                >
                  <Avatar name={u.username} color={u.avatar_color} size="md" />
                  {u.username}
                  <button
                    onClick={() => toggleUser(u)}
                    className="ml-0.5 hover:text-red-400 transition-colors font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User list */}
          <div className="flex flex-col gap-0.5">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-2 py-2.5 rounded-xl">
                  <div className="w-9 h-9 rounded-full skeleton" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-24 rounded-full skeleton" />
                    <div className="h-2.5 w-36 rounded-full skeleton" />
                  </div>
                </div>
              ))
            ) : users.length === 0 ? (
              <p className="text-center py-6 text-sm" style={{ color: 'var(--subtext)' }}>
                No users found
              </p>
            ) : (
              users.map(user => {
                const isSelected = !!selectedUsers.find(u => u.id === user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => tab === 'direct' ? onSelectUser(user) : toggleUser(user)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && (tab === 'direct' ? onSelectUser(user) : toggleUser(user))}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? '' : 'hover:bg-[var(--hover)]'
                    }`}
                    style={isSelected ? { background: 'rgba(18,140,126,0.1)' } : {}}
                  >
                    <Avatar name={user.username} color={user.avatar_color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {user.username}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--subtext)' }}>
                        Hey there! I am using ChatApp
                      </p>
                    </div>
                    {/* Checkmark for group */}
                    {tab === 'group' && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150"
                        style={{
                          background: isSelected ? 'var(--teal)' : 'transparent',
                          border: `2px solid ${isSelected ? 'var(--teal)' : 'var(--border)'}`,
                        }}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Create group footer */}
        {tab === 'group' && (
          <div className="px-4 pb-4 pt-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0}
              className="btn-primary w-full rounded-xl py-3 text-sm font-semibold"
            >
              {selectedUsers.length > 0
                ? `Create Group · ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''}`
                : 'Select members to continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
