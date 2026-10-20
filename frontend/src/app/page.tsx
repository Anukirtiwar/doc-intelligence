'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4'>
      <div className='max-w-2xl mx-auto text-center'>
        <div className='bg-white rounded-2xl shadow-xl p-12'>
          <div className='text-6xl mb-4'>📄</div>
          <h1 className='text-4xl font-bold text-gray-900 mb-2'>
            AI Document Intelligence
          </h1>
          <p className='text-xl text-gray-600 mb-8'>
            Upload, analyze, and chat with your documents using AI
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              href='/auth/login'
              className='inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium'
            >
              Sign In
            </Link>
            <Link
              href='/auth/register'
              className='inline-block px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium'
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
