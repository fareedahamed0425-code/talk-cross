import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import {
  compressImageTo50KB,
  CompressionResult,
} from '../../utils/imageCompressor.js';
import {
  getChatWallpaper,
  saveChatWallpaper,
  removeChatWallpaper,
  ChatWallpaper,
} from '../../utils/chatWallpaperStorage.js';
import { useModalBackHandler } from '../../utils/useModalBackHandler.js';

interface ChatWallpaperModalProps {
  conversationId: string;
  conversationTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatWallpaperModal: React.FC<ChatWallpaperModalProps> = ({
  conversationId,
  conversationTitle = 'This Chat',
  isOpen,
  onClose,
}) => {
  useModalBackHandler(isOpen, onClose, 'chat-wallpaper');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingWallpaper, setExistingWallpaper] = useState<ChatWallpaper | null>(null);

  // Staged wallpaper state
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [overlayDim, setOverlayDim] = useState<number>(0.65);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Initialize from current saved wallpaper
  useEffect(() => {
    if (isOpen && conversationId) {
      const current = getChatWallpaper(conversationId);
      setExistingWallpaper(current);
      if (current) {
        setPreviewDataUrl(current.dataUrl);
        setOverlayDim(current.overlayDim ?? 0.65);
      } else {
        setPreviewDataUrl(null);
        setOverlayDim(0.65);
      }
      setCompressionResult(null);
      setErrorMsg(null);
      setSavedSuccess(false);
    }
  }, [isOpen, conversationId]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsCompressing(true);
      setErrorMsg(null);
      const result = await compressImageTo50KB(file);
      setCompressionResult(result);
      setPreviewDataUrl(result.dataUrl);
    } catch (err: any) {
      console.error('Failed to compress image:', err);
      setErrorMsg(err?.message || 'Failed to compress image. Please try another photo.');
    } finally {
      setIsCompressing(false);
      // reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApply = () => {
    if (!previewDataUrl || !conversationId) return;

    saveChatWallpaper({
      conversationId,
      dataUrl: previewDataUrl,
      overlayDim,
      blur: 0,
      updatedAt: new Date().toISOString(),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleReset = () => {
    if (!conversationId) return;
    removeChatWallpaper(conversationId);
    setPreviewDataUrl(null);
    setExistingWallpaper(null);
    setCompressionResult(null);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 210,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        padding: '16px',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          backgroundColor: '#121217',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: 'rgba(225, 29, 72, 0.15)',
                color: 'var(--burgundy-300, #fda4af)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ImageIcon size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                Chat Wallpaper
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>
                Personalize background for {conversationTitle}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="icon-btn"
            style={{ width: '32px', height: '32px', borderRadius: '8px' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Explanation Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(225, 29, 72, 0.08)',
              border: '1px solid rgba(225, 29, 72, 0.22)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <Sparkles size={18} style={{ color: 'var(--burgundy-300, #fda4af)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.85)' }}>
              <strong>Custom Chat Background:</strong> Upload any image to set it as the background for this chat.
              Your image is automatically compressed down to <strong>~50KB</strong> to keep your chat instantaneous and smooth while keeping fine visual details intact!
            </div>
          </div>

          {/* Upload Trigger Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            style={{
              width: '100%',
              padding: '18px 16px',
              borderRadius: '12px',
              border: '1.5px dashed rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: isCompressing ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--burgundy-primary)';
              e.currentTarget.style.backgroundColor = 'rgba(225, 29, 72, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
          >
            {isCompressing ? (
              <>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '2.5px solid rgba(225, 29, 72, 0.3)',
                    borderTopColor: 'var(--burgundy-primary)',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--burgundy-300)' }}>
                  Optimizing image to ~50KB...
                </span>
                <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Preserving sharpness and fine details
                </span>
              </>
            ) : (
              <>
                <UploadCloud size={28} color="var(--burgundy-300, #fda4af)" />
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>
                  {previewDataUrl ? 'Choose Another Image' : 'Upload Image as Chat Background'}
                </span>
                <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Click to browse photos (JPG, PNG, WebP) • Auto-compressed to ~50KB
                </span>
              </>
            )}
          </button>

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Compression Info Badge */}
          {compressionResult && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#6ee7b7',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={15} />
                <span>Compressed to <strong>{(compressionResult.compressedSizeBytes / 1024).toFixed(1)} KB</strong></span>
              </div>
              <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '11.5px' }}>
                Reduced by {compressionResult.reductionPercentage}% (Details preserved)
              </span>
            </div>
          )}

          {/* Live Preview of Messages over Wallpaper */}
          {previewDataUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>
                  Live Chat Preview
                </span>
                <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Dimming: {Math.round(overlayDim * 100)}%
                </span>
              </div>

              {/* Sample Chat Screen Mockup */}
              <div
                style={{
                  height: '180px',
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundImage: `linear-gradient(rgba(10, 10, 14, ${overlayDim}), rgba(10, 10, 14, ${overlayDim})), url("${previewDataUrl}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '14px',
                  gap: '8px',
                }}
              >
                {/* Sample Received Message */}
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '75%',
                    backgroundColor: 'var(--bubble-recv, #1f1f28)',
                    color: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: '12px',
                    borderBottomLeftRadius: '3px',
                    fontSize: '12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  Hey! How does the new chat background look? ✨
                </div>

                {/* Sample Sent Message */}
                <div
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '75%',
                    backgroundColor: 'var(--bubble-sent, #881337)',
                    color: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: '12px',
                    borderBottomRightRadius: '3px',
                    fontSize: '12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  It looks sharp and crystal clear! 🔥
                </div>
              </div>

              {/* Dimming Slider Control */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255, 255, 255, 0.8)' }}>
                    <Sliders size={13} />
                    <span>Background Dimming (Contrast)</span>
                  </span>
                  <span style={{ color: 'var(--burgundy-300)', fontWeight: 600 }}>
                    {Math.round(overlayDim * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="0.85"
                  step="0.05"
                  value={overlayDim}
                  onChange={(e) => setOverlayDim(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--burgundy-primary, #e11d48)',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.45)' }}>
                  <span>Vivid (Brighter)</span>
                  <span>Balanced</span>
                  <span>Subtle (High Contrast)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          {existingWallpaper ? (
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary"
              style={{
                fontSize: '12.5px',
                padding: '6px 12px',
                color: '#f87171',
                borderColor: 'rgba(248, 113, 113, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Remove custom background for this chat"
            >
              <RotateCcw size={13} />
              <span>Reset to Default</span>
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ fontSize: '12.5px', padding: '6px 14px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!previewDataUrl || isCompressing}
              className="btn-primary"
              style={{
                fontSize: '12.5px',
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {savedSuccess ? (
                <>
                  <Check size={14} />
                  <span>Applied!</span>
                </>
              ) : (
                <span>Set as Chat Background</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
