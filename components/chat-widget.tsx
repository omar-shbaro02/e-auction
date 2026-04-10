"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "I can help with navigation, bidding rules, shipping notes, and the featured lots on this website."
  }
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();

    if (!question || loading) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content: question }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });

      const payload = (await response.json()) as { answer?: string; error?: string };

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || "The assistant could not respond.");
      }

      const answer = payload.answer;
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The assistant is temporarily unavailable."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-shell" id="assistant">
      {!open ? (
        <button className="button-primary chat-toggle" onClick={() => setOpen(true)} type="button">
          Ask LotLane AI
        </button>
      ) : (
        <section className="chat-card" aria-label="AI assistant">
          <div className="chat-header">
            <strong>LotLane AI Concierge</strong>
            <p>Trained on your site navigation, auction rules, and product highlights.</p>
          </div>

          <div className="chat-body">
            {messages.map((message, index) => (
              <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}
            {loading ? <div className="chat-bubble assistant">Thinking through the catalog...</div> : null}
          </div>

          <form className="chat-form" onSubmit={handleSubmit}>
            <textarea
              aria-label="Ask about the website or products"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about bidding, delivery, or the featured stock..."
              value={input}
            />
            {error ? <div className="muted">{error}</div> : null}
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
              <button className="button-secondary" onClick={() => setOpen(false)} type="button">
                Close
              </button>
              <button className="button-primary" disabled={loading} type="submit">
                Send
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
