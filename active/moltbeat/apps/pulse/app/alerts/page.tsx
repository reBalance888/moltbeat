'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function AlertsPage() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined>();
  const [readFilter, setReadFilter] = useState<boolean | undefined>(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', page, severityFilter, readFilter],
    queryFn: () =>
      api.getAlerts({
        page,
        limit: 20,
        severity: severityFilter,
        read: readFilter,
        sortBy: 'createdAt',
        order: 'desc',
      }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={severityFilter || ''}
            onChange={(e) => setSeverityFilter(e.target.value as any || undefined)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Severity</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={readFilter === undefined ? '' : readFilter.toString()}
            onChange={(e) => {
              const value = e.target.value;
              setReadFilter(value === '' ? undefined : value === 'true');
            }}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-white rounded-lg shadow animate-pulse"></div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No alerts found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {data?.data.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                    alert.severity === 'CRITICAL'
                      ? 'border-red-500'
                      : alert.severity === 'HIGH'
                      ? 'border-orange-500'
                      : alert.severity === 'MEDIUM'
                      ? 'border-yellow-500'
                      : 'border-blue-500'
                  } ${alert.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : alert.severity === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : alert.severity === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-sm text-gray-600">{alert.type}</span>
                        {alert.read && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            Read
                          </span>
                        )}
                      </div>

                      <p className="text-lg">{alert.message}</p>

                      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer">
                            Show details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(alert.metadata, null, 2)}
                          </pre>
                        </details>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {!alert.read && (
                      <button
                        onClick={() => markAsReadMutation.mutate(alert.id)}
                        className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!data.pagination.hasPrev}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.pagination.hasNext}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
