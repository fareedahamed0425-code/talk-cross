import React from 'react';
import { X, Download } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 200, padding: '24px' }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
          }}
        />
      </div>
    </div>
  );
};
