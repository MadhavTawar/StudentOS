import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  Bot,
  CalendarClock,
  CheckSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import './AssistantPage.css';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

const quickPrompts = [
  { icon: <CalendarClock size={18} />, title: 'Plan my day', prompt: 'What should I work on today?' },
  { icon: <BookOpen size={18} />, title: 'Study plan', prompt: 'Create a study plan for this week.' },
  { icon: <CheckSquare size={18} />, title: 'Upcoming work', prompt: 'Which deadlines are coming up?' },
  { icon: <Sparkles size={18} />, title: 'Break it down', prompt: 'Help me break down a complex assignment.' },
];

const currentTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    try { localStorage.setItem('studentos_study_guide_visited', 'true'); } catch { /* ignore */ }
  }, []);

  const handleSendMessage = async (queryText = inputMessage) => {
    const textToSend = queryText.trim();
    if (!textToSend || isLoading) return;

    setMessages((previous) => [...previous, { sender: 'user', text: textToSend, time: currentTime() }]);
    setInputMessage('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      const response = await api.chatAssistant(textToSend);
      setMessages((previous) => [
        ...previous,
        { sender: 'assistant', text: response.reply, time: currentTime() },
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Please check that the backend is running.';
      setMessages((previous) => [
        ...previous,
        { sender: 'assistant', text: `I couldn't reach the assistant service. ${detail}`, time: currentTime() },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const startNewChat = () => {
    if (isLoading) return;
    setMessages([]);
    setInputMessage('');
    inputRef.current?.focus();
  };

  return (
    <section className="assistant-page">
      <header className="assistant-topbar">
        <div className="assistant-brand">
          <div className="assistant-brand-icon"><Sparkles size={18} /></div>
          <div>
            <h1>Study companion</h1>
            <span>Study planning from your task and deadline context</span>
          </div>
        </div>
        <div className="assistant-topbar-actions">
          <Link to="/app/knowledge" className="assistant-knowledge-link"><BookOpen size={15} /><span>Knowledge library</span></Link>
          <button
            type="button"
            className="assistant-new-chat"
            onClick={startNewChat}
            disabled={isLoading}
            title="Start a new conversation"
          >
            <Plus size={17} />
            <span>New chat</span>
          </button>
        </div>
      </header>

      <div className={`assistant-conversation${messages.length === 0 ? ' is-welcome' : ''}`}>
        <div className="assistant-message-list" role="log" aria-live="polite" aria-label="Assistant conversation">
          {messages.length === 0 ? (
            <div className="assistant-welcome">
              <div className="assistant-welcome-mark"><Sparkles size={28} /></div>
              <p className="assistant-eyebrow">YOUR ACADEMIC CO-PILOT</p>
              <h2>What would you like to<br /><span>make progress on?</span></h2>
              <p className="assistant-welcome-copy">
                Ask about your coursework, organize your time, or turn a big assignment into manageable steps.
              </p>
              <div className="assistant-prompt-grid">
                {quickPrompts.map((item) => (
                  <button
                    type="button"
                    key={item.title}
                    className="assistant-prompt-card"
                    onClick={() => void handleSendMessage(item.prompt)}
                  >
                    <span className="assistant-prompt-icon">{item.icon}</span>
                    <span><strong>{item.title}</strong><small>{item.prompt}</small></span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isUser = message.sender === 'user';
              return (
                <article className={`assistant-message${isUser ? ' from-user' : ' from-assistant'}`} key={`${index}-${message.time}`}>
                  {!isUser && <div className="assistant-avatar"><Bot size={18} /></div>}
                  <div className="assistant-message-content">
                    {!isUser && (
                      <div className="assistant-message-heading">
                        <strong>StudentOS</strong><span>{message.time}</span>
                      </div>
                    )}
                    <div className="assistant-message-text">{message.text}</div>
                    {isUser && <span className="assistant-message-time">{message.time}</span>}
                  </div>
                  {isUser && <div className="assistant-user-avatar"><User size={17} /></div>}
                </article>
              );
            })
          )}

          {isLoading && (
            <div className="assistant-message from-assistant">
              <div className="assistant-avatar is-thinking"><Bot size={18} /></div>
              <div className="assistant-message-content">
                <div className="assistant-message-heading"><strong>StudentOS</strong><span>thinking</span></div>
                <div className="assistant-thinking" aria-label="Assistant is thinking">
                  <i /><i /><i />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="assistant-composer-area">
        <form
          className="assistant-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSendMessage();
          }}
        >
          <textarea
            ref={inputRef}
            aria-label="Message the academic assistant"
            value={inputMessage}
            onChange={(event) => {
              setInputMessage(event.target.value);
              event.currentTarget.style.height = 'auto';
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 130)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder="Message your study companion..."
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="assistant-send-button"
            disabled={isLoading || !inputMessage.trim()}
            aria-label="Send message"
          >
            <ArrowUp size={19} />
          </button>
        </form>
        <div className="assistant-composer-caption">
          <span><ShieldCheck size={13} /> Review important details before acting.</span>
          <span>Enter to send · Shift + Enter for a new line</span>
        </div>
        <p className="assistant-privacy-note">
          This conversation does not return document citations. Use the Knowledge library for answers grounded in published sources.
        </p>
      </div>
    </section>
  );
};
