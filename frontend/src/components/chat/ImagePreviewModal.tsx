import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { useModalBackHandler } from '../../utils/useModalBackHandler.js';
import { formatMessageTime } from '../../utils/format.js';

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  createdAt?: string;
  senderName?: string;
}

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
  images?: GalleryImage[];
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  onClose,
  images = [],
}) => {
  // Mobile hardware/gesture back button support
  useModalBackHandler(!!imageUrl, onClose, 'image-preview');

  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [scale, setScale] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Swipe-down to dismiss gesture
  const [translateY, setTranslateY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);

  // Sync current index when imageUrl or images change
  useEffect(() => {
    if (!imageUrl) {
      setCurrentIndex(-1);
      setScale(1);
      return;
    }

    if (images && images.length > 0) {
      const idx = images.findIndex((img) => img.url === imageUrl);
      setCurrentIndex(idx !== -1 ? idx : 0);
    } else {
      setCurrentIndex(-1);
    }
    setScale(1);
    setTranslateY(0);
  }, [imageUrl, images]);

  // Resolve currently viewed image
  const activeImage = useMemo(() => {
    if (images && images.length > 0 && currentIndex >= 0 && currentIndex < images.length) {
      return images[currentIndex];
    }
    return imageUrl ? { id: 'single', url: imageUrl } : null;
  }, [images, currentIndex, imageUrl]);

  // Keyboard controls: ESC to close, Left/Right arrows to navigate
  useEffect(() => {
    if (!imageUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && images.length > 1 && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
        setScale(1);
      } else if (e.key === 'ArrowRight' && images.length > 1 && currentIndex < images.length - 1) {
        setCurrentIndex((i) => i + 1);
        setScale(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, images.length, currentIndex, onClose]);

  if (!imageUrl || !activeImage) return null;

  const hasMultiple = images.length > 1;
  const canGoPrev = hasMultiple && currentIndex > 0;
  const canGoNext = hasMultiple && currentIndex < images.length - 1;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canGoPrev) {
      setCurrentIndex((i) => i - 1);
      setScale(1);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canGoNext) {
      setCurrentIndex((i) => i + 1);
      setScale(1);
    }
  };

  const toggleZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale((s) => (s === 1 ? 1.5 : 1));
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = activeImage.url;
    if (!targetUrl) return;

    try {
      setIsDownloading(true);
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      // Extract filename from URL or fallback to clean talk-cross timestamp name
      let filename = targetUrl.split('/').pop()?.split('?')[0] || '';
      if (!filename || filename.length < 3) {
        filename = `talk-cross-image-${Date.now()}.jpg`;
      }
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch {
      // Direct fallback if fetch/CORS is restricted
      window.open(targetUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // Mobile Touch Gestures (Swipe down to dismiss, horizontal swipe for prev/next)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartY.current;

    // Only recognize downwards pull to dismiss when at default 1x scale
    if (scale === 1 && diffY > 0) {
      setTranslateY(diffY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (translateY > 90) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
      onClose();
    } else if (hasMultiple && translateY < 20) {
      // Check horizontal swipe
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartX.current;
      if (diffX > 50 && canGoPrev) {
        handlePrev();
      } else if (diffX < -50 && canGoNext) {
        handleNext();
      }
    }
    setTranslateY(0);
    setIsDragging(false);
  };

  const opacity = Math.max(0.2, 1 - translateY / 320);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 200,
        padding: '16px',
        backgroundColor: `rgba(0, 0, 0, ${0.85 * opacity})`,
        backdropFilter: 'blur(10px)',
        transition: isDragging ? 'none' : 'background-color 0.2s ease',
      }}
    >
      <div
        className="preview-card-container"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 'min(640px, 90vw)',
          maxHeight: 'min(600px, 82vh)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          backgroundColor: '#121217',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          transform: `translateY(${translateY}px) scale(${1 - translateY / 800})`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile drag-down indicator */}
        <div
          style={{
            position: 'absolute',
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowDown size={11} /> Swipe down to close
        </div>

        {/* 1. Modal Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            zIndex: 10,
          }}
        >
          {/* Title & Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(225, 29, 72, 0.15)',
                color: 'var(--burgundy-300, #fda4af)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ImageIcon size={15} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {hasMultiple ? `Image ${currentIndex + 1} of ${images.length}` : 'Image Preview'}
              </div>
              {activeImage.senderName && (
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)' }}>
                  Sent by {activeImage.senderName}
                  {activeImage.createdAt ? ` • ${formatMessageTime(activeImage.createdAt)}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Zoom Toggle */}
            <button
              onClick={toggleZoom}
              className="icon-btn"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: scale > 1 ? 'var(--burgundy-primary)' : 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
              }}
              title={scale === 1 ? 'Zoom in (1.5x)' : 'Reset zoom (1x)'}
            >
              {scale === 1 ? <ZoomIn size={15} /> : <ZoomOut size={15} />}
            </button>

            {/* Save / Download */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="icon-btn"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: downloadSuccess ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                transition: 'background-color 0.2s ease',
              }}
              title="Save image to device"
            >
              {downloadSuccess ? <Check size={15} /> : <Download size={15} />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="icon-btn"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
              }}
              title="Close (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* 2. Image Canvas Container */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            overflow: 'hidden',
          }}
          onDoubleClick={toggleZoom}
        >
          {/* Navigation Previous Button */}
          {hasMultiple && (
            <button
              onClick={handlePrev}
              disabled={!canGoPrev}
              className="icon-btn"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 15,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                opacity: canGoPrev ? 1 : 0.25,
                cursor: canGoPrev ? 'pointer' : 'default',
                backdropFilter: 'blur(8px)',
              }}
              title="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Centered Image */}
          <img
            key={activeImage.url}
            src={activeImage.url}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: 'min(440px, 58vh)',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              transform: `scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: scale === 1 ? 'zoom-in' : 'zoom-out',
              userSelect: 'none',
            }}
            draggable={false}
          />

          {/* Navigation Next Button */}
          {hasMultiple && (
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="icon-btn"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 15,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                opacity: canGoNext ? 1 : 0.25,
                cursor: canGoNext ? 'pointer' : 'default',
                backdropFilter: 'blur(8px)',
              }}
              title="Next image"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* 3. Caption Footer (if present) */}
        {activeImage.caption && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              lineHeight: 1.4,
              maxHeight: '70px',
              overflowY: 'auto',
            }}
          >
            {activeImage.caption}
          </div>
        )}
      </div>
    </div>
  );
};
