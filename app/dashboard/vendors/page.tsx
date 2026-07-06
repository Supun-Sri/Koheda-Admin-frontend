'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Vendor {
  _id: string;
  email: string;
  companyName?: string;
  businessCategory?: string;
  vendorMobile?: string;
  isProfileComplete: boolean;
  registrationStep: number;
  createdAt: string;
  location?: {
    city?: string;
    district?: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
}

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [impersonating, setImpersonating] = useState(false);

  const fetchVendors = async (page: number = 1, search: string = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`${apiUrl}/api/admin/vendors?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setVendors(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
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
    fetchVendors();
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors(1, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    fetchVendors(newPage, searchTerm);
  };

  const openImpersonateModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowImpersonateModal(true);
    setImpersonateReason('');
  };

  const handleImpersonate = async () => {
    if (!selectedVendor) return;

    setImpersonating(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

      const response = await fetch(
        `${apiUrl}/api/admin/vendors/${selectedVendor._id}/impersonate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include', // ✅ Important: Allow cookies to be set
          body: JSON.stringify({
            reason: impersonateReason || 'Admin support',
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setShowImpersonateModal(false);
        
        // ✅ SECURE: Cookie is already set by backend
        // Simply open the vendor dashboard - no token in URL!
        const vendorUrl = process.env.NEXT_PUBLIC_VENDOR_URL || 'http://localhost:3001';
        window.open(`${vendorUrl}/dashboard`, '_blank');
        
        // Show success message
        alert(`Impersonation session started for ${selectedVendor.email}\nOpening vendor dashboard...`);
      } else {
        alert(data.message || 'Failed to start impersonation');
      }
    } catch (error) {
      console.error('Error starting impersonation:', error);
      alert('Failed to start impersonation session');
    } finally {
      setImpersonating(false);
    }
  };

  const getStatusBadge = (vendor: Vendor) => {
    if (vendor.isProfileComplete) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
          Complete
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-500 rounded-full">
        Step {vendor.registrationStep}/3
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
              <span className="text-gray-400">/ Vendors</span>
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
          <h2 className="text-3xl font-bold text-white mb-2">Vendor Management</h2>
          <p className="text-gray-400">Manage and impersonate vendor accounts</p>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="md:col-span-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by email or company name..."
                className="flex-1 px-4 py-3 bg-kohedha-light-gray border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kohedha-yellow focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-kohedha-yellow text-kohedha-dark font-bold rounded-lg hover:bg-kohedha-yellow/90 transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Vendors</p>
              <p className="text-2xl font-bold text-white mt-1">{pagination.total}</p>
            </div>
            <div className="w-10 h-10 bg-kohedha-yellow/10 rounded-lg flex items-center justify-center">
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
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-kohedha-yellow">Loading vendors...</div>
            </div>
          ) : vendors.length === 0 ? (
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
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-gray-400 text-lg">No vendors found</p>
              <p className="text-gray-600 text-sm mt-2">
                {searchTerm ? 'Try a different search term' : 'No vendors registered yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-kohedha-light-gray">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Company / Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kohedha-light-gray">
                    {vendors.map((vendor) => (
                      <tr key={vendor._id} className="hover:bg-kohedha-light-gray/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {vendor.companyName || 'Unnamed Company'}
                            </div>
                            <div className="text-sm text-gray-400">{vendor.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
                            {vendor.businessCategory || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
                            {vendor.location?.city || '-'}
                            {vendor.location?.district && `, ${vendor.location.district}`}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(vendor)}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-400">
                            {new Date(vendor.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openImpersonateModal(vendor)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-kohedha-yellow/10 text-kohedha-yellow hover:bg-kohedha-yellow/20 rounded-lg font-medium text-sm transition-colors"
                          >
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            Impersonate
                          </button>
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
                    {pagination.total} vendors
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

      {/* Impersonate Modal */}
      {showImpersonateModal && selectedVendor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-kohedha-gray border border-kohedha-light-gray rounded-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-white mb-4">
              Impersonate Vendor
            </h3>
            <div className="mb-6">
              <div className="bg-kohedha-light-gray rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-400 mb-2">Vendor:</p>
                <p className="text-white font-medium">
                  {selectedVendor.companyName || 'Unnamed Company'}
                </p>
                <p className="text-gray-400 text-sm">{selectedVendor.email}</p>
              </div>

              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
                placeholder="e.g., Customer support, Debug issue"
                className="w-full px-4 py-3 bg-kohedha-light-gray border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kohedha-yellow focus:border-transparent resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-2">
                This action will be logged in the audit trail
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowImpersonateModal(false)}
                disabled={impersonating}
                className="flex-1 px-4 py-3 bg-kohedha-light-gray text-white rounded-lg hover:bg-kohedha-light-gray/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleImpersonate}
                disabled={impersonating}
                className="flex-1 px-4 py-3 bg-kohedha-yellow text-kohedha-dark font-bold rounded-lg hover:bg-kohedha-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {impersonating ? 'Starting...' : 'Start Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
