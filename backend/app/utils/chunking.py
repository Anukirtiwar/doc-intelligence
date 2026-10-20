from typing import List, Dict


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> List[Dict]:
    """
    Split text into overlapping chunks.
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    chunks = []
    start = 0
    text_length = len(text)
    chunk_index = 0

    while start < text_length:
        end = min(start + chunk_size, text_length)

        if end < text_length:
            search_start = start + int(chunk_size * 0.7)
            search_region = text[search_start:end]

            best_break = -1
            for separator in ['\n\n', '\n', '. ', '! ', '? ', ' ']:
                idx = search_region.rfind(separator)
                if idx != -1:
                    best_break = search_start + idx + len(separator)
                    break

            if best_break > start:
                end = best_break

        chunk_content = text[start:end].strip()

        if chunk_content:
            chunks.append({
                'content': chunk_content,
                'chunk_index': chunk_index,
                'character_count': len(chunk_content)
            })
            chunk_index += 1

        new_start = end - chunk_overlap
        if new_start <= start:
            new_start = start + 1
        start = new_start

        if chunk_index > 10000:
            break

    return chunks


def estimate_page_number(chunk_index: int, total_chunks: int, total_pages: int) -> int:
    """Estimate which page a chunk came from."""
    if total_chunks == 0 or total_pages == 0:
        return 1
    page = int((chunk_index / total_chunks) * total_pages) + 1
    return min(page, total_pages)