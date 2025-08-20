import React, { useState, useEffect } from 'react';
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
  const [contactSaved, setContactSaved] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
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
  }, [user?.id, showToast]);

  const fetchCart = async () => {
    setLoadingCart(true);
    try {
      if (!user?.id) {
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
        setCartItems(guestCart);
      } else {
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            quantity,
            products (product_name, product_price, product_image)
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        setCartItems(
          data.map(item => ({
            id: item.id,
            productId: item.product_id,
            name: item.products.product_name,
            price: item.products.product_price,
            image: item.products.product_image,
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

  const clearCart = React.useCallback(async () => {
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
    
    for (let field of requiredFields) {
      if (!formData[field]?.trim()) {
        showToast(`Please fill out the ${field} field.`, 'error');
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showToast('Please enter a valid email address.', 'error');
      return false;
    }

    // Phone validation (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      showToast('Please enter a valid 10-digit phone number.', 'error');
      return false;
    }

    // Pincode validation (6 digits)
    const pincodeRegex = /^[0-9]{6}$/;
    if (!pincodeRegex.test(formData.pincode)) {
      showToast('Please enter a valid 6-digit pincode.', 'error');
      return false;
    }

    return true;
  };

  // ==================== CALCULATIONS ====================
  
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = 0;
  const total = subtotal + shipping;
  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);

  // ==================== ORDER MANAGEMENT ====================
  
  const handleSaveContactInfo = async () => {
    if (!validateForm()) return;

    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'error');
      return;
    }

    setLoading(true);
    try {
      const product_list = cartItems.map((i) => ({
        product_id: i.productId,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: i.price * i.quantity,
      }));

      const generatedPaymentId = crypto.randomUUID();

      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user?.id || null,
            user_name: formData.name.trim(),
            user_email: formData.email.trim().toLowerCase(),
            user_phone: formData.phone.trim(),
            address_line: formData.street.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postal_code: formData.pincode.trim(),
            product_list,
            total_amount: total,
            payment_status: 'PENDING',
            order_status: 'PROCESSING',
            created_at: new Date().toISOString(),
            payment_id: generatedPaymentId,
          },
        ])
        .select('id, payment_id')
        .single();

      if (error) throw error;

      setSavedOrderId(data.id);
      setPaymentId(data.payment_id);
      setContactSaved(true);
      showToast('Contact info saved! You may now proceed to payment.', 'success');
    } catch (err) {
      console.error('Error saving contact info:', err);
      showToast(`Failed to save contact info: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== PAYMENT PROCESSING ====================
  
  const handlePayment = async () => {
    if (!savedOrderId) {
      showToast('Please save contact info before proceeding to payment.', 'error');
      return;
    }

    setLoading(true);
    try {
      const orderId = paymentId;
      
      const requestBody = {
        order_id: orderId,
        amount: total.toFixed(2),
        currency: 'INR',
        redirect_url: 'https://gcmtshop-cca-backend-kappa.vercel.app/api/paymentResponse',
        cancel_url: 'https://gcmtshop.com/#/payment-cancel',
        language: 'EN',
        billing_name: formData.name.trim(),
        billing_address: formData.street.trim(),
        billing_city: formData.city.trim(),
        billing_state: formData.state.trim(),
        billing_zip: formData.pincode.trim(),
        billing_country: 'India',
        billing_tel: formData.phone.trim(),
        billing_email: formData.email.trim().toLowerCase(),
        merchant_param1: savedOrderId.toString(),
        merchant_param2: user?.id || localStorage.getItem('guest_identifier') || 'guest',
      };

      console.log('🚀 Initiating payment with request:', requestBody);

      const response = await fetch('https://gcmtshop-cca-backend.vercel.app/api/createOrder', {
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
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Backend response:', result);

      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format from backend');
      }

      if (!result.encRequest || typeof result.encRequest !== 'string') {
        throw new Error('Missing or invalid encRequest in backend response');
      }

      if (result.encRequest.trim().length === 0) {
        throw new Error('Empty encRequest received from backend');
      }

      const ACCESS_CODE = result.accessCode || process.env.NEXT_PUBLIC_ACCESS_CODE;
      
      if (!ACCESS_CODE) {
        throw new Error('Access code not available');
      }

      console.log('🔐 Encrypted request details:');
      console.log('- Length:', result.encRequest.length);

      setSavedOrderId(orderId);
      await submitToCCAvenue(result.encRequest, ACCESS_CODE);

    } catch (err) {
      console.error('💥 Payment initiation error:', err);
      showToast(`Payment failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitToCCAvenue = (encRequest, accessCode) => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 Starting CCAvenue form submission...');
        console.log('📊 encRequest length:', encRequest?.length);
        console.log('🔑 accessCode:', accessCode);

        if (!encRequest || typeof encRequest !== 'string' || encRequest.trim().length === 0) {
          throw new Error('Invalid encRequest: empty or not a string');
        }

        if (!accessCode || typeof accessCode !== 'string' || accessCode.trim().length === 0) {
          throw new Error('Invalid accessCode: empty or not a string');
        }

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

        console.log('✅ Form created and ready to submit');
        console.log('- encRequest:', encInput.value.substring(0, 100) + '...');
        console.log('- accessCode:', accessInput.value);

        setTimeout(() => {
          try {
            form.submit();
            console.log('✅ Form submitted successfully');
            resolve();
          } catch (submitError) {
            console.error('❌ Submission error:', submitError);
            reject(new Error(`Form submission failed: ${submitError.message}`));
          }
        }, 100);
      } catch (err) {
        console.error('❌ Error in submitToCCAvenue:', err);
        reject(new Error(`CCAvenue submission setup failed: ${err.message}`));
      }
    });
  };

  const handleCashOnDelivery = () => {
    window.open('https://www.amazon.in/GCMT-Charcoal-Toothpaste-Formula-Whitening/dp/B0F83QJK2L', '_blank', 'noopener,noreferrer');
  };

  // ==================== EVENT LISTENERS ====================
  
  useEffect(() => {
    const handlePaymentMessage = (event) => {
      console.log('📨 Received message:', event);
      
      if (
        event.origin !== window.location.origin &&
        !event.origin.includes('ccavenue.com')
      ) {
        console.log('🚫 Rejected message from:', event.origin);
        return;
      }

      if (event.data && event.data.type === 'PAYMENT_COMPLETE') {
        const { success, orderId } = event.data;
        console.log('💳 Payment complete:', { success, orderId, savedOrderId });
        
        if (success && orderId === savedOrderId) {
          clearCart();
          showToast('Payment successful! Order placed.', 'success');
          navigate(`/order-confirmation/${orderId}`);
        } else {
          showToast('Payment failed. Please try again.', 'error');
        }
      }
    };

    window.addEventListener('message', handlePaymentMessage);
    return () => window.removeEventListener('message', handlePaymentMessage);
  }, [savedOrderId, navigate, showToast, clearCart]);

  // Debug helper
  window.debugCCAvenue = () => {
    const debug = localStorage.getItem('ccavenue_debug');
    const error = localStorage.getItem('ccavenue_error');
    
    console.log('🔍 CCAvenue Debug Info:');
    if (debug) {
      console.log('Debug:', JSON.parse(debug));
    }
    if (error) {
      console.log('Error:', JSON.parse(error));
    }
    
    const forms = document.querySelectorAll('form[data-ccavenue-form="true"]');
    console.log('Remaining CCAvenue forms:', forms.length);
    
    return { debug: debug ? JSON.parse(debug) : null, error: error ? JSON.parse(error) : null };
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
              {[
                'name',
                'email',
                'phone',
                'street',
                'city',
                'state',
                'pincode',
              ].includes(field) && ' *'}
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
              disabled={contactSaved}
              className="form-input"
              placeholder={
                field === 'phone'
                  ? '10-digit mobile number'
                  : field === 'pincode'
                  ? '6-digit postal code'
                  : field === 'email'
                  ? 'your@email.com'
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
        <button
          onClick={handleSaveContactInfo}
          disabled={loading || contactSaved}
          className={`btn btn-primary ${
            contactSaved ? 'btn-disabled' : ''
          }`}
        >
          {loading
            ? 'Saving...'
            : contactSaved
            ? 'Contact Info Saved ✓'
            : 'Submit Contact Info'}
        </button>
      </div>
    </div>
  );

  const renderOrderSummary = () => (
    <div className="checkout-card">
      <h2>Order Summary</h2>
      <div className="checkout-card-body">
        {loadingCart ? (
          <p>Loading cart…</p>
        ) : cartItems.length ? (
          <ul className="order-summary-list">
            {cartItems.map((item, index) => (
              <li
                key={item.id || index}
                className="order-summary-item"
              >
                <div className="order-item-details">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="order-item-image"
                    />
                  )}
                  <div>
                    <div>{item.name}</div>
                    <div>Qty: {item.quantity}</div>
                  </div>
                </div>
                <div>{formatCurrency(item.price * item.quantity)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No items in cart</p>
        )}
        
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="summary-row">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</span>
        </div>
        <div className="summary-row summary-row-total">
          <strong>Total</strong>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>
    </div>
  );

  const handlePaymentClick = () => {
    if (!contactSaved) {
      showToast('Please submit the contact form before you can make a payment.', 'error');
      return;
    }
    handlePayment();
  };

  const handleCashOnDeliveryClick = () => {
    handleCashOnDelivery();
  };

  const renderPaymentActions = () => (
    <div className="checkout-actions">
      <button
        onClick={() => navigate('/cart')}
        className="btn btn-outline"
      >
        Return to Cart
      </button>
      
      <button
        onClick={handlePaymentClick}
        disabled={loading || cartItems.length === 0}
        className="btn btn-success"
      >
        {loading ? 'Processing...' : `Pay ${formatCurrency(total)} with CCAvenue`}
      </button>
      
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button
          onClick={handleCashOnDeliveryClick}
          className="btn btn-warning"
          style={{ marginBottom: '0.5rem' }}
        >
          Pay Cash on Delivery
        </button>
        <div style={{ fontSize: '0.95rem', color: '#555' }}>
          Please Order from amazon for cash on delivery
        </div>
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================
  
  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        <h1 className="checkout-title">Checkout</h1>

        {isMobile ? (
          <>
            {renderOrderSummary()}
            {renderShippingForm()}
            {renderPaymentActions()}
          </>
        ) : (
          <>
            {renderShippingForm()}
            {renderOrderSummary()}
            {renderPaymentActions()}
          </>
        )}

      </div>
    </div>
  );
}