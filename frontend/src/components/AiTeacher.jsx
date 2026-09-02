import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  Send,
  Globe,
  Cpu,
  Sparkles,
  ExternalLink,
  Trash2,
  Compass,
  Loader2
} from 'lucide-react';
import { API_BASE } from '../config';

export default function AiTeacher({ userId }) {
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      text: 'Hello! I am your AI Teacher powered by your local Gemini AI LLM and real-time Web Search. Ask me any question, request explanations, or explore study topics with live dual reference citations!',
      web_sources: [],
      llm_reference: 'Gemini AI Parametric Weights & Internal Reasoning'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatLoading]);

  // Loading Timer
  useEffect(() => {
    let timer;
    if (isChatLoading) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isChatLoading]);

  const suggestionChips = [
    'Explain Quantum Mechanics wave-particle duality',
    'What are the latest discoveries from James Webb Telescope?',
    'How does Photosynthesis compare to Cellular Respiration?',
    'Explain gradient descent in machine learning'
  ];

  const handleSendChat = async (inputQuery) => {
    const msg = (inputQuery || chatInput).trim();
    if (!msg) return;
    setChatInput('');

    const userMsgObj = { role: 'user', text: msg };
    const initialAiMsgObj = {
      role: 'ai',
      text: '',
      web_sources: [],
      llm_reference: 'Gemini AI Parametric Weights & Internal Reasoning'
    };

    setChatMessages((prev) => [...prev, userMsgObj, initialAiMsgObj]);
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai_chat_stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: msg,
          use_web_search: webSearchEnabled
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'ai',
            isError: true,
            text: `⚠️ Server Response Error (${res.status}): ${errText}`
          };
          return updated;
        });
        setIsChatLoading(false);
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
              if (payload.type === 'sources') {
                setChatMessages((prev) => {
                  const updated = [...prev];
                  const last = { ...updated[updated.length - 1] };
                  last.web_sources = payload.web_sources || [];
                  last.llm_reference = payload.llm_reference || last.llm_reference;
                  updated[updated.length - 1] = last;
                  return updated;
                });
              } else if (payload.type === 'text') {
                setChatMessages((prev) => {
                  const updated = [...prev];
                  const last = { ...updated[updated.length - 1] };
                  last.text = (last.text || '') + payload.content;
                  updated[updated.length - 1] = last;
                  return updated;
                });
              } else if (payload.type === 'error') {
                setChatMessages((prev) => {
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
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'ai',
          isError: true,
          text: `⚠️ Connection Error: ${err.message}`
        };
        return updated;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await fetch(`${API_BASE}/clear_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
    } catch (e) {}
    setChatMessages([
      {
        role: 'ai',
        text: 'Chat history cleared. Ask me any question to begin!',
        web_sources: [],
        llm_reference: 'Gemini AI Parametric Base'
      }
    ]);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Bar - Ultra Compact & Sleek */}
      <div style={{
        marginBottom: '0.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0F172A', letterSpacing: '-0.01em' }}>
            AI Teacher Chat & Dual Reference Engine
          </h1>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{
              background: 'rgba(79, 209, 197, 0.14)',
              color: '#0D9488',
              border: '1px solid rgba(79, 209, 197, 0.35)',
              padding: '0.2rem 0.55rem',
              borderRadius: '16px',
              fontSize: '0.7rem',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <Cpu size={12} /> Local Gemini AI
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
            padding: '0.25rem 0.65rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Globe size={13} color="#4FD1C5" /> Web Search
            </span>
            <button
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '12px',
                border: 'none',
                background: webSearchEnabled ? 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' : 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.675rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {webSearchEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <button
            onClick={handleClearChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              color: '#fb7185',
              padding: '0.3rem 0.65rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '700',
              transition: 'all 0.2s ease'
            }}
            title="Clear Chat History"
          >
            <Trash2 size={13} /> Clear Chat
          </button>
        </div>
      </div>

      {/* Main Chat Box Container - Dashboard Dark Navy Theme */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '16px',
        padding: '0.85rem 1rem',
        boxShadow: '0 16px 45px rgba(15, 23, 42, 0.22), 0 0 30px rgba(13, 148, 136, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}>
        
        {/* Chat Feed */}
        <div style={{
          background: 'rgba(5, 8, 15, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          height: '250px',
          maxHeight: '250px',
          overflowY: 'auto',
          padding: '0.75rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              {/* Message Bubble */}
              {(msg.text || (msg.role === 'ai' && !isChatLoading)) && (
                <div style={{
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)'
                    : msg.isError
                    ? 'rgba(244, 63, 94, 0.18)'
                    : 'rgba(15, 23, 42, 0.95)',
                  border: msg.isError
                    ? '1px solid rgba(244, 63, 94, 0.45)'
                    : msg.role === 'ai'
                    ? '1px solid rgba(79, 209, 197, 0.25)'
                    : 'none',
                  color: msg.isError ? '#fca5a5' : '#ffffff',
                  padding: '0.85rem 1.1rem',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '0.9rem',
                  lineHeight: '1.55',
                  boxShadow: msg.role === 'user' ? '0 4px 15px rgba(13, 148, 136, 0.35)' : '0 4px 15px rgba(0, 0, 0, 0.4)'
                }}>
                  {msg.role === 'ai' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', color: msg.isError ? '#f87171' : '#4FD1C5', marginBottom: '0.4rem', fontSize: '0.825rem' }}>
                      <Bot size={15} /> {msg.isError ? 'System Warning' : 'AI Teacher (Gemini AI)'}
                    </div>
                  )}

                  {msg.role === 'user' || msg.isError ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                  ) : (
                    <div className="ai-markdown-rendered" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text || (isChatLoading && idx === chatMessages.length - 1 ? 'Typing...' : '')}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* Visually Separate Reference Boxes (Box 1: LLM Knowledge Base, Box 2: Web Search Sources) */}
              {msg.role === 'ai' && !msg.isError && msg.text && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
                  
                  {/* BOX 1: LLM KNOWLEDGE BASE */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(192, 132, 252, 0.35)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    <div style={{
                      background: 'rgba(192, 132, 252, 0.15)',
                      padding: '0.35rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Cpu size={14} color="#c084fc" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', color: '#c084fc', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        LLM Knowledge Base
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.775rem', marginTop: '0.1rem' }}>
                        {msg.llm_reference || 'Gemini AI Parametric Weights & Internal Reasoning'}
                      </div>
                    </div>
                  </div>

                  {/* BOX 2: WEB SEARCH SOURCES */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.78rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    <div style={{ fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      <Globe size={14} color="#38bdf8" /> Web Search Sources
                      {msg.web_sources && msg.web_sources.length > 0 && (
                        <span style={{ background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.675rem' }}>
                          {msg.web_sources.length} sources found
                        </span>
                      )}
                    </div>

                    {msg.web_sources && msg.web_sources.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.3rem' }}>
                        {msg.web_sources.map((src, sIdx) => (
                          <div key={sIdx} style={{ background: 'rgba(5, 8, 15, 0.65)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <ExternalLink size={12} color="#38bdf8" />
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#38bdf8', fontWeight: '700', textDecoration: 'underline', fontSize: '0.775rem' }}
                              >
                                {src.title || src.url}
                              </a>
                            </div>
                            {src.snippet && (
                              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.725rem', marginTop: '0.2rem', lineHeight: '1.4' }}>
                                {src.snippet.length > 140 ? src.snippet.substring(0, 140) + '...' : src.snippet}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.15rem' }}>
                        No web sources used for this response
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator with Live Timer */}
          {isChatLoading && (
            <div style={{
              alignSelf: 'flex-start',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(79, 209, 197, 0.35)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#ffffff',
              fontSize: '0.85rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
              <Loader2 size={16} className="spin-animation" color="#4FD1C5" />
              <div>
                <span style={{ fontWeight: '600' }}>AI Teacher streaming response...</span>
                <span style={{ fontSize: '0.775rem', color: '#4FD1C5', marginLeft: '0.4rem', fontWeight: '700' }}>
                  ({elapsedSeconds}s)
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <input
            type="text"
            style={{
              flexGrow: 1,
              background: 'rgba(5, 8, 15, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '12px',
              padding: '0.65rem 1rem',
              color: '#ffffff',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.25s ease'
            }}
            placeholder={webSearchEnabled ? "Ask AI Teacher anything (Gemini AI + Web Search)..." : "Ask AI Teacher anything (Gemini AI)..."}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
          />
          <button
            onClick={() => handleSendChat()}
            style={{
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 18px rgba(13, 148, 136, 0.45)',
              transition: 'all 0.25s ease',
              whiteSpace: 'nowrap'
            }}
            disabled={isChatLoading}
          >
            <Send size={16} /> Send Question
          </button>
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
