from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import uuid
from app.db.base import get_db
from app.models.user import User
from app.services import gemini_service
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.schemas.document import DocumentListResponse
from app.api.v1.endpoints.auth import get_current_user
from app.utils.text_extraction import extract_text
from app.utils.chunking import chunk_text, estimate_page_number

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = "uploads"


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"Upload attempt by user: {current_user.username}")
    print(f"File: {file.filename}")

    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if file_extension not in ['pdf', 'txt']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PDF and TXT files are supported. Got: {file_extension}"
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Save file
    file_id = str(uuid.uuid4())
    saved_filename = f"{file_id}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    file_size = len(content)
    print(f"File saved: {file_path}, Size: {file_size} bytes")

    # Extract text
    print("Extracting text...")
    extracted_text, page_count = extract_text(file_path, file_extension)
    print(f"Extracted {len(extracted_text)} characters from {page_count} pages")

    # Create document record
    document = Document(
        filename=file.filename,
        file_type=file_extension,
        file_size=file_size,
        storage_path=saved_filename,
        user_id=current_user.id,
        status="completed",
        page_count=page_count,
        content=extracted_text[:100000]
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    print(f"Document created: {document.id}")

    # Create chunks
    print("Creating chunks...")
    chunks_data = chunk_text(extracted_text, chunk_size=1000, chunk_overlap=200)
    print(f"Created {len(chunks_data)} chunks")

    total_chunks = len(chunks_data)
    for chunk_data in chunks_data:
        page_num = estimate_page_number(chunk_data['chunk_index'], total_chunks, page_count)
        chunk = DocumentChunk(
            document_id=document.id,
            chunk_index=chunk_data['chunk_index'],
            content=chunk_data['content'],
            character_count=chunk_data['character_count'],
            page_number=page_num
        )
        db.add(chunk)

    db.commit()
    print(f"Saved {total_chunks} chunks to database")

    return {
        "id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "storage_path": document.storage_path,
        "status": document.status,
        "page_count": document.page_count,
        "chunk_count": total_chunks,
        "summary": document.summary,
        "user_id": document.user_id,
        "created_at": document.created_at,
        "updated_at": document.updated_at
    }


@router.get("/", response_model=DocumentListResponse)
def get_documents(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    documents = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

    total = db.query(Document).filter(Document.user_id == current_user.id).count()

    return {
        "documents": documents,
        "total": total
    }


@router.get("/{document_id}")
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return {
        "id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "storage_path": document.storage_path,
        "status": document.status,
        "page_count": document.page_count,
        "summary": document.summary,
        "user_id": document.user_id,
        "created_at": document.created_at,
        "updated_at": document.updated_at
    }

@router.post("/{document_id}/summarize")
def summarize_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a summary of the document."""
    print(f"Summarize request for document: {document_id}")

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if not document.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no extracted text to summarize"
        )

    summary_text = ""
    key_phrases = []
    stats = {}

    # Try Gemini first
    if gemini_service.is_available():
        print("Using Gemini for summary")
        summary_text = gemini_service.generate_summary(document.content)

    # Fallback to extractive
    if not summary_text:
        print("Using extractive summarizer (fallback)")
        from app.utils.summarizer import generate_extractive_summary
        result = generate_extractive_summary(document.content, num_sentences=5)
        summary_text = result['summary']
        key_phrases = result['key_phrases']
        stats = result['stats']

    # Save summary
    document.summary = summary_text
    db.commit()

    print(f"Summary generated ({len(summary_text)} chars)")

    return {
        "document_id": document_id,
        "summary": summary_text,
        "key_phrases": key_phrases,
        "stats": stats
    }


@router.get("/{document_id}/summary")
def get_document_summary(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the saved summary of a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return {
        "document_id": document.id,
        "summary": document.summary or "",
        "has_summary": bool(document.summary)
    }

@router.get("/{document_id}/content")
def get_document_content(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the extracted text content of a document."""
    print(f"Content request for document: {document_id}")

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return {
        "id": document.id,
        "filename": document.filename,
        "content": document.content or "",
        "page_count": document.page_count or 0,
        "content_length": len(document.content or "")
    }


# ✅ NEW: Chunks endpoint
@router.get("/{document_id}/chunks")
def get_document_chunks(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all chunks for a document."""
    print(f"Chunks request for document: {document_id}")

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document_id
    ).order_by(DocumentChunk.chunk_index).all()

    return {
        "document_id": document_id,
        "chunk_count": len(chunks),
        "chunks": [
            {
                "id": c.id,
                "chunk_index": c.chunk_index,
                "content": c.content,
                "character_count": c.character_count,
                "page_number": c.page_number
            }
            for c in chunks
        ]
    }


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    file_path = os.path.join(UPLOAD_DIR, document.storage_path)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )

    return FileResponse(
        path=file_path,
        filename=document.filename,
        media_type='application/octet-stream'
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"Delete request for document: {document_id}")

        document = db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == current_user.id
        ).first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Delete physical file first
        try:
            file_path = os.path.join(UPLOAD_DIR, document.storage_path)
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Deleted file: {file_path}")
        except Exception as e:
            print(f"Error deleting file: {e}")

        # Delete chunks with raw SQL (bypasses relationship cascade issues)
        from sqlalchemy import text
        db.execute(
            text("DELETE FROM document_chunks WHERE document_id = :doc_id"),
            {"doc_id": document_id}
        )
        db.commit()
        print(f"Deleted chunks for document: {document_id}")

        # Now delete the document
        db.delete(document)
        db.commit()
        print(f"Deleted document: {document_id}")

        return {"message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )