import os
from typing import Tuple, Optional

def extract_text_from_pdf(file_path: str):
    try:
        import PyPDF2
        text_parts = []
        page_count = 0
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            page_count = len(reader.pages)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        full_text = "\n\n".join(text_parts)
        return full_text, page_count
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return "", 0


def extract_text_from_txt(file_path: str):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        return content, 1
    except Exception as e:
        print(f"Error reading TXT file: {e}")
        return "", 0


def extract_text(file_path: str, file_type: str):
    file_type = file_type.lower()
    if file_type == 'pdf':
        return extract_text_from_pdf(file_path)
    elif file_type == 'txt':
        return extract_text_from_txt(file_path)
    return "", 0