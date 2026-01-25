import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom';
import '../styles/CheckOut.css';

export default function Checkout() {
  const { user } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State Management
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online'); // NEW: 'online' or 'cod'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  // ==================== CART MANAGEMENT ====================
  
  useEffect(() => {
    fetchCart();
  }, [user?.id]);

  const fetchCart = async () => {
    setLoadingCart(true);
    try {
      if (!user?.id) {
        // Guest cart (sessionStorage)
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
        setCartItems(guestCart);
      } else {
        // Logged-in user cart (Supabase)
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            quantity,
            products:products (id, product_name, product_price, product_image)
          `)
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

  // ==================== FORM HANDLING ====================
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const requiredFields = ['name', 'email', 'phone', 'street', 'city', 'state', 'pincode'];
    
    // Check for empty fields
    for (let field of requiredFields) {
      if (!formData[field]?.trim()) {
        showToast(`Please fill out the ${field.charAt(0).toUpperCase() + field.slice(1)} field.`, 'error');
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      showToast('Please enter a valid email address.', 'error');
      return false;
    }

    // Phone validation (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      showToast('Please enter a valid 10-digit phone number.', 'error');
      return false;
    }

    // Pincode validation (6 digits)
    const pincodeRegex = /^[0-9]{6}$/;
    if (!pincodeRegex.test(formData.pincode.trim())) {
      showToast('Please enter a valid 6-digit pincode.', 'error');
      return false;
    }

    return true;
  };

  // ==================== CALCULATIONS ====================
  
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0; // Free shipping
  const total = subtotal + shipping;
  
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);

  // ==================== ORDER CREATION ====================
  
  const createOrder = async (isCOD = false) => {
    if (!validateForm()) return null;

    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'error');
      return null;
    }

    try {
      // Get current user ID (can be null for guests)
      const currentUserId = user?.id || null;

      console.log('📝 Creating order with user ID:', currentUserId, '| COD:', isCOD);

      const product_list = cartItems.map((item) => ({
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      // Generate unique payment ID
      // For COD: Use a COD-prefixed identifier for easy identification
      // For Online: Use UUID for CCAvenue reference
      const generatedPaymentId = isCOD 
        ? `COD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        : crypto.randomUUID();
      
      const orderData = {
        user_id: currentUserId,
        user_name: formData.name.trim(),
        user_email: formData.email.trim().toLowerCase(),
        user_phone: formData.phone.trim(),
        address_line: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postal_code: formData.pincode.trim(),
        product_list,
        total_amount: total,
        payment_status: isCOD ? 'COD_PENDING' : 'PENDING', // Different status for COD
        order_status: isCOD ? 'processing' : 'PENDING',   // COD orders start processing immediately
        created_at: new Date().toISOString(),
        payment_id: generatedPaymentId,
      };

      console.log('📋 Order data to be inserted:', {
        ...orderData,
        product_list: orderData.product_list.length + ' items',
        payment_status: orderData.payment_status
      });

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select('id, payment_id, user_id, user_email, user_name, total_amount')
        .single();

      if (error) throw error;

      console.log('✅ Order created successfully:', data);

      return {
        orderId: data.id,
        paymentId: data.payment_id,
        userId: data.user_id,
        userEmail: data.user_email,
        userName: data.user_name,
        totalAmount: data.total_amount
      };
    } catch (err) {
      console.error('Error creating order:', err);
      throw new Error(`Failed to create order: ${err.message}`);
    }
  };

  // ==================== FORM SUBMISSION ====================
  
  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    
    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'error');
      return;
    }

    setFormSubmitted(true);
    showToast('Contact information validated! Select your payment method.', 'success');
  };

  // ==================== COD PAYMENT PROCESSING ====================
  
  const handleCODPayment = async () => {
    if (!formSubmitted) {
      showToast('Please submit your contact information first.', 'error');
      return;
    }

    if (cartItems.length === 0) {
      showToast('Your cart is empty.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Create order with COD status
      const orderResult = await createOrder(true); // true = COD order
      if (!orderResult) {
        setLoading(false);
        return;
      }

      const { orderId, paymentId, userName, totalAmount } = orderResult;
      
      console.log('📦 COD Order created successfully:', { orderId, paymentId });

      // Clear cart after successful order creation
      await clearCart();

      // Show success message
      showToast('Order placed successfully! Pay on delivery.', 'success');

      // Redirect to success page with COD parameters
      // Using URL params to pass order info to success page
      const successParams = new URLSearchParams({
        order_id: orderId,
        payment_id: paymentId,
        method: 'cod',
        status: 'success'
      });

      navigate(`/payment-success?${successParams.toString()}`);

    } catch (err) {
      console.error('💥 COD order error:', err);
      showToast(`Order failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  // ==================== ONLINE PAYMENT PROCESSING ====================
  
  const handleOnlinePayment = async () => {
    if (!formSubmitted) {
      showToast('Please submit your contact information first.', 'error');
      return;
    }

    if (cartItems.length === 0) {
      showToast('Your cart is empty.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Create order with PENDING status (online payment)
      const orderResult = await createOrder(false); // false = Online payment
      if (!orderResult) {
        setLoading(false);
        return;
      }

      const { orderId, paymentId, userId } = orderResult;
      
      console.log('📦 Order created for online payment:', { orderId, paymentId, userId });
      
      const requestBody = {
        order_id: paymentId, // This is the payment_id that CCAvenue will return
        amount: total.toFixed(2),
        currency: 'INR',
        redirect_url: 'https://gcmtshop-cca-backend-kappa.vercel.app/api/paymentResponse',
        cancel_url: 'https://gcmtshop-cca-backend-kappa.vercel.app/api/paymentResponse', // Same endpoint handles cancellation
        language: 'EN',
        billing_name: formData.name.trim(),
        billing_address: formData.street.trim(),
        billing_city: formData.city.trim(),
        billing_state: formData.state.trim(),
        billing_zip: formData.pincode.trim(),
        billing_country: 'India',
        billing_tel: formData.phone.trim(),
        billing_email: formData.email.trim().toLowerCase(),
        merchant_param1: orderId.toString(), // Store actual order ID for reference
        merchant_param2: userId || 'guest',
        merchant_param3: formData.email.trim().toLowerCase(), // Store email for reference
      };

      console.log('🚀 Initiating payment with request:', {
        ...requestBody,
        order_id: paymentId.substring(0, 8) + '...'
      });

      const response = await fetch('https://gcmtshop-cca-backend-kappa.vercel.app/api/createOrder', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend response error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Payment gateway error. Please try again.`);
      }

      const result = await response.json();
      console.log('✅ Backend response received');

      if (!result?.encRequest || typeof result.encRequest !== 'string' || result.encRequest.trim().length === 0) {
        throw new Error('Invalid payment response from server');
      }

      const ACCESS_CODE = result.accessCode;
      if (!ACCESS_CODE) {
        throw new Error('Payment configuration error. Please contact support.');
      }

      // Clear cart before redirecting (cart will be restored if payment fails)
      await clearCart();

      // Submit to CCAvenue
      await submitToCCAvenue(result.encRequest, ACCESS_CODE);

    } catch (err) {
      console.error('💥 Payment initiation error:', err);
      showToast(`Payment failed: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const submitToCCAvenue = (encRequest, accessCode) => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 Preparing CCAvenue form submission...');

        if (!encRequest || typeof encRequest !== 'string' || encRequest.trim().length === 0) {
          throw new Error('Invalid encRequest');
        }

        if (!accessCode || typeof accessCode !== 'string' || accessCode.trim().length === 0) {
          throw new Error('Invalid accessCode');
        }

        // Clean up existing forms
        const existingForms = document.querySelectorAll('form[data-ccavenue-form="true"]');
        existingForms.forEach(form => form.remove());

        // Create payment form
        const form = document.createElement('form');
        form.setAttribute('data-ccavenue-form', 'true');
        form.method = 'POST';
        form.action = 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
        form.target = '_self';
        form.style.display = 'none';
        form.enctype = 'application/x-www-form-urlencoded';
        form.acceptCharset = 'UTF-8';

        const encInput = document.createElement('input');
        encInput.type = 'hidden';
        encInput.name = 'encRequest';
        encInput.value = encRequest.trim();

        const accessInput = document.createElement('input');
        accessInput.type = 'hidden';
        accessInput.name = 'access_code';
        accessInput.value = accessCode.trim();

        form.appendChild(encInput);
        form.appendChild(accessInput);
        document.body.appendChild(form);

        console.log('✅ Submitting to CCAvenue...');

        setTimeout(() => {
          try {
            form.submit();
            resolve();
          } catch (submitError) {
            console.error('❌ Form submission error:', submitError);
            reject(new Error(`Form submission failed: ${submitError.message}`));
          }
        }, 100);
      } catch (err) {
        console.error('❌ Error in submitToCCAvenue:', err);
        reject(new Error(`CCAvenue submission failed: ${err.message}`));
      }
    });
  };

  // ==================== RENDER COMPONENTS ====================
  
  const renderShippingForm = () => (
    <div className="checkout-card">
      <h2>Shipping Information</h2>
      <div className="checkout-card-body">
        {Object.keys(formData).map((field) => (
          <div key={field} className="form-group">
            <label>
              {field.charAt(0).toUpperCase() +
                field.slice(1).replace(/([A-Z])/g, ' $1')}
              <span style={{ color: 'red' }}> *</span>
            </label>
            <input
              type={
                field === 'email'
                  ? 'email'
                  : field === 'phone'
                  ? 'tel'
                  : 'text'
              }
              name={field}
              value={formData[field]}
              onChange={handleChange}
              disabled={formSubmitted || loading}
              className="form-input"
              placeholder={
                field === 'phone'
                  ? '10-digit mobile number'
                  : field === 'pincode'
                  ? '6-digit postal code'
                  : field === 'email'
                  ? 'your@email.com'
                  : field === 'name'
                  ? 'Full Name'
                  : field === 'street'
                  ? 'House no, Street, Area'
                  : ''
              }
              maxLength={
                field === 'phone'
                  ? '10'
                  : field === 'pincode'
                  ? '6'
                  : undefined
              }
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
            ✓ Contact information confirmed
            <button
              onClick={() => setFormSubmitted(false)}
              className="btn-link"
              style={{ marginLeft: '10px', fontSize: '14px' }}
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );

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
                    <img
                      src={item.image}
                      alt={item.name}
                      className="order-item-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="order-item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-quantity">Qty: {item.quantity}</div>
                    <div className="item-unit-price">
                      {formatCurrency(item.price)} each
                    </div>
                  </div>
                </div>
                <div className="item-total">
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-cart-message">
            <p>No items in cart</p>
            <button 
              onClick={() => navigate('/products')}
              className="btn btn-outline"
            >
              Continue Shopping
            </button>
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
          <button
            onClick={() => navigate('/cart')}
            className="btn btn-outline"
          >
            Return to Cart
          </button>
        </div>
      );
    }

    return (
      <div className="checkout-actions">
        <button
          onClick={() => navigate('/cart')}
          className="btn btn-outline"
          disabled={loading}
        >
          Return to Cart
        </button>
        
        {formSubmitted && (
          <div className="payment-methods">
            {/* Payment Method Selection */}
            <div className="payment-method-selector">
              <h3 className="payment-method-title">Select Payment Method</h3>
              
              {/* Online Payment Option */}
              <label 
                className={`payment-option ${paymentMethod === 'online' ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={loading}
                  className="payment-option-radio"
                />
                <div className="payment-option-content">
                  <div className="payment-option-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2"/>
                      <line x1="6" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="payment-option-details">
                    <span className="payment-option-label">Pay Online</span>
                    <span className="payment-option-description">Credit/Debit Card, UPI, Net Banking</span>
                  </div>
                  <div className="payment-option-check">
                    {paymentMethod === 'online' && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="10" fill="#10B981"/>
                        <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </label>

              {/* Cash on Delivery Option */}
              <label 
                className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={loading}
                  className="payment-option-radio"
                />
                <div className="payment-option-content">
                  <div className="payment-option-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="6" width="18" height="12" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="6" cy="12" r="1" fill="currentColor"/>
                      <circle cx="18" cy="12" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="payment-option-details">
                    <span className="payment-option-label">Cash on Delivery</span>
                    <span className="payment-option-description">Pay when you receive your order</span>
                  </div>
                  <div className="payment-option-check">
                    {paymentMethod === 'cod' && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="10" fill="#10B981"/>
                        <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </label>
            </div>

            {/* Payment Action Button */}
            <div className="payment-button-container">
              {paymentMethod === 'online' ? (
                <button
                  onClick={handleOnlinePayment}
                  disabled={loading}
                  className="btn btn-success payment-btn"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Pay {formatCurrency(total)} Now
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCODPayment}
                  disabled={loading}
                  className="btn btn-cod payment-btn"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                        <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="2"/>
                        <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Place Order · {formatCurrency(total)}
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Payment Note */}
            <p className="payment-note">
              {paymentMethod === 'online' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Secure payment powered by CCAvenue
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <path d="M20 7L12 3L4 7M20 7V17L12 21M20 7L12 11M12 21L4 17V7M12 21V11M4 7L12 11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  Pay cash when your order is delivered to you
                </>
              )}
            </p>
          </div>
        )}
        
        {!formSubmitted && (
          <div className="payment-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            Please fill in your contact information to proceed with payment
          </div>
        )}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
  
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
    </div>
  );
}
