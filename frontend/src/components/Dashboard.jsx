import React, { useState, useEffect } from 'react';
import {
  Bot,
  FileUp,
  CreditCard,
  Presentation,
  GitFork,
  ArrowRight,
  Sparkles,
  BookOpen,
  Zap,
  Layers,
  FileText,
  Trash2,
  Trophy,
  AlertTriangle,
  Clock,
  BarChart3,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { API_BASE } from '../config';

export default function Dashboard({ setActivePage, user }) {
  const [stats, setStats] = useState({
    books: [],
    overall_mastery: 0.0,
    weak_topics: [],
    recent_attempts: [],
    streak_days: 1,
    materials_count: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    try {
      const uId = user?.id;
      const res = await fetch(`${API_BASE}/api/user/dashboard-stats${uId ? `?user_id=${encodeURIComponent(uId)}` : ''}`, {
        credentials: 'include',
        headers: uId ? { 'Authorization': `Bearer ${uId}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setStats(data);
        }
      }
    } catch (e) {
      console.error("Dashboard stats error:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleSelectActiveBook = async (bookId) => {
    try {
      await fetch(`${API_BASE}/api/user/books/active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'Authorization': `Bearer ${user.id}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ book_id: bookId, user_id: user?.id })
      });
      setActivePage('ai-teacher');
    } catch (e) {
      console.error("Set active book error:", e);
      setActivePage('ai-teacher');
    }
  };

  const handleDeleteBook = async (bookId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this book from your library?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/books/${bookId}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'Authorization': `Bearer ${user.id}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ user_id: user?.id })
      });
      if (res.ok) {
        fetchStats();
      }
    } catch (err) {
      console.error("Delete book error:", err);
    }
  };

  const tools = [
    {
      id: 'ai-teacher',
      title: 'AI Teacher',
      badge: 'on-demand tutor',
      badgeColor: 'badge-cyan',
      cardTheme: 'card-cyan',
      icon: Bot,
      iconBg: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
      btnBg: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
      btnGlow: 'rgba(13, 148, 136, 0.35)',
      accentColor: '#0D9488',
      description: 'drop your textbooks & past papers in — get a personal AI tutor that actually knows your syllabus. topic breakdowns, live Q&A, quizzes that grade themselves.',
      features: ['Textbook & Past Paper Training', 'Topic Breakdowns & Live Q&A', 'Self-Grading Quizzes'],
      actionText: 'Launch AI Teacher'
    },
    {
      id: 'word-pdf-uploader',
      title: 'Word + PDF Uploader',
      badge: 'auto-pilot mode',
      badgeColor: 'badge-emerald',
      cardTheme: 'card-emerald',
      icon: FileUp,
      iconBg: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
      btnBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      btnGlow: 'rgba(16, 185, 129, 0.35)',
      accentColor: '#059669',
      description: 'upload your files & set your timeline (days, weeks, or months) — get a fully custom adaptive study plan. zero manual work, just results.',
      features: ['Document Text Extraction', 'Customizable Study Plan (Days/Weeks/Months)', 'Zero Manual Work'],
      actionText: 'Upload & Generate'
    },
    {
      id: 'flashcards',
      title: 'Flash Card Generator',
      badge: 'study on hard mode',
      badgeColor: 'badge-cyan',
      cardTheme: 'card-blue',
      icon: CreditCard,
      iconBg: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
      btnBg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
      btnGlow: 'rgba(2, 132, 199, 0.35)',
      accentColor: '#0284C7',
      description: 'notes in, flashcards out. 3D flip cards + spaced repetition, tracks what you\'ve actually mastered.',
      features: ['Notes to Flashcards', '3D Interactive Flip Cards', 'Spaced Repetition & Mastery'],
      actionText: 'Generate Flash Cards'
    },
    {
      id: 'ppt-generator',
      title: 'PPT Generator',
      badge: 'slides, instantly',
      badgeColor: 'badge-purple',
      cardTheme: 'card-purple',
      icon: Presentation,
      iconBg: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
      btnBg: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
      btnGlow: 'rgba(124, 58, 237, 0.35)',
      accentColor: '#7C3AED',
      description: 'type a topic, get a full deck back. multiple themes, fully editable, ready to present.',
      features: ['Instant Full Slide Decks', 'Multiple Theme Options', 'Fully Editable Outlines'],
      actionText: 'Create Presentation'
    },
    {
      id: 'flow-diagram',
      title: 'Flow Diagram Generator',
      badge: 'make it click',
      badgeColor: 'badge-amber',
      cardTheme: 'card-amber',
      icon: GitFork,
      iconBg: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
      btnBg: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
      btnGlow: 'rgba(217, 119, 6, 0.35)',
      accentColor: '#D97706',
      description: 'confusing topic in, clean flowchart out. visual learning that actually works.',
      features: ['Topic to Flowchart', 'Interactive Logic Diagrams', 'Visual Learning Maps'],
      actionText: 'Generate Flow Diagram'
    }
  ];

  return (
    <div className="animate-fade-in">
      <style>{`
        .tool-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(145deg, #0F172A 0%, #1E293B 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 1.75rem;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.18);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .tool-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: transparent;
          transition: background 0.35s ease;
        }

        .tool-card.card-cyan:hover {
          transform: translateY(-6px);
          border-color: #0D9488;
          box-shadow: 0 22px 50px rgba(13, 148, 136, 0.35), 0 0 25px rgba(79, 209, 197, 0.2);
        }
        .tool-card.card-cyan:hover::before {
          background: linear-gradient(90deg, #0D9488, #2DD4BF);
        }

        .tool-card.card-emerald:hover {
          transform: translateY(-6px);
          border-color: #059669;
          box-shadow: 0 22px 50px rgba(16, 185, 129, 0.35), 0 0 25px rgba(52, 211, 153, 0.2);
        }
        .tool-card.card-emerald:hover::before {
          background: linear-gradient(90deg, #059669, #34D399);
        }

        .tool-card.card-blue:hover {
          transform: translateY(-6px);
          border-color: #0284C7;
          box-shadow: 0 22px 50px rgba(2, 132, 199, 0.35), 0 0 25px rgba(56, 189, 248, 0.2);
        }
        .tool-card.card-blue:hover::before {
          background: linear-gradient(90deg, #0284C7, #38BDF8);
        }

        .tool-card.card-purple:hover {
          transform: translateY(-6px);
          border-color: #7C3AED;
          box-shadow: 0 22px 50px rgba(124, 58, 237, 0.35), 0 0 25px rgba(192, 132, 252, 0.2);
        }
        .tool-card.card-purple:hover::before {
          background: linear-gradient(90deg, #7C3AED, #C084FC);
        }

        .tool-card.card-amber:hover {
          transform: translateY(-6px);
          border-color: #D97706;
          box-shadow: 0 22px 50px rgba(217, 119, 6, 0.35), 0 0 25px rgba(251, 191, 36, 0.2);
        }
        .tool-card.card-amber:hover::before {
          background: linear-gradient(90deg, #D97706, #FBBF24);
        }

        @media (max-width: 1150px) {
          .hero-partition-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .hero-partition-line {
            display: none !important;
          }
        }
      `}</style>

      {/* Hero Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        padding: '2rem 2.25rem',
        marginBottom: '2rem',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18), 0 0 35px rgba(13, 148, 136, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(79, 209, 197, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="hero-partition-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr auto 1fr',
          alignItems: 'center',
          gap: '2rem',
          position: 'relative',
          zIndex: 1
        }}>
          {/* LEFT PARTITION: WELCOME TEXT & QUICK STATS */}
          <div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              <span className="badge badge-cyan" style={{ background: 'rgba(79, 209, 197, 0.16)', color: '#4FD1C5', border: '1px solid rgba(79, 209, 197, 0.35)', padding: '0.4rem 0.9rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                {user?.provider === 'google' ? 'GOOGLE VERIFIED ACCOUNT ⚡' : "VERIFIED ACCOUNT ⚡"}
              </span>
              <span style={{ background: 'rgba(245, 158, 11, 0.16)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '0.4rem 0.9rem', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Flame size={15} color="#FBBF24" /> {stats.streak_days} Day Streak
              </span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.6rem', color: '#ffffff', lineHeight: '1.2' }}>
              Welcome back, {user?.name || 'Student'}! 👋
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: '0.975rem', lineHeight: '1.6' }}>
              Your personal AI Learning Suite is synced. Track textbook mastery, weak topics, and resume any saved book instantly.
            </p>
          </div>

          {/* VERTICAL PARTITION DIVIDER */}
          <div className="hero-partition-line" style={{
            width: '2px',
            alignSelf: 'stretch',
            background: 'linear-gradient(180deg, transparent 0%, rgba(79, 209, 197, 0.4) 20%, rgba(79, 209, 197, 0.85) 50%, rgba(79, 209, 197, 0.4) 80%, transparent 100%)',
            boxShadow: '0 0 12px rgba(79, 209, 197, 0.6)'
          }} />

          {/* RIGHT PARTITION: 5-SEC DANCING ROBOT VIDEO */}
          <div style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            height: '210px',
            background: '#000000',
            border: '1px solid rgba(79, 209, 197, 0.35)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(79, 209, 197, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video
              autoPlay
              loop
              muted
              playsInline
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                filter: 'contrast(1.1) brightness(0.95)'
              }}
            >
              <source src="/robot_dancing.mp4" type="video/mp4" />
              <source src="/Robot_dancing_video_5_sec_202608021621.mp4" type="video/mp4" />
              <source src="/0802.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>

      {/* ADAPTIVE MASTERY & ANALYTICS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.25rem' }}>
        
        {/* Overall Mastery Card */}
        <div style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)', padding: '1.25rem 1.5rem', borderRadius: '18px', border: '1px solid rgba(79, 209, 197, 0.35)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(79, 209, 197, 0.15)', border: '1px solid rgba(79, 209, 197, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={28} color="#4FD1C5" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Mastery Score</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              {stats.overall_mastery ?? 0}% <span style={{ fontSize: '0.85rem', color: '#34D399', fontWeight: '700' }}>Average</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginTop: '0.4rem', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(0, Number(stats.overall_mastery) || 0))}%`, height: '100%', background: 'linear-gradient(90deg, #0D9488, #34D399)', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Weak Topics Attention Card */}
        <div style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)', padding: '1.25rem 1.5rem', borderRadius: '18px', border: '1px solid rgba(244, 63, 94, 0.35)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={28} color="#F87171" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weakest Concept Area</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {stats.weak_topics.length > 0 ? stats.weak_topics[0].title : 'All Topics Mastered!'}
            </div>
            <div style={{ fontSize: '0.775rem', color: '#FCA5A5', marginTop: '0.2rem' }}>
              {stats.weak_topics.length > 0 ? `Mastery: ${stats.weak_topics[0].mastery_score}% (Needs Review)` : 'Zero critical weak spots detected'}
            </div>
          </div>
        </div>

        {/* Recent Quiz Scores Card */}
        <div style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)', padding: '1.25rem 1.5rem', borderRadius: '18px', border: '1px solid rgba(168, 85, 247, 0.35)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={28} color="#C084FC" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Quiz Attempt</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff' }}>
              {stats.recent_attempts.length > 0 ? `${stats.recent_attempts[0].percentage}%` : 'N/A'}
            </div>
            <div style={{ fontSize: '0.775rem', color: '#E9D5FF', marginTop: '0.2rem' }}>
              {stats.recent_attempts.length > 0 ? `Score: ${stats.recent_attempts[0].score}/${stats.recent_attempts[0].total}` : 'Take a quiz to log scores'}
            </div>
          </div>
        </div>

      </div>

      {/* MY SAVED & UPLOADED BOOKS */}
      <div style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#0F172A' }}>
          <BookOpen size={24} color="#059669" /> My Saved Textbooks & Books Library
        </h2>

        {stats.books.length === 0 ? (
          <div style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)', border: '1px dashed rgba(255, 255, 255, 0.2)', padding: '1.75rem', borderRadius: '16px', textAlign: 'center' }}>
            <FileText size={36} color="rgba(255, 255, 255, 0.4)" style={{ marginBottom: '0.5rem' }} />
            <h4 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: '800', marginBottom: '0.3rem' }}>No Books Saved Yet</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem', marginBottom: '1rem' }}>Upload your textbook PDFs or Word files under AI Teacher or Word + PDF Uploader to automatically store them here.</p>
            <button onClick={() => setActivePage('word-pdf-uploader')} className="btn" style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', color: '#ffffff', fontWeight: '800', fontSize: '0.85rem', padding: '0.6rem 1.25rem', borderRadius: '10px' }}>
              <FileUp size={16} /> Upload First Book
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.15rem' }}>
            {stats.books.map((book) => (
              <div
                key={book.id}
                onClick={() => handleSelectActiveBook(book.id)}
                style={{
                  background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                    <span style={{ background: 'rgba(5, 150, 105, 0.16)', color: '#34D399', border: '1px solid rgba(5, 150, 105, 0.35)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.725rem', fontWeight: '800' }}>
                      {book.chapter_count} Chapters
                    </span>
                    <button
                      onClick={(e) => handleDeleteBook(book.id, e)}
                      title="Delete book"
                      style={{ background: 'transparent', border: 'none', color: 'rgba(244, 63, 94, 0.7)', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.35rem', lineHeight: '1.3' }}>
                    {book.title}
                  </h3>
                  <div style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} /> Saved: {book.uploaded_at}
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#4FD1C5', fontSize: '0.8rem', fontWeight: '800' }}>Resume Studio</span>
                  <ArrowRight size={16} color="#4FD1C5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tools Grid Section */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#0F172A' }}>
        <Layers size={24} color="#0D9488" /> Learning Modules & Generators
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1.75rem'
      }}>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className={`tool-card ${tool.cardTheme}`}
              onClick={() => setActivePage(tool.id)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.35rem' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: tool.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 8px 20px ${tool.btnGlow}`
                  }}>
                    <Icon size={26} color="#FFFFFF" />
                  </div>
                  <span className={`badge ${tool.badgeColor}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}>{tool.badge}</span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.65rem', color: '#ffffff' }}>
                  {tool.title}
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: '0.925rem', marginBottom: '1.4rem', lineHeight: '1.55' }}>
                  {tool.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.75rem' }}>
                  {tool.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' }}>
                      <Zap size={15} color={tool.accentColor} /> {feat}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '1.1rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <button
                  className="btn"
                  style={{
                    width: '100%',
                    justify: 'space-between',
                    background: tool.btnBg,
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    padding: '0.75rem 1.35rem',
                    borderRadius: '12px',
                    boxShadow: `0 6px 20px ${tool.btnGlow}`
                  }}
                >
                  <span>{tool.actionText}</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
