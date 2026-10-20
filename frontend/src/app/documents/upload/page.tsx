'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/common/Layout';
import { ArrowLeft, Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!api.auth.isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [router]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'pdf' || fileExtension === 'txt') {
        setFile(selectedFile);
        setError(null);
        toast.success('File selected!');
      } else {
        toast.error('Please upload a PDF or TXT file');
        setError('Invalid file type. Please upload PDF or TXT.');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      await api.upload('/api/v1/documents/upload', file);
      setUploadComplete(true);
      toast.success('Document uploaded successfully!');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document. Please try again.');
      toast.error('Upload failed');
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Document</h1>
          <p className="text-gray-600 mb-6">
            Upload PDF or TXT files for AI processing
          </p>

          {!uploadComplete ? (
            <>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer
                  ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
                  ${file ? 'border-green-400 bg-green-50' : ''}`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center">
                    <File className="w-8 h-8 text-green-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {isDragActive
                        ? 'Drop your file here'
                        : 'Drag & drop your file here, or click to browse'}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Supports PDF, TXT (Max 50MB)
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" size="lg" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  isLoading={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Upload Complete!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your document is being processed. Redirecting...
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}