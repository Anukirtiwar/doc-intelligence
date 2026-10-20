import re
import math
from typing import List, Dict
from collections import Counter


STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'as',
    'from', 'into', 'through', 'during', 'before', 'after', 'there',
    'here', 'their', 'our', 'your', 'my', 'me', 'him', 'her', 'them',
    'us', 'if', 'then', 'than', 'so', 'such', 'not', 'no', 'nor'
}


def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences, handling common abbreviations."""
    # Split on period, question mark, exclamation, followed by space or newline
    sentences = re.split(r'(?<=[.!?])\s+', text)
    # Clean and filter
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 20]
    return sentences


def tokenize(text: str) -> List[str]:
    """Extract meaningful words."""
    words = re.findall(r'\b\w+\b', text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


def score_sentences(sentences: List[str]) -> List[Dict]:
    """Score each sentence by importance using word frequency."""
    if not sentences:
        return []

    # Get word frequencies across all sentences
    word_freq = Counter()
    for sentence in sentences:
        word_freq.update(set(tokenize(sentence)))

    total_sentences = len(sentences)

    scored = []
    for i, sentence in enumerate(sentences):
        tokens = tokenize(sentence)
        if not tokens:
            continue

        # Sum of word frequencies (rarer words score higher)
        score = 0.0
        for word in tokens:
            freq = word_freq.get(word, 0)
            if freq > 0:
                # IDF-like scoring
                idf = math.log(total_sentences / freq) + 1
                score += idf

        # Normalize by sentence length
        score = score / (len(tokens) ** 0.5)

        # Boost sentences near the beginning (often contain key info)
        position_boost = 1.0 + (0.3 * (1 - i / total_sentences))
        score *= position_boost

        scored.append({
            'index': i,
            'sentence': sentence,
            'score': round(score, 3)
        })

    return scored


def extract_key_phrases(text: str, top_n: int = 5) -> List[str]:
    """Extract key phrases from the document."""
    # Find capitalized sequences (proper nouns, key terms)
    phrases = re.findall(r'\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+\b', text)

    # Count occurrences
    phrase_counts = Counter(phrases)

    # Also look for common document keywords
    keywords = []
    keyword_patterns = [
        r'\b(?:name|title|date|address|number|id|code|email|phone)\b',
        r'\b(?:university|college|institute|school)\b',
        r'\b(?:bachelor|master|phd|degree|diploma)\b',
    ]

    for pattern in keyword_patterns:
        matches = re.findall(pattern, text.lower())
        keywords.extend(matches)

    # Combine and return most common
    combined = list(phrase_counts.most_common(top_n))
    return [phrase for phrase, count in combined if count > 1 or len(phrase.split()) >= 2]


def generate_extractive_summary(
    text: str,
    num_sentences: int = 5
) -> Dict:
    """
    Generate an extractive summary using TF-IDF scoring.

    Returns a dict with:
    - summary: The summary text
    - key_phrases: Important terms from the document
    - stats: Info about the document
    """
    if not text or not text.strip():
        return {
            'summary': '',
            'key_phrases': [],
            'stats': {'sentences': 0, 'words': 0, 'characters': 0}
        }

    sentences = split_into_sentences(text)
    total_words = len(text.split())

    if len(sentences) <= num_sentences:
        return {
            'summary': text.strip(),
            'key_phrases': extract_key_phrases(text),
            'stats': {
                'sentences': len(sentences),
                'words': total_words,
                'characters': len(text)
            }
        }

    # Score all sentences
    scored = score_sentences(sentences)

    # Pick top N sentences, keep original order
    top_sentences = sorted(scored, key=lambda s: s['score'], reverse=True)[:num_sentences]
    top_sentences = sorted(top_sentences, key=lambda s: s['index'])

    # Build summary
    summary = ' '.join([s['sentence'] for s in top_sentences])

    # Extract key phrases
    key_phrases = extract_key_phrases(text)

    return {
        'summary': summary,
        'key_phrases': key_phrases,
        'stats': {
            'sentences': len(sentences),
            'words': total_words,
            'characters': len(text)
        }
    }