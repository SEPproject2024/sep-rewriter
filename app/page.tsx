"use client";

import { useState, useRef, useEffect } from "react";

const CONTEXT_TAGS = [
  { id: "work", emoji: "💼", label: "工作壓力" },
  { id: "relationship", emoji: "💑", label: "感情困擾" },
  { id: "self-doubt", emoji: "🪞", label: "自我懷疑" },
  { id: "direction", emoji: "🧭", label: "方向迷茫" },
] as const;

type ContextTagId = (typeof CONTEXT_TAGS)[number]["id"] | null;

export default function ThoughtRewriter() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [previousResponses, setPreviousResponses] = useState<string[]>([]);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [contextTag, setContextTag] = useState<ContextTagId>(null);
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

  const callRewrite = async (thought: string, prev: string[], attempt: number) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRevealed(false);

    const tagLabel = contextTag
      ? CONTEXT_TAGS.find((t) => t.id === contextTag)?.label
      : undefined;

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thought,
          previousResponses: prev,
          attemptNumber: attempt,
          contextTag: tagLabel,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "No response");
      }

      setResult(data.text);
      setPreviousResponses([...prev, data.text]);
      setAttemptNumber(attempt + 1);
      setTimeout(() => setRevealed(true), 60);
    } catch (err) {
      console.error(err);
      setError("連線出了點問題，請再試一次。");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || loading) return;
    setPreviousResponses([]);
    setAttemptNumber(1);
    callRewrite(input.trim(), [], 1);
  };

  const handleRetry = () => {
    if (!input.trim() || loading) return;
    callRewrite(input.trim(), previousResponses, attemptNumber);
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
    setPreviousResponses([]);
    setAttemptNumber(1);
    setError(null);
    setRevealed(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const toggleTag = (id: ContextTagId) => {
    setContextTag((prev) => (prev === id ? null : id));
  };

  const hasResult = !!result || loading;

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
        {/* Title */}
        <div className={`title-area anim-rise anim-delay-1 ${hasResult ? "compact" : ""}`}>
          <h1 className="main-title">念頭改寫</h1>
        </div>

        {/* Tagline */}
        <div className={`tagline anim-rise anim-delay-2 ${hasResult ? "collapsed" : ""}`}>
          <p>同一個念頭，另一個角度<br />也許就另一個感受</p>
        </div>

        {/* Invitation */}
        <div className={`invitation anim-rise anim-delay-3 ${hasResult ? "collapsed" : ""}`}>
          <p>那個最近一直在轉的念頭<br />寫下來就好，不用修飾</p>
        </div>

        {/* Context tags */}
        <div className={`context-tags anim-rise anim-delay-4 ${hasResult ? "collapsed" : ""}`}>
          {CONTEXT_TAGS.map((tag) => (
            <button
              key={tag.id}
              className={`tag-pill ${contextTag === tag.id ? "tag-active" : ""}`}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.emoji} {tag.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="input-area anim-rise anim-delay-4">
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
            <div
              className="result-actions"
              style={{
                opacity: revealed ? 1 : 0,
                transition: "opacity 0.5s ease 1.1s",
              }}
            >
              <button className="try-again" onClick={handleReset}>
                ← 換一個念頭
              </button>
              <button className="retry-btn" onClick={handleRetry}>
                換一句 ↻
              </button>
            </div>
          </div>
        )}

        {/* Philosophy */}
        {!result && !loading && (
          <div className="philosophy anim-rise anim-delay-5">
            <div className="divider-line" />
            <p>念頭沒有對錯<br />只是有時候可以換個方式看一眼</p>
          </div>
        )}

        {/* Brand footer */}
        {!result && !loading && (
          <div className="brand-footer anim-rise anim-delay-6">
            <a href="https://www.portaly.cc/twilightproject" target="_blank" rel="noopener noreferrer">
              微亮
            </a>
          </div>
        )}
      </div>
    </>
  );
}
