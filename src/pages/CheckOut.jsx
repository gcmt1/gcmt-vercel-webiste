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
  
  const createOrder = async () => {
    if (!validateForm()) return null;

    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'error');
      return null;
    }

    try {
      // Get current user ID (can be null for guests)
      const currentUserId = user?.id || null;

      console.log('📝 Creating order with user ID:', currentUserId);

      const product_list = cartItems.map((item) => ({
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      // Generate unique payment ID for CCAvenue
      const generatedPaymentId = crypto.randomUUID();
      
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
        payment_status: 'PENDING', // Always starts as PENDING for online payment
        order_status: 'PENDING',   // Order pending until payment confirmed
        created_at: new Date().toISOString(),
        payment_id: generatedPaymentId,
      };

      console.log('📋 Order data to be inserted:', {
        ...orderData,
        product_list: orderData.product_list.length + ' items'
      });

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select('id, payment_id, user_id')
        .single();

      if (error) throw error;

      console.log('✅ Order created successfully:', data);

      return {
        orderId: data.id,
        paymentId: data.payment_id,
        userId: data.user_id
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
    showToast('Contact information validated! Click "Pay Now" to proceed with payment.', 'success');
  };

  // ==================== PAYMENT PROCESSING ====================
  
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
      // Create order with PENDING status
      const orderResult = await createOrder();
      if (!orderResult) {
        setLoading(false);
        return;
      }

      const { orderId, paymentId, userId } = orderResult;
      
      console.log('📦 Order created for payment:', { orderId, paymentId, userId });
      
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
                `Pay ${formatCurrency(total)} Now`
              )}
            </button>
            <p className="payment-note">
              🔒 Secure payment powered by CCAvenue
            </p>
          </div>
        )}
        
        {!formSubmitted && (
          <div className="payment-info">
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