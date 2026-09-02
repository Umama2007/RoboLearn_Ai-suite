import React, { useState, useEffect, useRef } from 'react';
import {
  GitFork,
  Sparkles,
  Download,
  Code,
  Palette,
  Layout,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Maximize2
} from 'lucide-react';
import mermaid from 'mermaid';
import { API_BASE } from '../config';

export default function FlowDiagram({ userId }) {
  const [topic, setTopic] = useState('');
  const [direction, setDirection] = useState('TD'); // TD (top-down) or LR (left-right)
  const [theme, setTheme] = useState('dark'); // dark, neutral, forest, default
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' or 'code'
  const [copied, setCopied] = useState(false);

  const [mermaidCode, setMermaidCode] = useState('');

  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState('');
  const diagramContainerRef = useRef(null);

  // Initialize Mermaid configuration
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif'
    });
    if (mermaidCode) {
      renderMermaidDiagram(mermaidCode);
    } else {
      setSvgContent('');
    }
  }, [theme, mermaidCode]);

  // Render Mermaid code to SVG dynamically
  const renderMermaidDiagram = async (code) => {
    try {
      setRenderError('');
      const id = 'mermaid-svg-' + Math.round(Math.random() * 100000);
      const { svg } = await mermaid.render(id, code);
      setSvgContent(svg);
    } catch (err) {
      setRenderError('Flowchart Syntax Error: ' + err.message);
    }
  };

  // Generate Flowchart via Local Ollama LLM
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    setRenderError('');

    try {
      const res = await fetch(`${API_BASE}/generate_flowchart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          direction,
          user_id: userId || 'student'
        })
      });

      const data = await res.json();
      if (data.mermaid_code) {
        setMermaidCode(data.mermaid_code);
      } else {
        alert(data.error || 'Failed to generate flowchart diagram.');
      }
    } catch (err) {
      alert('Error connecting to flowchart generator: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download SVG
  const downloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\W+/g, '_')}_Flowchart.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy Mermaid Code
  const copyCode = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1150px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>
          <GitFork size={14} /> Professional Flowchart & Logic Architect
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.4rem' }}>
          Flow Diagram Generator
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Generate publication-quality flowcharts with decision diamonds, process blocks, and branch logic powered by local LLM.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Form: Configuration */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffffff' }}>
            <Sparkles size={16} color="#4FD1C5" /> Flowchart Generator
          </h3>

          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>Process Topic or Algorithm</label>
              <textarea
                className="form-control"
                rows={4}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                placeholder="e.g. Machine Learning Pipeline, Photosynthesis Reactions, Binary Search Tree..."
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

            {/* Layout Direction */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>
                <Layout size={14} color="#4FD1C5" /> Flowchart Direction
              </label>
              <select
                className="form-select"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                style={{
                  background: 'rgba(5, 8, 15, 0.92)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '100%'
                }}
              >
                <option value="TD" style={{ background: '#0F172A', color: '#ffffff' }}>Top-to-Bottom (Vertical TD)</option>
                <option value="LR" style={{ background: '#0F172A', color: '#ffffff' }}>Left-to-Right (Horizontal LR)</option>
              </select>
            </div>

            {/* Visual Color Theme */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.35rem' }}>
                <Palette size={14} color="#34D399" /> Color Theme Style
              </label>
              <select
                className="form-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{
                  background: 'rgba(5, 8, 15, 0.92)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '100%'
                }}
              >
                <option value="dark" style={{ background: '#0F172A', color: '#ffffff' }}>Cyber Dark Theme</option>
                <option value="neutral" style={{ background: '#0F172A', color: '#ffffff' }}>Academic Clean Slate</option>
                <option value="forest" style={{ background: '#0F172A', color: '#ffffff' }}>Emerald Tech Green</option>
                <option value="default" style={{ background: '#0F172A', color: '#ffffff' }}>Corporate Blue Classic</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', color: '#ffffff', fontWeight: '800' }} disabled={isGenerating}>
              <Sparkles size={16} /> {isGenerating ? 'Architecting Flowchart...' : 'Generate Flow Diagram'}
            </button>
          </form>

          {/* Tips Box */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.12)', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            <strong style={{ color: '#4FD1C5', display: 'block', marginBottom: '0.3rem' }}>
              💡 Publication Diagram Legend:
            </strong>
            <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><code>([Start / End])</code> - Rounded Ovals</li>
              <li><code>[Process Box]</code> - Standard Action Steps</li>
              <li><code>&#123;Decision Point?&#125;</code> - Diamond Logic Branch</li>
              <li><code>--&gt;|Yes/No|</code> - Decision Path Connectors</li>
            </ul>
          </div>
        </div>

        {/* Right Flowchart Render & Code Studio Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Top Bar Tabs & Actions */}
          <div style={{
            background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '16px',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('visual')}
                className="btn btn-sm"
                style={{
                  background: activeTab === 'visual' ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: activeTab === 'visual' ? '1px solid #4FD1C5' : '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: '700'
                }}
              >
                <Zap size={14} color={activeTab === 'visual' ? '#ffffff' : '#4FD1C5'} /> Interactive Visual Diagram
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className="btn btn-sm"
                style={{
                  background: activeTab === 'code' ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: activeTab === 'code' ? '1px solid #4FD1C5' : '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: '700'
                }}
              >
                <Code size={14} color={activeTab === 'code' ? '#ffffff' : '#4FD1C5'} /> Edit Mermaid Syntax
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={copyCode}
                className="btn btn-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: '700'
                }}
              >
                {copied ? <Check size={14} color="#34D399" /> : <Copy size={14} color="#ffffff" />}
                {copied ? 'Copied Code!' : 'Copy Syntax'}
              </button>

              <button
                onClick={downloadSvg}
                className="btn btn-sm"
                disabled={!svgContent}
                style={{
                  background: svgContent ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : 'rgba(255, 255, 255, 0.05)',
                  color: svgContent ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                  border: svgContent ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                  fontWeight: '700'
                }}
              >
                <Download size={14} color={svgContent ? '#ffffff' : 'rgba(255, 255, 255, 0.35)'} /> Download SVG Diagram
              </button>
            </div>
          </div>

          {/* Workspace Area: Visual Render or Code Editor */}
          {activeTab === 'visual' ? (
            <div
              style={{
                minHeight: '480px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '16px',
                boxShadow: '0 14px 40px rgba(15, 23, 42, 0.22)',
                overflowX: 'auto'
              }}
            >
              {!mermaidCode ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <GitFork size={48} color="#4FD1C5" style={{ marginBottom: '1.25rem' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem', color: '#ffffff' }}>No Flow Diagram Active</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.75)', maxWidth: '420px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Enter an algorithm or process topic on the left, then click <strong style={{ color: '#ffffff' }}>Generate Flow Diagram</strong> to build the logic architecture.
                  </p>
                </div>
              ) : renderError ? (
                <div style={{ color: '#fca5a5', padding: '1rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244,63,94,0.4)', textAlign: 'center' }}>
                  <strong>Diagram Syntax Warning:</strong>
                  <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{renderError}</pre>
                </div>
              ) : (
                <div
                  ref={diagramContainerRef}
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '1rem'
                  }}
                />
              )}
            </div>
          ) : (
            /* Tab 2: Raw Mermaid Code Editor */
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  Interactive Mermaid Code Editor
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                  Edit nodes and arrows directly below
                </span>
              </div>
              <textarea
                className="form-control"
                rows={16}
                value={mermaidCode}
                onChange={(e) => setMermaidCode(e.target.value)}
                style={{
                  fontFamily: 'Fira Code, monospace, consolas',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: '#38bdf8'
                }}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
