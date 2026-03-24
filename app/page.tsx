"use client";

import { useState, useRef, useEffect, CSSProperties } from "react";

export default function ThoughtRewriter() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  // Scroll to result
  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [result]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setRevealed(false);

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought: input.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "No response");
      }

      setResult(data.text);
      setTimeout(() => setRevealed(true), 60);
    } catch (err) {
      console.error(err);
      setError("連線出了點問題，請再試一次。");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReset = () => {
    setInput("");
    setResult(null);
    setError(null);
    setRevealed(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // When result appears, the ambient glow expands slightly = "aperture opening"
  const glowScale = result && revealed ? 1.15 : 1;
  const glowOpacity = result && revealed ? 0.45 : 0.3;

  return (
    <div style={styles.page}>
      {/* Ambient light — warm glow from upper right, responds to state */}
      <div
        style={{
          ...styles.ambientGlow,
          transform: `scale(${glowScale})`,
          opacity: glowOpacity,
          transition: "transform 1.2s ease, opacity 1.2s ease",
        }}
      />

      {/* Fractal noise texture */}
      <div style={styles.noiseTexture} />

      {/* Content */}
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>念頭改寫</h1>
          <p style={styles.titleEn}>SEP rewriter</p>
          <p style={styles.subtitle}>
            寫下一個你覺得一直在想的念頭，我們會改寫一個新的給你
          </p>
        </header>

        {/* Input */}
        <div style={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：我覺得不管怎麼努力都不夠好..."
            style={styles.textarea}
            rows={2}
            disabled={loading}
          />
          <div style={styles.inputFooter}>
            <span style={styles.hint}>Enter 送出</span>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!input.trim() || loading}
              style={{
                ...styles.submitBtn,
                opacity: !input.trim() || loading ? 0.4 : 1,
                cursor: !input.trim() || loading ? "default" : "pointer",
              }}
            >
              {loading ? (
                <span style={{ letterSpacing: "0.25em" }}>
                  <span style={{ animation: "pulse 1.2s ease infinite" }}>·</span>
                  <span style={{ animation: "pulse 1.2s ease 0.2s infinite" }}>·</span>
                  <span style={{ animation: "pulse 1.2s ease 0.4s infinite" }}>·</span>
                </span>
              ) : (
                "改寫"
              )}
            </button>
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Result — rack focus from blur to sharp */}
        {result && (
          <div ref={resultRef} style={styles.resultArea}>
            {/* Divider */}
            <div className="fade-in" style={styles.divider} />

            {/* The rewritten thought */}
            <p
              className={revealed ? "rack-focus" : ""}
              style={{ ...styles.resultText, opacity: revealed ? undefined : 0 }}
            >
              {result}
            </p>

            {/* Actions — fade in after the question is sharp */}
            <div
              style={{
                ...styles.actions,
                opacity: revealed ? 1 : 0,
                transition: "opacity 0.5s ease 0.9s",
              }}
            >
              <button className="btn-ghost" onClick={handleReset} style={styles.resetBtn}>
                再試一個
              </button>
              <span style={styles.actionDot}>·</span>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="cta-link"
                style={styles.ctaLink}
              >
                想更深入了解自己？
              </a>
            </div>
          </div>
        )}

        {/* Footer — only when no result */}
        {!result && !loading && (
          <p style={styles.footer}>改寫只是換一個角度看事情</p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F9F7F4",
    position: "relative",
    overflow: "hidden",
  },

  ambientGlow: {
    position: "fixed",
    top: "-20%",
    right: "-12%",
    width: "65vw",
    height: "65vw",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(252, 245, 232, 0.8) 0%, rgba(249, 247, 244, 0) 65%)",
    pointerEvents: "none",
    zIndex: 0,
    transformOrigin: "center center",
  },

  noiseTexture: {
    position: "fixed",
    inset: 0,
    opacity: 0.028,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    backgroundSize: "200px 200px",
    pointerEvents: "none",
    zIndex: 0,
  },

  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: 480,
    margin: "0 auto",
    padding: "52px 24px 100px",
  },

  header: {
    marginBottom: 36,
  },
  title: {
    fontFamily: "var(--font-serif), 'Noto Serif TC', serif",
    fontSize: 26,
    fontWeight: 500,
    color: "#2A2520",
    letterSpacing: "0.06em",
  },
  titleEn: {
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontSize: 12,
    fontWeight: 300,
    color: "#A8A29A",
    marginTop: 5,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
  },
  subtitle: {
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontSize: 14,
    fontWeight: 300,
    color: "#7D776F",
    marginTop: 16,
    lineHeight: 1.9,
  },

  inputWrap: {
    marginBottom: 8,
  },
  textarea: {
    width: "100%",
    padding: "16px 18px",
    fontSize: 15,
    lineHeight: 1.8,
    fontWeight: 400,
    color: "#2A2520",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E0DBD4",
    borderRadius: 12,
    resize: "none" as const,
    boxShadow: "0 1px 6px rgba(0,0,0,0.02)",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  inputFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  hint: {
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontSize: 11,
    color: "#B5AFA6",
    fontWeight: 300,
  },
  submitBtn: {
    padding: "12px 24px",
    fontSize: 14,
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontWeight: 500,
    color: "#FFFEFA",
    backgroundColor: "#665E55",
    border: "none",
    borderRadius: 8,
    letterSpacing: "0.04em",
  },

  error: {
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontSize: 13,
    color: "#B07070",
    marginTop: 8,
  },

  resultArea: {
    marginTop: 8,
  },
  divider: {
    width: 36,
    height: 1,
    backgroundColor: "#D6D0C8",
    margin: "30px 0 34px",
  },
  resultText: {
    fontFamily: "var(--font-serif), 'Noto Serif TC', serif",
    fontSize: 20,
    fontWeight: 400,
    lineHeight: 2.1,
    color: "#2A2520",
    letterSpacing: "0.01em",
  },

  actions: {
    marginTop: 36,
    display: "flex",
    alignItems: "center",
  },
  resetBtn: {
    padding: "10px 14px",
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontSize: 12,
    fontWeight: 400,
    color: "#7D776F",
    backgroundColor: "transparent",
    border: "1px solid #D8D2C8",
    borderRadius: 7,
    cursor: "pointer",
  },
  actionDot: {
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontSize: 12,
    color: "#C8C2B8",
    margin: "0 10px",
  },
  ctaLink: {
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontSize: 12,
    fontWeight: 400,
    color: "#8A847A",
    textDecoration: "none",
    borderBottom: "1px solid #CEC8BE",
    paddingBottom: 1,
    cursor: "pointer",
  },

  footer: {
    fontFamily: "var(--font-sans), 'Noto Sans TC', sans-serif",
    fontSize: 12,
    fontWeight: 300,
    color: "#B0A898",
    marginTop: 48,
    lineHeight: 1.8,
  },
};
