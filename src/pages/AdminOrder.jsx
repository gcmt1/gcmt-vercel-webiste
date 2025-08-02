import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import "../styles/AdminOrder.css";
import { 
  Search, Calendar, Trash2, Eye, Package, CheckCircle, Clock, 
  AlertCircle, RefreshCw, X, ArrowLeft, ChevronDown, Edit3,
  Truck, PackageCheck, XCircle, User, MapPin, Phone, Mail, 
  CreditCard, Hash, CalendarRange, Filter, Download, MoreHorizontal
} from 'lucide-react';

const STATUS_CONFIG = {
  order: {
    PROCESSING: { icon: Clock, color: 'processing', label: 'Processing' },
    SHIPPED: { icon: Truck, color: 'shipped', label: 'Shipped' },
    DELIVERED: { icon: PackageCheck, color: 'delivered', label: 'Delivered' },
    CANCELLED: { icon: XCircle, color: 'cancelled', label: 'Cancelled' }
  },
  payment: {
    SUCCESS: { icon: CheckCircle, color: 'success', label: 'Success' },
    PENDING: { icon: Clock, color: 'pending', label: 'Pending' },
    FAILED: { icon: AlertCircle, color: 'failed', label: 'Failed' }
  }
};

const DATE_FILTERS = [
  { value: 'ALL', label: 'All Time' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'Last Week' },
  { value: 'MONTH', label: 'Last Month' },
  { value: 'CUSTOM', label: 'Custom Range' }
];

