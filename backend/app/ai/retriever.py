"""
Retriever wrapper for StudentOS.

Wraps the existing authorized knowledge retrieval
(``KnowledgeVectorStore.search``) so it can be used as a LangChain-compatible
retriever. SQL-side authorization happens before any chunk is returned; the
retriever never bypasses workspace isolation.
"""

from typing import Any, Dict, List, Optional

import asyncio

from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.knowledge_vector_store import KnowledgeVectorStore


class KnowledgeRetriever(BaseRetriever):
    """
    LangChain-compatible retriever over the existing workspace knowledge
    vector store.

    All access is scoped to a single workspace and respects the published /
    archived status of document versions (enforced by the underlying vector
    store, which queries SQL before returning chunks).
    """

    workspace_id: str
    top_k: int = 5

    def _get_relevant_documents(self, query: str) -> list[Document]:
        """Retrieve the top-k most relevant chunks for the workspace.

        Returns LangChain ``Document`` objects with metadata containing
        ``document_id``, ``version_id``, ``document_title``, ``version_number``,
        ``page_start``, ``page_end``, ``workspace_id`` and ``distance``.
        """
        vector_store = KnowledgeVectorStore()
        try:
            results = vector_store.search(
                query=query,
                workspace_id=self.workspace_id,
                limit=self.top_k,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Workspace knowledge search failed.")
            raise

        documents: list[Document] = []
        for result in results:
            metadata = result.get("metadata") or {}
            documents.append(
                Document(
                    page_content=result.get("content", ""),
                    metadata={
                        "document_id": metadata.get("document_id"),
                        "version_id": metadata.get("version_id"),
                        "document_title": metadata.get("document_title", ""),
                        "version_number": metadata.get("version_number"),
                        "page_start": metadata.get("page_start"),
                        "page_end": metadata.get("page_end"),
                        "workspace_id": metadata.get("workspace_id"),
                        "distance": metadata.get("distance"),
                    },
                )
            )
        return documents

    async def _aget_relevant_documents(self, query: str) -> list[Document]:
        # The underlying vector store is synchronous; run it in a thread to
        # avoid blocking the asyncio event loop.
        return await asyncio.to_thread(self._get_relevant_documents, query)


__all__ = ["KnowledgeRetriever"]
