import React, { useState } from 'react';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  MessageSquare,
  Award,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Zap,
  Target,
  FileText,
  AlertCircle
} from 'lucide-react';
import { API_BASE, fetchWithRetry } from '../config';

export default function QuizSimulator({ userId, initialSource = 'web_llm', mode = 'normal', panicTime = '24 Hours' }) {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [quizType, setQuizType] = useState('mcq'); // 'mcq', 'short_answer', 'socratic'
  const [source, setSource] = useState(initialSource); // 'web_llm' or 'book'
  const [isWeakAreasMode, setIsWeakAreasMode] = useState(false);
  const [autoSelectedInfo, setAutoSelectedInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [genError, setGenError] = useState('');
  const [quizData, setQuizData] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [socraticFeedback, setSocraticFeedback] = useState({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  // Generate Quiz Deck via Backend API
  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!isWeakAreasMode && !topic.trim()) return;
    setIsGenerating(true);
    setGenError('');
    setQuizFinished(false);
    setFinalResult(null);
    setUserAnswers({});
    setSocraticFeedback({});
    setCurrentIdx(0);
    setAutoSelectedInfo('');

    try {
      const res = await fetchWithRetry(`${API_BASE}/generate_quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: isWeakAreasMode ? '' : topic,
          question_count: Number(questionCount),
          quiz_type: quizType,
          source: isWeakAreasMode ? 'book' : source,
          mode: mode,
          panic_time: panicTime,
          user_id: userId || 'student',
          focus_weak_areas: isWeakAreasMode
        })
      });

      const data = await res.json();
      if (data.quiz) {
        setQuizData(data.quiz);
        if (data.auto_selected_topic) {
          setAutoSelectedInfo(`Generating a quiz on "${data.auto_selected_topic}" — ${data.auto_selected_reason}`);
        } else {
          setAutoSelectedInfo('');
        }
      } else {
        setGenError(data.error || 'Failed to generate quiz. Please check topic.');
      }
    } catch (err) {
      setGenError(err.message || 'Could not connect to AI quiz generator. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Request Socratic Hint & Counter Question
  const handleRequestSocraticHint = async (qObj) => {
    setIsEvaluating(true);
    const qid = qObj.id || currentIdx + 1;
    const currentInput = userAnswers[qid] || '';

    try {
      const res = await fetchWithRetry(`${API_BASE}/socratic_hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qObj.question,
          user_answer: currentInput,
          user_id: userId || 'student'
        })
      });

      const data = await res.json();
      if (data.socratic_response) {
        setSocraticFeedback((prev) => ({
          ...prev,
          [qid]: data.socratic_response
        }));
      }
    } catch (err) {
      alert('Notice: ' + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Submit Final Quiz
  const handleSubmitQuiz = async () => {
    if (!quizData) return;
    setIsEvaluating(true);

    try {
      const res = await fetchWithRetry(`${API_BASE}/submit_quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || 'student',
          answers: userAnswers
        })
      });

      const data = await res.json();
      setFinalResult(data);
      setQuizFinished(true);

      // Persist attempt details to backend DB for mastery tracking
      fetchWithRetry(`${API_BASE}/api/quiz/save-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || 'student',
          chapter_title: topic || 'General Quiz',
          score: data.score,
          total: data.total,
          answers: data.details || []
        })
      }).catch(err => console.error("Save attempt notice:", err));
    } catch (err) {
      alert('Error submitting quiz: ' + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const questions = quizData?.questions || [];
  const currentQ = questions[currentIdx];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1050px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'rgba(79, 209, 197, 0.14)',
          color: '#0D9488',
          border: '1px solid rgba(79, 209, 197, 0.35)',
          padding: '0.2rem 0.6rem',
          borderRadius: '16px',
          fontSize: '0.75rem',
          fontWeight: '800',
          marginBottom: '0.35rem'
        }}>
          <HelpCircle size={13} /> Interactive Exam Simulator & Socratic Tutor
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: '800', margin: '0 0 0.2rem 0', color: '#0F172A', letterSpacing: '-0.01em' }}>
          AI Quiz & Exam Simulator
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>
          Test your knowledge with adaptive MCQs, Short Answers, and Socratic Counter-Questions that stick with you until mastered!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left Form: Config - Dashboard Dark Navy Theme */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="#4FD1C5" /> Quiz Setup
          </h3>

          <form onSubmit={handleGenerateQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Topic Selection</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsWeakAreasMode(false)}
                  style={{
                    flex: 1,
                    background: !isWeakAreasMode ? 'rgba(79, 209, 197, 0.2)' : 'rgba(5, 8, 15, 0.88)',
                    border: !isWeakAreasMode ? '1px solid #4FD1C5' : '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '0.4rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Manual Input
                </button>
                <button
                  type="button"
                  onClick={() => setIsWeakAreasMode(true)}
                  style={{
                    flex: 1,
                    background: isWeakAreasMode ? 'rgba(79, 209, 197, 0.2)' : 'rgba(5, 8, 15, 0.88)',
                    border: isWeakAreasMode ? '1px solid #4FD1C5' : '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '0.4rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Focus on Weak Areas
                </button>
              </div>

              {!isWeakAreasMode ? (
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  placeholder="e.g. Photosynthesis, Machine Learning..."
                  style={{
                    width: '100%',
                    background: 'rgba(5, 8, 15, 0.92)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '0.825rem',
                    outline: 'none'
                  }}
                />
              ) : (
                <div style={{
                  background: 'rgba(5, 8, 15, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.8rem',
                  fontStyle: 'italic'
                }}>
                  The AI will automatically analyze your performance across active textbook chapters and quiz you on your weakest topic.
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Question Count</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(5, 8, 15, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  outline: 'none'
                }}
              >
                <option value={5}>5 Questions</option>
                <option value={8}>8 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Knowledge Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(5, 8, 15, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  outline: 'none'
                }}
              >
                <option value="web_llm">🌐 General AI Knowledge & Web Search</option>
                <option value="book">📚 Uploaded Textbook / Book Memory</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Exam Mode & Format</label>
              <select
                value={quizType}
                onChange={(e) => setQuizType(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(5, 8, 15, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  outline: 'none'
                }}
              >
                <option value="mcq">🎯 Multiple Choice (MCQ)</option>
                <option value="short_answer">✍️ Short Answer & Key Concepts</option>
                <option value="socratic">🧠 Interactive Socratic Dialogue</option>
              </select>
            </div>

            <div style={{ paddingTop: '0.35rem' }}>
              <button
                type="submit"
                disabled={isGenerating}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem',
                  fontSize: '0.875rem',
                  fontWeight: '800',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 18px rgba(13, 148, 136, 0.45)',
                  transition: 'all 0.25s ease'
                }}
              >
                <Sparkles size={15} /> {isGenerating ? 'Generating Quiz (connecting to AI)...' : 'Build Exam Quiz'}
              </button>
            </div>

            {genError && (
              <div style={{
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
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{genError}</span>
              </div>
            )}
          </form>

          {/* Socratic Feature Highlight */}
          <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)', fontSize: '0.775rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            <strong style={{ color: '#4FD1C5', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
              <Lightbulb size={13} /> Socratic Tutor Active:
            </strong>
            When stuck, request a hint! The AI asks counter-questions to push your reasoning without spoiling the answer.
          </div>
        </div>

        {/* Right Workspace: Quiz Player or Results - Dashboard Dark Navy Theme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {!quizData ? (
            /* Initial State */
            <div style={{
              background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '16px',
              padding: '2.5rem 1.75rem',
              textAlign: 'center',
              minHeight: '340px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.85rem',
              boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)'
            }}>
              <Award size={44} color="#4FD1C5" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>Ready to Test Your Knowledge?</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.75)', maxWidth: '420px', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
                Enter your desired topic on the left or click <strong>Build Exam Quiz</strong> to start an interactive assessment session!
              </p>
            </div>
          ) : quizFinished ? (
            /* Results Screen */
            <div style={{
              background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '16px',
              padding: '2rem 1.5rem',
              minHeight: '360px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.3rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '800', display: 'inline-block', marginBottom: '0.5rem' }}>
                  Exam Completed
                </span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                  Your Score: {finalResult?.score} / {finalResult?.total} ({Math.round(finalResult?.percentage || 0)}%)
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Topic: {topic}</p>
              </div>

              {/* Reteach Section if applicable */}
              {finalResult?.reteach && (
                <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(79, 209, 197, 0.35)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.925rem', fontWeight: '800', color: '#4FD1C5', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Lightbulb size={15} /> Targeted AI Concept Reteach
                  </h3>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.55', whiteSpace: 'pre-wrap', color: '#ffffff' }}>
                    {finalResult.reteach}
                  </div>
                </div>
              )}

              {/* Detailed Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '800', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>Question Breakdown</h4>
                {finalResult?.details?.map((d, i) => (
                  <div key={i} style={{ padding: '0.85rem', borderRadius: '10px', background: d.correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', border: d.correct ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Q{i + 1}: {d.question}</strong>
                      <span style={{ fontSize: '0.775rem', color: d.correct ? '#6ee7b7' : '#fca5a5', fontWeight: '800' }}>
                        {d.correct ? '✓ Correct' : '✗ Needs Practice'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Given: <span style={{ color: '#ffffff', fontWeight: '700' }}>{d.given || '(Blank)'}</span> | Expected: <span style={{ color: '#4FD1C5', fontWeight: '700' }}>{d.expected}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button onClick={() => { setQuizData(null); setAutoSelectedInfo(''); }} style={{ background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#ffffff', padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <RotateCw size={15} /> Retake / New Quiz
                </button>
              </div>
            </div>
          ) : (
            /* Active Question Screen */
            <div style={{
              background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '16px',
              padding: '1.5rem',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                {/* Progress Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ background: 'rgba(79, 209, 197, 0.16)', color: '#4FD1C5', border: '1px solid rgba(79, 209, 197, 0.35)', padding: '0.25rem 0.65rem', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '800' }}>
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <button
                    onClick={() => handleRequestSocraticHint(currentQ)}
                    style={{
                      background: 'rgba(79, 209, 197, 0.12)',
                      border: '1px solid rgba(79, 209, 197, 0.4)',
                      color: '#4FD1C5',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.775rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    disabled={isEvaluating}
                  >
                    <Lightbulb size={13} /> Request Socratic Hint
                  </button>
                </div>

                {autoSelectedInfo && (
                  <div style={{
                    background: 'rgba(79, 209, 197, 0.1)',
                    border: '1px solid rgba(79, 209, 197, 0.3)',
                    color: '#4FD1C5',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <Zap size={14} color="#4FD1C5" /> {autoSelectedInfo}
                  </div>
                )}

                {/* Question Text */}
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', marginBottom: '1.15rem', lineHeight: '1.45' }}>
                  {currentQ?.question}
                </h2>

                {/* Options / Input based on MCQ or Short Answer */}
                {currentQ?.options && currentQ.options.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                    {currentQ.options.map((opt, oIdx) => {
                      const qid = currentQ.id || currentIdx + 1;
                      const isSelected = userAnswers[qid] === opt || userAnswers[qid] === opt[0];
                      return (
                        <div
                          key={oIdx}
                          onClick={() => setUserAnswers((prev) => ({ ...prev, [qid]: opt[0] }))}
                          style={{
                            padding: '0.7rem 0.95rem',
                            borderRadius: '10px',
                            background: isSelected ? 'rgba(79, 209, 197, 0.2)' : 'rgba(5, 8, 15, 0.88)',
                            border: isSelected ? '2px solid #4FD1C5' : '1px solid rgba(255, 255, 255, 0.14)',
                            color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.88)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? '700' : '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Short Answer Textarea */
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>Your Answer / Concept Explanation</label>
                    <textarea
                      rows={3}
                      placeholder="Type your explanation or short answer..."
                      value={userAnswers[currentQ?.id || currentIdx + 1] || ''}
                      onChange={(e) =>
                        setUserAnswers((prev) => ({
                          ...prev,
                          [currentQ?.id || currentIdx + 1]: e.target.value
                        }))
                      }
                      style={{
                        width: '100%',
                        background: 'rgba(5, 8, 15, 0.92)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '8px',
                        padding: '0.6rem 0.85rem',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {/* Socratic Feedback Box */}
                {socraticFeedback[currentQ?.id || currentIdx + 1] && (
                  <div style={{ background: 'rgba(5, 8, 15, 0.9)', border: '1px solid #4FD1C5', borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#4FD1C5', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem' }}>
                      <MessageSquare size={14} /> Socratic Tutor Guidance:
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#ffffff', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {socraticFeedback[currentQ?.id || currentIdx + 1]}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <button
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: '700',
                    cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentIdx === 0 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                  disabled={currentIdx === 0}
                >
                  <ChevronLeft size={16} /> Prev
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                    style={{
                      background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.825rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      boxShadow: '0 4px 15px rgba(13, 148, 136, 0.4)'
                    }}
                  >
                    Next Question <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.55rem 1.15rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                    }}
                    disabled={isEvaluating}
                  >
                    <CheckCircle2 size={16} /> Submit Quiz for AI Grade
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
