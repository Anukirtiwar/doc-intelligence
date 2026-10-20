export interface Document {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  user_id: string;
  status: 'processing' | 'completed' | 'failed';
  page_count?: number;
  summary?: string;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
}

export interface Source {
  document_id: string;
  filename: string;
  page_number: number;
  text: string;
  relevance_score: number;
}