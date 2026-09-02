import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import WordPdfUploader from './components/WordPdfUploader';
import AiTeacher from './components/AiTeacher';
import QuizSimulator from './components/QuizSimulator';
import FlashcardGenerator from './components/FlashcardGenerator';
import PptGenerator from './components/PptGenerator';
import FlowDiagram from './components/FlowDiagram';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { API_BASE } from './config';


export default function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check backend session cookie first
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          localStorage.setItem('education_user', JSON.stringify(data.user));
        } else {
          checkLocalFallback();
        }
      })
      .catch(() => {
        checkLocalFallback();
      })
      .finally(() => {
        setCheckingAuth(false);
      });

    function checkLocalFallback() {
      const savedUser = localStorage.getItem('education_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {}
      }
    }
  }, []);

  const handleLogin = (userObj) => {
    setUser(userObj);
    localStorage.setItem('education_user', JSON.stringify(userObj));
  };

  const handleLogout = () => {
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    localStorage.removeItem('education_user');
    setUser(null);
    setActivePage('dashboard');
  };

  if (checkingAuth) {
    return (
      <div style={{ height: '100vh', background: '#04070D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4FD1C5', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <Sparkles size={32} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }} />
          <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>Authenticating RoboLearn Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      {/* Vertical Navbar Sidebar */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <main className="main-content">
          {activePage === 'dashboard' && (
            <Dashboard setActivePage={setActivePage} user={user} />
          )}
          {activePage === 'ai-teacher' && (
            <AiTeacher userId={user.id} />
          )}
          {activePage === 'word-pdf-uploader' && (
            <WordPdfUploader userId={user.id} />
          )}
          {activePage === 'quiz-simulator' && (
            <QuizSimulator userId={user.id} />
          )}
          {activePage === 'flashcards' && (
            <FlashcardGenerator userId={user.id} />
          )}
          {activePage === 'ppt-generator' && (
            <PptGenerator userId={user.id} />
          )}
          {activePage === 'flow-diagram' && (
            <FlowDiagram userId={user.id} />
          )}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          padding: '1.5rem',
          marginTop: 'auto',
          fontSize: '0.875rem',
          color: '#64748B'
        }}>
          <div style={{
            maxWidth: '1350px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0F172A', fontWeight: '700' }}>
              <Sparkles size={16} color="#0D9488" />
              <span>RoboLearn — AI Learning Suite</span>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontWeight: '500' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => setActivePage('ai-teacher')}>AI Teacher</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setActivePage('word-pdf-uploader')}>Word+PDF Uploader</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setActivePage('flashcards')}>Flash Cards</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setActivePage('ppt-generator')}>PPT Generator</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setActivePage('flow-diagram')}>Flow Diagram</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontWeight: '600' }}>
              <ShieldCheck size={16} /> Backend Proxy Connected
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
