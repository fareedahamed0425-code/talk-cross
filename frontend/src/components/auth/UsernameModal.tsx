import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { AtSign, Check, X, AlertCircle } from 'lucide-react';

export const UsernameModal: React.FC = () => {
  const { user, isNewUserModalOpen, closeNewUserModal, updateUserProfile } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
      setIsAvailable(true);
      setErrorMsg('');
    }
  }, [user]);

  useEffect(() => {
    if (!username || username.trim().length < 3) {
      setIsAvailable(null);
      setErrorMsg('');
      return;
    }

    const clean = username.trim().toLowerCase();

    // If it's already the user's assigned/current username
    if (user?.username && user.username.toLowerCase() === clean) {
      setIsAvailable(true);
      setErrorMsg('');
      setIsChecking(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsChecking(true);
        const res = await api.checkUsername(clean, user?.id);
        setIsAvailable(res.available);
        setErrorMsg(res.available ? '' : res.reason || 'Username is unavailable');
      } catch (err: any) {
        setIsAvailable(false);
        setErrorMsg(err.message || 'Error checking username');
      } finally {
        setIsChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, user?.username, user?.id]);

  if (!isNewUserModalOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim().toLowerCase();
    if (!clean || isAvailable === false) return;

    // If unchanged, simply close
    if (user?.username && user.username.toLowerCase() === clean) {
      closeNewUserModal();
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile({ username: clean });
      closeNewUserModal();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update username');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Choose Your @Username
          </h2>
        </div>
        <form onSubmit={handleSave} className="modal-body">
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Friends will use your unique @handle to search and connect with you on Talk Cross.
          </p>

          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            >
              <AtSign size={18} />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              maxLength={25}
              style={{
                width: '100%',
                padding: '10px 38px 10px 36px',
                fontSize: '15px',
                fontFamily: 'monospace',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              {isChecking && (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid var(--text-muted)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              {!isChecking && isAvailable === true && <Check size={18} color="var(--emerald)" />}
              {!isChecking && isAvailable === false && <X size={18} color="var(--danger)" />}
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--danger)',
                fontSize: '12.5px',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={closeNewUserModal}
            >
              Skip / Keep
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || isAvailable === false || username.length < 3}
            >
              {isSaving ? 'Saving...' : 'Set Username'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
