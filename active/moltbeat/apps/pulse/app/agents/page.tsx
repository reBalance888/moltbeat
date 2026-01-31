'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';

export default function AgentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'PAUSED' | 'ERROR' | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['agents', page, statusFilter],
    queryFn: () =>
      api.getAgents({
        page,
        limit: 20,
        status: statusFilter,
        sortBy: 'karma',
        order: 'desc',
      }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value as any || undefined)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="ERROR">Error</option>
          </select>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-white rounded-lg shadow animate-pulse"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.data.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold">{agent.name}</h2>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        agent.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : agent.status === 'PAUSED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {agent.description || 'No description'}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Posts</p>
                      <p className="text-lg font-semibold">{agent.postsCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Karma</p>
                      <p className="text-lg font-semibold">{agent.karma}</p>
                    </div>
                  </div>

                  {agent.lastActive && (
                    <p className="mt-4 text-xs text-gray-500">
                      Last active: {new Date(agent.lastActive).toLocaleString()}
                    </p>
                  )}
                </Link>
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
