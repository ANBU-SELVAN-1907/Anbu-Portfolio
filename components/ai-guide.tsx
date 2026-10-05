"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp, LoaderCircle, RotateCcw, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
type Message = { role: "user" | "model"; text: string };
export default function AiGuide({
  title,
  intro,
  email,
}: {
  title: string;
  intro: string;
  email: string;
}) {
  const [open, setOpen] = useState(false),
    [ready, setReady] = useState<boolean | null>(null),
    [accepted, setAccepted] = useState(false),
    [messages, setMessages] = useState<Message[]>([]),
    [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null),
    abort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    fetch("/api/chat", { signal: ac.signal })
      .then((r) => r.json())
      .then((b) => setReady(Boolean((b as { ready: boolean }).ready)))
      .catch(() => {
        if (!ac.signal.aborted) setReady(false);
      });
    return () => ac.abort();
  }, [open]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, error]);
  useEffect(() => () => abort.current?.abort(), []);
  async function send(text: string) {
    if (!text.trim() || busy || !accepted || !ready) return;
    setError("");
    const previous = messages.slice(-10);
    const next: Message[] = [...previous, { role: "user", text: text.trim() }];
    setQuestion("");
    setMessages(next);
    setBusy(true);
    const ac = new AbortController();
    abort.current = ac;
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: ac.signal,
      });
      const b = (await r.json()) as { answer?: string; error?: string };
      if (!r.ok || !b.answer)
        throw Error(b.error || "No response. Please try again.");
      setMessages([...next, { role: "model", text: b.answer }]);
    } catch (e) {
      if (!ac.signal.aborted) {
        setMessages(previous);
        setQuestion(text);
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="ai-launch"
        aria-label="Open AI portfolio guide"
        onClick={() => {
          setReady(null);
          setOpen(true);
        }}
      >
        <Sparkles size={20} />
        <span>Ask AI</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="ai-panel">
          <div className="ai-heading">
            <Sparkles size={22} />
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{intro}</DialogDescription>
            </div>
          </div>
          <div className="ai-conversation" aria-live="polite" aria-busy={busy}>
            {ready === null ? (
              <p className="ai-notice">
                <LoaderCircle className="spin" size={18} />
                Connecting to the guide…
              </p>
            ) : !ready ? (
              <div className="ai-unconfigured">
                <p>The AI guide is awaiting configuration.</p>
                <p>
                  You can still explore every project, or get in touch directly.
                </p>
                <a className="folio-button" href={`mailto:${email}`}>
                  <Mail size={16} />
                  Email Anbu
                </a>
              </div>
            ) : !accepted ? (
              <div className="ai-consent">
                <p>A real AI guide, grounded in my published portfolio.</p>
                <p>
                  Your questions and the recent conversation will be sent to
                  Google Gemini to generate a reply. Google’s free tier may use
                  chats to improve its products. Please avoid sharing private or
                  sensitive information. AI can make mistakes; check the linked
                  case studies.
                </p>
                <button
                  className="folio-button filled"
                  onClick={() => setAccepted(true)}
                >
                  Start AI conversation <Sparkles size={16} />
                </button>
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="ai-prompts">
                    <p>Where would you like to start?</p>
                    {[
                      "What did Anbu build at Deloitte?",
                      "How does the Jarvis project work?",
                      "What are Anbu’s strongest skills?",
                    ].map((q) => (
                      <button key={q} onClick={() => send(q)}>
                        {q}
                        <ArrowUp size={14} />
                      </button>
                    ))}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`ai-message ${m.role}`}>
                    <span>{m.role === "user" ? "You" : "AI guide"}</span>
                    <p>{m.text}</p>
                  </div>
                ))}
                {busy && (
                  <div className="ai-thinking">
                    <LoaderCircle className="spin" size={16} />
                    Thinking through the portfolio…
                  </div>
                )}
              </>
            )}
            {error && (
              <p className="ai-error" role="alert">
                {error}
              </p>
            )}
            <div ref={end} />
          </div>
          <form
            className="ai-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(question);
            }}
          >
            <label className="sr-only" htmlFor="ai-question">
              Question for AI guide
            </label>
            <input
              id="ai-question"
              value={question}
              maxLength={1200}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about a project or experience…"
              disabled={!ready || !accepted || busy}
            />
            <button
              disabled={!question.trim() || busy || !ready || !accepted}
              aria-label="Send question"
            >
              <ArrowUp size={18} />
            </button>
          </form>
          <div className="ai-footer">
            <span>Powered by Gemini · Answers can be imperfect</span>
            <button
              disabled={busy}
              onClick={() => {
                setMessages([]);
                setQuestion("");
                setError("");
              }}
            >
              <RotateCcw size={13} />
              Clear chat
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
