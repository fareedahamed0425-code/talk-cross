import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

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
      // Show install prompt banner
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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
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
        bottom: '20px',
        right: '20px',
        zIndex: 999,
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid rgba(225, 29, 72, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 16px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(159, 18, 57, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '360px',
        backdropFilter: 'blur(16px)',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--burgundy-vibrant), var(--burgundy-primary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <Smartphone size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Download Talk Cross
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          Install as standalone app on your device
        </div>
      </div>

      <button
        onClick={handleInstallClick}
        className="btn-primary"
        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', gap: '5px', flexShrink: 0 }}
      >
        <Download size={14} /> Install
      </button>

      <button
        onClick={handleDismiss}
        style={{ color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}
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
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
