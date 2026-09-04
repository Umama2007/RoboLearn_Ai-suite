import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  RotateCw,
  Cpu,
  Check
} from 'lucide-react';
import { API_BASE, fetchWithRetry } from '../config';

export default function FlashcardGenerator({ userId, initialSource = 'web_llm' }) {
  const [topicText, setTopicText] = useState('');
  const [cardCount, setCardCount] = useState(5);
  const [source, setSource] = useState(initialSource);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [cards, setCards] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Automatically reset card flip state whenever active card index changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  // Generate Deck via AI LLM API
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topicText.trim()) return;
    setIsGenerating(true);
    setGenError('');

    try {
      const res = await fetchWithRetry(`${API_BASE}/generate_flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicText,
          count: Number(cardCount),
          source: source,
          user_id: userId || 'student'
        })
      });

      const data = await res.json();
      if (data.cards && data.cards.length > 0) {
        // Apply weakness-first sort order (unmastered cards first)
        const sorted = [...data.cards].sort((a, b) => (a.mastered === b.mastered ? 0 : a.mastered ? 1 : -1));
        setCards(sorted);
        setCurrentIndex(0);
        setIsFlipped(false);
      } else {
        setGenError(data.error || 'Failed to generate flashcards. Please try another topic.');
      }
    } catch (err) {
      setGenError(err.message || 'Could not connect to flashcard generator. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentCard = cards[currentIndex] || cards[0];
  const masteredCount = cards.filter((c) => c.mastered).length;

  const toggleMastered = (e) => {
    if (e) e.stopPropagation();
    setCards((prev) =>
      prev.map((c, i) => (i === currentIndex ? { ...c, mastered: !c.mastered } : c))
    );
  };

  const handlePrevCard = (e) => {
    if (e) e.stopPropagation();
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextCard = (e) => {
    if (e) e.stopPropagation();
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.min(cards.length - 1, prev + 1));
  };

  const handleFlipCard = (e) => {
    if (e) e.stopPropagation();
    setIsFlipped((prev) => !prev);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span className="badge badge-indigo">
            <CreditCard size={14} /> Interactive 3D Flip Flashcards
          </span>
          <span className="badge badge-emerald">
            <Cpu size={14} /> Powered by Ollama (qwen2.5:1.5b)
          </span>
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.4rem' }}>
          Flash Card Generator
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Question is displayed on the front side. Click the button to flip the card and reveal the real AI-generated answer!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Control Panel */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffffff' }}>
            <Sparkles size={16} color="#4FD1C5" /> Generate New LLM Deck
          </h3>
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>Topic or Study Notes</label>
              <textarea
                className="form-control"
                rows={5}
                placeholder="Enter topic (e.g. Organic Chemistry, Quantum Physics, World History)..."
                value={topicText}
                onChange={(e) => setTopicText(e.target.value)}
                required
                style={{
                  background: 'rgba(5, 8, 15, 0.92)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>Number of Cards</label>
              <select
                className="form-select"
                value={cardCount}
                onChange={(e) => setCardCount(e.target.value)}
                style={{
                  background: 'rgba(5, 8, 15, 0.92)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value={5} style={{ background: '#0F172A', color: '#ffffff' }}>5 Flashcards</option>
                <option value={8} style={{ background: '#0F172A', color: '#ffffff' }}>8 Flashcards</option>
                <option value={10} style={{ background: '#0F172A', color: '#ffffff' }}>10 Flashcards</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', color: '#ffffff', fontWeight: '800' }} disabled={isGenerating}>
              <Sparkles size={16} /> {isGenerating ? 'Generating Flashcards...' : 'Build Flashcard Deck'}
            </button>

            {genError && (
              <div style={{
                marginTop: '0.65rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(244, 63, 94, 0.16)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#fca5a5',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.4rem',
                lineHeight: '1.35'
              }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span>{genError}</span>
              </div>
            )}
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span>Total Cards in Deck:</span>
              <strong style={{ color: '#ffffff' }}>{cards.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Mastered Cards:</span>
              <strong style={{ color: '#34D399' }}>{masteredCount} / {cards.length}</strong>
            </div>
          </div>
        </div>

        {/* Right 3D Flip Flashcard Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', width: '100%' }}>
          {cards.length === 0 ? (
            <div style={{
              width: '100%',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2rem',
              textAlign: 'center',
              background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '16px',
              boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)'
            }}>
              <HelpCircle size={48} color="#4FD1C5" style={{ marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem', color: '#ffffff' }}>No Flashcards Active</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.75)', maxWidth: '400px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Enter a topic or study notes on the left control panel, then click <strong style={{ color: '#ffffff' }}>Build Flashcard Deck</strong> to generate your interactive cards.
              </p>
            </div>
          ) : (
            <>
              {/* 3D Perspective Card Container */}
              <div
                onClick={handleFlipCard}
                style={{
                  width: '100%',
                  minHeight: '340px',
                  perspective: '1000px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '100%',
                  minHeight: '340px',
                  position: 'relative',
                  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}>
                  
                  {/* FRONT SIDE (QUESTION) */}
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    minHeight: '340px',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: currentCard?.mastered ? '2px solid #34D399' : '1px solid rgba(79, 209, 197, 0.35)',
                    background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)',
                    padding: '2rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-indigo" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                        <HelpCircle size={15} /> QUESTION #{currentIndex + 1}
                      </span>

                      {/* FLIP REVEAL BUTTON */}
                      <button
                        onClick={handleFlipCard}
                        style={{
                          background: 'rgba(79, 209, 197, 0.16)',
                          border: '1px solid #4FD1C5',
                          color: '#4FD1C5',
                          padding: '0.4rem 0.9rem',
                          borderRadius: '20px',
                          fontSize: '0.825rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 0 12px rgba(79, 209, 197, 0.25)'
                        }}
                      >
                        <RotateCw size={14} /> Click Card to Flip & Reveal Answer
                      </button>
                    </div>

                    {/* Question Text */}
                    <div style={{
                      textAlign: 'center',
                      fontSize: '1.3rem',
                      fontWeight: '800',
                      color: '#ffffff',
                      margin: '1.75rem 0',
                      lineHeight: '1.5'
                    }}>
                      {currentCard?.question}
                    </div>

                    {/* Bottom Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                        Deck: {topicText.substring(0, 24)}...
                      </span>

                      <button
                        onClick={handleFlipCard}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#4FD1C5',
                          fontWeight: '700',
                          fontSize: '0.825rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <RotateCw size={14} /> Click to Flip Card 🔄
                      </button>
                    </div>
                  </div>

                  {/* BACK SIDE (REVEALED REAL ANSWER FROM LLM) */}
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    minHeight: '340px',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid #4FD1C5',
                    background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(79, 209, 197, 0.25)',
                    padding: '2rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                        <Sparkles size={15} /> REVEALED LLM ANSWER
                      </span>

                      <button
                        onClick={handleFlipCard}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          padding: '0.4rem 0.9rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <RotateCw size={14} /> Flip Back to Question
                      </button>
                    </div>

                    {/* Real LLM Answer Text */}
                    <div style={{
                      textAlign: 'center',
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      color: '#4FD1C5',
                      margin: '1.5rem 0',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6',
                      background: 'rgba(5, 8, 15, 0.8)',
                      padding: '1.25rem',
                      borderRadius: '14px',
                      border: '1px solid rgba(79, 209, 197, 0.35)',
                      boxShadow: 'inset 0 0 15px rgba(79, 209, 197, 0.1)'
                    }}>
                      {currentCard?.answer}
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                        Card {currentIndex + 1} of {cards.length}
                      </span>

                      <button
                        onClick={toggleMastered}
                        className={`btn btn-sm ${currentCard?.mastered ? 'btn-accent' : 'btn-secondary'}`}
                      >
                        <CheckCircle2 size={14} /> {currentCard?.mastered ? 'Mastered' : 'Mark as Known'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* High-Contrast Prominent Navigation Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.85rem 1.25rem',
                background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
                border: '1px solid rgba(79, 209, 197, 0.35)',
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.3)'
              }}>
                <button
                  onClick={handlePrevCard}
                  disabled={currentIndex === 0}
                  style={{
                    background: currentIndex === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '800',
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === 0 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronLeft size={20} /> Previous Card
                </button>

                <span style={{ fontWeight: '800', color: '#4FD1C5', fontSize: '0.95rem', background: 'rgba(79, 209, 197, 0.12)', padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid rgba(79, 209, 197, 0.3)' }}>
                  Card {currentIndex + 1} of {cards.length}
                </span>

                <button
                  onClick={handleNextCard}
                  disabled={currentIndex === cards.length - 1}
                  style={{
                    background: currentIndex === cards.length - 1 ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                    border: currentIndex === cards.length - 1 ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #4FD1C5',
                    color: '#ffffff',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '800',
                    cursor: currentIndex === cards.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === cards.length - 1 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: currentIndex === cards.length - 1 ? 'none' : '0 4px 18px rgba(13, 148, 136, 0.45)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Next Card <ChevronRight size={20} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
