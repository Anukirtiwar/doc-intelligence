'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Layout } from '@/components/common/Layout';
import { DocumentCard, Document } from '@/components/dashboard/DocumentCard';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface DocumentsResponse {
  documents: Document[];
  total: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    completed: 0,
    processing: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (!api.auth.isAuthenticated()) {
      router.push('/auth/login');
      return;
    }
    fetchDocuments();
  }, [router]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get<DocumentsResponse>('/api/v1/documents/');
      const docs = response.documents || [];
      setDocuments(docs);

      const completed = docs.filter((d) => d.status === 'completed').length;
      const processing = docs.filter((d) => d.status === 'processing').length;
      const totalPages = docs.reduce((sum, d) => sum + (d.page_count || 0), 0);

      setStats({
        totalDocuments: docs.length,
        completed,
        processing,
        totalPages,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/api/v1/documents/${id}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const statCards = [
    {
      label: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'from-indigo-500 to-violet-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Processing',
      value: stats.processing,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pages Analyzed',
      value: stats.totalPages,
      icon: TrendingUp,
      color: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50',
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100"></div>
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
            </div>
            <p className="text-gray-500 mt-4 text-sm">Loading your documents...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Overview</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Manage your documents and AI insights
            </p>
          </div>
          <Link href="/documents/upload">
            <Button variant="primary" size="lg" className="shadow-md shadow-indigo-200">
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-soft transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-md group-hover:scale-105 transition-transform',
                      stat.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Documents list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Documents
            </h2>
            {documents.length > 0 && (
              <span className="text-sm text-gray-500">
                {documents.length} {documents.length === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 mb-5">
                <FileText className="w-10 h-10 text-indigo-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No documents yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Upload your first PDF or TXT file and start chatting with it using AI
              </p>
              <Link href="/documents/upload">
                <Button variant="primary" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Your First Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Utility for classnames
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}