"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

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
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
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

  return (
    <>
      {/* Ambient background */}
      <div className="ambient">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
      </div>
      <div className="texture" />

      <div className="page-container">
        {/* Logo */}
        <div className="logo-mark anim-rise anim-delay-1">
          <Image src="/logo-white.png" alt="微亮計畫" width={64} height={64} priority />
        </div>

        {/* Title */}
        <div className="title-area anim-rise anim-delay-2">
          <h1 className="main-title">念頭改寫</h1>
        </div>

        {/* Tagline */}
        <div className="tagline anim-rise anim-delay-3">
          <p>同一個念頭，另一個角度<br />也許就另一個感覺</p>
        </div>

        {/* Invitation */}
        <div className="invitation anim-rise anim-delay-4">
          <p>那個最近一直在轉的念頭<br />寫下來就好，不用修飾</p>
        </div>

        {/* Input */}
        <div className="input-area anim-rise anim-delay-5">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="thought-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="我覺得不管怎麼做都不夠好⋯⋯"
              rows={2}
              disabled={loading}
            />
            <div className="input-footer">
              <span className="input-hint">按 Enter 送出</span>
              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
              >
                {loading ? (
                  "⋯"
                ) : (
                  <>
                    換個角度看
                    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M1 7h10.5M8 3.5L11.5 7 8 10.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {/* Loading */}
        {loading && (
          <div className="loading-area anim-rise">
            <div className="loading-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="loading-text">讓我想想⋯⋯</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div ref={resultRef} className="result-area anim-rise">
            <div className="result-card">
              <div className="result-label">另一個角度</div>
              <p
                className={`result-text ${revealed ? "rack-focus" : ""}`}
                style={{ opacity: revealed ? undefined : 0 }}
              >
                {result}
              </p>
              <div
                className="result-note"
                style={{
                  opacity: revealed ? 1 : 0,
                  transition: "opacity 0.5s ease 0.9s",
                }}
              >
                不一定要接受，感受一下就好。<br />
                看看哪個說法讓你比較鬆。
              </div>
            </div>
            <button
              className="try-again"
              onClick={handleReset}
              style={{
                opacity: revealed ? 1 : 0,
                transition: "opacity 0.5s ease 1.1s",
              }}
            >
              ← 換一個念頭
            </button>
          </div>
        )}

        {/* Philosophy — only when idle */}
        {!result && !loading && (
          <div className="philosophy anim-rise anim-delay-6">
            <div className="divider-line" />
            <p>念頭沒有對錯<br />只是有時候可以換個方式看一眼</p>
          </div>
        )}

        {/* Brand footer */}
        {!result && !loading && (
          <div className="brand-footer anim-rise anim-delay-7">
            <a href="https://www.portaly.cc/twilightproject" target="_blank" rel="noopener noreferrer">
              微亮
            </a>
          </div>
        )}
      </div>
    </>
  );
}
