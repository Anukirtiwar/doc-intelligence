import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = None
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        print("✅ Gemini client initialized")
    except Exception as e:
        print(f"⚠️ Failed to initialize Gemini: {e}")
else:
    print("⚠️ GEMINI_API_KEY not found — using fallback")


GEMINI_MODEL = "gemini-3.5-flash-lite"


def is_available() -> bool:
    return client is not None


def generate_summary(text: str, max_chars: int = 30000) -> str:
    if not client:
        return ""

    try:
        truncated = text[:max_chars]
        prompt = f"""Please provide a concise, well-structured summary of the following document.

Focus on:
- The main purpose or topic
- Key information (names, dates, numbers, IDs)
- Important details or conclusions

Keep it clear and professional.

Document:
{truncated}

Summary:"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        return response.text.strip()

    except Exception as e:
        print(f"Gemini summary error: {e}")
        return ""


def answer_question(question: str, context_chunks: list) -> str:
    """Answer a question using retrieved context chunks."""
    if not client:
        return ""

    try:
        context = "\n\n---\n\n".join([
            f"[Chunk {c.get('chunk_index', 0) + 1}, Page {c.get('page_number', 1)}]\n{c['content']}"
            for c in context_chunks
        ])

        prompt = f"""You are a helpful assistant answering questions about a document.

Instructions:
1. Use ONLY the information in the context below to answer the question.
2. If the answer is not directly in the context, try to INFER it from related information.
   Example: If asked "what is the exam name?" and the context mentions "GATE 2027 examination", 
   answer with "GATE 2027" and note that the document refers to it that way.
3. Only say "I couldn't find that information in the document" if truly nothing related exists.
4. Be concise. Cite the chunk/page when possible.

Context:
{context}

Question: {question}

Answer:"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        return response.text.strip()

    except Exception as e:
        print(f"Gemini answer error: {e}")
        return ""