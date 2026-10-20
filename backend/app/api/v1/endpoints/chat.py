from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json
from app.db.base import get_db
from app.models.user import User
from app.models.document import Document
from app.services import gemini_service
from app.models.chunk import DocumentChunk
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import (
    ChatMessageRequest,
    ChatSessionResponse,
    ChatSessionWithMessages,
    ChatResponse,
    ChatMessageResponse
)
from app.api.v1.endpoints.auth import get_current_user
from app.utils.retrieval import find_relevant_chunks, generate_fake_response

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/send", response_model=ChatResponse)
def send_message(
    request: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a message and get a response.

    If session_id is provided, use that session.
    Otherwise, create a new session for the user's first document.
    """
    print(f"Chat message from {current_user.username}: {request.message}")

    # Get or create session
    if request.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == request.session_id,
            ChatSession.user_id == current_user.id
        ).first()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
    else:
        # Create new session — use first completed document
        document = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.status == "completed"
        ).first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No documents found. Please upload a document first."
            )

        session = ChatSession(
            document_id=document.id,
            user_id=current_user.id,
            title=f"Chat about {document.filename}"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Save user message
    user_message = ChatMessage(
        session_id=session.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    db.commit()

    # Get all chunks for the document
    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == session.document_id
    ).order_by(DocumentChunk.chunk_index).all()

    chunk_dicts = [
        {
            'id': c.id,
            'content': c.content,
            'chunk_index': c.chunk_index,
            'page_number': c.page_number or 1
        }
        for c in chunks
    ]

    # Find relevant chunks
    relevant = find_relevant_chunks(request.message, chunk_dicts, top_k=3)
    print(f"Found {len(relevant)} relevant chunks")

    # Generate response (fake AI for now)
    # Try Gemini first, fall back to fake AI
    response_text = ""

    if gemini_service.is_available():
        print("Using Gemini for response")
        response_text = gemini_service.answer_question(request.message, relevant)

    if not response_text:
        print("Using fake AI (fallback)")
        response_text = generate_fake_response(request.message, relevant)

    # Save sources as JSON
    sources_json = json.dumps([
        {
            'chunk_id': c['id'],
            'chunk_index': c['chunk_index'],
            'page_number': c.get('page_number', 1),
            'score': c.get('score', 0),
            'preview': c['content'][:200]
        }
        for c in relevant
    ])

    # Save assistant message
    assistant_message = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=response_text,
        sources=sources_json
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)

    return {
        "session_id": session.id,
        "message": {
            "id": assistant_message.id,
            "role": assistant_message.role,
            "content": assistant_message.content,
            "sources": assistant_message.sources,
            "created_at": assistant_message.created_at
        }
    }


@router.get("/sessions/{session_id}", response_model=ChatSessionWithMessages)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a chat session with all its messages."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).all()

    return {
        "id": session.id,
        "document_id": session.document_id,
        "user_id": session.user_id,
        "title": session.title,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": m.sources,
                "created_at": m.created_at
            }
            for m in messages
        ],
        "created_at": session.created_at,
        "updated_at": session.updated_at
    }


@router.get("/sessions/document/{document_id}")
def get_document_sessions(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all chat sessions for a document."""
    sessions = db.query(ChatSession).filter(
        ChatSession.document_id == document_id,
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.created_at.desc()).all()

    return [
        {
            "id": s.id,
            "document_id": s.document_id,
            "user_id": s.user_id,
            "title": s.title,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for s in sessions
    ]

@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    db.delete(session)
    db.commit()

    return {"message": "Chat session deleted"}