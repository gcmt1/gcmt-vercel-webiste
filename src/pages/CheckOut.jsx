import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom';
import '../styles/CheckOut.css';

const GUEST_KEYS = {
  USER_ID: 'guest_user_id',
  EMAIL: 'guest_user_email',
  PASSWORD: 'guest_user_password',
  IDENTIFIER: 'guest_identifier'
};

const PAYMENT_SESSION_KEY = 'pending_payment_session';

export default function Checkout() {
  const { user } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const modalRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [updatingQuantity, setUpdatingQuantity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Lock body scroll when modal is open — bulletproof version
useEffect(() => {
  if (showPaymentModal) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  } else {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
  
  return () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };
}, [showPaymentModal]);

  const getOrCreateGuestIdentifier = useCallback(() => {
    let identifier = localStorage.getItem(GUEST_KEYS.IDENTIFIER);
    if (!identifier) {
      identifier = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(GUEST_KEYS.IDENTIFIER, identifier);
    }
    return identifier;
  }, []);

  const isGuestUser = useCallback(() => {
    if (!user?.email) return true;
    return user.email.toLowerCase().includes('guest_') || 
           user.email.toLowerCase().includes('@temp.local') ||
           user.email.toLowerCase().includes('@example.com');
  }, [user]);

  const savePaymentSession = useCallback((orderId, paymentId) => {
    const sessionData = {
      orderId,
      paymentId,
      userId: user?.id || null,
      guestIdentifier: getOrCreateGuestIdentifier(),
      timestamp: Date.now(),
      formData: {
        email: formData.email,
        name: formData.name,
        phone: formData.phone
      }
    };
    localStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(sessionData));
    sessionStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(sessionData));
  }, [user?.id, formData.email, formData.name, formData.phone, getOrCreateGuestIdentifier]);

  useEffect(() => {
    fetchCart();
  }, [user?.id]);

  const fetchCart = async () => {
    setLoadingCart(true);
    try {
      if (!user?.id) {
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
        setCartItems(guestCart);
      } else {
        const { data, error } = await supabase
          .from('cart_items')
          .select(`id, product_id, quantity, products:products (id, product_name, product_price, product_image)`)
          .eq('user_id', user.id);
        if (error) throw error;
        setCartItems(
          data.map(item => ({
            id: item.id,
            productId: item.product_id,
            name: item.products?.product_name ?? 'Unknown',
            price: item.products?.product_price ?? 0,
            image: item.products?.product_image ?? '',
            quantity: item.quantity,
          }))
        );
      }
    } catch (err) {
      console.error('Fetch cart error:', err.message);
      showToast('Failed to load cart', 'error');
    } finally {
      setLoadingCart(false);
    }
  };

  const updateQuantity = useCallback(async (item, newQuantity) => {
    if (newQuantity < 1 || updatingQuantity || loading || formSubmitted) return;
    const itemKey = item.id || item.productId;
    setUpdatingQuantity(itemKey);
    try {
      setCartItems(prev =>
        prev.map(ci => (ci.id || ci.productId) === itemKey ? { ...ci, quantity: newQuantity } : ci)
      );
      if (!user?.id) {
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
        const updatedCart = guestCart.map(ci =>
          ci.productId === item.productId ? { ...ci, quantity: newQuantity } : ci
        );
        sessionStorage.setItem('guest_cart', JSON.stringify(updatedCart));
      } else {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', item.id)
          .eq('user_id', user.id);
        if (error) {
          setCartItems(prev =>
            prev.map(ci => (ci.id || ci.productId) === itemKey ? { ...ci, quantity: item.quantity } : ci)
          );
          throw error;
        }
      }
    } catch (err) {
      console.error('Update quantity error:', err.message);
      showToast('Failed to update quantity', 'error');
    } finally {
      setUpdatingQuantity(null);
    }
  }, [user?.id, updatingQuantity, loading, formSubmitted, showToast]);

  const removeItem = useCallback(async (item) => {
    if (updatingQuantity || loading || formSubmitted) return;
    const itemKey = item.id || item.productId;
    setUpdatingQuantity(itemKey);
    try {
      setCartItems(prev => prev.filter(ci => (ci.id || ci.productId) !== itemKey));
      if (!user?.id) {
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
        const updatedCart = guestCart.filter(ci => ci.productId !== item.productId);
        sessionStorage.setItem('guest_cart', JSON.stringify(updatedCart));
      } else {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', item.id)
          .eq('user_id', user.id);
        if (error) {
          await fetchCart();
          throw error;
        }
      }
      showToast(`${item.name} removed from cart`, 'success');
    } catch (err) {
      console.error('Remove item error:', err.message);
      showToast('Failed to remove item', 'error');
    } finally {
      setUpdatingQuantity(null);
    }
  }, [user?.id, updatingQuantity, loading, formSubmitted, showToast]);

  const clearCart = useCallback(async () => {
    try {
      if (user?.id) {
        await supabase.from('cart_items').delete().eq('user_id', user.id);
      } else {
        sessionStorage.removeItem('guest_cart');
      }
      setCartItems([]);
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  }, [user?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const requiredFields = ['name', 'email', 'phone', 'street', 'city', 'state', 'pincode'];
    for (let field of requiredFields) {
      if (!formData[field]?.trim()) {
        showToast(`Please fill out the ${field.charAt(0).toUpperCase() + field.slice(1)} field.`, 'error');
        return false;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      showToast('Please enter a valid email address.', 'error');
      return false;
    }
    if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      showToast('Please enter a valid 10-digit phone number.', 'error');
      return false;
    }
    if (!/^[0-9]{6}$/.test(formData.pincode.trim())) {
      showToast('Please enter a valid 6-digit pincode.', 'error');
      return false;
    }
    return true;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0;
  const total = subtotal + shipping;
  
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);

  const createOrder = async (isCOD = false) => {
    if (!validateForm()) return null;
    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'error');
      return null;
    }
    try {
      const currentUserId = user?.id || null;
      const guestIdentifier = getOrCreateGuestIdentifier();
      const product_list = cartItems.map((item) => ({
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));
      const generatedPaymentId = isCOD 
        ? `COD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        : crypto.randomUUID();
      const orderData = {
        user_id: currentUserId,
        guest_identifier: isGuestUser() ? guestIdentifier : null,
        user_name: formData.name.trim(),
        user_email: formData.email.trim().toLowerCase(),
        user_phone: formData.phone.trim(),
        address_line: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postal_code: formData.pincode.trim(),
        product_list,
        total_amount: total,
        payment_status: isCOD ? 'COD_PENDING' : 'PENDING',
        order_status: isCOD ? 'processing' : 'PENDING',
        created_at: new Date().toISOString(),
        payment_id: generatedPaymentId,
      };
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select('id, payment_id, user_id, guest_identifier, user_email, user_name, total_amount')
        .single();
      if (error) throw error;
      return {
        orderId: data.id,
        paymentId: data.payment_id,
        userId: data.user_id,
        guestIdentifier: data.guest_identifier,
        userEmail: data.user_email,
        userName: data.user_name,
        totalAmount: data.total_amount
      };
    } catch (err) {
      console.error('Error creating order:', err);
      throw new Error(`Failed to create order: ${err.message}`);
    }
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'error');
      return;
    }
    setFormSubmitted(true);
    setShowPaymentModal(true);
    setPaymentMethod('');
  };

  const handleCODPayment = async () => {
    if (!formSubmitted || cartItems.length === 0) return;
    setLoading(true);
    try {
      const orderResult = await createOrder(true);
      if (!orderResult) { setLoading(false); return; }
      const { orderId, paymentId } = orderResult;
      await clearCart();
      showToast('Order placed successfully! Pay on delivery.', 'success');
      const successParams = new URLSearchParams({
        order_id: orderId, payment_id: paymentId, method: 'cod', status: 'success'
      });
      navigate(`/payment-success?${successParams.toString()}`);
    } catch (err) {
      console.error('COD order error:', err);
      showToast(`Order failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!formSubmitted || cartItems.length === 0) return;
    setLoading(true);
    try {
      const orderResult = await createOrder(false);
      if (!orderResult) { setLoading(false); return; }
      const { orderId, paymentId, userId, guestIdentifier } = orderResult;
      savePaymentSession(orderId, paymentId);
      const requestBody = {
        order_id: paymentId,
        amount: total.toFixed(2),
        currency: 'INR',
        redirect_url: 'https://gcmtshop-cca-backend-kappa.vercel.app/api/paymentResponse',
        cancel_url: 'https://gcmtshop-cca-backend-kappa.vercel.app/api/paymentResponse',
        language: 'EN',
        billing_name: formData.name.trim(),
        billing_address: formData.street.trim(),
        billing_city: formData.city.trim(),
        billing_state: formData.state.trim(),
        billing_zip: formData.pincode.trim(),
        billing_country: 'India',
        billing_tel: formData.phone.trim(),
        billing_email: formData.email.trim().toLowerCase(),
        merchant_param1: orderId.toString(),
        merchant_param2: userId || guestIdentifier || 'guest',
        merchant_param3: formData.email.trim().toLowerCase(),
        merchant_param4: guestIdentifier || '',
      };
      const response = await fetch('https://gcmtshop-cca-backend-kappa.vercel.app/api/createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error('Payment gateway error. Please try again.');
      const result = await response.json();
      if (!result?.encRequest || typeof result.encRequest !== 'string' || result.encRequest.trim().length === 0) {
        throw new Error('Invalid payment response from server');
      }
      const ACCESS_CODE = result.accessCode;
      if (!ACCESS_CODE) throw new Error('Payment configuration error. Please contact support.');
      await clearCart();
      await submitToCCAvenue(result.encRequest, ACCESS_CODE);
    } catch (err) {
      console.error('Payment initiation error:', err);
      showToast(`Payment failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const submitToCCAvenue = (encRequest, accessCode) => {
    return new Promise((resolve, reject) => {
      try {
        if (!encRequest?.trim() || !accessCode?.trim()) throw new Error('Invalid payment data');
        const existingForms = document.querySelectorAll('form[data-ccavenue-form="true"]');
        existingForms.forEach(form => form.remove());
        const form = document.createElement('form');
        form.setAttribute('data-ccavenue-form', 'true');
        form.method = 'POST';
        form.action = 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
        form.target = '_self';
        form.style.display = 'none';
        form.enctype = 'application/x-www-form-urlencoded';
        form.acceptCharset = 'UTF-8';
        const encInput = document.createElement('input');
        encInput.type = 'hidden'; encInput.name = 'encRequest'; encInput.value = encRequest.trim();
        const accessInput = document.createElement('input');
        accessInput.type = 'hidden'; accessInput.name = 'access_code'; accessInput.value = accessCode.trim();
        form.appendChild(encInput);
        form.appendChild(accessInput);
        document.body.appendChild(form);
        setTimeout(() => { try { form.submit(); resolve(); } catch (e) { reject(e); } }, 100);
      } catch (err) { reject(err); }
    });
  };

  const handlePaymentSelect = (method) => {
    if (loading) return;
    setPaymentMethod(method);
    setTimeout(() => {
      if (method === 'online') handleOnlinePayment();
      else if (method === 'cod') handleCODPayment();
    }, 350);
  };

  const handleCloseModal = () => {
    if (loading) return;
    setShowPaymentModal(false);
  };

  // Prevent scroll events from passing through the modal to the page
  const handleOverlayTouchMove = useCallback((e) => {
    // Allow scrolling inside the modal wrapper only
    if (modalRef.current && modalRef.current.contains(e.target)) {
      return; // allow scroll inside modal
    }
    e.preventDefault();
  }, []);

  // ==================== PAYMENT MODAL (rendered via Portal) ====================
  const renderPaymentModal = () => {
    if (!showPaymentModal) return null;

    const modalContent = (
      <div
        className="gcmt-pm-overlay"
        onClick={handleCloseModal}
        onTouchMove={handleOverlayTouchMove}
      >
        <div
          className="gcmt-pm-wrapper"
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Choose payment method"
        >

          {/* Close Button */}
          {!loading && (
            <button
              className="gcmt-pm-close"
              onClick={handleCloseModal}
              aria-label="Close payment options"
              type="button"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {/* Header */}
          <div className="gcmt-pm-header">
            <div className="gcmt-pm-header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="1" y="4" width="22" height="16" rx="3" stroke="#4f46e5" strokeWidth="1.8"/>
                <path d="M1 10h22" stroke="#4f46e5" strokeWidth="1.8"/>
                <path d="M5 15h4" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="gcmt-pm-title">Choose Payment Method</h2>
            <p className="gcmt-pm-subtitle">Total: <strong>{formatCurrency(total)}</strong></p>
          </div>

          {/* Payment Options */}
          <div className="gcmt-pm-body">

            {/* PAY ONLINE CARD */}
            <button
              type="button"
              className={`gcmt-pm-card gcmt-pm-card--online ${paymentMethod === 'online' ? 'gcmt-pm-card--selected' : ''} ${loading && paymentMethod === 'online' ? 'gcmt-pm-card--loading' : ''} ${loading && paymentMethod !== 'online' ? 'gcmt-pm-card--disabled' : ''}`}
              onClick={() => handlePaymentSelect('online')}
              disabled={loading}
            >
              {paymentMethod === 'online' && (
                <div className="gcmt-pm-card-check">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              <div className="gcmt-pm-card-icon gcmt-pm-card-icon--online">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="#4f46e5" strokeWidth="1.6"/>
                  <path d="M2 10h20" stroke="#4f46e5" strokeWidth="1.6"/>
                  <path d="M6 14.5h3" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M11 14.5h2" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>

              <div className="gcmt-pm-card-content">
                <div className="gcmt-pm-card-title-row">
                  <span className="gcmt-pm-card-title">Pay Online</span>
                  <span className="gcmt-pm-badge gcmt-pm-badge--green">Recommended</span>
                </div>
                <p className="gcmt-pm-card-desc">
                  Fast & secure payment via UPI, Google Pay, PhonePe, Paytm & more
                </p>
              </div>

              {/* Brand logos */}
              <div className="gcmt-pm-logos">
                <div className="gcmt-pm-logo-item" title="UPI">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1024px-UPI-Logo-vector.svg.png"
                    alt="UPI"
                    className="gcmt-pm-logo-img"
                    loading="eager"
                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <span className="gcmt-pm-logo-fallback" style={{display:'none', background:'#5f259f', color:'#fff'}}>UPI</span>
                </div>
                <div className="gcmt-pm-logo-item" title="Google Pay">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/512px-Google_Pay_Logo.svg.png"
                    alt="Google Pay"
                    className="gcmt-pm-logo-img"
                    loading="eager"
                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <span className="gcmt-pm-logo-fallback" style={{display:'none', background:'#4285f4', color:'#fff'}}>GPay</span>
                </div>
                <div className="gcmt-pm-logo-item" title="PhonePe">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1024px-PhonePe_Logo.svg.png"
                    alt="PhonePe"
                    className="gcmt-pm-logo-img"
                    loading="eager"
                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <span className="gcmt-pm-logo-fallback" style={{display:'none', background:'#5f259f', color:'#fff'}}>PhonePe</span>
                </div>
                <div className="gcmt-pm-logo-item" title="Paytm">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/1024px-Paytm_Logo_%28standalone%29.svg.png"
                    alt="Paytm"
                    className="gcmt-pm-logo-img"
                    loading="eager"
                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <span className="gcmt-pm-logo-fallback" style={{display:'none', background:'#00baf2', color:'#fff'}}>Paytm</span>
                </div>
                <div className="gcmt-pm-logo-item" title="Visa">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/1024px-Visa_Inc._logo.svg.png"
                    alt="Visa"
                    className="gcmt-pm-logo-img"
                    loading="eager"
                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <span className="gcmt-pm-logo-fallback" style={{display:'none', background:'#1a1f71', color:'#fff'}}>Visa</span>
                </div>
                <div className="gcmt-pm-logo-item" title="Mastercard">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1024px-Mastercard-logo.svg.png"
                    alt="Mastercard"
                    className="gcmt-pm-logo-img"
                    loading="eager"
                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <span className="gcmt-pm-logo-fallback" style={{display:'none', background:'#eb001b', color:'#fff'}}>MC</span>
                </div>
              </div>

              <div className="gcmt-pm-secure-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="#16a34a" strokeWidth="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="#16a34a" strokeWidth="2"/>
                </svg>
                <span>100% Safe & Secure</span>
              </div>

              {loading && paymentMethod === 'online' && (
                <div className="gcmt-pm-card-loader">
                  <span className="gcmt-pm-spinner-lg" />
                  <span>Redirecting to payment gateway...</span>
                </div>
              )}
            </button>

            {/* DIVIDER */}
            <div className="gcmt-pm-or-divider">
              <span>OR</span>
            </div>

            {/* CASH ON DELIVERY CARD */}
            <button
              type="button"
              className={`gcmt-pm-card gcmt-pm-card--cod ${paymentMethod === 'cod' ? 'gcmt-pm-card--selected' : ''} ${loading && paymentMethod === 'cod' ? 'gcmt-pm-card--loading' : ''} ${loading && paymentMethod !== 'cod' ? 'gcmt-pm-card--disabled' : ''}`}
              onClick={() => handlePaymentSelect('cod')}
              disabled={loading}
            >
              {paymentMethod === 'cod' && (
                <div className="gcmt-pm-card-check gcmt-pm-card-check--cod">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              <div className="gcmt-pm-card-icon gcmt-pm-card-icon--cod">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="20" height="12" rx="2" stroke="#d97706" strokeWidth="1.6"/>
                  <circle cx="12" cy="12" r="3" stroke="#d97706" strokeWidth="1.6"/>
                  <circle cx="5" cy="12" r="1" fill="#d97706"/>
                  <circle cx="19" cy="12" r="1" fill="#d97706"/>
                </svg>
              </div>

              <div className="gcmt-pm-card-content">
                <div className="gcmt-pm-card-title-row">
                  <span className="gcmt-pm-card-title">Cash on Delivery</span>
                </div>
                <p className="gcmt-pm-card-desc">
                  Pay with cash when your order is delivered to your doorstep. No online payment needed.
                </p>
              </div>

              {loading && paymentMethod === 'cod' && (
                <div className="gcmt-pm-card-loader gcmt-pm-card-loader--cod">
                  <span className="gcmt-pm-spinner-lg gcmt-pm-spinner-lg--cod" />
                  <span>Placing your order...</span>
                </div>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="gcmt-pm-footer">
            {!loading && (
              <button className="gcmt-pm-back-btn" onClick={handleCloseModal} type="button">
                ← Back to details
              </button>
            )}
            <div className="gcmt-pm-powered-by">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#999" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#999" strokeWidth="2"/>
              </svg>
              <span>Payments secured by CCAvenue</span>
            </div>
          </div>
        </div>
      </div>
    );

    // Render via Portal directly onto document.body
    // This bypasses ANY parent CSS (transform, filter, will-change)
    // that would break position:fixed
    return createPortal(modalContent, document.body);
  };

  // ==================== RENDER COMPONENTS ====================

  const renderShippingForm = () => (
    <div className="checkout-card">
      <h2>Shipping Information</h2>
      <div className="checkout-card-body">
        {Object.keys(formData).map((field) => (
          <div key={field} className="form-group">
            <label>
              {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
              <span style={{ color: 'red' }}> *</span>
            </label>
            <input
              type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              disabled={formSubmitted || loading}
              className="form-input"
              placeholder={
                field === 'phone' ? '10-digit mobile number' :
                field === 'pincode' ? '6-digit postal code' :
                field === 'email' ? 'your@email.com' :
                field === 'name' ? 'Full Name' :
                field === 'street' ? 'House no, Street, Area' : ''
              }
              maxLength={field === 'phone' ? '10' : field === 'pincode' ? '6' : undefined}
            />
          </div>
        ))}
        
        {!formSubmitted && (
          <button
            onClick={handleSubmitForm}
            disabled={loading || cartItems.length === 0}
            className="btn btn-primary"
          >
            Continue to Payment
          </button>
        )}
        
        {formSubmitted && (
          <div className="success-message">
            <span>✓ Details confirmed</span>
            <button
              onClick={() => { setFormSubmitted(false); setShowPaymentModal(false); setPaymentMethod(''); }}
              className="btn-link"
              style={{ marginLeft: '10px', fontSize: '14px' }}
            >
              Edit
            </button>
            <button
              onClick={() => { setShowPaymentModal(true); setPaymentMethod(''); }}
              className="btn btn-primary"
              style={{ marginTop: '12px', width: '100%' }}
            >
              Choose Payment Method
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuantityControls = (item) => {
    const itemKey = item.id || item.productId;
    const isUpdating = updatingQuantity === itemKey;
    const isDisabled = isUpdating || loading || formSubmitted;
    return (
      <div className="qty-controls">
        <button className="qty-btn qty-btn-minus" onClick={() => { if (item.quantity <= 1) removeItem(item); else updateQuantity(item, item.quantity - 1); }} disabled={isDisabled} aria-label={item.quantity <= 1 ? 'Remove item' : 'Decrease quantity'}>
          {item.quantity <= 1 ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          )}
        </button>
        <span className={`qty-value ${isUpdating ? 'qty-updating' : ''}`}>
          {isUpdating ? <span className="qty-spinner"></span> : item.quantity}
        </span>
        <button className="qty-btn qty-btn-plus" onClick={() => updateQuantity(item, item.quantity + 1)} disabled={isDisabled || item.quantity >= 99} aria-label="Increase quantity">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    );
  };

  const renderOrderSummary = () => (
    <div className="checkout-card">
      <h2>Order Summary</h2>
      <div className="checkout-card-body">
        {loadingCart ? (
          <div className="loading-message">Loading cart…</div>
        ) : cartItems.length ? (
          <ul className="order-summary-list">
            {cartItems.map((item, index) => (
              <li key={item.id || index} className="order-summary-item">
                <div className="order-item-details">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="order-item-image" onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                  <div className="order-item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-qty-row">{renderQuantityControls(item)}</div>
                    <div className="item-unit-price">{formatCurrency(item.price)} each</div>
                  </div>
                </div>
                <div className="item-total-col">
                  <div className="item-total">{formatCurrency(item.price * item.quantity)}</div>
                  {!formSubmitted && !loading && (
                    <button className="item-remove-btn" onClick={() => removeItem(item)} disabled={updatingQuantity === (item.id || item.productId)} aria-label={`Remove ${item.name}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-cart-message">
            <p>No items in cart</p>
            <button onClick={() => navigate('/products')} className="btn btn-outline">Continue Shopping</button>
          </div>
        )}
        {cartItems.length > 0 && (
          <>
            <div className="summary-row">
              <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span className="free-shipping">Free</span>
            </div>
            <div className="summary-row summary-row-total">
              <strong>Total Amount</strong>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderPaymentActions = () => {
    if (cartItems.length === 0) {
      return (
        <div className="checkout-actions">
          <button onClick={() => navigate('/cart')} className="btn btn-outline">Return to Cart</button>
        </div>
      );
    }
    return (
      <div className="checkout-actions">
        <button onClick={() => navigate('/cart')} className="btn btn-outline" disabled={loading}>Return to Cart</button>
        {!formSubmitted && (
          <div className="payment-info">ℹ️ Fill in your details above to continue</div>
        )}
      </div>
    );
  };

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        <div className="checkout-header">
          <h1 className="checkout-title">Checkout</h1>
          <div className="checkout-steps">
            <span className="step active">1. Cart</span>
            <span className={`step ${formSubmitted ? 'active' : ''}`}>2. Information</span>
            <span className={`step ${loading ? 'active' : ''}`}>3. Payment</span>
          </div>
        </div>
        {isMobile ? (
          <div className="mobile-layout">
            {renderOrderSummary()}
            {renderShippingForm()}
            {renderPaymentActions()}
          </div>
        ) : (
          <div className="desktop-layout">
            <div className="left-column">
              {renderShippingForm()}
              {renderPaymentActions()}
            </div>
            <div className="right-column">
              {renderOrderSummary()}
            </div>
          </div>
        )}
      </div>
      {renderPaymentModal()}
    </div>
  );
}
