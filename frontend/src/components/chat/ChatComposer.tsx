import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { api } from '../../services/api.js';
import { Sticker } from '../../types/index.js';
import { generateTalkCrossMediaName } from '../../utils/format.js';
import {
  Send,
  Smile,
  Paperclip,
  X,
  Sparkles,
} from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
      '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶',
      '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯',
      '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
      '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
      '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
      '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄',
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
      '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💍', '💎', '💐', '🌹', '🥀', '🌺',
      '🌸', '🌼', '🌻', '✨', '⭐', '🌟', '💫', '🔥', '💥', '⚡', '🌈',
    ],
  },
  {
    id: 'activities',
    name: 'Objects & Fun',
    icon: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎂', '🎁', '🏆', '🥇', '🥈', '🥉', '🎯', '🚀', '✈️', '🚗',
      '🚲', '💡', '🕯️', '🔔', '📢', '📣', '📱', '💻', '🖥️', '📷', '📸', '🎮', '🎧',
      '🎵', '🎶', '☕', '🍵', '🍕', '🍔', '🍟', '🌮', '🍦', '🍫', '🍿', '🍻', '🥂',
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: '🐱',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
      '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝',
      '🐛', '🦋', '🐢', '🐍', '🐙', '🐬', '🐳', '🦈', '🐊', '🐅', '🐘', '🌴', '🍀',
    ],
  },
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
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [mainPickerTab, setMainPickerTab] = useState<'emoji' | 'sticker'>('emoji');
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>('smileys');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState<string>('');

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
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

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
    if (myStickers.length > 0 || defaultStickers.length > 0) return;
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

  const togglePicker = () => {
    if (!showPicker) {
      loadStickers();
    }
    setShowPicker(!showPicker);
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
    setShowPicker(false);

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
    setShowPicker(false);
    await sendMessage({
      messageType: 'sticker',
      stickerId: sticker.id,
      mediaUrl: sticker.storage_url,
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'warning');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file size must be under 10MB', 'warning');
      return;
    }

    const customName = generateTalkCrossMediaName(file.name, file.type);
    const renamedFile = new File([file], customName, { type: file.type });

    setPendingImageFile(renamedFile);
    const objectUrl = URL.createObjectURL(renamedFile);
    setPendingImagePreview(objectUrl);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelImage = () => {
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }
    setPendingImageFile(null);
    setPendingImagePreview(null);
  };

  const handleSendImageUpload = async () => {
    if (!pendingImageFile) return;

    try {
      setIsUploadingImage(true);
      const res = await api.uploadMedia(pendingImageFile);

      await sendMessage({
        messageType: 'image',
        mediaUrl: res.url,
        content: text.trim() || undefined,
      });

      handleCancelImage();
      setText('');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'warning');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  // Filter emojis based on search
  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeEmojiCategory);
  const displayedEmojis = emojiSearchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : currentCategory?.emojis || [];

  return (
    <div className="chat-composer">
      {/* 1. Quoted Reply Bar */}
      {replyingTo && (
        <div className="reply-preview-bar">
          <div className="reply-preview-content">
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--burgundy-300)' }}>
              Replying to {replyingTo.sender_name || 'Friend'}
            </div>
            <div
              style={{
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '400px',
              }}
            >
              {replyingTo.message_type === 'image'
                ? '📷 Photo'
                : replyingTo.message_type === 'sticker'
                ? '✨ Sticker'
                : replyingTo.content}
            </div>
          </div>
          <button onClick={cancelReply} className="icon-btn" style={{ width: '26px', height: '26px' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* 2. Editing Message Bar */}
      {editingMessage && (
        <div
          className="reply-preview-bar"
          style={{ borderLeftColor: 'var(--primary)', backgroundColor: 'var(--bg-active)' }}
        >
          <div className="reply-preview-content">
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--burgundy-300)' }}>
              Editing Message
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Press Enter to save changes, Esc to cancel
            </div>
          </div>
          <button onClick={cancelEdit} className="icon-btn" style={{ width: '26px', height: '26px' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* 3. Image Upload Preview Banner */}
      {pendingImagePreview && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            backgroundColor: 'var(--bg-panel-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '8px',
          }}
        >
          <img
            src={pendingImagePreview}
            alt="Upload Preview"
            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {pendingImageFile?.name}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {pendingImageFile ? `${(pendingImageFile.size / 1024).toFixed(1)} KB` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="icon-btn"
              onClick={handleCancelImage}
              title="Cancel Upload"
              style={{ width: '32px', height: '32px' }}
            >
              <X size={16} />
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

      {/* 4. Unified Emoji & Sticker Popover */}
      {showPicker && (
        <div ref={popoverRef} className="composer-popover-panel">
          {/* Main Tabs: Emojis vs Stickers */}
          <div className="picker-main-header">
            <button
              type="button"
              className={`picker-header-tab ${mainPickerTab === 'emoji' ? 'active' : ''}`}
              onClick={() => setMainPickerTab('emoji')}
            >
              <Smile size={16} />
              <span>Emojis</span>
            </button>

            <button
              type="button"
              className={`picker-header-tab ${mainPickerTab === 'sticker' ? 'active' : ''}`}
              onClick={() => {
                setMainPickerTab('sticker');
                loadStickers();
              }}
            >
              <Sparkles size={16} />
              <span>Stickers</span>
            </button>
          </div>

          {/* TAB 1: FULL EMOJI SELECTOR */}
          {mainPickerTab === 'emoji' && (
            <div className="emoji-section-wrap">
              {/* Emoji Category Navigation */}
              <div className="emoji-cat-bar">
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`emoji-cat-btn ${activeEmojiCategory === cat.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveEmojiCategory(cat.id);
                      setEmojiSearchQuery('');
                    }}
                    title={cat.name}
                  >
                    <span>{cat.icon}</span>
                  </button>
                ))}
              </div>

              {/* Emoji Grid */}
              <div className="emoji-grid-container">
                {displayedEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="emoji-item-btn"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: STICKERS */}
          {mainPickerTab === 'sticker' && (
            <div className="stickers-section-wrap">
              <div className="sticker-sub-tabs">
                <button
                  type="button"
                  onClick={() => setStickerTab('my')}
                  className={`sticker-sub-tab ${stickerTab === 'my' ? 'active' : ''}`}
                >
                  My Stickers ({myStickers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStickerTab('default')}
                  className={`sticker-sub-tab ${stickerTab === 'default' ? 'active' : ''}`}
                >
                  Starter Pack ({defaultStickers.length})
                </button>
              </div>

              <div className="sticker-grid-container">
                {isLoadingStickers ? (
                  <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Loading stickers...
                  </div>
                ) : (stickerTab === 'my' ? myStickers : defaultStickers).length === 0 ? (
                  <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    No custom stickers yet. Create some in Sticker Studio!
                  </div>
                ) : (
                  (stickerTab === 'my' ? myStickers : defaultStickers).map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleSendSticker(st)}
                      className="sticker-pick-item"
                    >
                      <img src={st.storage_url} alt={st.name} className="sticker-pick-img" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Minimal Integrated Sender Box */}
      <div className="composer-input-row">
        {/* Integrated Capsule containing Emoji trigger + Textarea + File attachment */}
        <div className="composer-pill-box">
          {/* Unified Emoji & Sticker Trigger Button inside Box */}
          <button
            type="button"
            className="composer-inner-action-btn"
            onClick={togglePicker}
            title="Emojis & Stickers"
            style={{ color: showPicker ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <Smile size={20} />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="composer-textarea-inner"
          />

          {/* Media / Photo Attachment Button inside Box */}
          <button
            type="button"
            className="composer-inner-action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Photo"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Paperclip size={19} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Floating Send Button */}
        <button
          type="button"
          onClick={pendingImagePreview ? handleSendImageUpload : handleSend}
          disabled={!text.trim() && !pendingImagePreview}
          className="send-btn"
          title="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatComposer;
