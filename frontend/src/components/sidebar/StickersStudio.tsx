import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { api } from '../../services/api.js';
import { Sticker } from '../../types/index.js';
import { Smile, Trash2, Plus, Wand2 } from 'lucide-react';

export const StickersStudio: React.FC = () => {
  const { showToast } = useSocket();
  const [myStickers, setMyStickers] = useState<Sticker[]>([]);
  const [defaultStickers, setDefaultStickers] = useState<Sticker[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [stickerName, setStickerName] = useState<string>('');
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchStickers = async () => {
    try {
      setIsLoading(true);
      const res = await api.getStickers();
      setMyStickers(res.myStickers);
      setDefaultStickers(res.defaultStickers);
    } catch (err) {
      console.error('Failed to load stickers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStickers();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target?.result as string);
      setStickerName(file.name.replace(/\.[^/.]+$/, '').substring(0, 30));
      setIsCreating(true);
    };
    reader.readAsDataURL(file);
  };

  // Render image onto canvas and optionally perform white/bright background removal
  useEffect(() => {
    if (!selectedImageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Scale canvas to fit sticker size
      const maxDim = 320;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = (h / w) * maxDim;
          w = maxDim;
        } else {
          w = (w / h) * maxDim;
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      if (isRemovingBg) {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        // Simple intelligent chroma/light background transparency pass
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // If close to pure white or very light background
          if (r > 235 && g > 235 && b > 235) {
            data[i + 3] = 0; // Transparent
          } else if (r > 215 && g > 215 && b > 215) {
            data[i + 3] = Math.max(0, data[i + 3] - 140);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
    };
    img.src = selectedImageSrc;
  }, [selectedImageSrc, isRemovingBg]);

  const handleSaveSticker = async () => {
    if (!canvasRef.current) return;

    try {
      setIsSaving(true);
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const res = await api.createStickerFromDataUrl(
        stickerName.trim() || `Sticker_${Date.now()}`,
        dataUrl
      );

      setMyStickers((prev) => [res.sticker, ...prev]);
      setIsCreating(false);
      setSelectedImageSrc(null);
      setStickerName('');
      showToast('Sticker saved to your collection!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save sticker', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSticker = async (stickerId: string) => {
    if (!window.confirm('Delete this sticker from your collection?')) return;
    try {
      await api.deleteSticker(stickerId);
      setMyStickers((prev) => prev.filter((s) => s.id !== stickerId));
      showToast('Sticker deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete sticker', 'warning');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header action */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-sidebar)',
        }}
      >
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Sticker Studio
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Create & manage custom stickers
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
          style={{ display: 'flex', gap: '6px', fontSize: '12.5px' }}
        >
          <Plus size={16} /> New Sticker
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png, image/jpeg, image/webp"
          style={{ display: 'none' }}
        />
      </div>

      {/* Main Content */}
      <div className="sidebar-content" style={{ padding: '16px' }}>
        {/* Creator Modal / Dialog */}
        {isCreating && selectedImageSrc && (
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              marginBottom: '20px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Sticker Preview & Studio
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 0)',
                backgroundSize: '12px 12px',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                minHeight: '160px',
                marginBottom: '14px',
              }}
            >
              <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={stickerName}
                onChange={(e) => setStickerName(e.target.value)}
                placeholder="Sticker name..."
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              />
              <button
                type="button"
                className={`btn-secondary ${isRemovingBg ? 'active' : ''}`}
                onClick={() => setIsRemovingBg(!isRemovingBg)}
                title="Toggle Background Removal Filter"
                style={{
                  display: 'flex',
                  gap: '4px',
                  fontSize: '12px',
                  backgroundColor: isRemovingBg ? 'rgba(6, 182, 212, 0.2)' : undefined,
                  borderColor: isRemovingBg ? 'var(--primary)' : undefined,
                }}
              >
                <Wand2 size={14} color={isRemovingBg ? 'var(--primary)' : 'inherit'} />
                {isRemovingBg ? 'Bg Erased' : 'Erase Bg'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsCreating(false);
                  setSelectedImageSrc(null);
                }}
                disabled={isSaving}
                style={{ fontSize: '12.5px' }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveSticker}
                disabled={isSaving}
                style={{ fontSize: '12.5px' }}
              >
                {isSaving ? 'Uploading to Supabase...' : 'Save Sticker'}
              </button>
            </div>
          </div>
        )}

        {/* User's Created Stickers */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              marginBottom: '10px',
              textTransform: 'uppercase',
            }}
          >
            My Custom Stickers ({myStickers.length})
          </div>

          {isLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
              Loading sticker collection...
            </div>
          ) : myStickers.length === 0 ? (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Smile size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                No custom stickers yet
              </div>
              <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                Upload an image or meme to turn it into a sticker!
              </div>
              <button
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ margin: '0 auto', fontSize: '12px' }}
              >
                Create First Sticker
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
              }}
            >
              {myStickers.map((sticker) => (
                <div
                  key={sticker.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <img
                    src={sticker.storage_url}
                    alt={sticker.name}
                    style={{
                      width: '100%',
                      height: '75px',
                      objectFit: 'contain',
                      marginBottom: '6px',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    {sticker.name}
                  </span>
                  <button
                    onClick={() => handleDeleteSticker(sticker.id)}
                    title="Delete Sticker"
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'var(--danger)',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Starter Pack Stickers */}
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              marginBottom: '10px',
              textTransform: 'uppercase',
            }}
          >
            Starter Sticker Pack
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {defaultStickers.map((sticker) => (
              <div
                key={sticker.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <img
                  src={sticker.storage_url}
                  alt={sticker.name}
                  style={{
                    width: '100%',
                    height: '75px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    marginBottom: '6px',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {sticker.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
