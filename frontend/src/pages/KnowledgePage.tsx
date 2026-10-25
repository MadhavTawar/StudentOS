import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Download, FileText, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { KnowledgeAccess, KnowledgeChatResponse, KnowledgeLibraryItem } from '../types';
import './KnowledgePage.css';

interface KnowledgeTurn {
  question: string;
  result: KnowledgeChatResponse;
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

export const KnowledgePage: React.FC = () => {
  const [library, setLibrary] = useState<KnowledgeLibraryItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [activePanel, setActivePanel] = useState<'documents' | 'preview' | 'assistant'>('documents');
  const [rightTab, setRightTab] = useState<'ask' | 'details'>('ask');
  const [access, setAccess] = useState<KnowledgeAccess | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [turns, setTurns] = useState<KnowledgeTurn[]>([]);
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

  const openCitation = (documentId: string, versionId: string, page?: number | null) => {
    setSelectedDocumentId(documentId);
    setSelectedVersionId(versionId);
    setPreview(null);
    setActivePanel('preview');
    setRightTab('ask');
    setPreviewPage(page ?? 1);
  };

  const previewSrc = () => {
    if (!preview?.url) return '';
    const src = preview.contentType === 'application/pdf' ? `${preview.url}#page=${previewPage}` : preview.url;
    return src;
  };

  return (
    <section className="knowledge-page">
      <header className="knowledge-heading">
        <span className="knowledge-eyebrow">SHARED WORKSPACE LIBRARY</span>
        <h1>Knowledge library</h1>
        <p>Ask questions about published workspace resources and check every answer against its sources.</p>
        {access?.can_manage_documents && (
          <Link to="/app/knowledge/manage" className="btn btn-outline knowledge-manage-link">
            Manage library
          </Link>
        )}
      </header>

      <div className="knowledge-mobile-tabs" role="tablist" aria-label="Knowledge workspace panels">
        {([
          ['documents', 'Documents'],
          ['preview', 'Reader'],
          ['assistant', 'Ask'],
        ] as const).map(([panel, label]) => (
          <button key={panel} id={`knowledge-tab-${panel}`} type="button" role="tab" aria-controls={`knowledge-panel-${panel}`} aria-selected={activePanel === panel} onClick={() => setActivePanel(panel)}>
            {label}
          </button>
        ))}
      </div>

      <div className="knowledge-layout" data-active-panel={activePanel}>
        <aside id="knowledge-panel-documents" role="tabpanel" aria-labelledby="knowledge-tab-documents" className="knowledge-documents-panel" aria-label="Published workspace documents">
          <div className="knowledge-panel-heading">
            <div className="knowledge-panel-icon"><FileText size={18} /></div>
            <div><h2>Library</h2><p>{library.length} published {library.length === 1 ? 'document' : 'documents'}</p></div>
          </div>
          {error && <p className="knowledge-error" role="alert">{error}</p>}
          {isLoadingLibrary ? (
            <p className="knowledge-library-empty">Loading the published library…</p>
          ) : library.length === 0 ? (
            access?.can_manage_documents ? (
              <div className="knowledge-library-empty">
                <p>Upload your notes or course PDFs, publish them, then ask questions with sources.</p>
                <Link to="/app/knowledge/manage" className="btn btn-primary knowledge-upload-cta">Upload your first document</Link>
              </div>
            ) : (
              <p className="knowledge-library-empty">Nothing has been published in this workspace yet. Ask the workspace owner to add study material.</p>
            )
          ) : (
            <>
              {documentsByCategory.map(([category, items]) => (
                <section key={category} className="knowledge-category-group">
                  <h3 className="knowledge-category-title">{category} ({items.length})</h3>
                  <ul className="knowledge-document-list">
                    {items.map((document) => (
                      <li key={document.id}>
                        <button
                          type="button"
                          className={`knowledge-document-select${selectedDocument?.id === document.id ? ' is-selected' : ''}`}
                          aria-pressed={selectedDocument?.id === document.id}
                          onClick={() => {
                            setSelectedDocumentId(document.id);
                            setSelectedVersionId(document.version_id);
                            setPreview(null);
                            setActivePanel('preview');
                            setPreviewPage(1);
                          }}
                        >
                          <span className="knowledge-document-category">{document.category}</span>
                          <strong>{document.title}</strong>
                          {document.description && <span className="knowledge-document-description">{document.description}</span>}
                          <small>Version {document.version_number}{document.page_count > 0 ? ` · ${document.page_count} pages` : ''}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <p className="knowledge-library-footnote">Only current, published documents are searchable. Archived or superseded versions are excluded.</p>
            </>
          )}
        </aside>

        <section id="knowledge-panel-preview" role="tabpanel" aria-labelledby="knowledge-tab-preview" className="knowledge-reader-panel" aria-label="Selected document">
          {!selectedDocument ? (
            <div className="knowledge-reader-empty"><BookOpen size={28} /><h2>Select a published document</h2><p>Choose a document from the workspace library to inspect its details.</p></div>
          ) : (
            <>
              <div className="knowledge-reader-heading">
                <div>
                  <span className="knowledge-document-category">{selectedDocument.category}</span>
                  <h2>{selectedDocument.title}</h2>
                  <p>Version {selectedDocument.version_number}{selectedDocument.page_count > 0 ? ` · ${selectedDocument.page_count} pages` : ''}</p>
                </div>
                <button type="button" className="knowledge-reader-download" onClick={() => void downloadSource(selectedDocument.id, previewVersionId, selectedDocument.title)}>
                  <Download size={15} /><span>Download</span>
                </button>
              </div>
              {selectedDocument.description && <p className="knowledge-reader-description">{selectedDocument.description}</p>}
              <div className="knowledge-document-preview" aria-live="polite">
                {!preview || preview.documentId !== selectedDocument.id || preview.versionId !== previewVersionId ? (
                  <p className="knowledge-library-empty">Loading authorized document preview…</p>
                ) : preview.error ? (
                  <div className="knowledge-reader-empty" role="alert"><FileText size={26} /><h3>Preview unavailable</h3><p>{preview.error}</p></div>
                ) : preview.contentType === 'application/pdf' && preview.url ? (
                  <iframe title={`Preview of ${selectedDocument.title}`} src={previewSrc()} />
                ) : preview.contentType?.startsWith('image/') && preview.url ? (
                  <img src={preview.url} alt={`Preview of ${selectedDocument.title}`} />
                ) : (
                  <div className="knowledge-reader-empty"><FileText size={26} /><h3>Document selected</h3><p>This file type is not previewable here. Use Download to view the original file.</p></div>
                )}
              </div>
            </>
          )}
        </section>

        <section id="knowledge-panel-assistant" role="tabpanel" aria-labelledby="knowledge-tab-assistant" className="knowledge-chat-panel" aria-label="Workspace knowledge assistant">
          <div className="knowledge-panel-heading">
            <div className="knowledge-panel-icon"><BookOpen size={19} /></div>
            <div>
              <h2>Ask the library</h2>
              <p>Answers are grounded in the current published collection.</p>
            </div>
          </div>

          <div className="knowledge-right-tabs">
            <button
              type="button"
              className={`knowledge-right-tab${rightTab === 'ask' ? ' is-active' : ''}`}
              onClick={() => setRightTab('ask')}
            >
              Ask
            </button>
            <button
              type="button"
              className={`knowledge-right-tab${rightTab === 'details' ? ' is-active' : ''}`}
              onClick={() => setRightTab('details')}
            >
              Details
            </button>
          </div>

          {rightTab === 'ask' && (
            <>
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
                      {result.insufficient_evidence && (
                        <strong className="knowledge-evidence-warning">Not enough evidence — no published source supports this answer.</strong>
                      )}
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
                              aria-label={`Open cited source ${citation.document_title}`}
                              onClick={() => openCitation(citation.document_id, citation.version_id, citation.page_start)}
                            >
                              Open cited document
                            </button>
                            <button type="button" className="knowledge-source-link" onClick={() => void downloadSource(citation.document_id, citation.version_id, citation.document_title)}>Download cited source</button>
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
                {aiProvider === 'offline'
                  ? 'Questions and source matching run locally against published workspace material.'
                  : aiProvider === 'groq'
                    ? 'Your question and relevant source excerpts are sent to the configured Groq AI service.'
                    : 'Your question and relevant source excerpts are processed by the configured AI service.'}
              </p>
            </>
          )}

          {rightTab === 'details' && selectedDocument && (
            <div className="knowledge-details">
              <h3>Document details</h3>
              <dl className="knowledge-details-list">
                <dt>Title</dt>
                <dd>{selectedDocument.title}</dd>
                <dt>Category</dt>
                <dd>{selectedDocument.category}</dd>
                <dt>Version</dt>
                <dd>{selectedDocument.version_number}</dd>
                <dt>Pages</dt>
                <dd>{selectedDocument.page_count > 0 ? selectedDocument.page_count : 'Not specified'}</dd>
                <dt>Published</dt>
                <dd>{new Date(selectedDocument.published_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</dd>
              </dl>
              {selectedDocument.description && (
                <>
                  <dt>Description</dt>
                  <dd>{selectedDocument.description}</dd>
                </>
              )}
            </div>
          )}
        </section>

      </div>
    </section>
  );
};
