import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { api } from '../../services/api.js';
import { Sticker } from '../../types/index.js';
import {
  Send,
  Smile,
  Paperclip,
  X,
  Sparkles,
} from 'lucide-react';

const COMMON_EMOJIS = [
  '😊', '😂', '🔥', '❤️', '👍', '🎉', '✨', '🙌',
  '😎', '😍', '🤔', '🥳', '🚀', '💯', '👏', '🙏',
  '☕', '🍕', '🐱', '🐶', '👀', '💡', '🌟', '💪',
];

export const ChatComposer: React.FC = () => {
  const {
    sendMessage,
    replyingTo,
    cancelReply,
    editingMessage,
    cancelEdit,
    editMessage,
    emitTyping,
  } = useChat();
  const { showToast } = useSocket();

  const [text, setText] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showStickerPicker, setShowStickerPicker] = useState<boolean>(false);
  const [myStickers, setMyStickers] = useState<Sticker[]>([]);
  const [defaultStickers, setDefaultStickers] = useState<Sticker[]>([]);
  const [stickerTab, setStickerTab] = useState<'my' | 'default'>('my');
  const [isLoadingStickers, setIsLoadingStickers] = useState<boolean>(false);

  // Selected file for upload preview
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When edit mode is triggered, populate composer
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const loadStickers = async () => {
    try {
      setIsLoadingStickers(true);
      const res = await api.getStickers();
      setMyStickers(res.myStickers);
      setDefaultStickers(res.defaultStickers);
    } catch (err) {
      console.error('Failed to fetch stickers:', err);
    } finally {
      setIsLoadingStickers(false);
    }
  };

  const toggleStickerPicker = () => {
    if (!showStickerPicker) {
      loadStickers();
      setShowEmojiPicker(false);
    }
    setShowStickerPicker(!showStickerPicker);
  };

  const toggleEmojiPicker = () => {
    if (!showEmojiPicker) {
      setShowStickerPicker(false);
    }
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    emitTyping(true);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage) {
      await editMessage(editingMessage.id, trimmed);
      setText('');
      cancelEdit();
      return;
    }

    setText('');
    setShowEmojiPicker(false);
    setShowStickerPicker(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage({
      messageType: 'text',
      content: trimmed,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendSticker = async (sticker: Sticker) => {
    setShowStickerPicker(false);
    await sendMessage({
      messageType: 'sticker',
      stickerId: sticker.is_default ? null : sticker.id,
      mediaUrl: sticker.storage_url,
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendImageUpload = async () => {
    if (!pendingImageFile) return;

    try {
      setIsUploadingImage(true);
      const res = await api.uploadMedia(pendingImageFile, 'chat-media');

      await sendMessage({
        messageType: 'image',
        mediaUrl: res.url,
        content: text.trim() || null,
      });

      setPendingImageFile(null);
      setPendingImagePreview(null);
      setText('');
    } catch (err: any) {
      showToast(err.message || 'Image upload failed', 'warning');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="chat-composer">
      {/* 1. Reply Preview Banner */}
      {replyingTo && (
        <div className="reply-preview-bar">
          <div className="reply-preview-content">
            <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
              Replying to {replyingTo.sender?.display_name || 'Friend'}
            </div>
            <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
              {replyingTo.message_type === 'image'
                ? '📷 Photo'
                : replyingTo.message_type === 'sticker'
                ? '✨ Sticker'
                : replyingTo.content}
            </div>
          </div>
          <button onClick={cancelReply} className="icon-btn" style={{ width: '28px', height: '28px' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* 2. Edit Preview Banner */}
      {editingMessage && (
        <div className="reply-preview-bar" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="reply-preview-content">
            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
              Editing message
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              Press Enter to save, or cancel
            </div>
          </div>
          <button onClick={cancelEdit} className="icon-btn" style={{ width: '28px', height: '28px' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* 3. Image Upload Preview Dialog */}
      {pendingImagePreview && (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '10px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <img
            src={pendingImagePreview}
            alt="Upload preview"
            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
          />
          <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div>Ready to send image</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Add an optional caption below and click Send
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={() => {
                setPendingImageFile(null);
                setPendingImagePreview(null);
              }}
              disabled={isUploadingImage}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSendImageUpload}
              disabled={isUploadingImage}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              {isUploadingImage ? 'Uploading...' : 'Send Photo'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Popover: Emoji Picker */}
      {showEmojiPicker && (
        <div className="popover-panel">
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            QUICK EMOJIS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
            {COMMON_EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => setText((prev) => prev + emoji)}
                style={{
                  fontSize: '20px',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'transform 0.1s',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Popover: Sticker Picker */}
      {showStickerPicker && (
        <div className="popover-panel" style={{ width: '320px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            <button
              onClick={() => setStickerTab('my')}
              style={{
                fontSize: '12px',
                fontWeight: stickerTab === 'my' ? 600 : 400,
                color: stickerTab === 'my' ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              My Stickers ({myStickers.length})
            </button>
            <button
              onClick={() => setStickerTab('default')}
              style={{
                fontSize: '12px',
                fontWeight: stickerTab === 'default' ? 600 : 400,
                color: stickerTab === 'default' ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              Starter Pack ({defaultStickers.length})
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
            {isLoadingStickers ? (
              <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                Loading stickers...
              </div>
            ) : (stickerTab === 'my' ? myStickers : defaultStickers).length === 0 ? (
              <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No stickers yet. Create some in Sticker Studio!
              </div>
            ) : (
              (stickerTab === 'my' ? myStickers : defaultStickers).map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleSendSticker(st)}
                  style={{
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s, background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <img
                    src={st.storage_url}
                    alt={st.name}
                    style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. Composer Input Row */}
      <div className="composer-input-row">
        {/* Emoji Button */}
        <button
          type="button"
          className="icon-btn"
          onClick={toggleEmojiPicker}
          title="Emoji Picker"
          style={{ color: showEmojiPicker ? 'var(--primary)' : undefined }}
        >
          <Smile size={20} />
        </button>

        {/* Sticker Button */}
        <button
          type="button"
          className="icon-btn"
          onClick={toggleStickerPicker}
          title="Stickers"
          style={{ color: showStickerPicker ? 'var(--primary)' : undefined }}
        >
          <Sparkles size={20} />
        </button>

        {/* Media / Photo Attachment Button */}
        <button
          type="button"
          className="icon-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach Photo"
        >
          <Paperclip size={20} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="composer-textarea"
        />

        {/* Send Action */}
        <button
          type="button"
          onClick={pendingImagePreview ? handleSendImageUpload : handleSend}
          disabled={!text.trim() && !pendingImagePreview}
          className="send-btn"
          title="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
