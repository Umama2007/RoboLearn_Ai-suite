import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp,
  FileText,
  Download,
  BookOpen,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Layers,
  FileCheck,
  Loader2,
  Quote,
  Compass,
  Target,
  ChevronDown,
  ChevronUp,
  Calendar,
  Zap,
  Clock,
  HelpCircle
} from 'lucide-react';
import QuizSimulator from './QuizSimulator';
import { API_BASE } from '../config';

export default function WordPdfUploader({ userId }) {
  // Book Upload & Mode State
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('Computer Architecture');
  const [grade, setGrade] = useState('Grade 10');
  const [language, setLanguage] = useState('English');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Dynamic Custom Timeframe State
  const [durationVal, setDurationVal] = useState(9);
  const [durationUnit, setDurationUnit] = useState('months'); // 'days' | 'weeks' | 'months'

  // Study Modes State
  const [studyMode, setStudyMode] = useState('normal'); // 'normal' | 'panic' | 'curiosity' | 'examprep' | 'feynman'
  const [panicTime, setPanicTime] = useState('24 Hours'); // '24 Hours' | '3 Days' | '1 Week' | '2 Weeks'

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [result, setResult] = useState(null);
  const [tocPreview, setTocPreview] = useState([]);
  const [trainedBookName, setTrainedBookName] = useState('');
  const [isBookTrained, setIsBookTrained] = useState(false);

  // Saved Books Selector State
  const [savedBooks, setSavedBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');

  const fetchSavedBooks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/books`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.books) {
          setSavedBooks(data.books);
        }
      }
    } catch (e) {
      console.error("Fetch saved books error:", e);
    }
  };

  // Upload book file to dedicated endpoint (separate step from curriculum generation)
  const uploadBookFile = async (selectedFile) => {
    if (!selectedFile) return;

    // Client-side validation
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      setStatusMsg('Error: Only .pdf and .docx files are allowed.');
      setFile(null);
      return;
    }
    const maxMB = 30;
    if (selectedFile.size > maxMB * 1024 * 1024) {
      setStatusMsg(`Error: File too large (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB). Maximum is ${maxMB}MB.`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setStatusMsg('Uploading and extracting book content...');

    const fd = new FormData();
    fd.append('book', selectedFile);

    try {
      const res = await fetch(`${API_BASE}/api/user/books/upload`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const data = await res.json();

      if (!res.ok) {
        setStatusMsg('Upload error: ' + (data.error || `Server returned ${res.status}`));
        setLoading(false);
        return;
      }

      setIsBookTrained(true);
      setTrainedBookName(data.title || selectedFile.name);
      setStatusMsg(`✓ '${data.title}' uploaded and saved to your library! (${data.chapter_count || 0} chapters detected)`);
      fetchSavedBooks(); // Refresh the saved books list
    } catch (err) {
      setStatusMsg('Upload network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedBooks();
  }, []);

  const handleSelectSavedBook = async (bookId) => {
    if (!bookId) return;
    setSelectedBookId(bookId);
    setLoading(true);
    setStatusMsg('Activating selected book across AI Studio...');
    try {
      const res = await fetch(`${API_BASE}/api/user/books/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ book_id: parseInt(bookId) })
      });
      if (res.ok) {
        const data = await res.json();
        setIsBookTrained(true);
        setTrainedBookName(data.active_book?.title || 'Selected Book');
        setStatusMsg(`✓ Activated '${data.active_book?.title}' across all AI features!`);
      }
    } catch (err) {
      setStatusMsg('Error setting active book: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Accordion Expand State for the 3 Book-Based Studio Tools
  const [expandedCards, setExpandedCards] = useState({
    curriculum: true,
    teacher: true,
    quiz: false
  });

  const toggleCard = (cardKey) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  };

  // Book Teacher Chat State
  const [bookChatMessages, setBookChatMessages] = useState([
    {
      role: 'ai',
      text: 'Welcome to the Book Extractor Teacher! Select your preferred Study Mode above (Normal, Panic Crunch, Curiosity Deep Dive, Exam Prep, or Feynman ELI5) and ask any questions strictly answered from your book text.',
      citation: null
    }
  ]);
  const [bookChatInput, setBookChatInput] = useState('');
  const [isBookChatLoading, setIsBookChatLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const bookChatFeedRef = useRef(null);

  // Scroll ONLY inside the chat feed box (no window/page sliding!)
  useEffect(() => {
    if (bookChatFeedRef.current) {
      bookChatFeedRef.current.scrollTop = bookChatFeedRef.current.scrollHeight;
    }
  }, [bookChatMessages, isBookChatLoading]);

  // Loading Timer
  useEffect(() => {
    let timer;
    if (isBookChatLoading) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isBookChatLoading]);

  // Preview ToC client-side
  const handlePreviewToc = () => {
    if (!text.trim()) {
      alert('Please paste book text in the excerpt box to preview ToC.');
      return;
    }
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const toc = [];
    for (let ln of lines) {
      if (/^(chapter|unit|lesson|part|module)\b/i.test(ln) || /^\d+[\.\)]\s+/.test(ln)) {
        toc.push(ln);
      }
    }
    setTocPreview(toc.length ? toc : ['No explicit headings detected in pasted text.']);
  };

  // Train Book & Generate Curriculum
  const handleSubmitCurriculum = async (e) => {
    e.preventDefault();
    if (!file && !text.trim()) {
      alert('Please upload a PDF/Word file or paste book text.');
      return;
    }

    setLoading(true);
    setStatusMsg(`Extracting book structure in ${studyMode.toUpperCase()} mode, training Book Teacher & initializing Studio...`);
    setResult(null);

    const fd = new FormData();
    fd.append('subject', subject);
    fd.append('grade', grade);
    fd.append('language', language);
    fd.append('start_date', startDate);
    fd.append('mode', studyMode);
    fd.append('panic_time', panicTime);

    if (file) {
      fd.append('book', file);
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      fd.append('book', blob, 'book_text.txt');
    }

    try {
      // 1. Train teacher memory (with session auth)
      const trainFd = new FormData();
      if (file) trainFd.append('teacher_book', file);
      else trainFd.append('teacher_book', new Blob([text], { type: 'text/plain' }), 'book_text.txt');
      
      fetch(`${API_BASE}/train_teacher`, { method: 'POST', credentials: 'include', body: trainFd }).catch(() => {});

      // 2. Generate Curriculum
      const res = await fetch(`${API_BASE}/generate_curriculum`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = `Server returned status (${res.status})`;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error || errMsg;
        } catch (e) {}
        setStatusMsg('Error: ' + errMsg);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.error) {
        setStatusMsg('Error: ' + data.error);
        setLoading(false);
        return;
      }

      setResult(data);
      const name = file ? file.name : `${subject} ${grade} Book Text`;
      setTrainedBookName(name);
      setIsBookTrained(true);
      setStatusMsg(`✓ Book successfully trained in ${studyMode.toUpperCase()} Mode! Studio tools are ready below.`);

      // Expand all tool cards when book is trained
      setExpandedCards({ curriculum: true, teacher: true, quiz: true });

    } catch (err) {
      setStatusMsg('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Send Question to Book Extractor Teacher
  const handleSendBookQuestion = async (queryText) => {
    const q = (queryText || bookChatInput).trim();
    if (!q) return;
    setBookChatInput('');

    const userMsgObj = { role: 'user', text: q };
    const initialAiMsgObj = { role: 'ai', text: '', citation: null };

    setBookChatMessages((prev) => [...prev, userMsgObj, initialAiMsgObj]);
    setIsBookChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ask_book_teacher_stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || 'student',
          question: q,
          mode: studyMode,
          panic_time: panicTime
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        setBookChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'ai',
            isError: true,
            text: `⚠️ Error (${res.status}): ${errText}`
          };
          return updated;
        });
        setIsBookChatLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (rawData === '[DONE]') break;
            try {
              const payload = JSON.parse(rawData);
              if (payload.type === 'citation') {
                setBookChatMessages((prev) => {
                  const updated = [...prev];
                  const last = { ...updated[updated.length - 1] };
                  last.citation = payload.citation;
                  updated[updated.length - 1] = last;
                  return updated;
                });
              } else if (payload.type === 'text') {
                setBookChatMessages((prev) => {
                  const updated = [...prev];
                  const last = { ...updated[updated.length - 1] };
                  last.text += payload.content;
                  updated[updated.length - 1] = last;
                  return updated;
                });
              } else if (payload.type === 'error') {
                setBookChatMessages((prev) => {
                  const updated = [...prev];
                  const last = { ...updated[updated.length - 1] };
                  last.isError = true;
                  last.text = `⚠️ ${payload.error}`;
                  updated[updated.length - 1] = last;
                  return updated;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setBookChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'ai',
          isError: true,
          text: `⚠️ Connection Error: ${err.message}`
        };
        return updated;
      });
    } finally {
      setIsBookChatLoading(false);
    }
  };

  const getModeBadge = () => {
    switch (studyMode) {
      case 'panic':
        return { label: `🚨 Panic Mode (${panicTime} Left)`, color: '#f87171', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.4)' };
      case 'curiosity':
        return { label: '🔍 Curiosity Deep Dive Mode', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)' };
      case 'examprep':
        return { label: '🎯 Exam Prep Mode', color: '#38bdf8', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.4)' };
      case 'feynman':
        return { label: '🧠 Feynman ELI5 Mode', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' };
      default:
        return { label: '📘 Normal Study Mode', color: '#4FD1C5', bg: 'rgba(79, 209, 197, 0.15)', border: 'rgba(79, 209, 197, 0.4)' };
    }
  };

  const activeModeInfo = getModeBadge();

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1150px', margin: '0 auto' }}>
      
      {/* Header Bar */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.14)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '0.2rem 0.6rem',
              borderRadius: '16px',
              fontSize: '0.725rem',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <BookOpen size={12} /> Strict Book Context Studio
            </span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', margin: 0, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Word & PDF Book Studio
          </h1>
        </div>

        {/* Active Study Mode Banner */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: `1px solid ${activeModeInfo.border}`,
          color: activeModeInfo.color,
          padding: '0.45rem 0.95rem',
          borderRadius: '10px',
          fontWeight: '800',
          fontSize: '0.825rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
        }}>
          <Zap size={15} color={activeModeInfo.color} /> Mode: {activeModeInfo.label}
        </div>
      </div>

      {/* STEP 1: UPLOAD BOOK & CHOOSE STUDY MODE - DASHBOARD DARK NAVY THEME */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
        border: isBookTrained ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '20px',
        padding: '1.4rem 1.5rem',
        boxShadow: '0 16px 45px rgba(15, 23, 42, 0.22), 0 0 30px rgba(16, 185, 129, 0.12)',
        marginBottom: '1.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp size={18} color="#34D399" /> 1. Upload Book File or Paste Textbook Content
          </h3>
          {isBookTrained && (
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.3rem 0.75rem', borderRadius: '16px', fontSize: '0.775rem', fontWeight: '800' }}>
              ✓ Trained: {trainedBookName || `${subject} (${grade})`}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmitCurriculum}>
          {/* Quick Select Saved Book Dropdown */}
          {savedBooks.length > 0 && (
            <div style={{ marginBottom: '1.25rem', background: 'rgba(5, 8, 15, 0.85)', padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid rgba(79, 209, 197, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff', fontWeight: '800', fontSize: '0.85rem' }}>
                <BookOpen size={17} color="#4FD1C5" /> Select Previously Saved Book:
              </div>
              <select
                value={selectedBookId}
                onChange={(e) => handleSelectSavedBook(e.target.value)}
                style={{
                  minWidth: '240px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(79, 209, 197, 0.5)',
                  color: '#ffffff',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: '700',
                  outline: 'none'
                }}
              >
                <option value="">-- Choose Saved Book from Library --</option>
                {savedBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    📖 {b.title} ({b.chapter_count} chapters)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            
            {/* File Upload Box */}
            <div style={{
              border: '2px dashed rgba(16, 185, 129, 0.4)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              background: 'rgba(5, 8, 15, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              <FileUp size={30} color="#34D399" style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ fontSize: '0.925rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.3rem' }}>
                Upload Textbook (PDF or DOCX)
              </h4>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => {
                  const f = e.target.files[0] || null;
                  if (f) uploadBookFile(f);
                }}
                style={{
                  maxWidth: '280px',
                  margin: '0 auto',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
                  padding: '0.4rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem'
                }}
              />
              <p style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.4rem' }}>
                {file ? `Selected: ${file.name}` : 'Supports PDFs with OCR & Word Docs'}
              </p>
            </div>

            {/* Text Excerpt Box */}
            <div>
              <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <FileText size={15} color="#4FD1C5" /> Or Paste Book Content / Chapter Text:
              </label>
              <textarea
                rows={6}
                placeholder="Paste textbook chapter text, unit content, or outline here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(5, 8, 15, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* SELECT STUDY MODE */}
          <div style={{ marginBottom: '1.25rem', background: 'rgba(5, 8, 15, 0.75)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <label style={{ fontWeight: '800', fontSize: '0.875rem', color: '#ffffff', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Zap size={16} color="#FBBF24" /> Select Learning & Study Mode for Studio Tools:
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
              
              {/* Normal Mode */}
              <div
                onClick={() => setStudyMode('normal')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: studyMode === 'normal' ? '2px solid #4FD1C5' : '1px solid rgba(255, 255, 255, 0.14)',
                  background: studyMode === 'normal' ? 'rgba(79, 209, 197, 0.16)' : 'rgba(15, 23, 42, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '0.825rem', color: studyMode === 'normal' ? '#4FD1C5' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  📘 Normal Study
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.15rem' }}>
                  Balanced 9-month pacing guide & comprehensive chapter coverage.
                </div>
              </div>

              {/* Panic Mode */}
              <div
                onClick={() => setStudyMode('panic')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: studyMode === 'panic' ? '2px solid #F87171' : '1px solid rgba(255, 255, 255, 0.14)',
                  background: studyMode === 'panic' ? 'rgba(244, 63, 94, 0.16)' : 'rgba(15, 23, 42, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '0.825rem', color: studyMode === 'panic' ? '#f87171' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  🚨 Panic / Exam Crunch
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.15rem' }}>
                  Emergency deadline mode. Filters for high-yield priority topics!
                </div>
              </div>

              {/* Curiosity Mode */}
              <div
                onClick={() => setStudyMode('curiosity')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: studyMode === 'curiosity' ? '2px solid #C084FC' : '1px solid rgba(255, 255, 255, 0.14)',
                  background: studyMode === 'curiosity' ? 'rgba(168, 85, 247, 0.16)' : 'rgba(15, 23, 42, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '0.825rem', color: studyMode === 'curiosity' ? '#c084fc' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  🔍 Curiosity Deep Dive
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.15rem' }}>
                  Advanced theory & real-world industry applications.
                </div>
              </div>

              {/* Exam Prep Mode */}
              <div
                onClick={() => setStudyMode('examprep')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: studyMode === 'examprep' ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.14)',
                  background: studyMode === 'examprep' ? 'rgba(6, 182, 212, 0.16)' : 'rgba(15, 23, 42, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '0.825rem', color: studyMode === 'examprep' ? '#38bdf8' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  🎯 Exam Prep & Past Papers
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.15rem' }}>
                  Marking scheme breakdowns & question trap warnings.
                </div>
              </div>

              {/* Feynman ELI5 Mode */}
              <div
                onClick={() => setStudyMode('feynman')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: studyMode === 'feynman' ? '2px solid #34D399' : '1px solid rgba(255, 255, 255, 0.14)',
                  background: studyMode === 'feynman' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(15, 23, 42, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '0.825rem', color: studyMode === 'feynman' ? '#34d399' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  🧠 Feynman / ELI5 Mode
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.15rem' }}>
                  Explains complex topics using simple everyday analogies.
                </div>
              </div>

            </div>

            {/* Panic Mode Extra Time Left Input */}
            {studyMode === 'panic' && (
              <div className="animate-fade-in" style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.35)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ color: '#fca5a5', fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={15} /> Exam Deadline / Time Left:
                </div>
                <select value={panicTime} onChange={(e) => setPanicTime(e.target.value)} style={{ maxWidth: '220px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(244, 63, 94, 0.5)', color: '#ffffff', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <option value="24 Hours">⚡ 24 Hours Emergency Crash</option>
                  <option value="3 Days">🔥 3 Days Exam Sprint</option>
                  <option value="1 Week">⏳ 1 Week Crunch</option>
                  <option value="2 Weeks">📅 2 Weeks Quick Review</option>
                  <option value="1 Month">🗓️ 1 Month Express Review</option>
                </select>
              </div>
            )}
          </div>

          {/* CUSTOM STUDY PLAN TIMEFRAME SELECTOR */}
          <div style={{ marginBottom: '1.15rem', background: 'rgba(5, 8, 15, 0.85)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(79, 209, 197, 0.3)' }}>
            <label style={{ fontWeight: '800', fontSize: '0.875rem', color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={16} color="#4FD1C5" /> Custom Target Study Plan Timeframe:
            </label>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.75rem' }}>
              Choose how fast you want to complete your syllabus — set any custom duration in Days, Weeks, or Months.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4FD1C5', marginBottom: '0.2rem' }}>Duration Count</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={durationVal}
                  onChange={(e) => setDurationVal(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(79, 209, 197, 0.4)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4FD1C5', marginBottom: '0.2rem' }}>Timeframe Unit</label>
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(79, 209, 197, 0.4)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', outline: 'none' }}
                >
                  <option value="days">Days (Daily Sprint)</option>
                  <option value="weeks">Weeks (Weekly Pacing)</option>
                  <option value="months">Months (Monthly Syllabus)</option>
                </select>
              </div>

              <div style={{ background: 'rgba(79, 209, 197, 0.12)', border: '1px solid rgba(79, 209, 197, 0.3)', padding: '0.5rem 0.85rem', borderRadius: '8px', color: '#4FD1C5', fontSize: '0.8rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                Target: {durationVal} {durationUnit.toUpperCase()}
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '700' }}>Quick Presets:</span>
              <button
                type="button"
                onClick={() => { setDurationVal(14); setDurationUnit('days'); }}
                style={{ background: durationVal === 14 && durationUnit === 'days' ? '#4FD1C5' : 'rgba(255, 255, 255, 0.08)', color: durationVal === 14 && durationUnit === 'days' ? '#04070D' : '#ffffff', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '700', cursor: 'pointer' }}
              >
                ⚡ 14 Days Sprint
              </button>
              <button
                type="button"
                onClick={() => { setDurationVal(30); setDurationUnit('days'); }}
                style={{ background: durationVal === 30 && durationUnit === 'days' ? '#4FD1C5' : 'rgba(255, 255, 255, 0.08)', color: durationVal === 30 && durationUnit === 'days' ? '#04070D' : '#ffffff', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '700', cursor: 'pointer' }}
              >
                📅 30 Days Crash
              </button>
              <button
                type="button"
                onClick={() => { setDurationVal(3); setDurationUnit('months'); }}
                style={{ background: durationVal === 3 && durationUnit === 'months' ? '#4FD1C5' : 'rgba(255, 255, 255, 0.08)', color: durationVal === 3 && durationUnit === 'months' ? '#04070D' : '#ffffff', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '700', cursor: 'pointer' }}
              >
                🗓️ 3 Months Term
              </button>
              <button
                type="button"
                onClick={() => { setDurationVal(9); setDurationUnit('months'); }}
                style={{ background: durationVal === 9 && durationUnit === 'months' ? '#4FD1C5' : 'rgba(255, 255, 255, 0.08)', color: durationVal === 9 && durationUnit === 'months' ? '#04070D' : '#ffffff', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '700', cursor: 'pointer' }}
              >
                🎓 9 Months Full
              </button>
            </div>
          </div>

          {/* Form Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', marginBottom: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Computer Architecture"
                style={{ width: '100%', background: 'rgba(5, 8, 15, 0.92)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.825rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Grade / Level</label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. Grade 10, BSCS"
                style={{ width: '100%', background: 'rgba(5, 8, 15, 0.92)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.825rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', background: 'rgba(5, 8, 15, 0.92)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.825rem', outline: 'none' }}>
                <option value="English">English</option>
                <option value="Urdu">Urdu</option>
                <option value="Arabic">Arabic</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Academic Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', background: 'rgba(5, 8, 15, 0.92)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.825rem', outline: 'none' }} />
            </div>
          </div>

          {/* Action Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                maxWidth: '360px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
                transition: 'all 0.25s ease'
              }}
            >
              <Sparkles size={16} /> {loading ? 'Processing Book...' : 'Upload & Train Book Studio'}
            </button>
          </div>

        </form>

        {statusMsg && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: statusMsg.startsWith('Error') ? 'rgba(244, 63, 94, 0.18)' : 'rgba(16, 185, 129, 0.18)',
            border: statusMsg.startsWith('Error') ? '1px solid rgba(244, 63, 94, 0.45)' : '1px solid rgba(16, 185, 129, 0.45)',
            color: statusMsg.startsWith('Error') ? '#fca5a5' : '#6ee7b7',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            {statusMsg.startsWith('Error') ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {statusMsg}
          </div>
        )}
      </div>

      {/* STEP 2: EXPANDABLE FLASHCARD TOOL DECK */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Layers size={20} color="#059669" /> Book Studio Tools & Generators
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '600' }}>
            Expand any tool below to run strictly on your uploaded book!
          </span>
        </div>

        {/* CARD 1: 9-MONTH CURRICULUM GENERATOR */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.18)'
        }}>
          <div
            onClick={() => toggleCard('curriculum')}
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: expandedCards.curriculum ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.5)',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '10px', color: '#34D399' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  1. Curriculum & Syllabus Generator
                  <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.2rem 0.55rem', borderRadius: '12px', fontSize: '0.7rem' }}>{activeModeInfo.label}</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.15rem' }}>
                  Generates adaptive pacing guide, Excel schedule (.xlsx), and Word syllabus (.docx).
                </div>
              </div>
            </div>
            {expandedCards.curriculum ? <ChevronUp size={18} color="#ffffff" /> : <ChevronDown size={18} color="#ffffff" />}
          </div>

          {expandedCards.curriculum && (
            <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(5, 8, 15, 0.88)' }}>
              {result ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileCheck size={17} color="#34D399" /> Download Book Curriculum Schedule ({studyMode.toUpperCase()} Mode)
                    </h4>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <a href={result.excel} download style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.16)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34D399', padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', fontWeight: '800', fontSize: '0.85rem' }}>
                      <Download size={16} color="#34D399" /> Download Excel Schedule (.xlsx)
                    </a>
                    <a href={result.word} download style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(79, 209, 197, 0.16)', border: '1px solid rgba(79, 209, 197, 0.4)', color: '#4FD1C5', padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', fontWeight: '800', fontSize: '0.85rem' }}>
                      <Download size={16} color="#4FD1C5" /> Download Word Syllabus (.docx)
                    </a>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                  Upload your textbook file or paste text above and click <strong>"Upload & Train Book Studio"</strong> to generate the Excel schedule & Word syllabus.
                </p>
              )}

              {/* ToC Preview Box */}
              {tocPreview.length > 0 && (
                <div style={{ marginTop: '1rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Bookmark size={15} color="#4FD1C5" /> Extracted Table of Contents Preview:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.8rem' }}>
                    {tocPreview.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.2rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 2: BOOK EXTRACTOR TEACHER Q&A */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.18)'
        }}>
          <div
            onClick={() => toggleCard('teacher')}
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: expandedCards.teacher ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.5)',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(79, 209, 197, 0.2)', padding: '0.5rem', borderRadius: '10px', color: '#4FD1C5' }}>
                <BookOpen size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  2. Book Extractor Teacher Q&A
                  <span style={{ background: 'rgba(79, 209, 197, 0.2)', color: '#4FD1C5', border: '1px solid rgba(79, 209, 197, 0.4)', padding: '0.2rem 0.55rem', borderRadius: '12px', fontSize: '0.7rem' }}>{activeModeInfo.label}</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.15rem' }}>
                  Ask questions strictly answered from your uploaded book text with exact chapter and verbatim quote references.
                </div>
              </div>
            </div>
            {expandedCards.teacher ? <ChevronUp size={18} color="#ffffff" /> : <ChevronDown size={18} color="#ffffff" />}
          </div>

          {expandedCards.teacher && (
            <div style={{ padding: '1.15rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(5, 8, 15, 0.88)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* Quick Query Chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem', alignSelf: 'center' }}>
                  <Compass size={13} /> Quick Book Queries:
                </span>
                {['Summarize Chapter 1 concepts', 'What is the definition of key terms in this book?', 'Explain main topics covered in the textbook'].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendBookQuestion(chip)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#ffffff',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Feed Box */}
              <div
                ref={bookChatFeedRef}
                style={{
                  background: 'rgba(5, 8, 15, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  height: '250px',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                {bookChatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '88%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem'
                    }}
                  >
                    {/* Message Bubble */}
                    {(msg.text || (msg.role === 'ai' && !isBookChatLoading)) && (
                      <div style={{
                        background: msg.role === 'user' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : msg.isError ? 'rgba(244, 63, 94, 0.18)' : 'rgba(15, 23, 42, 0.95)',
                        border: msg.isError ? '1px solid rgba(244, 63, 94, 0.45)' : msg.role === 'ai' ? '1px solid rgba(16, 185, 129, 0.25)' : 'none',
                        color: msg.isError ? '#fca5a5' : '#ffffff',
                        padding: '0.75rem 1rem',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5'
                      }}>
                        {msg.role === 'ai' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '800', color: msg.isError ? '#f87171' : '#34D399', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
                            <BookOpen size={14} /> {msg.isError ? 'System Warning' : `Book Teacher (${studyMode.toUpperCase()} Mode)`}
                          </div>
                        )}
                        {msg.text || (isBookChatLoading && idx === bookChatMessages.length - 1 ? 'Extracting answer from book text...' : '')}
                      </div>
                    )}

                    {/* STRICT BOOK CITATION BOX */}
                    {msg.role === 'ai' && !msg.isError && msg.citation && (
                      <div style={{
                        background: 'rgba(10, 15, 25, 0.85)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '10px',
                        padding: '0.7rem 0.85rem',
                        fontSize: '0.775rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}>
                        <div style={{ fontWeight: '800', color: '#34D399', display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <Bookmark size={13} color="#34D399" /> Exact Book Citation & Reference
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', color: '#ffffff', fontWeight: '700' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.725rem' }}>
                            📖 Chapter / Topic: {msg.citation.chapter || 'Main Text'}
                          </span>
                          <span style={{ background: 'rgba(79, 209, 197, 0.2)', color: '#4FD1C5', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.725rem' }}>
                            📄 Location: {msg.citation.page || 'Page 1'}
                          </span>
                        </div>

                        {msg.citation.exact_quote && (
                          <div style={{
                            background: 'rgba(15, 23, 42, 0.8)',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            borderLeft: '3px solid #34D399',
                            fontStyle: 'italic',
                            color: '#cbd5e1',
                            fontSize: '0.775rem'
                          }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'normal', fontWeight: '800', marginBottom: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Quote size={11} /> Verbatim Book Quote:
                            </div>
                            "{msg.citation.exact_quote}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Streaming Loading Indicator */}
                {isBookChatLoading && (
                  <div style={{
                    alignSelf: 'flex-start',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    padding: '0.65rem 0.95rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    color: '#ffffff',
                    fontSize: '0.825rem'
                  }}>
                    <Loader2 size={15} className="spin-animation" color="#34D399" />
                    <div>
                      <span>Extracting answer from book text...</span>
                      <span style={{ fontSize: '0.75rem', color: '#34D399', marginLeft: '0.4rem', fontWeight: '800' }}>
                        ({elapsedSeconds}s)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <input
                  type="text"
                  style={{
                    flexGrow: 1,
                    background: 'rgba(5, 8, 15, 0.92)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.9rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                  placeholder={`Ask any question strictly from book text (${studyMode.toUpperCase()} mode active)...`}
                  value={bookChatInput}
                  onChange={(e) => setBookChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendBookQuestion()}
                />
                <button
                  onClick={() => handleSendBookQuestion()}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.6rem 1.1rem',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                    whiteSpace: 'nowrap'
                  }}
                  disabled={isBookChatLoading}
                >
                  <Send size={15} /> Ask Book Teacher
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CARD 3: BOOK QUIZ GENERATOR */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.18)'
        }}>
          <div
            onClick={() => toggleCard('quiz')}
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: expandedCards.quiz ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.5)',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.5rem', borderRadius: '10px', color: '#FBBF24' }}>
                <Target size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  3. Book Quiz Generator
                  <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.2rem 0.55rem', borderRadius: '12px', fontSize: '0.7rem' }}>{activeModeInfo.label}</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.15rem' }}>
                  Generate 5–15 question exams (MCQ, Short Answer) created strictly from your uploaded book.
                </div>
              </div>
            </div>
            {expandedCards.quiz ? <ChevronUp size={18} color="#ffffff" /> : <ChevronDown size={18} color="#ffffff" />}
          </div>

          {expandedCards.quiz && (
            <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(5, 8, 15, 0.88)' }}>
              <QuizSimulator userId={userId} initialSource="book" mode={studyMode} panicTime={panicTime} />
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
