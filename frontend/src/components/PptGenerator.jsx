import React, { useState } from 'react';
import {
  Presentation,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Palette,
  Download,
  Image as ImageIcon,
  Upload,
  Layout,
  CheckCircle2,
  Loader2,
  Sliders,
  Play,
  Shapes,
  X,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { API_BASE, fetchWithRetry } from '../config';

export default function PptGenerator({ userId }) {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [colorScheme, setColorScheme] = useState('indigo');
  const [templateStyle, setTemplateStyle] = useState('modern_cards');
  const [slideShape, setSlideShape] = useState('rounded_card');
  const [slideAnimation, setSlideAnimation] = useState('fade_glow');
  const [includeImages, setIncludeImages] = useState(true);
  const [imageStyle, setImageStyle] = useState('minimalist');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [genError, setGenError] = useState('');
  const [slides, setSlides] = useState([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [exportMessage, setExportMessage] = useState('');

  const colorPalettes = {
    indigo: '#6366F1',
    cyan: '#06B6D4',
    emerald: '#10B981',
    amber: '#F59E0B',
    corporate_white: '#F8FAFC'
  };

  const colorText = {
    indigo: '#ffffff',
    cyan: '#ffffff',
    emerald: '#ffffff',
    amber: '#ffffff',
    corporate_white: '#0f172a'
  };

  const themeGradients = {
    indigo: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
    cyan: 'linear-gradient(135deg, #083344 0%, #0E7490 50%, #06B6D4 100%)',
    emerald: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #10B981 100%)',
    amber: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #F59E0B 100%)',
    corporate_white: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)'
  };

  const themeTextColors = {
    indigo: '#ffffff',
    cyan: '#ffffff',
    emerald: '#ffffff',
    amber: '#ffffff',
    corporate_white: '#ffffff'
  };

  // Generate Deck via Local LLM
  const handleGenerateDeck = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    setGenError('');
    setExportMessage('');

    try {
      const res = await fetchWithRetry(`${API_BASE}/generate_ppt_slides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          slide_count: Number(slideCount),
          user_id: userId || 'student'
        })
      });

      const data = await res.json();
      if (data.slides && data.slides.length > 0) {
        setSlides(data.slides.map(s => ({ ...s, custom_image: null })));
        setActiveSlideIdx(0);
      } else {
        setGenError(data.error || 'Failed to generate presentation slides.');
      }
    } catch (err) {
      setGenError(err.message || 'Could not connect to presentation generator. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload Custom Image for Current Active Slide
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Str = uploadEvent.target.result;
      setSlides((prev) =>
        prev.map((s, idx) => (idx === activeSlideIdx ? { ...s, custom_image: base64Str } : s))
      );
    };
    reader.readAsDataURL(file);
  };

  const removeCustomImage = () => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeSlideIdx ? { ...s, custom_image: null } : s))
    );
  };

  // Update Slide Content Inline
  const updateSlideField = (field, value) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeSlideIdx ? { ...s, [field]: value } : s))
    );
  };

  const updateBullet = (bulletIdx, val) => {
    setSlides((prev) =>
      prev.map((s, idx) => {
        if (idx === activeSlideIdx) {
          const newBullets = [...s.bullets];
          newBullets[bulletIdx] = val;
          return { ...s, bullets: newBullets };
        }
        return s;
      })
    );
  };

  // Export PPTX File & Trigger Download
  const handleExportPptx = async () => {
    if (!slides || slides.length === 0) return;
    setIsExporting(true);
    setExportMessage('Building customized .pptx PowerPoint file with chosen shapes, animations & images...');

    try {
      const res = await fetchWithRetry(`${API_BASE}/export_ppt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          slides,
          color_scheme: colorScheme,
          template_style: templateStyle,
          slide_shape: slideShape,
          slide_animation: slideAnimation,
          include_images: includeImages,
          image_style: imageStyle
        })
      });

      const data = await res.json();
      if (data.download_url) {
        const a = document.createElement('a');
        a.href = data.download_url;
        a.download = data.filename || `${topic}_Presentation.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setExportMessage(`✅ Presentation downloaded successfully: ${data.filename}`);
      } else {
        setExportMessage('⚠️ Error exporting PPTX: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setExportMessage('⚠️ Download error: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const currentSlide = slides[activeSlideIdx] || slides[0];

  // Helper for shape CSS styling in preview
  const getShapeStyle = () => {
    if (slideShape === 'circle') return { borderRadius: '40px', border: '3px solid var(--accent-cyan)' };
    if (slideShape === 'hexagon') return { borderRadius: '24px', border: '2px dashed var(--accent-cyan)' };
    if (slideShape === 'rectangle') return { borderRadius: '4px', border: '2px solid var(--border-glow)' };
    return { borderRadius: '18px', border: '2px solid rgba(255,255,255,0.2)' };
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1140px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="badge badge-cyan" style={{ marginBottom: '0.5rem', background: 'rgba(79, 209, 197, 0.16)', color: '#4FD1C5', border: '1px solid rgba(79, 209, 197, 0.35)' }}>
          <Presentation size={14} /> Ultimate AI Slide Studio & PPTX Generator
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.4rem', color: '#0F172A' }}>
          PPT Generator & Slide Studio
        </h1>
        <p style={{ color: '#475569' }}>
          Customize slide shapes, animations, upload per-slide custom images, and export directly as a real PowerPoint (.pptx) file!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Form: Advanced Customization Config */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffffff' }}>
            <Sliders size={16} color="#4FD1C5" /> Presentation Settings
          </h3>

          <form onSubmit={handleGenerateDeck}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>Presentation Topic</label>
              <input
                type="text"
                className="form-control"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                placeholder="e.g. Quantum Mechanics, Photosynthesis"
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
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>Slide Count</label>
              <select
                className="form-select"
                value={slideCount}
                onChange={(e) => setSlideCount(e.target.value)}
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
                <option value={5} style={{ background: '#0F172A', color: '#ffffff' }}>5 Slides</option>
                <option value={8} style={{ background: '#0F172A', color: '#ffffff' }}>8 Slides</option>
                <option value={10} style={{ background: '#0F172A', color: '#ffffff' }}>10 Slides</option>
              </select>
            </div>

            {/* 🎨 Color Scheme Selection */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>
                <Palette size={14} color="#4FD1C5" /> Color Scheme Palette
              </label>
              <select
                className="form-select"
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value)}
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
                <option value="indigo" style={{ background: '#0F172A', color: '#ffffff' }}>Deep Navy & Neon Cyan</option>
                <option value="cyan" style={{ background: '#0F172A', color: '#ffffff' }}>Cyber Cyan & Ocean</option>
                <option value="emerald" style={{ background: '#0F172A', color: '#ffffff' }}>Emerald & Mint Cyber</option>
                <option value="amber" style={{ background: '#0F172A', color: '#ffffff' }}>Warm Amber & Sunset Gold</option>
                <option value="corporate_white" style={{ background: '#0F172A', color: '#ffffff' }}>Corporate Pure White & Navy</option>
              </select>
            </div>

            {/* 🔵 Slide Geometry / Shape Selection */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>
                <Shapes size={14} color="#34D399" /> Slide Card Shape / Geometry
              </label>
              <select
                className="form-select"
                value={slideShape}
                onChange={(e) => setSlideShape(e.target.value)}
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
                <option value="rounded_card" style={{ background: '#0F172A', color: '#ffffff' }}>Modern Rounded Glass Card</option>
                <option value="circle" style={{ background: '#0F172A', color: '#ffffff' }}>Circle / Pill Badge Card</option>
                <option value="hexagon" style={{ background: '#0F172A', color: '#ffffff' }}>Hexagon Cyber Frame</option>
                <option value="rectangle" style={{ background: '#0F172A', color: '#ffffff' }}>Full Widescreen Rectangle</option>
              </select>
            </div>

            {/* 🎬 Slide Entrance Animation Choice */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>
                <Play size={14} color="#4FD1C5" /> Transition & Entrance Animation
              </label>
              <select
                className="form-select"
                value={slideAnimation}
                onChange={(e) => setSlideAnimation(e.target.value)}
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
                <option value="fade_glow" style={{ background: '#0F172A', color: '#ffffff' }}>Fade In & Glow Slide</option>
                <option value="zoom_bounce" style={{ background: '#0F172A', color: '#ffffff' }}>Zoom In Bounce</option>
                <option value="slide_right" style={{ background: '#0F172A', color: '#ffffff' }}>Slide In from Right</option>
                <option value="flip_3d" style={{ background: '#0F172A', color: '#ffffff' }}>3D Flip Entrance</option>
              </select>
            </div>

            {/* 🖼️ AI Image Banner Options */}
            <div className="form-group" style={{
              background: 'rgba(5, 8, 15, 0.6)',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ffffff' }}>
                  <ImageIcon size={14} color="#34D399" /> Include Fallback Concept Banners
                </span>
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0D9488' }}
                />
              </div>

              {includeImages && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.775rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.25rem' }}>Concept Banner Style</label>
                  <select
                    className="form-select"
                    style={{
                      fontSize: '0.8rem',
                      background: 'rgba(5, 8, 15, 0.92)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '8px'
                    }}
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                  >
                    <option value="minimalist" style={{ background: '#0F172A', color: '#ffffff' }}>Minimalist Concept Banner</option>
                    <option value="tech_graphic" style={{ background: '#0F172A', color: '#ffffff' }}>Tech & Cyber Graphic</option>
                    <option value="corporate_asset" style={{ background: '#0F172A', color: '#ffffff' }}>Corporate Asset Illustration</option>
                  </select>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', color: '#ffffff', fontWeight: '800' }} disabled={isGenerating}>
              <Sparkles size={16} /> {isGenerating ? 'Generating Slides via AI...' : 'Build Presentation Deck'}
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

          {/* Slide List Outline Sidebar */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.6rem', color: '#ffffff' }}>
              Slide Outline ({slides.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '190px', overflowY: 'auto' }}>
              {slides.map((s, idx) => (
                <div
                  key={s.id || idx}
                  onClick={() => setActiveSlideIdx(idx)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: '10px',
                    fontSize: '0.825rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: activeSlideIdx === idx
                      ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)'
                      : 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
                    border: activeSlideIdx === idx
                      ? '1px solid #4FD1C5'
                      : '1px solid rgba(79, 209, 197, 0.25)',
                    color: '#ffffff',
                    boxShadow: activeSlideIdx === idx ? '0 4px 15px rgba(13, 148, 136, 0.4)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {idx + 1}. {s.title}
                  </span>
                  {s.custom_image && (
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      Img
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview, Custom Image Upload & Export Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          {slides.length === 0 ? (
            <div className="glass-card" style={{
              width: '100%',
              minHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2rem',
              textAlign: 'center',
              background: themeGradients[colorScheme] || themeGradients.indigo,
              color: '#ffffff',
              ...getShapeStyle()
            }}>
              <Presentation size={48} color="#0D9488" style={{ marginBottom: '1.25rem', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>No Presentation Slides Active</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '420px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Enter a topic on the left sidebar settings, then click <strong>Build Presentation Deck</strong> to generate your slides.
              </p>
            </div>
          ) : (
            <>
              {/* Main Slide Screen Container */}
              <div
                className={`glass-card ${slideAnimation}`}
                style={{
                  background: themeGradients[colorScheme] || themeGradients.indigo,
                  color: themeTextColors[colorScheme] || '#ffffff',
                  minHeight: '420px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '2.25rem',
                  boxShadow: 'var(--shadow-lg)',
                  position: 'relative',
                  ...getShapeStyle()
                }}
              >
                <div>
                  {/* Top Slide Badge & Theme Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.8rem' }}>
                      Slide {activeSlideIdx + 1} of {slides.length}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                        Shape: {slideShape.replace('_',' ')}
                      </span>
                      <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>
                        Anim: {slideAnimation.replace('_',' ')}
                      </span>
                    </div>
                  </div>

                  {/* Editable Title & Subtitle */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <input
                      type="text"
                      value={currentSlide?.title || ''}
                      onChange={(e) => updateSlideField('title', e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px dashed rgba(255,255,255,0.3)',
                        color: '#ffffff',
                        fontSize: '1.65rem',
                        fontWeight: '800',
                        width: '100%',
                        marginBottom: '0.4rem',
                        outline: 'none'
                      }}
                      placeholder="Slide Title..."
                    />
                    <input
                      type="text"
                      value={currentSlide?.subtitle || ''}
                      onChange={(e) => updateSlideField('subtitle', e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        width: '100%',
                        outline: 'none'
                      }}
                      placeholder="Slide Subtitle / Summary..."
                    />
                  </div>

                  {/* Slide Content Grid & Image Preview */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
                    
                    {/* Bullets List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {currentSlide?.bullets.map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1rem', opacity: 0.8 }}>•</span>
                          <input
                            type="text"
                            value={b}
                            onChange={(e) => updateBullet(i, e.target.value)}
                            style={{
                              background: 'rgba(15, 23, 42, 0.3)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              color: '#ffffff',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.9rem',
                              width: '100%',
                              outline: 'none'
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Custom Image Upload & Preview Box for current slide */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px dashed var(--accent-cyan)',
                      borderRadius: '14px',
                      minHeight: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      textAlign: 'center',
                      position: 'relative'
                    }}>
                      {currentSlide?.custom_image ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img
                            src={currentSlide.custom_image}
                            alt="Custom Slide Image"
                            style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '8px' }}
                          />
                          <button
                            onClick={removeCustomImage}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                          <Upload size={24} color="var(--accent-cyan)" />
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Upload Slide Image</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation & Presentation Tools */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  <button
                    onClick={() => setActiveSlideIdx(prev => Math.max(0, prev - 1))}
                    className="btn btn-secondary btn-sm"
                    disabled={activeSlideIdx === 0}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Slide {activeSlideIdx + 1} of {slides.length}</span>
                  <button
                    onClick={() => setActiveSlideIdx(prev => Math.min(slides.length - 1, prev + 1))}
                    className="btn btn-secondary btn-sm"
                    disabled={activeSlideIdx === slides.length - 1}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Action Toolbar: PPTX Export & Custom Image Trigger */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  onClick={handleExportPptx}
                  className="btn btn-accent"
                  style={{ flex: 1, padding: '0.85rem 1.5rem', fontWeight: '700', gap: '0.5rem', background: '#10B981' }}
                  disabled={isExporting}
                >
                  {isExporting ? <Loader2 size={18} className="spin-animation" /> : <Download size={18} />}
                  {isExporting ? 'Building .PPTX File...' : '📥 Export & Download Presentation (.pptx)'}
                </button>
              </div>

              {/* Status Message */}
              {exportMessage && (
                <div style={{
                  padding: '0.85rem 1.1rem',
                  borderRadius: '10px',
                  background: exportMessage.startsWith('⚠️') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: exportMessage.startsWith('⚠️') ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                  color: exportMessage.startsWith('⚠️') ? '#fca5a5' : '#6ee7b7',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {exportMessage.startsWith('⚠️') ? <Sliders size={16} /> : <CheckCircle2 size={16} />}
                  {exportMessage}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeGlow {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes zoomBounce {
          0% { opacity: 0; transform: scale(0.9); }
          70% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes flip3D {
          from { opacity: 0; transform: rotateY(90deg); }
          to { opacity: 1; transform: rotateY(0deg); }
        }
        .fade_glow { animation: fadeGlow 0.5s ease-out; }
        .zoom_bounce { animation: zoomBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .slide_right { animation: slideRight 0.5s ease-out; }
        .flip_3d { animation: flip3D 0.6s ease-out; }
        .spin-animation { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
