import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowUp, BookOpen, FileText, Search, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { KnowledgeAccess, KnowledgeChatResponse, KnowledgeLibraryItem } from '../types';
import './KnowledgePage.css';

interface KnowledgeTurn {
  question: string;
  result: KnowledgeChatResponse;
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Please check that the StudentOS service is available.';

export const KnowledgePage: React.FC = () => {
  const [library, setLibrary] = useState<KnowledgeLibraryItem[]>([]);
  const [access, setAccess] = useState<KnowledgeAccess | null>(null);
  const [turns, setTurns] = useState<KnowledgeTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([api.listKnowledgeLibrary(), api.getKnowledgeAccess()])
      .then(([items, currentAccess]) => {
        setLibrary(items);
        setAccess(currentAccess);
      })
      .catch((loadError: unknown) => setError(errorText(loadError)))
      .finally(() => setIsLoadingLibrary(false));
  }, []);

  const askQuestion = async (event: FormEvent) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || isAsking) return;
    setIsAsking(true);
    setChatError('');
    setQuestion('');
    try {
      const result = await api.chatWithKnowledge(prompt);
      setTurns((previous) => [...previous, { question: prompt, result }]);
    } catch (requestError) {
      setChatError(errorText(requestError));
      setQuestion(prompt);
    } finally {
      setIsAsking(false);
      inputRef.current?.focus();
    }
  };

  const downloadSource = async (documentId: string, versionId: string, title: string) => {
    try {
      const blob = await api.downloadKnowledgeVersion(documentId, versionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = title;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setChatError(errorText(downloadError));
    }
  };

  return (
    <section className="knowledge-page">
      <header className="knowledge-heading">
        <span className="knowledge-eyebrow">SHARED WORKSPACE LIBRARY</span>
        <h1>Knowledge library</h1>
        <p>Ask questions about published workspace resources and check every answer against its sources.</p>
      </header>

      <div className="knowledge-layout">
        <section className="knowledge-chat-panel" aria-label="Workspace knowledge assistant">
          <div className="knowledge-panel-heading">
            <div className="knowledge-panel-icon"><BookOpen size={19} /></div>
            <div>
              <h2>Ask the library</h2>
              <p>Answers are grounded in the current published collection.</p>
            </div>
          </div>

          <div className="knowledge-conversation" aria-live="polite">
            {turns.length === 0 ? (
              <div className="knowledge-empty-chat">
                <Search size={22} />
                <strong>Find a clear answer, with evidence.</strong>
                <span>Try asking about a reference, study resource, or shared procedure.</span>
              </div>
            ) : turns.map(({ question: asked, result }, index) => (
              <article className="knowledge-turn" key={`${index}-${asked}`}>
                <p className="knowledge-question">{asked}</p>
                <div className={`knowledge-answer${result.insufficient_evidence ? ' is-insufficient' : ''}`}>
                  {result.answer}
                </div>
                {result.citations.length > 0 && (
                  <div className="knowledge-citations">
                    <strong><ShieldCheck size={15} /> Sources checked</strong>
                    {result.citations.map((citation) => (
                      <details className="knowledge-citation" key={citation.chunk_id}>
                        <summary>
                          <span>{citation.document_title}</span>
                          <small>
                            Version {citation.version_number}
                            {citation.page_start ? ` · page ${citation.page_start}` : ''}
                          </small>
                        </summary>
                        <blockquote>{citation.excerpt}</blockquote>
                        <button
                          type="button"
                          className="knowledge-source-link"
                          onClick={() => void downloadSource(
                            citation.document_id,
                            citation.version_id,
                            citation.document_title,
                          )}
                        >
                          Open source document
                        </button>
                      </details>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {isAsking && <p className="knowledge-thinking">Checking published workspace sources…</p>}
          </div>

          {chatError && <p className="knowledge-error" role="alert">{chatError}</p>}
          <form className="knowledge-composer" onSubmit={(event) => void askQuestion(event)}>
            <textarea
              ref={inputRef}
              aria-label="Ask about shared workspace documents"
              placeholder="Ask about a shared reference…"
              rows={2}
              maxLength={2000}
              value={question}
              disabled={isAsking}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button type="submit" disabled={isAsking || question.trim().length < 2} aria-label="Ask question">
              <ArrowUp size={19} />
            </button>
          </form>
          <p className="knowledge-privacy-note">
            <ShieldCheck size={14} />
            {access?.ai_provider === 'offline'
              ? 'Questions and source matching run locally against published workspace material.'
              : access?.ai_provider === 'groq'
                ? 'Your question and relevant source excerpts are sent to the configured Groq AI service.'
                : 'Your question and relevant source excerpts are processed by the configured AI service.'}
          </p>
        </section>

        <aside className="knowledge-library-panel" aria-label="Published workspace documents">
          <div className="knowledge-panel-heading">
            <div className="knowledge-panel-icon"><FileText size={18} /></div>
            <div>
              <h2>Published library</h2>
              <p>{library.length} current {library.length === 1 ? 'document' : 'documents'}</p>
            </div>
          </div>
          {error && <p className="knowledge-error" role="alert">{error}</p>}
          {isLoadingLibrary ? (
            <p className="knowledge-library-empty">Loading the published library…</p>
          ) : library.length === 0 ? (
            <p className="knowledge-library-empty">No workspace references have been published yet.</p>
          ) : (
            <ul className="knowledge-document-list">
              {library.map((document) => (
                <li key={document.id}>
                  <span className="knowledge-document-category">{document.category}</span>
                  <strong>{document.title}</strong>
                  {document.description && <p>{document.description}</p>}
                  <small>
                    Version {document.version_number}
                    {document.page_count > 0 ? ` · ${document.page_count} pages` : ''}
                  </small>
                </li>
              ))}
            </ul>
          )}
          <p className="knowledge-library-footnote">
            Only current, published documents are searchable. Archived or superseded versions are excluded.
          </p>
        </aside>
      </div>
    </section>
  );
};
