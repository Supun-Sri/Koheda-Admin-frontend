'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuditLog {
  _id: string;
  adminId: {
    _id: string;
    name?: string;
    email: string;
  };
  vendorId: {
    _id: string;
    email: string;
    companyName?: string;
  };
  action: string;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: any;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
  });
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = async (page: number = 1, action: string = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(action && { action }),
      });

      const response = await fetch(`${apiUrl}/api/admin/audit-logs?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchLogs();
  }, [router]);

  const handleFilterChange = (action: string) => {
    setFilterAction(action);
    fetchLogs(1, action);
  };

  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage, filterAction);
  };

  const getActionBadge = (action: string) => {
    if (action === 'impersonation.start') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-kohedha-yellow/10 text-kohedha-yellow rounded-full">
          Session Start
        </span>
      );
    }
    if (action === 'impersonation.end') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
          Session End
        </span>
      );
    }
    if (action === 'request') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-full">
          Action
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-500/10 text-gray-400 rounded-full">
        {action}
      </span>
    );
  };

  const getStatusBadge = (statusCode?: number) => {
    if (!statusCode) return null;
    
    if (statusCode >= 200 && statusCode < 300) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
          {statusCode}
        </span>
      );
    }
    if (statusCode >= 400) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-kohedha-red/10 text-kohedha-red rounded-full">
          {statusCode}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-500/10 text-gray-400 rounded-full">
        {statusCode}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-kohedha-dark">
      {/* Navigation Bar */}
      <nav className="bg-kohedha-gray border-b border-kohedha-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-2xl font-extrabold"
              >
                <span className="text-kohedha-yellow">kohedha</span>
                <span className="text-kohedha-red">.</span>
              </button>
              <span className="text-gray-400">/ Audit Logs</span>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Audit Logs</h2>
          <p className="text-gray-400">Track all admin impersonation activities</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => handleFilterChange('')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterAction === ''
                ? 'bg-kohedha-yellow text-kohedha-dark'
                : 'bg-kohedha-light-gray text-gray-300 hover:bg-kohedha-light-gray/70'
            }`}
          >
            All Actions
          </button>
          <button
            onClick={() => handleFilterChange('impersonation.start')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterAction === 'impersonation.start'
                ? 'bg-kohedha-yellow text-kohedha-dark'
                : 'bg-kohedha-light-gray text-gray-300 hover:bg-kohedha-light-gray/70'
            }`}
          >
            Session Starts
          </button>
          <button
            onClick={() => handleFilterChange('impersonation.end')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterAction === 'impersonation.end'
                ? 'bg-kohedha-yellow text-kohedha-dark'
                : 'bg-kohedha-light-gray text-gray-300 hover:bg-kohedha-light-gray/70'
            }`}
          >
            Session Ends
          </button>
          <button
            onClick={() => handleFilterChange('request')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterAction === 'request'
                ? 'bg-kohedha-yellow text-kohedha-dark'
                : 'bg-kohedha-light-gray text-gray-300 hover:bg-kohedha-light-gray/70'
            }`}
          >
            Actions
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-kohedha-yellow">Loading logs...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                className="w-16 h-16 text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-400 text-lg">No audit logs found</p>
              <p className="text-gray-600 text-sm mt-2">
                {filterAction ? 'Try a different filter' : 'No activities recorded yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-kohedha-light-gray">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kohedha-light-gray">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-kohedha-light-gray/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {log.adminId.name || 'Admin'}
                            </div>
                            <div className="text-sm text-gray-400">{log.adminId.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {log.vendorId.companyName || 'Unnamed'}
                            </div>
                            <div className="text-sm text-gray-400">{log.vendorId.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm space-y-1">
                            {log.method && log.path && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-kohedha-yellow">
                                  {log.method}
                                </span>
                                <span className="text-gray-400 font-mono text-xs">
                                  {log.path}
                                </span>
                                {getStatusBadge(log.statusCode)}
                              </div>
                            )}
                            {log.metadata && (
                              <div className="text-gray-500 text-xs">
                                {JSON.stringify(log.metadata)}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="px-6 py-4 border-t border-kohedha-light-gray flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} logs
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 bg-kohedha-light-gray text-white rounded-lg hover:bg-kohedha-light-gray/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={
                        pagination.page >= Math.ceil(pagination.total / pagination.limit)
                      }
                      className="px-4 py-2 bg-kohedha-light-gray text-white rounded-lg hover:bg-kohedha-light-gray/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
