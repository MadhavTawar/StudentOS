from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from fastapi import HTTPException, status

from backend.app.core.config import settings
from backend.app.core.logging import logger


@lru_cache(maxsize=4)
def _embedding_model(model_name: str):
    try:
        from fastembed import TextEmbedding
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local workspace embeddings are unavailable. Install backend requirements and restart.",
        ) from exc

    try:
        return TextEmbedding(model_name=model_name)
    except Exception as exc:
        logger.exception("Could not initialize the configured local workspace embedding model.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The configured local embedding model is unavailable.",
        ) from exc


class KnowledgeVectorStore:
    def __init__(self) -> None:
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The workspace vector store is unavailable. Install backend requirements and restart.",
            ) from exc

        path = Path(settings.KNOWLEDGE_VECTOR_DIR).expanduser().resolve()
        try:
            path.mkdir(parents=True, exist_ok=True)
            client = chromadb.PersistentClient(
                path=str(path),
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self.collection = client.get_or_create_collection(
                name="studentos_institute_knowledge",
                metadata={"hnsw:space": "cosine"},
                embedding_function=None,
            )
        except Exception as exc:
            logger.exception("Could not initialize the local workspace vector store.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The local workspace vector store could not be opened.",
            ) from exc

    @staticmethod
    def _embed(texts: List[str]) -> List[List[float]]:
        model = _embedding_model(settings.KNOWLEDGE_EMBEDDING_MODEL)
        try:
            return [vector.tolist() for vector in model.embed(texts)]
        except Exception as exc:
            logger.exception("Local workspace embedding failed.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Local document embedding failed. The document was not published.",
            ) from exc

    def upsert_chunks(
        self,
        chunks: List[Dict[str, Any]],
        *,
        document_id: str,
        version_id: str,
        workspace_id: str,
        status_value: str,
    ) -> None:
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="The document did not produce any searchable text.",
            )
        try:
            embeddings = np.asarray(
                self._embed([chunk["content"] for chunk in chunks]),
                dtype=np.float32,
            )
            self.collection.upsert(
                ids=[chunk["id"] for chunk in chunks],
                documents=[chunk["content"] for chunk in chunks],
                embeddings=embeddings,
                metadatas=[
                    {
                        "document_id": document_id,
                        "version_id": version_id,
                        "workspace_id": workspace_id,
                        "page_start": chunk["page_start"] or 0,
                        "page_end": chunk["page_end"] or 0,
                        "status": status_value,
                    }
                    for chunk in chunks
                ],
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Could not index workspace document chunks.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The document could not be indexed locally and remains unpublished.",
            ) from exc

    def set_version_status(self, version_id: str, status_value: str) -> None:
        try:
            result = self.collection.get(
                where={"version_id": version_id},
                include=["metadatas"],
            )
            ids = result.get("ids") or []
            metadatas = result.get("metadatas") or []
            if ids:
                self.collection.update(
                    ids=ids,
                    metadatas=[
                        {**metadata, "status": status_value}
                        for metadata in metadatas
                    ],
                )
        except Exception as exc:
            logger.exception("Could not update workspace vector lifecycle metadata.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The local search index could not be updated.",
            ) from exc

    def set_version_workspace(self, version_id: str, workspace_id: str) -> None:
        try:
            result = self.collection.get(
                where={"version_id": version_id},
                include=["metadatas"],
            )
            ids = result.get("ids") or []
            metadatas = result.get("metadatas") or []
            if ids:
                self.collection.update(
                    ids=ids,
                    metadatas=[{**metadata, "workspace_id": workspace_id} for metadata in metadatas],
                )
        except Exception as exc:
            logger.exception("Could not migrate workspace ownership in the local knowledge index.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The local search index could not be migrated to workspace isolation.",
            ) from exc

    def search(self, query: str, workspace_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            query_embedding = self._embed([query])[0]
            result = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=limit,
                where={"$and": [{"status": "published"}, {"workspace_id": workspace_id}]},
                include=["distances", "metadatas", "documents"],
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Workspace knowledge search failed.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Workspace knowledge search is temporarily unavailable.",
            ) from exc

        ids_by_query = result.get("ids") or []
        metadatas_by_query = result.get("metadatas") or []
        documents_by_query = result.get("documents") or []
        distances_by_query = result.get("distances") or []
        ids = ids_by_query[0] if ids_by_query else []
        metadatas = metadatas_by_query[0] if metadatas_by_query else []
        documents = documents_by_query[0] if documents_by_query else []
        distances = distances_by_query[0] if distances_by_query else []
        return [
            {
                "id": chunk_id,
                "metadata": metadata or {},
                "content": content or "",
                "distance": distance,
            }
            for chunk_id, metadata, content, distance in zip(ids, metadatas, documents, distances)
        ]
