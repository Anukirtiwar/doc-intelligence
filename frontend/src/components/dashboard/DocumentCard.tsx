'use client';

import Link from 'next/link';
import { FileText, Clock, CheckCircle, AlertCircle, Trash2, File } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Document {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  uploaded_at?: string;
  created_at?: string;
  status: 'processing' | 'completed' | 'failed';
  page_count?: number;
  summary?: string;
}

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
}

const statusConfig = {
  processing: {
    label: 'Processing',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  completed: {
    label: 'Ready',
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
};

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const status = statusConfig[document.status] || statusConfig.completed;
  const StatusIcon = status.icon;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) onDelete(document.id);
  };

  return (
    <Link href={`/documents/${document.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-soft transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
              {document.filename}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <File className="w-3 h-3" />
                {(document.file_size / 1024 / 1024).toFixed(2)} MB
              </span>
              <span>•</span>
              <span>{document.page_count || 0} pages</span>
              <span>•</span>
              <span>{formatDate(document.created_at || document.uploaded_at)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border',
                status.color
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}