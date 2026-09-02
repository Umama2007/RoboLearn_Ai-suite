import React, { useState } from 'react';
import {
  GraduationCap,
  Bot,
  FileUp,
  CreditCard,
  Presentation,
  GitFork,
  HelpCircle,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai-teacher', label: 'AI Teacher', icon: Bot },
    { id: 'word-pdf-uploader', label: 'Word+PDF Uploader', icon: FileUp },
    { id: 'quiz-simulator', label: 'Quiz Studio', icon: HelpCircle },
    { id: 'flashcards', label: 'Flash Cards', icon: CreditCard },
    { id: 'ppt-generator', label: 'PPT Generator', icon: Presentation },
    { id: 'flow-diagram', label: 'Flow Diagram', icon: GitFork },
  ];

  const handleNavClick = (id) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  return (
    <>
      <style>{`
        /* MOBILE TOP BAR (Shown only on small screens <= 992px) */
        .mobile-header-bar {
          display: none;
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 90;
          background: rgba(10, 15, 26, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          padding: 0.75rem 1.25rem;
          align-items: center;
          justify-content: space-between;
        }

        /* VERTICAL NAVBAR / SIDEBAR - FIXED FULL VIEWPORT HEIGHT */
        .vertical-navbar {
          width: 280px;
          min-width: 280px;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 100;
          background: linear-gradient(180deg, #0A0F1A 0%, #060913 50%, #04070D 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 10px 0 40px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.5rem 1.1rem;
          overflow-y: auto;
          flex-shrink: 0;
          box-sizing: border-box;
        }

        /* CUSTOM SCROLLBAR FOR SIDEBAR */
        .vertical-navbar::-webkit-scrollbar {
          width: 5px;
        }
        .vertical-navbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .vertical-navbar::-webkit-scrollbar-thumb {
          background: rgba(79, 209, 197, 0.3);
          border-radius: 4px;
        }
        .vertical-navbar::-webkit-scrollbar-thumb:hover {
          background: rgba(79, 209, 197, 0.6);
        }

        .sidebar-top-container {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        /* LOGO HEADER */
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          cursor: pointer;
          padding: 0.4rem 0.2rem;
          margin-bottom: 1.4rem;
        }

        .sidebar-logo-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(79, 209, 197, 0.4);
          transition: box-shadow 0.3s ease;
        }

        .sidebar-brand:hover .sidebar-logo-icon {
          box-shadow: 0 0 28px rgba(79, 209, 197, 0.75);
        }

        .sidebar-brand-title {
          font-weight: 800;
          font-size: 1.3rem;
          color: #ffffff;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .sidebar-brand-subtitle {
          font-size: 0.68rem;
          font-weight: 800;
          color: #4FD1C5;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 0.15rem;
        }

        /* USER PROFILE CARD */
        .sidebar-user-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 16px;
          padding: 0.85rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .sidebar-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #4FD1C5;
          object-fit: cover;
          flex-shrink: 0;
          box-shadow: 0 0 14px rgba(79, 209, 197, 0.35);
        }

        .sidebar-avatar-fallback {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4FD1C5 0%, #319795 100%);
          color: #04070D;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
          flex-shrink: 0;
          box-shadow: 0 0 14px rgba(79, 209, 197, 0.35);
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .sidebar-user-name {
          color: #ffffff;
          font-weight: 800;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-user-email {
          color: rgba(255, 255, 255, 0.55);
          font-weight: 500;
          font-size: 0.725rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* SECTION TITLE */
        .sidebar-section-title {
          font-size: 0.7rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0 0.5rem 0.6rem 0.5rem;
        }

        /* VERTICAL NAVIGATION LIST */
        .sidebar-nav-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          flex: 1;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.8rem 1rem;
          border-radius: 14px;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(255, 255, 255, 0.78);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .sidebar-nav-item-content {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          min-width: 0;
        }

        .sidebar-nav-item:hover {
          color: #4FD1C5;
          background: rgba(79, 209, 197, 0.14);
          border-color: rgba(79, 209, 197, 0.3);
        }

        .sidebar-nav-item.active {
          background: linear-gradient(135deg, #4FD1C5 0%, #319795 100%);
          color: #04070D;
          font-weight: 800;
          box-shadow: 0 6px 22px rgba(79, 209, 197, 0.45);
          border-color: transparent;
        }

        .sidebar-nav-item.active .active-arrow {
          opacity: 1;
        }

        .active-arrow {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        /* BOTTOM ACTIONS */
        .sidebar-footer {
          margin-top: 1.5rem;
          padding-top: 1.1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sidebar-logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          background: rgba(244, 63, 94, 0.14);
          border: 1px solid rgba(244, 63, 94, 0.4);
          color: #fb7185;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 700;
          width: 100%;
          transition: all 0.25s ease;
        }

        .sidebar-logout-button:hover {
          background: rgba(244, 63, 94, 0.32) !important;
          border-color: rgba(244, 63, 94, 0.8) !important;
          color: #ffffff !important;
          box-shadow: 0 6px 20px rgba(244, 63, 94, 0.45);
        }

        /* MOBILE OVERLAY */
        .mobile-nav-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          z-index: 95;
        }

        @media (max-width: 992px) {
          .mobile-header-bar {
            display: flex;
          }

          .vertical-navbar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            transform: translateX(-100%);
            transition: transform 0.3s ease-in-out;
            z-index: 100;
            box-shadow: 10px 0 40px rgba(0, 0, 0, 0.85);
          }

          .vertical-navbar.open {
            transform: translateX(0);
          }

          .mobile-nav-backdrop.open {
            display: block;
          }
        }
      `}</style>

      {/* MOBILE HEADER BAR */}
      <div className="mobile-header-bar">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
          onClick={() => handleNavClick('dashboard')}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color="#04070D" />
          </div>
          <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#ffffff' }}>
            Robo<span style={{ color: '#4FD1C5' }}>Learn</span>
          </span>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#ffffff', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* MOBILE BACKDROP */}
      <div
        className={`mobile-nav-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* VERTICAL NAVBAR / SIDEBAR */}
      <aside className={`vertical-navbar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top-container">
          {/* SIDEBAR LOGO BRAND */}
          <div className="sidebar-brand" onClick={() => handleNavClick('dashboard')}>
            <div className="sidebar-logo-icon">
              <GraduationCap size={24} color="#04070D" />
            </div>
            <div>
              <div className="sidebar-brand-title">
                Robo<span style={{ color: '#4FD1C5' }}>Learn</span>
              </div>
              <div className="sidebar-brand-subtitle">AI Learning Suite</div>
            </div>
          </div>

          {/* USER PROFILE CARD */}
          {user && (
            <div className="sidebar-user-card">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="sidebar-avatar" />
              ) : (
                <div className="sidebar-avatar-fallback">
                  {(user.name || 'S')[0].toUpperCase()}
                </div>
              )}
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name || 'Student'}</div>
                {user.email && <div className="sidebar-user-email">{user.email}</div>}
              </div>
            </div>
          )}

          {/* CIRCLED VERTICAL NAVIGATION ITEMS */}
          <div className="sidebar-section-title">Navigation Suite</div>
          <nav className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="sidebar-nav-item-content">
                    <Icon size={19} color={isActive ? '#04070D' : 'currentColor'} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight size={14} className="active-arrow" color="#04070D" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM FOOTER & LOGOUT */}
        <div className="sidebar-footer">
          <button onClick={onLogout} className="sidebar-logout-button" title="Log Out">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

