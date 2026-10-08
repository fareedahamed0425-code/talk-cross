import React, { useState, useEffect } from 'react';
import { MonitorDown, X, Download, Share } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSTip, setShowIOSTip] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Detect iOS
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Expose to window for global access
      (window as any).deferredInstallPrompt = e;
      
      // Show install prompt banner if not previously dismissed
      const dismissed = localStorage.getItem('talkcross_install_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show for iOS if not dismissed
    if (isIosDevice) {
      const dismissed = localStorage.getItem('talkcross_install_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
    } else if (isIOS) {
      setShowIOSTip(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSTip(false);
    localStorage.setItem('talkcross_install_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid rgba(225, 29, 72, 0.4)',
        borderRadius: '16px',
        padding: '14px 18px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(159, 18, 57, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        maxWidth: '380px',
        backdropFilter: 'blur(20px)',
        animation: 'slideUpPrompt 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--burgundy-vibrant), var(--burgundy-primary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(159, 18, 57, 0.35)',
        }}
      >
        <MonitorDown size={22} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
          Install Talk Cross
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
          Get the desktop & mobile standalone app
        </div>
      </div>

      <button
        onClick={handleInstallClick}
        className="btn-primary"
        style={{
          padding: '7px 14px',
          fontSize: '12.5px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexShrink: 0,
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        <Download size={14} /> Install
      </button>

      <button
        onClick={handleDismiss}
        style={{
          color: 'var(--text-muted)',
          padding: '4px',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
        }}
        title="Dismiss"
      >
        <X size={16} />
      </button>

      {/* iOS Safari instructions tooltip */}
      {showIOSTip && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            right: '0',
            backgroundColor: 'var(--bg-panel-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '12px',
            color: 'var(--text-primary)',
            width: '260px',
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
            <Share size={14} color="var(--primary)" /> Add to Home Screen:
          </div>
          Tap the <strong>Share</strong> button in Safari toolbar, then select <strong>'Add to Home Screen'</strong>.
        </div>
      )}

      <style>{`
        @keyframes slideUpPrompt {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
