'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminData {
  _id: string;
  email: string;
  name?: string;
  role: string;
}

interface DashboardStats {
  totalVendors: number;
  activeSessions: number;
  totalEvents: number;
  totalMobileUsers: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalVendors: 0,
    activeSessions: 0,
    totalEvents: 0,
    totalMobileUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('admin_token');
    const data = localStorage.getItem('admin_data');

    if (!token || !data) {
      router.push('/login');
      return;
    }

    try {
      setAdminData(JSON.parse(data));
      fetchDashboardStats(token);
    } catch (err) {
      console.error('Error parsing admin data:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchDashboardStats = async (token: string) => {
    setStatsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

      // Use the new consolidated stats endpoint
      const response = await fetch(`${apiUrl}/api/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStats({
            totalVendors: result.data.totalVendors,
            activeSessions: result.data.activeSessions,
            totalEvents: result.data.totalEvents,
            totalMobileUsers: result.data.totalMobileUsers,
          });
        }
      } else {
        // Fallback to individual API calls if stats endpoint doesn't exist
        const [vendorsRes, sessionsRes] = await Promise.all([
          fetch(`${apiUrl}/api/admin/vendors?limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/api/admin/impersonation-sessions/active`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const vendorsData = await vendorsRes.json();
        const sessionsData = await sessionsRes.json();

        setStats({
          totalVendors: vendorsData.pagination?.total || 0,
          activeSessions: sessionsData.data?.length || 0,
          totalEvents: 0,
          totalMobileUsers: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kohedha-dark">
        <div className="text-kohedha-yellow text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kohedha-dark">
      {/* Navigation Bar */}
      <nav className="bg-kohedha-gray border-b border-kohedha-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-extrabold">
                <span className="text-kohedha-yellow">kohedha</span>
                <span className="text-kohedha-red">.</span>
              </h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-300">
                  {adminData?.name || adminData?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">{adminData?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-kohedha-dark bg-kohedha-yellow rounded-lg hover:bg-kohedha-yellow/90 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {adminData?.name || 'Admin'}!
          </h2>
          <p className="text-gray-400">
            Here's what's happening with your platform today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Vendors</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {statsLoading ? '...' : stats.totalVendors}
                </p>
              </div>
              <div className="w-12 h-12 bg-kohedha-yellow/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-kohedha-yellow"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard/active-sessions')}
            className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl p-6 hover:border-kohedha-yellow/50 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Sessions</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {statsLoading ? '...' : stats.activeSessions}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
            </div>
          </button>

          <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Events</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {statsLoading ? '...' : stats.totalEvents}
                </p>
              </div>
              <div className="w-12 h-12 bg-kohedha-yellow/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-kohedha-yellow"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Mobile Users</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {statsLoading ? '...' : stats.totalMobileUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-kohedha-red/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-kohedha-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/vendors')}
              className="flex items-center gap-3 p-4 bg-kohedha-light-gray rounded-lg hover:bg-kohedha-light-gray/70 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-kohedha-yellow/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-kohedha-yellow"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Manage Vendors</p>
                <p className="text-gray-400 text-sm">View and impersonate</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/audit-logs')}
              className="flex items-center gap-3 p-4 bg-kohedha-light-gray rounded-lg hover:bg-kohedha-light-gray/70 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-kohedha-red/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-kohedha-red"
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
              </div>
              <div>
                <p className="text-white font-medium">Audit Logs</p>
                <p className="text-gray-400 text-sm">View activity history</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 bg-kohedha-light-gray rounded-lg hover:bg-kohedha-light-gray/70 transition-colors text-left">
              <div className="w-10 h-10 bg-kohedha-yellow/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-kohedha-yellow"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Settings</p>
                <p className="text-gray-400 text-sm">Manage platform settings</p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