export default function GoldOrdersPage() {
  // Core state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [loadingStates, setLoadingStates] = useState({
    order: new Set()
  });

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    payment: 'ALL',
    dateRange: 'ALL',
    customDate: { start: '', end: '' }
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Modal state
  const [modals, setModals] = useState({
    orderDetails: { show: false, order: null },
    deleteConfirm: { show: false, orderId: null },
    notification: null
  });

  const navigate = useNavigate();

  // Helper function to normalize status to uppercase
  const normalizeStatus = (status) => {
    return status ? status.toString().toUpperCase() : 'UNKNOWN';
  };

  // Helper function to get status config with fallback
  const getStatusConfig = (type, status) => {
    const normalizedStatus = normalizeStatus(status);
    return STATUS_CONFIG[type][normalizedStatus] || {
      icon: AlertCircle,
      color: 'unknown',
      label: normalizedStatus
    };
  };

  // Authentication check
  const checkAdmin = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      navigate('/login');
      return false;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileErr || profile?.role !== 'admin') {
      navigate('/');
      return false;
    }
    return true;
  }, [navigate]);

  // Load orders
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, user_id, user_name, user_email, user_phone,
          address_line, city, state, postal_code, product_list,
          payment_id, payment_status, order_status, created_at, guest_identifier
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showNotification('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Notification system
  const showNotification = useCallback((message, type = 'success') => {
    setModals(prev => ({ ...prev, notification: { message, type } }));
    setTimeout(() => {
      setModals(prev => ({ ...prev, notification: null }));
    }, 4000);
  }, []);

  // Filter orders with improved case-insensitive filtering
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter - improved to handle null/undefined values
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order => {
        const searchFields = [
          order.user_name,
          order.user_email,
          order.id?.toString(),
          order.payment_id,
          order.user_phone,
          order.city,
          order.state
        ];
        
        return searchFields.some(field => 
          field && field.toString().toLowerCase().includes(searchLower)
        );
      });
    }

    // Status filters - normalized to handle case variations
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(order => 
        normalizeStatus(order.order_status) === filters.status
      );
    }
    
    if (filters.payment !== 'ALL') {
      filtered = filtered.filter(order => 
        normalizeStatus(order.payment_status) === filters.payment
      );
    }

    // Date filter - improved with better date handling
    if (filters.dateRange !== 'ALL') {
      const now = new Date();
      
      switch (filters.dateRange) {
        case 'TODAY': {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= today && orderDate < tomorrow;
          });
          break;
        }
        case 'WEEK': {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= weekAgo
          );
          break;
        }
        case 'MONTH': {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          monthAgo.setHours(0, 0, 0, 0);
          
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= monthAgo
          );
          break;
        }
        case 'CUSTOM': {
          if (filters.customDate.start && filters.customDate.end) {
            const startDate = new Date(filters.customDate.start);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(filters.customDate.end);
            endDate.setHours(23, 59, 59, 999);
            
            filtered = filtered.filter(order => {
              const orderDate = new Date(order.created_at);
              return orderDate >= startDate && orderDate <= endDate;
            });
          }
          break;
        }
      }
    }

    return filtered;
  }, [orders, filters]);

  // Analytics with normalized status handling
  const analytics = useMemo(() => {
    const statusCounts = filteredOrders.reduce((acc, order) => {
      const normalizedStatus = normalizeStatus(order.order_status);
      acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
      return acc;
    }, {});

    const totalRevenue = filteredOrders.reduce((total, order) => {
      if (order.product_list && Array.isArray(order.product_list)) {
        return total + order.product_list.reduce((sum, item) => sum + (item.total_price || 0), 0);
      }
      return total;
    }, 0);

    const groupedOrders = filteredOrders.reduce((groups, order) => {
      const date = new Date(order.created_at);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(order);
      return groups;
    }, {});

    return { statusCounts, totalRevenue, groupedOrders };
  }, [filteredOrders]);

  // Update filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'dateRange') {
      setShowCustomDatePicker(value === 'CUSTOM');
      if (value !== 'CUSTOM') {
        setFilters(prev => ({ ...prev, customDate: { start: '', end: '' } }));
      }
    }
  }, []);

  // Order status update function (only for order status, not payment)
  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    setLoadingStates(prev => ({
      ...prev,
      order: new Set([...prev.order, orderId])
    }));

    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus.toLowerCase() }) // Store in lowercase for consistency
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, order_status: newStatus.toLowerCase() } : order
      ));

      // Update modal order if it's the same one
      setModals(prev => ({
        ...prev,
        orderDetails: prev.orderDetails.order?.id === orderId 
          ? { ...prev.orderDetails, order: { ...prev.orderDetails.order, order_status: newStatus.toLowerCase() } }
          : prev.orderDetails
      }));

      showNotification(`Order status updated to ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      showNotification('Failed to update order status', 'error');
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        order: new Set([...prev.order].filter(id => id !== orderId))
      }));
    }
  }, [showNotification]);

  // Delete functions
  const deleteOrder = useCallback(async (orderId) => {
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;

      setOrders(prev => prev.filter(order => order.id !== orderId));
      setSelectedOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });

      if (modals.orderDetails.order?.id === orderId) {
        setModals(prev => ({ ...prev, orderDetails: { show: false, order: null } }));
      }

      showNotification('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      showNotification('Failed to delete order', 'error');
    }
    setModals(prev => ({ ...prev, deleteConfirm: { show: false, orderId: null } }));
  }, [modals.orderDetails.order?.id, showNotification]);

  const bulkDeleteOrders = useCallback(async () => {
    if (selectedOrders.size === 0) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', Array.from(selectedOrders));

      if (error) throw error;

      setOrders(prev => prev.filter(order => !selectedOrders.has(order.id)));
      setSelectedOrders(new Set());
      showNotification(`${selectedOrders.size} orders deleted successfully`);
    } catch (error) {
      console.error('Error deleting orders:', error);
      showNotification('Failed to delete orders', 'error');
    }
  }, [selectedOrders, showNotification]);

  // Selection functions
  const toggleOrderSelection = useCallback((orderId, event) => {
    event.stopPropagation();
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  const selectAllOrders = useCallback(() => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)));
    }
  }, [selectedOrders.size, filteredOrders]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      if (await checkAdmin()) {
        await loadOrders();
      }
    };
    init();
  }, [checkAdmin, loadOrders]);

  // Status badge component - only for order status (editable)
  const OrderStatusBadge = ({ status, orderId, onUpdate, availableStatuses }) => {
    const config = getStatusConfig('order', status);
    const Icon = config.icon;
    const isLoading = loadingStates.order.has(orderId);

    return (
      <div className="admin-status-dropdown">
        <button className={`admin-status-badge admin-status-${config.color}`}>
          <Icon className="w-4 h-4" />
          <span>{isLoading ? 'Updating...' : config.label}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        <div className="admin-status-dropdown-menu">
          {availableStatuses
            .filter(s => normalizeStatus(s) !== normalizeStatus(status))
            .map(s => {
              const statusConfig = getStatusConfig('order', s);
              const StatusIcon = statusConfig.icon;
              return (
                <button
                  key={s}
                  onClick={() => onUpdate(orderId, s)}
                  disabled={isLoading}
                  className="admin-status-dropdown-item"
                >
                  <StatusIcon className="w-4 h-4" />
                  <span>{statusConfig.label}</span>
                </button>
              );
            })}
        </div>
      </div>
    );
  };

  // Payment status badge component - read-only (admin cannot change this)
  const PaymentStatusBadge = ({ status }) => {
    const config = getStatusConfig('payment', status);
    const Icon = config.icon;

    return (
      <div className={`admin-status-badge admin-status-${config.color} admin-status-readonly`}>
        <Icon className="w-4 h-4" />
        <span>{config.label}</span>
      </div>
    );
  };

  // Order card component
  const OrderCard = ({ order }) => (
    <div className="admin-order-card">
      <div className="admin-order-header">
        <div className="admin-order-info">
          <input
            type="checkbox"
            checked={selectedOrders.has(order.id)}
            onChange={(e) => toggleOrderSelection(order.id, e)}
            className="admin-checkbox"
          />
          <div>
            <h3 className="admin-order-id">Order #{order.id}</h3>
            <p className="admin-order-meta">
              {order.user_name || 'Guest'} • {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="admin-order-actions">
          <PaymentStatusBadge status={order.payment_status} />
          <OrderStatusBadge
            status={order.order_status}
            orderId={order.id}
            onUpdate={updateOrderStatus}
            availableStatuses={Object.keys(STATUS_CONFIG.order)}
          />
          <button
            onClick={() => setModals(prev => ({ 
              ...prev, 
              orderDetails: { show: true, order } 
            }))}
            className="admin-btn admin-btn-secondary"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setModals(prev => ({ 
              ...prev, 
              deleteConfirm: { show: true, orderId: order.id } 
            }))}
            className="admin-btn admin-btn-danger"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="admin-order-details">
        <div className="admin-order-detail-grid">
          <div className="admin-detail-item">
            <Mail className="w-4 h-4" />
            <span>{order.user_email || 'N/A'}</span>
          </div>
          <div className="admin-detail-item">
            <Phone className="w-4 h-4" />
            <span>{order.user_phone || 'N/A'}</span>
          </div>
          <div className="admin-detail-item">
            <MapPin className="w-4 h-4" />
            <span>{order.city || 'N/A'}, {order.state || 'N/A'}</span>
          </div>
          {order.payment_id && (
            <div className="admin-detail-item">
              <CreditCard className="w-4 h-4" />
              <span>{order.payment_id}</span>
            </div>
          )}
        </div>

        {order.product_list && order.product_list.length > 0 && (
          <div className="admin-product-summary">
            <Package className="w-4 h-4" />
            <span>
              {order.product_list.length} items • 
              ₹{order.product_list.reduce((sum, item) => sum + (item.total_price || 0), 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="admin-loading-container">
        <RefreshCw className="admin-loading-spinner" />
        <span>Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Notification */}
      {modals.notification && (
        <div className={`admin-notification admin-notification-${modals.notification.type}`}>
          {modals.notification.type === 'success' ? 
            <CheckCircle className="w-5 h-5" /> : 
            <AlertCircle className="w-5 h-5" />
          }
          <span>{modals.notification.message}</span>
          <button onClick={() => setModals(prev => ({ ...prev, notification: null }))}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1 className="admin-title">Order Management</h1>
            <div className="admin-stats">
              <span>{filteredOrders.length} orders</span>
              <span>₹{analytics.totalRevenue.toLocaleString()} revenue</span>
              {analytics.statusCounts.PROCESSING > 0 && (
                <span className="admin-stat-warning">
                  {analytics.statusCounts.PROCESSING} processing
                </span>
              )}
            </div>
          </div>
          
          <div className="admin-header-actions">
            <button onClick={loadOrders} className="admin-btn admin-btn-secondary">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {selectedOrders.size > 0 && (
              <>
                <button onClick={bulkDeleteOrders} className="admin-btn admin-btn-danger">
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedOrders.size})
                </button>
                <button onClick={selectAllOrders} className="admin-btn admin-btn-secondary">
                  {selectedOrders.size === filteredOrders.length ? 'Deselect All' : 'Select All'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="admin-stats-grid">
        {Object.entries(STATUS_CONFIG.order).map(([status, config]) => {
          const Icon = config.icon;
          const count = analytics.statusCounts[status] || 0;
          return (
            <div key={status} className="admin-stat-card">
              <div className={`admin-stat-icon admin-stat-${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="admin-stat-number">{count}</div>
                <div className="admin-stat-label">{config.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-container">
          <Search className="admin-search-icon" />
          <input
            type="text"
            placeholder="Search orders, customers, phone, city..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="admin-search-input"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="admin-select"
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(STATUS_CONFIG.order).map(([status, config]) => (
            <option key={status} value={status}>{config.label}</option>
          ))}
        </select>

        <select
          value={filters.payment}
          onChange={(e) => updateFilter('payment', e.target.value)}
          className="admin-select"
        >
          <option value="ALL">All Payments</option>
          {Object.entries(STATUS_CONFIG.payment).map(([status, config]) => (
            <option key={status} value={status}>{config.label}</option>
          ))}
        </select>

        <select
          value={filters.dateRange}
          onChange={(e) => updateFilter('dateRange', e.target.value)}
          className="admin-select"
        >
          {DATE_FILTERS.map(filter => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
      </div>

      {/* Custom Date Range */}
      {showCustomDatePicker && (
        <div className="admin-date-picker">
          <div className="admin-date-inputs">
            <input
              type="date"
              value={filters.customDate.start}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                customDate: { ...prev.customDate, start: e.target.value }
              }))}
              className="admin-date-input"
            />
            <span>to</span>
            <input
              type="date"
              value={filters.customDate.end}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                customDate: { ...prev.customDate, end: e.target.value }
              }))}
              className="admin-date-input"
            />
          </div>
          <div className="admin-date-actions">
            <button
              onClick={() => {
                if (filters.customDate.start && filters.customDate.end) {
                  setShowCustomDatePicker(false);
                } else {
                  showNotification('Please select both dates', 'error');
                }
              }}
              className="admin-btn admin-btn-primary"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, dateRange: 'ALL', customDate: { start: '', end: '' } }));
                setShowCustomDatePicker(false);
              }}
              className="admin-btn admin-btn-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="admin-orders-container">
        {Object.keys(analytics.groupedOrders).length === 0 ? (
          <div className="admin-empty-state">
            <Package className="admin-empty-icon" />
            <h3>No orders found</h3>
            <p>Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          Object.entries(analytics.groupedOrders).map(([monthYear, monthOrders]) => (
            <div key={monthYear} className="admin-month-group">
              <div className="admin-month-header">
                <Calendar className="w-5 h-5" />
                <h2>{monthYear}</h2>
                <span className="admin-month-badge">{monthOrders.length} orders</span>
              </div>
              <div className="admin-orders-grid">
                {monthOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {modals.orderDetails.show && modals.orderDetails.order && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Order #{modals.orderDetails.order.id}</h2>
              <button 
                onClick={() => setModals(prev => ({ ...prev, orderDetails: { show: false, order: null } }))}
                className="admin-modal-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="admin-modal-content">
              <div className="admin-order-detail-sections">
                {/* Customer Info */}
                <div className="admin-detail-section">
                  <h3><User className="w-4 h-4" /> Customer Information</h3>
                  <div className="admin-detail-grid">
                    <div><strong>Name:</strong> {modals.orderDetails.order.user_name || 'Guest'}</div>
                    <div><strong>Email:</strong> {modals.orderDetails.order.user_email || 'N/A'}</div>
                    <div><strong>Phone:</strong> {modals.orderDetails.order.user_phone || 'N/A'}</div>
                    <div><strong>Address:</strong> {modals.orderDetails.order.address_line || 'N/A'}, {modals.orderDetails.order.city || 'N/A'}, {modals.orderDetails.order.state || 'N/A'} - {modals.orderDetails.order.postal_code || 'N/A'}</div>
                  </div>
                </div>

                {/* Order Items */}
                {modals.orderDetails.order.product_list && modals.orderDetails.order.product_list.length > 0 && (
                  <div className="admin-detail-section">
                    <h3><Package className="w-4 h-4" /> Order Items</h3>
                    <div className="admin-product-list">
                      {modals.orderDetails.order.product_list.map((item, index) => (
                        <div key={index} className="admin-product-item">
                          <span className="admin-product-name">{item.name || 'Unknown Item'}</span>
                          <span className="admin-product-quantity">×{item.quantity || 1}</span>
                          <span className="admin-product-price">₹{(item.total_price || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Management */}
                <div className="admin-detail-section">
                  <h3>Status Management</h3>
                  <div className="admin-status-actions">
                    <div className="admin-status-group">
                      <label>Payment Status (Read-only):</label>
                      <PaymentStatusBadge status={modals.orderDetails.order.payment_status} />
                      <small className="admin-help-text">Payment status cannot be changed by admin</small>
                    </div>
                    <div className="admin-status-group">
                      <label>Order Status (Editable):</label>
                      <OrderStatusBadge
                        status={modals.orderDetails.order.order_status}
                        orderId={modals.orderDetails.order.id}
                        onUpdate={updateOrderStatus}
                        availableStatuses={Object.keys(STATUS_CONFIG.order)}
                      />
                      <small className="admin-help-text">Click to change order status</small>
                    </div>
                  </div>
                </div>

                {/* Order Metadata */}
                <div className="admin-detail-section">
                  <h3>Order Details</h3>
                  <div className="admin-detail-grid">
                    <div><strong>Order ID:</strong> {modals.orderDetails.order.id}</div>
                    <div><strong>Payment ID:</strong> {modals.orderDetails.order.payment_id || 'N/A'}</div>
                    <div><strong>Created:</strong> {new Date(modals.orderDetails.order.created_at).toLocaleString()}</div>
                    <div><strong>Guest ID:</strong> {modals.orderDetails.order.guest_identifier || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modals.deleteConfirm.show && (
        <div className="admin-modal-overlay">
          <div className="admin-modal admin-modal-confirm">
            <div className="admin-modal-header">
              <h2>Confirm Deletion</h2>
              <button 
                onClick={() => setModals(prev => ({ ...prev, deleteConfirm: { show: false, orderId: null } }))}
                className="admin-modal-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="admin-modal-content">
              <p>Are you sure you want to delete order #{modals.deleteConfirm.orderId}?</p>
              <div className="admin-confirm-actions">
                <button 
                  onClick={() => deleteOrder(modals.deleteConfirm.orderId)}
                  className="admin-btn admin-btn-danger"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setModals(prev => ({ ...prev, deleteConfirm: { show: false, orderId: null } }))}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}