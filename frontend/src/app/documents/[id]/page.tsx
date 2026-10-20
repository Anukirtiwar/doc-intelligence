'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/common/Layout';
import { ArrowLeft, FileText, MessageSquare, BookOpen, Download, Share2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Sparkles, RefreshCw } from 'lucide-react';

interface DocumentData {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
  status: string;
  page_count: number;
  summary?: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'content' | 'chat' | 'sources'>('summary');

  // Content tab state
  const [content, setContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);

  // Summary tab state
  const [summary, setSummary] = useState<string>('');
  const [keyPhrases, setKeyPhrases] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (!api.auth.isAuthenticated()) {
      router.push('/auth/login');
      return;
    }
    fetchDocument();
  }, [docId, router]);

  // Load content when tab changes
  useEffect(() => {
    if (activeTab === 'content' && !content) {
      fetchContent();
    }
  }, [activeTab]);

  // Load summary when component mounts
  useEffect(() => {
    if (docId) {
      fetchSummary();
    }
  }, [docId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const data = await api.get<DocumentData>(`/api/v1/documents/${docId}`);
      setDoc(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load document');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async () => {
    try {
      setContentLoading(true);
      const data = await api.get<{ content: string; content_length: number }>(
        `/api/v1/documents/${docId}/content`
      );
      setContent(data.content || '');
    } catch (error: any) {
      toast.error(error.message || 'Failed to load content');
    } finally {
      setContentLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const data = await api.get<{
        summary: string;
        has_summary: boolean;
      }>(`/api/v1/documents/${docId}/summary`);

      if (data.has_summary) {
        setSummary(data.summary);
      }
    } catch (error: any) {
      // No summary yet, that's fine
    } finally {
      setSummaryLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      setSummaryLoading(true);
      const data = await api.post<{
        summary: string;
        key_phrases: string[];
      }>(`/api/v1/documents/${docId}/summarize`);

      setSummary(data.summary);
      setKeyPhrases(data.key_phrases || []);
      toast.success('Summary generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/api/v1/documents/${docId}`);
      toast.success('Document deleted');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const handleDownload = async () => {
    if (!doc) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `http://localhost:8000/api/v1/documents/${docId}/download`,
        {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleShare = async () => {
    if (!doc) return;

    const shareUrl = window.location.href;
    const shareText = `Check out this document: ${doc.filename}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: doc.filename,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      const textArea = window.document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      window.document.body.appendChild(textArea);
      textArea.select();
      try {
        window.document.execCommand('copy');
        toast.success('Link copied to clipboard!');
      } catch (e) {
        toast.error('Failed to copy link');
      }
      window.document.body.removeChild(textArea);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!doc) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Document not found</h2>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

    return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Document Header */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center border border-indigo-100 flex-shrink-0">
                <FileText className="w-7 h-7 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 break-words">
                  {doc.filename}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-500">
                  <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>{doc.page_count || 0} pages</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>Uploaded {formatDate(doc.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 self-end sm:self-start">
              <button
                onClick={handleDownload}
                className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleShare}
                className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-2">
            <nav className="flex gap-1 overflow-x-auto">
              {[
                { id: 'summary' as const, label: 'Summary', icon: FileText },
                { id: 'content' as const, label: 'Content', icon: BookOpen },
                { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
                { id: 'sources' as const, label: 'Sources', icon: BookOpen },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6 animate-fade-in">
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {summaryLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                    <p className="text-gray-500 mt-4 text-sm">Generating summary...</p>
                  </div>
                ) : summary ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>AI-generated from document content</span>
                      </div>
                      <button
                        onClick={generateSummary}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Regenerate
                      </button>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                        {summary}
                      </div>
                    </div>

                    {keyPhrases.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Key Terms
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {keyPhrases.map((phrase, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                            >
                              {phrase}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 mb-4">
                      <Sparkles className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Generate AI Summary
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                      Let AI analyze this document and generate a concise summary
                    </p>
                    <Button variant="primary" onClick={generateSummary}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Summary
                    </Button>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-5 mt-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Document Info
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Pages</span>
                      <p className="font-semibold text-gray-900">{doc.page_count || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">File Size</span>
                      <p className="font-semibold text-gray-900">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Type</span>
                      <p className="font-semibold text-gray-900">
                        {doc.file_type.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="font-semibold text-emerald-600">Ready</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                {contentLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                    <p className="text-gray-500 mt-4 text-sm">Loading content...</p>
                  </div>
                ) : content ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">
                          {content.length.toLocaleString()}
                        </span>{' '}
                        characters extracted
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-5 max-h-[500px] overflow-y-auto border border-gray-100">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                        {content}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No content extracted</p>
                    <p className="text-sm text-gray-400 mt-1">
                      This might be a scanned PDF or image-based document
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && <ChatInterface documentId={docId} />}

            {/* Sources Tab */}
            {activeTab === 'sources' && (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No sources yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Chat with the document to see cited sources
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );}