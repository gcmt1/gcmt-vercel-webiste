import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom';
import '../styles/CheckOut.css';

export default function Checkout() {
  const { user, setUser } = useAppContext(); // Make sure setUser is available from context
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
  const [autoCreatedAccount, setAutoCreatedAccount] = useState(false); // Track if account was auto-created
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  // ==================== AUTO LOGIN ON PAGE LOAD ====================
  
  useEffect(() => {
    checkSavedCredentials();
  }, []);

  const checkSavedCredentials = async () => {
    try {
      const savedEmail = localStorage.getItem('user_email');
      const savedPassword = localStorage.getItem('user_password');
      
      if (savedEmail && savedPassword && !user?.id) {
        console.log('🔄 Attempting auto-login with saved credentials...');
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: savedEmail,
          password: savedPassword,
        });

        if (error) {
          console.log('❌ Auto-login failed:', error.message);
          // Clear invalid credentials
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_password');
        } else if (data?.session?.user) {
          console.log('✅ Auto-login successful');
          // The AppContext should handle the user state update
          await mergeGuestCart(data.session.user.id);
        }
      }
    } catch (err) {
      console.error('Auto-login error:', err);
    }
  };

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
      if (showToast) showToast('Failed to load cart', 'error');
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
      showToast('Failed to clear cart', 'error');
    }
  }, [user?.id, showToast]);

  const mergeGuestCart = async (userId) => {
    try {
      const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
      
      for (const item of guestCart) {
        const { error } = await supabase.from('cart_items').upsert(
          {
            user_id: userId,
            product_id: item.productId,
            quantity: item.quantity,
          },
          { onConflict: ['user_id', 'product_id'] }
        );

        if (error) {
          console.error('Cart merge error:', error);
        }
      }
      
      sessionStorage.removeItem('guest_cart');
      console.log('✅ Guest cart merged successfully');
    } catch (err) {
      console.error('Error merging guest cart:', err);
    }
  };

  // ==================== AUTO ACCOUNT CREATION ====================
  
  const createAccountSilently = async (email, name, password) => {
    try {
      console.log('🔄 Creating account silently...');
      
      // Check if user already exists by trying to sign in first
      const { data: existingSignIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (existingSignIn?.session?.user && !signInError) {
        console.log('✅ User already exists, signed in successfully');
        await mergeGuestCart(existingSignIn.session.user.id);
        
        // Save credentials to localStorage
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_password', password);
        
        // Update user context manually if setUser is available
        if (setUser && typeof setUser === 'function') {
          setUser(existingSignIn.session.user);
        }
        
        return existingSignIn.session.user;
      }

      // Create new account if sign in failed
      console.log('🆕 Creating new account...');
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { name: name },
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error.message);
        
        // If email already exists, try to sign in with different password patterns
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          console.log('🔄 Email exists, trying to sign in...');
          
          // Try common password patterns
          const passwordAttempts = [
            password,
            name,
            email.split('@')[0], // email username
            `${name}123`,
            `${name.toLowerCase()}`,
          ];
          
          for (const pwd of passwordAttempts) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: email,
              password: pwd,
            });

            if (!signInError && signInData?.session?.user) {
              console.log('✅ Successfully signed in with existing account');
              await mergeGuestCart(signInData.session.user.id);
              
              // Save the working credentials
              localStorage.setItem('user_email', email);
              localStorage.setItem('user_password', pwd);
              
              // Update user context
              if (setUser && typeof setUser === 'function') {
                setUser(signInData.session.user);
              }
              
              return signInData.session.user;
            }
          }
        }
        
        return null;
      }

      if (data?.user) {
        console.log('✅ Account created successfully, now signing in...');
        
        const userId = data.user.id;
        
        // Create user profile
        const { error: profileError } = await supabase.from('users').insert({
          id: userId,
          email: email,
          name: name,
          role: 'user'
        });

        if (profileError) {
          console.error('❌ Failed to create user profile:', profileError);
        }

        // Sign in the newly created user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (!signInError && signInData?.session?.user) {
          console.log('✅ New user signed in successfully');
          await mergeGuestCart(signInData.session.user.id);
          
          // Save credentials to localStorage
          localStorage.setItem('user_email', email);
          localStorage.setItem('user_password', password);
          
          // Update user context
          if (setUser && typeof setUser === 'function') {
            setUser(signInData.session.user);
          }
          
          return signInData.session.user;
        } else {
          console.error('❌ Failed to sign in new user:', signInError);
        }
      }

      return null;
    } catch (err) {
      console.error('Error in createAccountSilently:', err);
      return null;
    }
  };

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
  
  // 🔥 FIXED: Modified to properly handle payment status
  const createOrder = async (paymentMethod = 'ONLINE', paymentStatus = 'PENDING') => {
    if (!validateForm()) return null;

    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'error');
      return null;
    }

    try {
      // Get the current user from the latest session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || user?.id;

      console.log('📝 Creating order with user ID:', currentUserId);

      const product_list = cartItems.map((item) => ({
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const generatedPaymentId = crypto.randomUUID();
      
      // 🔥 FIXED: Set proper payment status based on payment method
      let finalPaymentStatus, orderStatus;
      
      if (paymentMethod === 'COD') {
        finalPaymentStatus = 'CASH_ON_DELIVERY';
        orderStatus = 'CONFIRMED';
      } else {
        // For online payments, always start with PENDING
        finalPaymentStatus = 'PENDING';
        orderStatus = 'PROCESSING';
      }

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
        payment_status: finalPaymentStatus, // 🔥 FIXED: Use proper status
        order_status: orderStatus,
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

    setLoading(true);

    try {
      // Create account silently if user is not logged in
      if (!user?.id) {
        console.log('🔄 User not logged in, creating account silently...');
        
        // Use name as password
        const password = formData.name.trim();
        const email = formData.email.trim().toLowerCase();
        const name = formData.name.trim();

        const createdUser = await createAccountSilently(email, name, password);
        
        if (createdUser) {
          setAutoCreatedAccount(true);
          console.log('✅ Account created and signed in silently');
          
          // Update the user context and wait for it to propagate
          // The AppContext should handle this automatically via Supabase auth state changes
          
          // Wait a bit longer for the user context to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Refresh cart with new user context
          await fetchCart();
        } else {
          console.log('⚠️ Could not create account, proceeding as guest');
        }
      }

      setFormSubmitted(true);
      showToast('Contact information validated! Choose your payment method below.', 'success');
      
    } catch (err) {
      console.error('Error in handleSubmitForm:', err);
      showToast('Information validated! Choose your payment method below.', 'success');
      setFormSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PAYMENT PROCESSING ====================
  
  const handleOnlinePayment = async () => {
    if (!formSubmitted) {
      showToast('Please submit your contact information first.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Ensure we have the latest session before creating order
      const { data: { session } } = await supabase.auth.getSession();
      console.log('💳 Current session before payment:', session?.user?.id);

      // 🔥 FIXED: Create order with PENDING status for online payment
      const orderResult = await createOrder('ONLINE', 'PENDING');
      if (!orderResult) return;

      const { orderId, paymentId, userId } = orderResult;
      
      console.log('📦 Order created for payment:', { orderId, paymentId, userId });
      
      const requestBody = {
        order_id: paymentId,
        amount: total.toFixed(2),
        currency: 'INR',
        redirect_url: 'https://gcmtshop-cca-backend-kappa.vercel.app/api/paymentResponse',
        cancel_url: 'https://gcmtshop.com/payment-cancel',
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
        merchant_param2: userId || localStorage.getItem('guest_identifier') || 'guest',
      };

      console.log('🚀 Initiating payment with request:', requestBody);

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
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Backend response:', result);

      if (!result?.encRequest || typeof result.encRequest !== 'string' || result.encRequest.trim().length === 0) {
        throw new Error('Invalid payment response from server');
      }

      const ACCESS_CODE = result.accessCode || process.env.NEXT_PUBLIC_ACCESS_CODE;
      if (!ACCESS_CODE) {
        throw new Error('Access code not available');
      }

      await submitToCCAvenue(result.encRequest, ACCESS_CODE);

    } catch (err) {
      console.error('💥 Payment initiation error:', err);
      showToast(`Payment failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCashOnDelivery = async () => {
    if (!formSubmitted) {
      showToast('Please submit your contact information first.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Ensure we have the latest session before creating order
      const { data: { session } } = await supabase.auth.getSession();
      console.log('💰 Current session before COD order:', session?.user?.id);

      // Create order for cash on delivery
      const orderResult = await createOrder('COD', 'CASH_ON_DELIVERY');
      if (!orderResult) return;

      const { orderId, userId } = orderResult;
      
      console.log('📦 COD Order created:', { orderId, userId });

      // Clear cart and redirect
      await clearCart();
      
      // Show account creation message if account was created
      if (autoCreatedAccount) {
        showToast('Order placed successfully! Your account has been created automatically. You can use your email and name to login next time.', 'success');
      } else {
        showToast('Order placed successfully! You will pay cash on delivery.', 'success');
      }
      
      // Navigate to success page
      setTimeout(() => {
        navigate('/payment-success', { 
          state: { 
            orderId: orderId,
            paymentMethod: 'COD',
            accountCreated: autoCreatedAccount,
            credentials: autoCreatedAccount ? {
              email: formData.email.trim().toLowerCase(),
              password: formData.name.trim()
            } : null
          }
        });
      }, 2000);

    } catch (err) {
      console.error('Error placing COD order:', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitToCCAvenue = (encRequest, accessCode) => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 Starting CCAvenue form submission...');

        if (!encRequest || typeof encRequest !== 'string' || encRequest.trim().length === 0) {
          throw new Error('Invalid encRequest: empty or not a string');
        }

        if (!accessCode || typeof accessCode !== 'string' || accessCode.trim().length === 0) {
          throw new Error('Invalid accessCode: empty or not a string');
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

        console.log('✅ Form created and ready to submit');

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
        console.log('💳 Payment complete:', { success, orderId });
        
        if (success) {
          clearCart();
          
          // Show account creation message if account was created
          if (autoCreatedAccount) {
            showToast('Payment successful! Your account has been created automatically.', 'success');
          } else {
            showToast('Payment successful! Order placed.', 'success');
          }
          
          navigate(`/order-confirmation/${orderId}`, {
            state: {
              accountCreated: autoCreatedAccount,
              credentials: autoCreatedAccount ? {
                email: formData.email.trim().toLowerCase(),
                password: formData.name.trim()
              } : null
            }
          });
        } else {
          showToast('Payment failed. Please try again.', 'error');
        }
      }
    };

    window.addEventListener('message', handlePaymentMessage);
    return () => window.removeEventListener('message', handlePaymentMessage);
  }, [navigate, showToast, clearCart, autoCreatedAccount, formData]);

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
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Processing...' : 'Submit Contact Information'}
          </button>
        )}
        
        {formSubmitted && (
          <div className="success-message">
            ✓ Contact information submitted successfully
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
    if (!formSubmitted || cartItems.length === 0) {
      return (
        <div className="checkout-actions">
          <button
            onClick={() => navigate('/cart')}
            className="btn btn-outline"
          >
            Return to Cart
          </button>
          {!formSubmitted && (
            <div className="payment-info">
              Submit your contact information to choose payment method
            </div>
          )}
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
        
        <div className="payment-methods">
          <h3>Choose Payment Method</h3>
          
          <button
            onClick={handleOnlinePayment}
            disabled={loading}
            className="btn btn-success payment-btn"
          >
            {loading ? 'Processing...' : `Pay ${formatCurrency(total)} Online`}
          </button>
          
          <div className="payment-divider">
            OR
          </div>
          
          <button
            onClick={handleCashOnDelivery}
            disabled={loading}
            className="btn btn-secondary payment-btn"
          >
            {loading ? 'Processing...' : 'Cash on Delivery'}
          </button>
        </div>
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
            <span className={`step ${true ? 'active' : ''}`}>1. Cart</span>
            <span className={`step ${formSubmitted ? 'active' : ''}`}>2. Information</span>
            <span className="step">3. Payment</span>
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