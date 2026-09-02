import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, User, GraduationCap, ArrowRight } from 'lucide-react';
import { API_BASE } from '../config';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [googleClientId, setGoogleClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const googleBtnRef = useRef(null);

  // Fetch public auth config from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/config`)
      .then(res => res.json())
      .then(data => {
        if (data.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
      })
      .catch(() => {});
  }, []);

  // Load Google Identity Services SDK (GIS)
  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts?.id) {
      initGoogleAuth();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initGoogleAuth();
    };
    document.head.appendChild(script);
  }, [googleClientId, isLogin]);

  const initGoogleAuth = () => {
    if (!window.google?.accounts?.id || !googleClientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCallback,
        auto_select: false
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: isLogin ? 'continue_with' : 'signup_with',
          shape: 'pill'
        });
      }
    } catch (err) {
      console.warn('Google Identity init notice:', err);
    }
  };

  const handleGoogleCallback = async (response) => {
    if (!response.credential) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Google login failed');
      }
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Real Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? `${API_BASE}/api/auth/login` : `${API_BASE}/api/auth/signup`;
    const payload = isLogin ? { email, password } : { username: name, email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Authentication failed');
      }
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Server authentication error. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerGoogle = () => {
    if (googleClientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In requires configuring VITE_GOOGLE_CLIENT_ID on the server.');
    }
  };

  return (
    <div className="auth-wrapper">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-wrapper {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #04070D;
        }

        /* ── FULL-SCREEN BACKGROUND MEDIA ── */
        .auth-bg-video,
        .auth-bg-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 1;
          pointer-events: none;
          user-select: none;
        }

        /* Dark overlay so card text is always readable */
        .auth-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(
            135deg,
            rgba(4, 7, 13, 0.35) 0%,
            rgba(4, 7, 13, 0.15) 50%,
            rgba(4, 7, 13, 0.72) 100%
          );
          pointer-events: none;
        }

        /* ── BOTTOM-RIGHT CARD ── */
        .auth-card-wrap {
          position: absolute;
          bottom: 2.5rem;
          right: 2.5rem;
          z-index: 10;
          width: 100%;
          max-width: 390px;
          animation: slideInCard 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes slideInCard {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }

        .auth-card {
          background: rgba(8, 12, 22, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 1.35rem;
          padding: 1.5rem 1.6rem 1.6rem;
          box-shadow:
            0 32px 80px rgba(0, 0, 0, 0.85),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 0 40px rgba(79, 209, 197, 0.14);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
        }

        /* ── INPUTS ── */
        .auth-input {
          width: 100%;
          padding: 0.55rem 0.85rem 0.55rem 2.35rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(5, 8, 15, 0.88);
          color: #ffffff;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.25s ease;
          font-family: inherit;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.38); }
        .auth-input:focus {
          border-color: #4FD1C5;
          box-shadow: 0 0 14px rgba(79, 209, 197, 0.35);
          background: rgba(8, 12, 22, 0.95);
        }

        /* ── SUBMIT BUTTON ── */
        .auth-submit-btn {
          width: 100%;
          padding: 0.65rem;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #4FD1C5 0%, #319795 100%);
          color: #04070D;
          font-weight: 800;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          box-shadow: 0 6px 22px rgba(79, 209, 197, 0.45);
          transition: all 0.25s ease;
          font-family: inherit;
        }
        .auth-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(79, 209, 197, 0.6);
        }
        .auth-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        /* ── GOOGLE BUTTON ── */
        .google-btn {
          transition: all 0.2s ease;
        }
        .google-btn:hover {
          background: rgba(255, 255, 255, 0.16) !important;
          border-color: rgba(66, 133, 244, 0.6) !important;
          box-shadow: 0 4px 20px rgba(66, 133, 244, 0.3) !important;
          transform: translateY(-1px);
        }

        @media (max-width: 600px) {
          .auth-card-wrap {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
            max-width: 100%;
          }
          .auth-card {
            padding: 1.25rem 1.25rem 1.4rem;
            border-radius: 1.1rem;
          }
        }
      `}</style>

      {/* ── FULL-SCREEN BACKGROUND: VIDEO (login) or IMAGE (signup) ── */}
      {isLogin ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          className="auth-bg-video"
        >
          <source src="/0802.mp4" type="video/mp4" />
          <source src="/robot.mp4" type="video/mp4" />
          <source src="/background.mp4" type="video/mp4" />
        </video>
      ) : (
        <img
          src="/robot-waving.jpeg"
          alt="RoboLearn Robot"
          className="auth-bg-image"
        />
      )}

      {/* Dark gradient overlay */}
      <div className="auth-overlay" />

      {/* ── BOTTOM-RIGHT FORM CARD ── */}
      <div className="auth-card-wrap" key={isLogin ? 'login' : 'signup'}>
        <div className="auth-card">

          {/* Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(255,255,255,0.3)'
              }}>
                <GraduationCap size={19} color="#04070D" />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Robo<span style={{ color: '#4FD1C5' }}>Learn</span>
              </span>
            </div>
            <span style={{
              fontSize: '0.62rem', fontWeight: '800', color: '#4FD1C5',
              background: 'rgba(79,209,197,0.12)',
              border: '1px solid rgba(79,209,197,0.35)',
              padding: '0.22rem 0.55rem', borderRadius: '20px',
              letterSpacing: '0.05em'
            }}>
              SECURE PORTAL
            </span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.2rem', letterSpacing: '-0.02em' }}>
            {isLogin ? 'Welcome Back' : 'Create Your Account'}
          </h1>
          <p style={{ fontSize: '0.815rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.9rem' }}>
            {isLogin ? "Don't have an account yet? " : 'Already registered? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{
                background: 'none', border: 'none', color: '#4FD1C5',
                fontWeight: '700', fontSize: '0.815rem',
                cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit'
              }}
            >
              {isLogin ? 'Sign up now' : 'Log in here'}
            </button>
          </p>

          {/* REAL GOOGLE BUTTON CONTAINER */}
          {googleClientId ? (
            <div style={{ marginBottom: '0.7rem' }}>
              <div ref={googleBtnRef} style={{ width: '100%', minHeight: '40px' }} />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleTriggerGoogle}
              className="google-btn"
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.65rem',
                padding: '0.6rem 0.85rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '10px', fontSize: '0.875rem', fontWeight: '700',
                color: '#ffffff', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                marginBottom: '0.7rem', fontFamily: 'inherit'
              }}
            >
              <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isLogin ? 'Continue with Google' : 'Sign up with Google'}</span>
            </button>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.3rem 0 0.7rem 0' }}>
            <div style={{ flexGrow: 1, borderTop: '1px solid rgba(255,255,255,0.14)' }} />
            <span style={{ padding: '0 0.6rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              OR {isLogin ? 'LOGIN' : 'SIGN UP'} WITH EMAIL
            </span>
            <div style={{ flexGrow: 1, borderTop: '1px solid rgba(255,255,255,0.14)' }} />
          </div>

          {/* Real Form */}
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {error && (
              <div style={{
                padding: '0.55rem 0.85rem', borderRadius: '10px',
                background: 'rgba(244,63,94,0.18)', border: '1px solid rgba(244,63,94,0.45)',
                color: '#fca5a5', fontSize: '0.78rem', textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Full Name (signup only) */}
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.2rem' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} color="rgba(255,255,255,0.45)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="text" placeholder="e.g. Alex Johnson" value={name} onChange={(e) => setName(e.target.value)} required={!isLogin} className="auth-input" />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.2rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color="rgba(255,255,255,0.45)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="email" placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="auth-input" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.2rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="rgba(255,255,255,0.45)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.45)', padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div style={{ paddingTop: '0.3rem' }}>
              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? 'Authenticating...' : (isLogin ? 'Log in to Portal' : 'Create Account')}
                <ArrowRight size={15} />
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
