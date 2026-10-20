from app.db.base import engine, Base
from app.models.user import User
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.models.chat import ChatSession, ChatMessage


def init_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    init_database()