import React, { useState, useRef } from 'react';
import { X, Download, ArrowDown } from 'lucide-react';
import { useModalBackHandler } from '../../utils/useModalBackHandler.js';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  // Mobile hardware/gesture back button support
  useModalBackHandler(!!imageUrl, onClose, 'image-preview');

  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  if (!imageUrl) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      // Swiping downward to dismiss
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (translateY > 90) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }
      onClose();
    }
    setTranslateY(0);
    setIsDragging(false);
  };

  const opacity = Math.max(0.2, 1 - translateY / 300);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 200,
        padding: '24px',
        backgroundColor: `rgba(0, 0, 0, ${0.85 * opacity})`,
        transition: isDragging ? 'none' : 'background-color 0.2s ease',
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${translateY}px) scale(${1 - translateY / 800})`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
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
            top: '-32px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'none',
          }}
        >
          <ArrowDown size={12} /> Swipe down to close
        </div>

        {/* Top Control Bar */}
        <div
          style={{
            position: 'absolute',
            top: '-48px',
            right: 0,
            display: 'flex',
            gap: '12px',
          }}
        >
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="icon-btn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white' }}
            title="Download image"
          >
            <Download size={18} />
          </a>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white' }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Image Content */}
        <img
          src={imageUrl}
          alt="Full preview"
          style={{
            maxWidth: '100%',
            maxHeight: '82vh',
            objectFit: 'contain',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            userSelect: 'none',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
};
