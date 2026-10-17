from typing import List, Tuple

import numpy as np
from fastembed import TextEmbedding

from backend.app.core.config import settings

SYNTHETIC_CHUNKS = [
    (
        "synthetic-academic-integrity",
        "Academic integrity policy: Students must cite every source used in coursework and submit original work.",
    ),
    (
        "synthetic-course-registration",
        "Course registration guidance: Students may add or drop courses during the registrar's published add/drop period.",
    ),
    (
        "synthetic-library-hours",
        "Campus library hours: The library is open from 8 AM to 10 PM on weekdays during the term.",
    ),
    (
        "synthetic-counseling",
        "Student counseling services: Book an appointment through the wellness office during business hours.",
    ),
]

SYNTHETIC_QUESTIONS: List[Tuple[str, str]] = [
    ("What are the citation rules for coursework?", "synthetic-academic-integrity"),
    ("How can I change my course registration?", "synthetic-course-registration"),
    ("When is the campus library open?", "synthetic-library-hours"),
    ("How do I make a counseling appointment?", "synthetic-counseling"),
]


def run_evaluation() -> Tuple[float, float]:
    model = TextEmbedding(model_name=settings.KNOWLEDGE_EMBEDDING_MODEL)
    chunk_vectors = np.asarray(
        list(model.embed([content for _, content in SYNTHETIC_CHUNKS])),
        dtype=np.float32,
    )
    question_vectors = np.asarray(
        list(model.embed([question for question, _ in SYNTHETIC_QUESTIONS])),
        dtype=np.float32,
    )
    similarities = question_vectors @ chunk_vectors.T
    norms = np.linalg.norm(question_vectors, axis=1, keepdims=True) * np.linalg.norm(
        chunk_vectors, axis=1
    )
    similarities = similarities / np.maximum(norms, np.finfo(np.float32).tiny)

    reciprocal_ranks = []
    for question_index, (_, expected_id) in enumerate(SYNTHETIC_QUESTIONS):
        ranked_indexes = np.argsort(-similarities[question_index])[:3]
        expected_index = next(
            index for index, (chunk_id, _) in enumerate(SYNTHETIC_CHUNKS) if chunk_id == expected_id
        )
        rank = next(
            (position for position, index in enumerate(ranked_indexes, start=1) if index == expected_index),
            None,
        )
        reciprocal_ranks.append(1 / rank if rank is not None else 0.0)

    recall_at_three = sum(rank > 0 for rank in reciprocal_ranks) / len(SYNTHETIC_QUESTIONS)
    mean_reciprocal_rank = sum(reciprocal_ranks) / len(SYNTHETIC_QUESTIONS)
    return recall_at_three, mean_reciprocal_rank


if __name__ == "__main__":
    recall_at_three, mean_reciprocal_rank = run_evaluation()
    print(
        "Synthetic institute retrieval evaluation "
        f"(n={len(SYNTHETIC_QUESTIONS)}, model={settings.KNOWLEDGE_EMBEDDING_MODEL}): "
        f"Recall@3={recall_at_three:.0%}, MRR={mean_reciprocal_rank:.3f}"
    )
