import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import { 
  Package, 
  Calendar, 
  MapPin, 
  Phone, 
  CreditCard, 
  Truck, 
  Check, 
  Clock, 
  AlertCircle,
  Eye,
  X,
  Download,
  ChevronRight
} from 'lucide-react';
import styles from '../styles/YourOrders.module.css';
import { generateInvoicePDF } from '../components/InvoiceGenerator';

const YourOrders = () => {
  const user = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionChecked, setSessionChecked] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setSessionChecked(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .eq('payment_status', 'success')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again later.');
      } finally {
        setSessionChecked(true);
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <Check className={styles.statusIconGreen} />;
      case 'shipped':
        return <Truck className={styles.statusIconBlue} />;
      case 'processing':
        return <Clock className={styles.statusIconYellow} />;
      default:
        return <Package className={styles.statusIconGray} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return styles.statusDelivered;
      case 'shipped':
        return styles.statusShipped;
      case 'processing':
        return styles.statusProcessing;
      default:
        return styles.statusDefault;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowModal(false);
  };

  const getOrderSummary = (productList) => {
    if (!Array.isArray(productList) || productList.length === 0) {
      return 'No items listed';
    }
    
    const totalItems = productList.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const firstItem = productList[0];
    
    if (productList.length === 1) {
      return `${firstItem.name} (${firstItem.quantity})`;
    } else {
      return `${firstItem.name} and ${productList.length - 1} other item${productList.length > 2 ? 's' : ''} (${totalItems} total)`;
    }
  };

  // Loading, error, and empty states remain the same
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (!user && sessionChecked) {
    return (
      <div className={styles.centeredContainer}>
        <div className={styles.messageCard}>
          <Package className={styles.largeIcon} />
          <h2 className={styles.messageTitle}>Sign In Required</h2>
          <p className={styles.messageText}>Please log in to view your order history.</p>
          <a href="/login" className={styles.primaryButton}>
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centeredContainer}>
        <div className={styles.messageCard}>
          <AlertCircle className={styles.largeIconRed} />
          <h2 className={styles.messageTitle}>Something went wrong</h2>
          <p className={styles.messageText}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.primaryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={styles.centeredContainer}>
        <div className={styles.messageCard}>
          <Package className={styles.largeIcon} />
          <h2 className={styles.messageTitle}>No Orders Yet</h2>
          <p className={styles.messageText}>You haven't placed any orders yet. Start shopping to see your orders here.</p>
          <a href="#/products" className={styles.primaryButton}>
            Start Shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Your Orders</h1>
          <p className={styles.pageSubtitle}>Track and manage your order history</p>
        </div>

        {/* Compact Orders List */}
        <div className={styles.ordersContainer}>
          {orders.map((order) => (
            <div key={order.id} className={styles.compactOrderCard}>
              {/* Order Card Header */}
              <div className={styles.compactOrderHeader}>
                <div className={styles.orderBasicInfo}>
                  <div className={styles.orderMeta}>
                    <h3 className={styles.compactOrderTitle}>
                      Order #{order.id?.slice(-8) || 'N/A'}
                    </h3>
                    <div className={styles.orderDate}>
                      <Calendar className={styles.smallIcon} />
                      {formatDate(order.created_at)}
                    </div>
                  </div>
                  <div className={styles.orderStatus}>
                    {getStatusIcon(order.order_status)}
                    <span className={`${styles.statusBadge} ${getStatusClass(order.order_status)}`}>
                      {order.order_status || 'Processing'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Card Content */}
              <div className={styles.compactOrderContent}>
                <div className={styles.orderSummaryRow}>
                  <div className={styles.orderItems}>
                    <Package className={styles.smallIcon} />
                    <span className={styles.itemSummary}>
                      {getOrderSummary(order.product_list)}
                    </span>
                  </div>
                  <div className={styles.orderTotal}>
                    <span className={styles.totalAmount}>
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </div>

                <div className={styles.orderActions}>
                  <button
                    onClick={() => openOrderDetails(order)}
                    className={styles.viewDetailsBtn}
                  >
                    <Eye className={styles.smallIcon} />
                    View Details
                    <ChevronRight className={styles.smallIcon} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.pageFooter}>
          <p className={styles.footerText}>Need help with your order?</p>
          <a href="#/contact" className={styles.secondaryButton}>
            Contact Support
          </a>
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className={styles.modalOverlay} onClick={closeOrderDetails}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Package className={styles.orderIcon} />
                <div>
                  <h2>Order #{selectedOrder.id?.slice(-8) || 'N/A'}</h2>
                  <p className={styles.modalSubtitle}>
                    Placed on {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
              </div>
              <div className={styles.modalHeaderRight}>
                <div className={styles.modalStatus}>
                  {getStatusIcon(selectedOrder.order_status)}
                  <span className={`${styles.statusBadge} ${getStatusClass(selectedOrder.order_status)}`}>
                    {selectedOrder.order_status || 'Processing'}
                  </span>
                </div>
                <button
                  onClick={closeOrderDetails}
                  className={styles.closeButton}
                >
                  <X className={styles.smallIcon} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                {/* Left Column */}
                <div className={styles.modalColumn}>
                  {/* Products */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                      <Package className={styles.smallIcon} />
                      Items Ordered
                    </h4>
                    <div className={styles.infoBox}>
                      <div className={styles.infoText}>
                        {Array.isArray(selectedOrder.product_list) && selectedOrder.product_list.length > 0 ? (
                          selectedOrder.product_list.map((item, index) => (
                            <div key={index} className={styles.productItem}>
                              <div><strong>{item.name}</strong></div>
                              <div>Qty: {item.quantity}</div>
                              <div>Unit Price: {formatCurrency(item.unit_price)}</div>
                              <div>Total: {formatCurrency(item.total_price)}</div>
                              {index < selectedOrder.product_list.length - 1 && (
                                <hr className={styles.productDivider} />
                              )}
                            </div>
                          ))
                        ) : (
                          <p>No items listed</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                      <CreditCard className={styles.smallIcon} />
                      Payment Details
                    </h4>
                    <div className={styles.paymentDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Payment ID:</span>
                        <span className={styles.detailValue}>{selectedOrder.payment_id || 'N/A'}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Status:</span>
                        <span className={styles.detailValueSuccess}>{selectedOrder.payment_status}</span>
                      </div>
                      {selectedOrder.total_amount && (
                        <div className={`${styles.detailRow} ${styles.totalRow}`}>
                          <span className={styles.detailLabelBold}>Total:</span>
                          <span className={styles.detailValueBold}>{formatCurrency(selectedOrder.total_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className={styles.modalColumn}>
                  {/* Delivery Address */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                      <MapPin className={styles.smallIcon} />
                      Delivery Address
                    </h4>
                    <div className={styles.infoBox}>
                      <p className={styles.infoText}>
                        {selectedOrder.address_line ? (
                          <>
                            {selectedOrder.address_line}<br />
                            {selectedOrder.city && `${selectedOrder.city}, `}
                            {selectedOrder.state && `${selectedOrder.state} `}
                            {selectedOrder.postal_code}
                          </>
                        ) : (
                          'Address not available'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  {selectedOrder.user_phone && (
                    <div className={styles.section}>
                      <h4 className={styles.sectionTitle}>
                        <Phone className={styles.smallIcon} />
                        Contact Number
                      </h4>
                      <div className={styles.infoBox}>
                        <p className={styles.infoText}>{selectedOrder.user_phone}</p>
                      </div>
                    </div>
                  )}

                  {/* Order Actions */}
                  <div className={styles.actionsSection}>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => generateInvoicePDF(selectedOrder)}
                        className={styles.invoiceButton}
                      >
                        <Download className={styles.smallIcon} />
                        Download Invoice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourOrders;