import React, { useState } from 'react';
import { Bot, Send, Sparkles, Shield, User, HelpCircle, BookOpen } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am your StudentOS Academic Assistant. I have read-only access to your authorized tasks and academic deadlines to help keep you on track. How can I help you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    'What should I work on today?',
    'Which deadlines are coming up?',
    'Create a study plan for this week.',
    'Help me break down a complex assignment.',
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await api.chatAssistant(textToSend);
      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error contacting assistant service: ${err.message || 'Please check backend status.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Academic AI Assistant
            </h1>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <Shield size={12} /> Sandboxed & Grounded
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Ask questions about upcoming exams, pending coursework, and study schedules.
          </p>
        </div>
      </div>

      {/* Chat Messages Card */}
      <div
        className="card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-card)',
          padding: 0,
        }}
      >
        {/* Messages Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '0.875rem',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}

                <div
                  style={{
                    padding: '0.875rem 1.125rem',
                    borderRadius: varIsUser(isUser),
                    backgroundColor: isUser ? 'var(--accent-primary)' : 'var(--bg-input)',
                    border: isUser ? 'none' : '1px solid var(--border-card)',
                    color: isUser ? '#ffffff' : 'var(--text-main)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {msg.text}
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: isUser ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-dim)',
                      textAlign: 'right',
                      marginTop: '0.375rem',
                    }}
                  >
                    {msg.time}
                  </div>
                </div>

                {isUser && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={16} />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-start' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px 12px 12px 4px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                Thinking and querying authorized context...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-card)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              className="btn btn-outline btn-sm"
              style={{
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Sparkles size={12} color="var(--accent-primary)" />
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-card)',
            display: 'flex',
            gap: '0.75rem',
            backgroundColor: 'var(--bg-sidebar)',
          }}
        >
          <input
            type="text"
            className="input"
            placeholder="Ask anything about your tasks, deadlines, or revision schedule..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            style={{ borderRadius: 'var(--radius-md)' }}
          />
          <Button type="submit" variant="primary" isLoading={isLoading} icon={<Send size={16} />}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

function varIsUser(isUser: boolean) {
  return isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px';
}
