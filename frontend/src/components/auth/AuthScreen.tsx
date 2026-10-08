import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { MessageSquare, Shield, Smile, Zap, User, ArrowRight, Sun, Moon, CheckCheck, Heart } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, signInWithDemoUser, isLoading, error } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [demoName, setDemoName] = useState<string>('Fareed');
  const [showCustomDemo, setShowCustomDemo] = useState<boolean>(false);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#050507',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Background Ambient Burgundy Glows */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '5%',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(159, 18, 57, 0.22) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(225, 29, 72, 0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Ambient Curved Glowing Wire/Path Background */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M-50,280 C200,180 280,440 500,380 C720,320 820,520 1100,420 C1300,350 1400,220 1500,320"
          stroke="url(#burgundyGradient)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          opacity="0.65"
        />
        <path
          d="M-50,280 C200,180 280,440 500,380 C720,320 820,520 1100,420 C1300,350 1400,220 1500,320"
          stroke="url(#burgundyGradientSolid)"
          strokeWidth="1.5"
          opacity="0.4"
        />
        {/* Node Dots on line */}
        <circle cx="132" cy="308" r="4.5" fill="#f43f5e" />
        <circle cx="132" cy="308" r="9" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="2" />
        <circle cx="1208" cy="425" r="4.5" fill="#f43f5e" />
        <circle cx="1208" cy="425" r="9" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="2" />
        <circle cx="1360" cy="285" r="4" fill="#fb7185" />

        <defs>
          <linearGradient id="burgundyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#881337" stopOpacity="0.2" />
            <stop offset="30%" stopColor="#e11d48" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#881337" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="burgundyGradientSolid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#be123c" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating Decorative Elements (Left Side) */}
      <div
        className="hide-on-mobile"
        style={{
          position: 'absolute',
          top: '34%',
          left: '8%',
          zIndex: 2,
          transform: 'rotate(-8deg)',
          backgroundColor: 'rgba(24, 18, 24, 0.65)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(159, 18, 57, 0.2)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fda4af', opacity: 0.9 }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fb7185', opacity: 0.9 }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e', opacity: 0.9 }} />
      </div>

      <div
        className="hide-on-mobile"
        style={{
          position: 'absolute',
          bottom: '36%',
          left: '17%',
          zIndex: 2,
          transform: 'rotate(6deg)',
          backgroundColor: 'rgba(24, 18, 24, 0.65)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '50%',
          width: '54px',
          height: '54px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(159, 18, 57, 0.2)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fda4af',
          pointerEvents: 'none',
        }}
      >
        <Smile size={26} />
      </div>

      {/* Floating Decorative Elements (Right Side) */}
      <div
        className="hide-on-mobile"
        style={{
          position: 'absolute',
          top: '33%',
          right: '8%',
          zIndex: 2,
          transform: 'rotate(5deg)',
          backgroundColor: 'rgba(28, 16, 24, 0.7)',
          border: '1px solid rgba(244, 63, 94, 0.28)',
          borderRadius: '16px',
          padding: '12px 18px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 24px rgba(159, 18, 57, 0.25)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#fecdd3' }}>Let's catch up!</span>
        <span style={{ fontSize: '11px', color: '#fda4af', display: 'flex', alignItems: 'center', gap: '3px' }}>
          9:41 PM <CheckCheck size={14} color="#67e8f9" />
        </span>
      </div>

      <div
        className="hide-on-mobile"
        style={{
          position: 'absolute',
          bottom: '36%',
          right: '15%',
          zIndex: 2,
          transform: 'rotate(-10deg)',
          backgroundColor: 'rgba(28, 16, 24, 0.7)',
          border: '1px solid rgba(244, 63, 94, 0.28)',
          borderRadius: '16px',
          width: '56px',
          height: '56px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 24px rgba(159, 18, 57, 0.25)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fb7185',
          pointerEvents: 'none',
        }}
      >
        <Heart size={26} fill="#fb7185" />
      </div>

      {/* Floating Theme Switcher */}
      <button
        onClick={toggleTheme}
        className="icon-btn"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          zIndex: 20,
        }}
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      >
        {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#fda4af" />}
      </button>

      {/* Central Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'rgba(13, 13, 17, 0.75)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '28px',
          padding: '40px 36px 32px 36px',
          boxShadow: '0 0 60px rgba(159, 18, 57, 0.16), 0 20px 60px rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* App Logo Icon with Burgundy Gradient Glow */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #e11d48, #881337)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            marginBottom: '20px',
            boxShadow: '0 0 24px rgba(225, 29, 72, 0.5), 0 4px 16px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <MessageSquare size={32} />
        </div>

        {/* Brand Name */}
        <h1
          style={{
            fontFamily: 'var(--font-brand)',
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '8px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <span style={{ color: '#ffffff' }}>Talk</span>
          <span
            style={{
              background: 'linear-gradient(135deg, #fda4af, #f43f5e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Cross
          </span>
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: '#a1a1aa',
            marginBottom: '32px',
            lineHeight: 1.45,
          }}
        >
          Private, real-time messaging
          <br />
          with your friends.
        </p>

        {error && (
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            {error}
          </div>
        )}

        {/* Primary Action: Continue with Google */}
        <button
          onClick={signInWithGoogle}
          disabled={isLoading}
          style={{
            width: '100%',
            height: '48px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontWeight: 600,
            fontSize: '14.5px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '0 20px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {/* Google G Logo */}
          <div style={{ position: 'absolute', left: '18px', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>

          <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>

          <div style={{ position: 'absolute', right: '18px', display: 'flex', alignItems: 'center' }}>
            <ArrowRight size={18} />
          </div>
        </button>

        {/* OR Divider */}
        <div
          style={{
            width: '100%',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'rgba(255, 255, 255, 0.35)',
            fontSize: '11.5px',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
          <span>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
        </div>

        {/* Demo Fast Sign-In Grid */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => signInWithDemoUser('Fareed')}
              disabled={isLoading}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '11px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <User size={15} color="#fda4af" />
              <span>Sign in as @fareed</span>
            </button>

            <button
              onClick={() => signInWithDemoUser('Rahul')}
              disabled={isLoading}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '11px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <User size={15} color="#fda4af" />
              <span>Sign in as @rahul</span>
            </button>
          </div>

          {!showCustomDemo ? (
            <button
              onClick={() => setShowCustomDemo(true)}
              style={{
                color: '#fb7185',
                fontSize: '12.5px',
                fontWeight: 500,
                marginTop: '4px',
                alignSelf: 'center',
                padding: '4px 8px',
              }}
            >
              + Enter custom demo name
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                type="text"
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                placeholder="Enter name (e.g. Maya)"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  fontSize: '13px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  color: '#ffffff',
                }}
              />
              <button
                onClick={() => signInWithDemoUser(demoName)}
                disabled={isLoading || !demoName.trim()}
                className="btn-primary"
                style={{ padding: '9px 16px', fontSize: '12.5px' }}
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid at Bottom */}
        <div
          style={{
            marginTop: '32px',
            paddingTop: '22px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Zap size={18} color="#f43f5e" style={{ marginBottom: '6px' }} />
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#f4f4f5' }}>Instant Messages</span>
            <span style={{ fontSize: '10.5px', color: '#71717a', marginTop: '2px' }}>Real-time chatting</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Smile size={18} color="#fb7185" style={{ marginBottom: '6px' }} />
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#f4f4f5' }}>Sticker Studio</span>
            <span style={{ fontSize: '10.5px', color: '#71717a', marginTop: '2px' }}>Create your own</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Shield size={18} color="#fda4af" style={{ marginBottom: '6px' }} />
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#f4f4f5' }}>Private by Design</span>
            <span style={{ fontSize: '10.5px', color: '#71717a', marginTop: '2px' }}>Your chats, your space</span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
