import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  ArrowLeft,
  Mail,
  Users,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import '../styles/AdminSubscription.css';

export default function AdminSubscription() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (await verifyAdmin()) {
        await fetchSubscriptions();
      }
    })();
  }, []);

  // Verify admin session and role
  const verifyAdmin = async () => {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      navigate('/login');
      return false;
    }
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (profileErr || profile.role !== 'admin') {
      navigate('/');
      return false;
    }
    return true;
  };

  // Load subscription records
  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSubscriptions(data || []);
    setLoading(false);
  };

  // Delete single subscription
  const handleDelete = async (id) => {
    setDeletingId(id);
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .delete()
      .eq('id', id);
    if (!error) {
      setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
    }
    setDeletingId(null);
    setShowDeleteModal(false);
  };

  // Bulk delete selected subscriptions
  const handleBulkDelete = async () => {
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .delete()
      .in('id', selectedIds);
    if (!error) {
      setSubscriptions((prev) => prev.filter((sub) => !selectedIds.includes(sub.id)));
      setSelectedIds([]);
    }
  };

  // Export filtered subscriptions to CSV
  const exportToCSV = () => {
    const rows = [
      ['Email', 'Subscription Date'],
      ...filtered.map((sub) => [
        sub.email,
        new Date(sub.created_at).toLocaleDateString()
      ])
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Refresh list
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptions();
    setRefreshing(false);
  };

  // Memoized filtered list
  const filtered = useMemo(() => {
    let list = subscriptions;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((s) => s.email.toLowerCase().includes(term));
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateFilter === '7days') cutoff.setDate(now.getDate() - 7);
      if (dateFilter === '30days') cutoff.setDate(now.getDate() - 30);
      if (dateFilter === '90days') cutoff.setDate(now.getDate() - 90);
      list = list.filter((s) => new Date(s.created_at) >= cutoff);
    }
    return list;
  }, [subscriptions, searchTerm, dateFilter]);

  // Memoized growth rate calculation
  const growthRate = useMemo(() => {
    const now = new Date();
    const lastMonthCount = subscriptions.filter((s) => {
      const d = new Date(s.created_at);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    }).length;
    const thisMonthCount = subscriptions.filter((s) => {
      const d = new Date(s.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return lastMonthCount > 0
      ? `${(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100).toFixed(1)}%`
      : '—';
  }, [subscriptions]);

  // Selection handlers
  const toggleSelectAll = (checked) => {
    if (checked) setSelectedIds(filtered.map((s) => s.id));
    else setSelectedIds([]);
  };
  const toggleSelectOne = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Newsletter Subscribers</h1>
          </div>
          <button
            onClick={() => navigate('/admin-landing')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Subscribers</p>
              <p className="text-xl font-semibold text-gray-900">{subscriptions.length}</p>
            </div>
            <Users className="h-6 w-6 text-gray-600" />
          </div>
          <div className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-xl font-semibold text-gray-900">
                {
                  subscriptions.filter((s) => {
                    const d = new Date(s.created_at);
                    const now = new Date();
                    return (
                      d.getMonth() === now.getMonth() &&
                      d.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
            </div>
            <Calendar className="h-6 w-6 text-gray-600" />
          </div>
          <div className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Growth Rate</p>
              <p className="text-xl font-semibold text-gray-900">
                {growthRate}
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-gray-600" />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border rounded"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-8 pr-4 py-2 border rounded"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`${refreshing ? 'animate-spin' : ''}`} size={16} /> Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Download size={16} /> Export CSV
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <Trash2 size={16} /> Delete ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white p-4 rounded shadow overflow-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600">No subscribers match the criteria.</p>
            </div>
          ) : (
            <table className="w-full table-auto border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sub.id)}
                        onChange={(e) => toggleSelectOne(sub.id, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2">{sub.email}</td>
                    <td className="p-2">{new Date(sub.created_at).toLocaleDateString()}</td>
                    <td className="p-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                        <CheckCircle size={14} /> Active
                      </span>
                    </td>
                    <td className="p-2 flex gap-2">
                      <button
                        onClick={() => {
                          setDeletingId(sub.id);
                          setShowDeleteModal(true);
                        }}
                        disabled={deletingId === sub.id}
                        className="p-1 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={20} className="text-red-600" />
                <h2 className="text-lg font-semibold">Confirm Deletion</h2>
              </div>
              <p className="mb-6 text-gray-700">Are you sure you want to delete this subscriber? This cannot be undone.</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
