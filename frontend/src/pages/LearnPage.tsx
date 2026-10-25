import React, { FormEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  Download,
  FileText,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { KnowledgeAccess, KnowledgeChatResponse, KnowledgeLibraryItem } from '../types';
import './LearnPage.css';

interface LearnTurn {
  question: string;
  source: 'documents' | 'studentos';
  knowledge?: KnowledgeChatResponse;
  assistant?: { reply: string; provider: string };
}

interface DocumentPreview {
  documentId: string;
  versionId: string;
  url?: string;
  contentType?: string;
  error?: string;
  page?: number;
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Please check that the StudentOS service is available.';

// Heuristic: route schedule/task/deadline/goal questions to the assistant endpoint,
// everything else to the document-grounded knowledge endpoint.
const isStudentOsQuestion = (prompt: string) => {
  const lower = prompt.toLowerCase();
  return (
    lower.includes('task') ||
    lower.includes('deadline') ||
    lower.includes('goal') ||
    lower.includes('homework') ||
    lower.includes('assignment') ||
    lower.includes('exam') ||
    lower.includes('due') ||
    lower.includes('study plan') ||
    lower.includes('work on') ||
    lower.includes('schedule')
  );
};

export const LearnPage: React.FC = () => {
  const [library, setLibrary] = useState<KnowledgeLibraryItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [activePanel, setActivePanel] = useState<'documents' | 'reader' | 'chat'>('documents');
  const [access, setAccess] = useState<KnowledgeAccess | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [turns, setTurns] = useState<LearnTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([api.listKnowledgeLibrary(), api.getKnowledgeAccess(), api.getAiProvider()])
      .then(([items, currentAccess, provider]) => {
        setLibrary(items);
        setSelectedDocumentId(items[0]?.id ?? '');
        setSelectedVersionId(items[0]?.version_id ?? '');
        setAccess(currentAccess);
        setAiProvider(provider.provider);
      })
      .catch((loadError: unknown) => setError(errorText(loadError)))
      .finally(() => setIsLoadingLibrary(false));
  }, []);

  const documentsByCategory = (() => {
    const grouped = new Map<string, KnowledgeLibraryItem[]>();
    library.forEach((item) => {
      const arr = grouped.get(item.category) ?? [];
      arr.push(item);
      grouped.set(item.category, arr);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();

  const selectedDocument = library.find((item) => item.id === selectedDocumentId) ?? library[0] ?? null;
  const previewDocumentId = selectedDocument?.id;
  const previewVersionId = selectedVersionId || selectedDocument?.version_id || '';

  useEffect(() => {
    if (!previewDocumentId || !previewVersionId) return;
    let isCurrent = true;
    let objectUrl: string | undefined;
    api.downloadKnowledgeVersion(previewDocumentId, previewVersionId)
      .then((blob) => {
        if (!isCurrent) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({
          documentId: previewDocumentId,
          versionId: previewVersionId,
          url: objectUrl,
          contentType: blob.type,
          page: previewPage,
        });
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setPreview({
            documentId: previewDocumentId,
            versionId: previewVersionId,
            error: errorText(loadError),
          });
        }
      });
    return () => {
      isCurrent = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewDocumentId, previewVersionId, previewPage]);

  const askQuestion = async (event: FormEvent) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || isAsking) return;
    setIsAsking(true);
    setChatError('');
    setQuestion('');
    try {
      if (isStudentOsQuestion(prompt)) {
        const assistant = await api.chatAssistant(prompt);
        setTurns((previous) => [
          ...previous,
          { question: prompt, source: 'studentos', assistant: { reply: assistant.reply, provider: assistant.provider } },
        ]);
      } else {
        const result = await api.chatWithKnowledge(prompt);
        setTurns((previous) => [...previous, { question: prompt, source: 'documents', knowledge: result }]);
      }
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

  const openCitation = (documentId: string, versionId: string, page?: number | null) => {
    setSelectedDocumentId(documentId);
    setSelectedVersionId(versionId);
    setPreview(null);
    setActivePanel('reader');
    setPreviewPage(page ?? 1);
  };

  const previewSrc = () => {
    if (!preview?.url) return '';
    const src = preview.contentType === 'application/pdf' ? `${preview.url}#page=${previewPage}` : preview.url;
    return src;
  };

  return (
    <section className="learn-page">
      <header className="learn-header">
        <div className="learn-brand">
          <BookOpen size={20} />
          <h1>Learn</h1>
        </div>
        <div className="learn-header-actions">
          {access?.can_manage_documents && (
            <Link to="/app/knowledge/manage" className="btn btn-outline knowledge-manage-link">
              Manage library
            </Link>
          )}
        </div>
      </header>

      <div className="learn-mobile-tabs" role="tablist" aria-label="Learn workspace panels">
        {([
          ['documents', 'Documents'],
          ['reader', 'Reader'],
          ['chat', 'Chat'],
        ] as const).map(([panel, label]) => (
          <button
            key={panel}
            id={`learn-tab-${panel}`}
            type="button"
            role="tab"
            aria-controls={`learn-panel-${panel}`}
            aria-selected={activePanel === panel}
            onClick={() => setActivePanel(panel)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="learn-layout" data-active-panel={activePanel}>
        {/* Left: Documents */}
        <aside id="learn-panel-documents" role="tabpanel" aria-labelledby="learn-tab-documents" className="learn-documents-panel" aria-label="Published workspace documents">
          <div className="learn-panel-heading">
            <div className="learn-panel-icon"><FileText size={18} /></div>
            <div><h2>Library</h2><p>{library.length} published {library.length === 1 ? 'document' : 'documents'}</p></div>
          </div>
          {error && <p className="knowledge-error" role="alert">{error}</p>}
          {isLoadingLibrary ? (
            <p className="learn-library-empty">Loading the published library…</p>
          ) : library.length === 0 ? (
            access?.can_manage_documents ? (
              <div className="learn-library-empty">
                <p>Upload your notes or course PDFs, publish them, then ask questions with sources.</p>
                <Link to="/app/knowledge/manage" className="btn btn-primary knowledge-upload-cta">Upload your first document</Link>
              </div>
            ) : (
              <p className="learn-library-empty">Nothing has been published in this workspace yet. Ask the workspace owner to add study material.</p>
            )
          ) : (
            <>
              {documentsByCategory.map(([category, items]) => (
                <section key={category} className="learn-category-group">
                  <h3 className="learn-category-title">{category} ({items.length})</h3>
                  <ul className="learn-document-list">
                    {items.map((document) => (
                      <li key={document.id}>
                        <button
                          type="button"
                          className={`learn-document-select${selectedDocument?.id === document.id ? ' is-selected' : ''}`}
                          aria-pressed={selectedDocument?.id === document.id}
                          onClick={() => {
                            setSelectedDocumentId(document.id);
                            setSelectedVersionId(document.version_id);
                            setPreview(null);
                            setActivePanel('reader');
                            setPreviewPage(1);
                          }}
                        >
                          <span className="learn-document-category">{document.category}</span>
                          <strong>{document.title}</strong>
                          {document.description && <span className="learn-document-description">{document.description}</span>}
                          <small>Version {document.version_number}{document.page_count > 0 ? ` · ${document.page_count} pages` : ''}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <p className="learn-library-footnote">Only current, published documents are searchable. Archived or superseded versions are excluded.</p>
            </>
          )}
        </aside>

        {/* Center: Reader */}
        <section id="learn-panel-reader" role="tabpanel" aria-labelledby="learn-tab-reader" className="learn-reader-panel" aria-label="Selected document">
          {!selectedDocument ? (
            <div className="learn-reader-empty"><BookOpen size={28} /><h2>Select a published document</h2><p>Choose a document from the workspace library to inspect its details.</p></div>
          ) : (
            <>
              <div className="learn-reader-heading">
                <div>
                  <span className="learn-document-category">{selectedDocument.category}</span>
                  <h2>{selectedDocument.title}</h2>
                  <p>Version {selectedDocument.version_number}{selectedDocument.page_count > 0 ? ` · ${selectedDocument.page_count} pages` : ''}</p>
                </div>
                <button type="button" className="learn-reader-download" onClick={() => void downloadSource(selectedDocument.id, previewVersionId, selectedDocument.title)}>
                  <Download size={15} /><span>Download</span>
                </button>
              </div>
              {selectedDocument.description && <p className="learn-reader-description">{selectedDocument.description}</p>}
              <div className="learn-document-preview" aria-live="polite">
                {!preview || preview.documentId !== selectedDocument.id || preview.versionId !== previewVersionId ? (
                  <p className="learn-library-empty">Loading authorized document preview…</p>
                ) : preview.error ? (
                  <div className="learn-reader-empty" role="alert"><FileText size={26} /><h3>Preview unavailable</h3><p>{preview.error}</p></div>
                ) : preview.contentType === 'application/pdf' && preview.url ? (
                  <iframe title={`Preview of ${selectedDocument.title}`} src={previewSrc()} />
                ) : preview.contentType?.startsWith('image/') && preview.url ? (
                  <img src={preview.url} alt={`Preview of ${selectedDocument.title}`} />
                ) : (
                  <div className="learn-reader-empty"><FileText size={26} /><h3>Document selected</h3><p>This file type is not previewable here. Use Download to view the original file.</p></div>
                )}
              </div>
            </>
          )}
        </section>

        {/* Right: Chat */}
        <section id="learn-panel-chat" role="tabpanel" aria-labelledby="learn-tab-chat" className="learn-chat-panel" aria-label="Workspace knowledge assistant">
          <div className="learn-panel-heading">
            <div className="learn-panel-icon"><BookOpen size={19} /></div>
            <div>
              <h2>Ask the library</h2>
              <p>Questions about your documents use published sources; task, deadline and goal questions use your StudentOS data.</p>
            </div>
          </div>

          <div className="learn-conversation" aria-live="polite">
            {turns.length === 0 ? (
              <div className="learn-empty-chat">
                <Search size={22} />
                <strong>Find a clear answer, with evidence.</strong>
                <span>Ask about a reference, your tasks, deadlines or goals.</span>
              </div>
            ) : turns.map(({ question: asked, source, knowledge, assistant }, index) => (
              <article className="learn-turn" key={`${index}-${asked}`}>
                <p className="learn-question">{asked}</p>
                <div className="learn-turn-label">
                  {source === 'documents' ? 'From your documents' : 'From your StudentOS data'}
                </div>
                <div className={`learn-answer${knowledge?.insufficient_evidence ? ' is-insufficient' : ''}`}>
                  {knowledge?.insufficient_evidence && (
                    <strong className="learn-evidence-warning">Not enough evidence — no published source supports this answer.</strong>
                  )}
                  {source === 'documents' ? knowledge?.answer : assistant?.reply}
                </div>
                {source === 'documents' && knowledge && knowledge.citations.length > 0 && (
                  <div className="learn-citations">
                    <strong><ShieldCheck size={15} /> Sources checked</strong>
                    {knowledge.citations.map((citation) => (
                      <details className="learn-citation" key={citation.chunk_id}>
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
                          className="learn-source-link"
                          aria-label={`Open cited source ${citation.document_title}`}
                          onClick={() => openCitation(citation.document_id, citation.version_id, citation.page_start)}
                        >
                          Open cited document
                        </button>
                        <button type="button" className="learn-source-link" onClick={() => void downloadSource(citation.document_id, citation.version_id, citation.document_title)}>Download cited source</button>
                      </details>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {isAsking && <p className="learn-thinking">Checking your workspace…</p>}
          </div>

          {chatError && <p className="learn-error" role="alert">{chatError}</p>}
          <form className="learn-composer" onSubmit={(event) => void askQuestion(event)}>
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
          <p className="learn-privacy-note">
            <ShieldCheck size={14} />
            {aiProvider === 'offline'
              ? 'Questions and source matching run locally against published workspace material.'
              : aiProvider === 'groq'
                ? 'Your question and relevant source excerpts are sent to the configured Groq AI service.'
                : 'Your question and relevant source excerpts are processed by the configured AI service.'}
          </p>
        </section>
      </div>
    </section>
  );
};
