import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Archive, Download, FilePlus2, Library } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { KnowledgeAccess, KnowledgeDocument } from '../types';
import './KnowledgeAdminPage.css';

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Please check that the StudentOS service is available.';

export const KnowledgeAdminPage: React.FC = () => {
  const [access, setAccess] = useState<KnowledgeAccess | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [file, setFile] = useState<File | null>(null);

  const refresh = useCallback(async () => {
    const currentAccess = await api.getKnowledgeAccess();
    setAccess(currentAccess);
    if (!currentAccess.can_manage_documents) return;
    const currentDocuments = await api.listKnowledgeDocuments();
    setDocuments(currentDocuments);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      try {
        await refresh();
      } catch (loadError) {
        if (isCurrent) setError(errorText(loadError));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    void load();
    return () => { isCurrent = false; };
  }, [refresh]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refresh();
      setNotice(successMessage);
    } catch (actionError) {
      setError(errorText(actionError));
    } finally {
      setIsBusy(false);
    }
  };

  const submitUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Choose a PDF or DOCX file to upload.');
      return;
    }
    await runAction(async () => {
      const form = new FormData();
      form.append('file', file);
      form.append('title', title);
      form.append('description', description);
      form.append('category', category);
      await api.uploadKnowledgeDocument(form);
      setTitle('');
      setDescription('');
      setCategory('General');
      setFile(null);
      const input = document.getElementById('knowledge-upload-file') as HTMLInputElement | null;
      if (input) input.value = '';
    }, 'Document processed. Review its version below and publish it when ready.');
  };

  const uploadReplacement = (documentId: string, replacement: File) =>
    runAction(
      async () => { await api.uploadKnowledgeVersion(documentId, replacement); },
      'Replacement version processed. The current published version remains active until you publish this one.',
    );

  const downloadVersion = async (document: KnowledgeDocument, versionId: string, filename: string) => {
    try {
      const blob = await api.downloadKnowledgeVersion(document.id, versionId);
      const url = URL.createObjectURL(blob);
      const link = documentElement();
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(errorText(downloadError));
    }
  };

  const documentElement = () => window.document.createElement('a');

  if (isLoading) {
    return <div className="knowledge-admin-loading" role="status">Loading document desk…</div>;
  }

  if (!access?.can_manage_documents) {
    return (
      <section className="knowledge-admin-page">
        <header className="knowledge-admin-heading">
          <span>SHARED WORKSPACE</span>
          <h1>Library manager</h1>
          <p>Only a workspace owner or admin can publish shared references.</p>
        </header>
        <div className="knowledge-admin-notice" role="status">
          {error || 'Switch to a workspace you own or administer, or create one from the workspace settings.'}
          {' '}<Link to="/app/workspaces">Manage workspaces</Link>
        </div>
        {error && <div className="knowledge-admin-notice is-error" role="alert">{error}</div>}
      </section>
    );
  }

  return (
    <section className="knowledge-admin-page">
      <header className="knowledge-admin-heading">
        <span>SHARED WORKSPACE</span>
        <h1>Library manager</h1>
        <p>Upload, review, publish, and archive references for this workspace.</p>
      </header>

      {error && <div className="knowledge-admin-notice is-error" role="alert">{error}</div>}
      {notice && <div className="knowledge-admin-notice" role="status">{notice}</div>}

      <div className="knowledge-admin-grid">
        <form className="knowledge-admin-panel knowledge-upload-form" onSubmit={(event) => void submitUpload(event)}>
          <div className="knowledge-admin-section-title">
            <FilePlus2 size={18} />
            <div><h2>Add a document</h2><p>Only PDF and DOCX files are accepted.</p></div>
          </div>
          <label>
            Document title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} required />
          </label>
          <label>
            Category
            <input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} rows={3} />
          </label>
          <label>
            PDF or DOCX file
            <input
              id="knowledge-upload-file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
            />
          </label>
          <p className="knowledge-admin-helper">
            Files are stored privately. New uploads stay unpublished until you review and publish a processed version.
          </p>
          <button className="knowledge-admin-primary" type="submit" disabled={isBusy}>
            {isBusy ? 'Processing…' : 'Upload and process'}
          </button>
        </form>

        <section className="knowledge-admin-panel">
          <div className="knowledge-admin-section-title">
            <Library size={18} />
            <div><h2>Document lifecycle</h2><p>Published versions are searchable by students.</p></div>
          </div>
          {documents.length === 0 ? (
            <p className="knowledge-admin-empty">No shared references have been uploaded yet.</p>
          ) : (
            <div className="knowledge-admin-documents">
              {documents.map((document) => (
                <article className="knowledge-admin-document" key={document.id}>
                  <div className="knowledge-admin-document-heading">
                    <div>
                      <span className={`knowledge-admin-status is-${document.status}`}>{document.status}</span>
                      <h3>{document.title}</h3>
                    </div>
                    <small>{document.category}</small>
                  </div>
                  {document.description && <p className="knowledge-admin-description">{document.description}</p>}
                  <ul className="knowledge-admin-versions">
                    {document.versions.map((version) => (
                      <li key={version.id}>
                        <div>
                          <strong>Version {version.version_number}</strong>
                          <span>{version.original_filename}</span>
                          <small>
                            {version.status}
                            {version.page_count > 0 ? ` · ${version.page_count} pages` : ''}
                          </small>
                          {version.error_message && <small className="knowledge-admin-error-text">{version.error_message}</small>}
                        </div>
                        <div className="knowledge-admin-version-actions">
                          <button
                            type="button"
                            title="Download source file"
                            aria-label={`Download ${version.original_filename}`}
                            onClick={() => void downloadVersion(document, version.id, version.original_filename)}
                          >
                            <Download size={15} />
                          </button>
                          {version.status === 'ready' && document.status !== 'archived' && (
                            <button
                              type="button"
                              className="is-publish"
                              disabled={isBusy}
                              onClick={() => void runAction(
                                async () => { await api.publishKnowledgeVersion(document.id, version.id); },
                                `Version ${version.version_number} is now published.`,
                              )}
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {document.status !== 'archived' && (
                    <div className="knowledge-admin-document-actions">
                      <label className="knowledge-admin-replace">
                        Replace with a new version
                        <input
                          type="file"
                          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          disabled={isBusy}
                          onChange={(event) => {
                            const replacement = event.target.files?.[0];
                            if (replacement) void uploadReplacement(document.id, replacement);
                            event.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="knowledge-admin-archive"
                        disabled={isBusy}
                        onClick={() => {
                          if (window.confirm(`Archive "${document.title}" and remove it from student search?`)) {
                            void runAction(
                              async () => { await api.archiveKnowledgeDocument(document.id); },
                              'Document archived and removed from student search.',
                            );
                          }
                        }}
                      >
                        <Archive size={14} /> Archive
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

    </section>
  );
};
