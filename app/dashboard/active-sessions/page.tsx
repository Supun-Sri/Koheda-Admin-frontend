'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ActiveSession {
  _id: string;
  jti: string;
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
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

export default function ActiveSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [endingSession, setEndingSession] = useState<string | null>(null);

  const fetchActiveSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

      const response = await fetch(`${apiUrl}/api/admin/impersonation-sessions/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error);
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
    fetchActiveSessions();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActiveSessions, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const handleForceEnd = async (sessionId: string, vendorEmail: string) => {
    if (!confirm(`Force end impersonation session for ${vendorEmail}?`)) {
      return;
    }

    setEndingSession(sessionId);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

      const response = await fetch(
        `${apiUrl}/api/admin/impersonation-sessions/${sessionId}/end`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('Session ended successfully');
        fetchActiveSessions(); // Refresh list
      } else {
        alert(data.message || 'Failed to end session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    } finally {
      setEndingSession(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  };

  const getDuration = (createdAt: string) => {
    const now = new Date();
    const started = new Date(createdAt);
    const diffMs = now.getTime() - started.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
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
              <span className="text-gray-400">/ Active Sessions</span>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Active Impersonation Sessions</h2>
            <p className="text-gray-400">Monitor and manage active admin impersonation sessions</p>
          </div>
          <button
            onClick={fetchActiveSessions}
            className="px-4 py-2 bg-kohedha-yellow/10 text-kohedha-yellow hover:bg-kohedha-yellow/20 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Active Sessions List */}
        <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-kohedha-yellow">Loading sessions...</div>
            </div>
          ) : sessions.length === 0 ? (
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-400 text-lg">No active impersonation sessions</p>
              <p className="text-gray-600 text-sm mt-2">All sessions have been ended</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-kohedha-light-gray">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Expires In
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kohedha-light-gray">
                  {sessions.map((session) => (
                    <tr key={session._id} className="hover:bg-kohedha-light-gray/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {session.adminId.name || 'Admin'}
                          </div>
                          <div className="text-sm text-gray-400">{session.adminId.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {session.vendorId.companyName || 'Unnamed'}
                          </div>
                          <div className="text-sm text-gray-400">{session.vendorId.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {new Date(session.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-full">
                          {getDuration(session.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-kohedha-yellow/10 text-kohedha-yellow rounded-full">
                          {getTimeRemaining(session.expiresAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleForceEnd(session._id, session.vendorId.email)}
                          disabled={endingSession === session._id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-kohedha-red/10 text-kohedha-red hover:bg-kohedha-red/20 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {endingSession === session._id ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Ending...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Force End
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        {sessions.length > 0 && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-blue-400">
                <p className="font-medium mb-1">About Active Sessions</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300">
                  <li>Sessions automatically expire after 1 hour</li>
                  <li>Force ending a session logs an audit entry</li>
                  <li>Ended sessions can be viewed in audit logs</li>
                  <li>Vendor will see "Session ended" message</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
