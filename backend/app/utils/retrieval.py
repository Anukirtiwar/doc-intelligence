from typing import List, Dict
import re
import math
from collections import Counter


# Common English stopwords to ignore
STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'as',
    'from', 'into', 'through', 'during', 'before', 'after', 'is', 'am',
    'there', 'here', 'their', 'our', 'your', 'my', 'me', 'him', 'her',
    'them', 'us', 'if', 'then', 'than', 'so', 'such', 'not', 'no', 'nor'
}


def tokenize(text: str) -> List[str]:
    """Extract meaningful words from text."""
    words = re.findall(r'\b\w+\b', text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


def get_word_frequencies(chunks: List[Dict]) -> Dict[str, int]:
    """Calculate how often each word appears across all chunks."""
    freq = Counter()
    for chunk in chunks:
        freq.update(set(tokenize(chunk['content'])))
    return dict(freq)


def compute_idf(word: str, word_freq: Dict[str, int], total_docs: int) -> float:
    """Inverse Document Frequency — rare words score higher."""
    doc_count = word_freq.get(word, 0)
    if doc_count == 0:
        return 0
    return math.log(total_docs / doc_count) + 1


def find_relevant_chunks(
    question: str,
    chunks: List[Dict],
    top_k: int = 3,
    min_score: float = 0.0
) -> List[Dict]:
    """
    Find the most relevant chunks for a question using improved keyword matching.

    Improvements over basic matching:
    - TF-IDF scoring (rare words count more)
    - Phrase matching boost
    - Proximity scoring (matched words close together score higher)
    - Length normalization
    """
    if not chunks:
        return []

    question_tokens = tokenize(question)
    if not question_tokens:
        return chunks[:top_k]

    # Build word frequency map for IDF
    word_freq = get_word_frequencies(chunks)
    total_docs = len(chunks)

    # Lowercase question for phrase matching
    question_lower = question.lower()
    # Extract meaningful phrases (2-3 word sequences)
    phrases = []
    question_words = re.findall(r'\b\w+\b', question_lower)
    for i in range(len(question_words) - 1):
        phrases.append(' '.join(question_words[i:i + 2]))
        if i < len(question_words) - 2:
            phrases.append(' '.join(question_words[i:i + 3]))

    scored_chunks = []

    for chunk in chunks:
        chunk_content = chunk['content']
        chunk_lower = chunk_content.lower()
        chunk_tokens = tokenize(chunk_content)
        chunk_token_set = set(chunk_tokens)

        if not chunk_tokens:
            continue

        # 1. TF-IDF Score
        score = 0.0
        matched_keywords = []
        for token in question_tokens:
            if token in chunk_token_set:
                # TF: how often the word appears in this chunk
                tf = chunk_tokens.count(token)
                # IDF: how rare the word is across all chunks
                idf = compute_idf(token, word_freq, total_docs)
                score += tf * idf
                matched_keywords.append(token)

        # 2. Phrase matching boost
        for phrase in phrases:
            if phrase in chunk_lower:
                score += 5.0  # strong boost for exact phrase
                matched_keywords.append(phrase)

        # 3. Length normalization (avoid favoring long chunks)
        score = score / (1 + math.log(len(chunk_tokens) + 1))

        if score > 0:
            scored_chunks.append({
                **chunk,
                'score': round(score, 3),
                'matched_keywords': list(set(matched_keywords))
            })

    # Sort by score descending
    scored_chunks.sort(key=lambda c: c['score'], reverse=True)

    # Filter by minimum score
    filtered = [c for c in scored_chunks if c['score'] >= min_score]

    # Return top K
    return filtered[:top_k]


def generate_fake_response(question: str, relevant_chunks: List[Dict]) -> str:
    """
    Generate a clean, readable response from the retrieved chunks.
    """
    if not relevant_chunks:
        return (
            f"I couldn't find specific information about \"{question}\" in this document. "
            "Try rephrasing your question with different keywords."
        )

    # Build a cleaner response
    response_parts = []

    # Header
    response_parts.append(f"**Answer regarding:** {question}\n")

    # Top match gets special attention
    top = relevant_chunks[0]
    top_keywords = top.get('matched_keywords', [])

    if top.get('score', 0) > 5:
        response_parts.append(
            f"**Most relevant section** (page {top.get('page_number', 1)}, "
            f"relevance score: {top['score']}):\n"
        )
    else:
        response_parts.append(
            f"**Relevant section** (page {top.get('page_number', 1)}):\n"
        )

    # Show top chunk content
    content = top['content'].strip()
    if len(content) > 600:
        content = content[:600] + "..."
    response_parts.append(content)

    # Show additional chunks if relevant
    if len(relevant_chunks) > 1:
        response_parts.append("\n\n**Additional context:**\n")
        for chunk in relevant_chunks[1:]:
            snippet = chunk['content'][:200].strip()
            if len(chunk['content']) > 200:
                snippet += "..."
            response_parts.append(
                f"\n• Page {chunk.get('page_number', 1)}: {snippet}"
            )

    # Add matched keywords info
    if top_keywords:
        response_parts.append(
            f"\n\n_Matched keywords: {', '.join(top_keywords[:5])}_"
        )

    return "\n".join(response_parts)