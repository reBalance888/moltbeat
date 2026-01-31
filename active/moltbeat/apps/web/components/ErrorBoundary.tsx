'use client';

import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ErrorBoundary({ fallback }: ErrorBoundaryProps) {
  return (
    <div className="card p-6 border-l-4 border-red-500 bg-red-50">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {fallback || (
            <>
              <h3 className="text-lg font-semibold text-red-900">Something went wrong</h3>
              <p className="text-sm text-red-700 mt-1">
                Unable to load data. Please try refreshing the page.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
