import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';
import '../styles/AuthPage.css';

function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const session = useSession(); // Use the session from context

  useEffect(() => {
    // Only create guest account if no session exists
    if (!session) {
      createGuestAccountIfNeeded();
    }
  }, [session]);

  const createGuestAccountIfNeeded = async () => {
    console.log('🔍 Checking for existing guest account...');
    
    // Check if we already have a guest session stored
    const storedGuestId = localStorage.getItem('guest_user_id');
    const storedGuestEmail = localStorage.getItem('guest_user_email');
    const storedGuestPassword = localStorage.getItem('guest_user_password');
    
    if (storedGuestId && storedGuestEmail && storedGuestPassword) {
      console.log('🔄 Found existing guest credentials, attempting to restore session...');
      
      try {
        // Try to sign in with existing guest credentials
        const { data, error } = await supabase.auth.signInWithPassword({
          email: storedGuestEmail,
          password: storedGuestPassword,
        });

        if (error) {
          console.log('⚠️ Failed to restore guest session, creating new one...', error.message);
          // Clear invalid credentials
          localStorage.removeItem('guest_user_id');
          localStorage.removeItem('guest_user_email');
          localStorage.removeItem('guest_user_password');
          // Create new guest account
          await createNewGuestAccount();
        } else if (data?.user) {
          console.log('✅ Guest session restored successfully!');
          return;
        }
      } catch (err) {
        console.error('❌ Error restoring guest session:', err);
        await createNewGuestAccount();
      }
    } else {
      console.log('🆕 No existing guest account found, creating new one...');
      await createNewGuestAccount();
    }
  };

  const createNewGuestAccount = async () => {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const guestEmail = `guest_${randomSuffix}@example.com`;
    const guestPassword = Math.random().toString(36).substring(2, 10);

    console.log('🔨 Creating new guest account...');

    const { data, error } = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPassword,
    });

    if (error) {
      console.error('❌ Failed to create guest account:', error);
      showToast('Failed to create guest session. Please try again.', 'error');
    } else if (data?.user) {
      const userId = data.user.id;
      
      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: userId,
        email: guestEmail,
        name: 'Guest User',
        role: 'guest'
      });

      if (profileError) {
        console.error('❌ Failed to create guest profile:', profileError);
        showToast('Failed to create guest profile. Please try again.', 'error');
      } else {
        // Store guest credentials for session restoration
        localStorage.setItem('guest_user_id', userId);
        localStorage.setItem('guest_user_email', guestEmail);
        localStorage.setItem('guest_user_password', guestPassword);
        console.log('✅ New guest account created and credentials saved');
      }
    }
  };

  const handleSignUp = async () => {
    if (!name) {
      showToast('❌ Please enter your name for sign-up.', 'error');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      showToast(`❌ ${error.message}`, 'error');
    } else {
      showToast('✅ Sign-up successful! Check your email to confirm.', 'success');

      if (data.user) {
        const userId = data.user.id;
        const { error: profileError } = await supabase.from('users').insert({
          id: userId,
          email,
          name,
          role: 'user' // default role
        });

        if (profileError) {
          showToast(`❌ ${profileError.message}`, 'error');
        }
      }

      navigate('/');
    }

    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showToast(`❌ ${error.message}`, 'error');
    } else if (data?.session?.user) {
      showToast('✅ Logged in successfully!', 'success');
      
      // Clear guest credentials since user is now logged in with real account
      localStorage.removeItem('guest_user_id');
      localStorage.removeItem('guest_user_email');
      localStorage.removeItem('guest_user_password');
      
      await mergeGuestCart(data.session.user.id);

      const userId = data.session.user.id;

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Failed to fetch user profile:', profileError);
      }

      if (!userProfile) {
        await supabase.from('users').insert({
          id: userId,
          email,
          name: name || '',
          role: 'user'
        });
        navigate('/');
      } else if (userProfile.role === 'admin') {
        navigate('/admin-landing');
      } else {
        navigate('/');
      }
    }

    setLoading(false);
  };

  const mergeGuestCart = async (userId) => {
    const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
    
    if (guestCart.length === 0) {
      return; // No guest cart to merge
    }

    console.log('🔄 Merging guest cart to user account...');
    
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
        showToast(`❌ Failed to merge cart for ${item.productId}`, 'error');
      }
    }
    
    sessionStorage.removeItem('guest_cart');
    showToast('✅ Guest cart merged to your account!', 'success');
  };

  // Show loading state while session is being determined
  if (session === undefined) {
    return (
      <div className="auth-page">
        <div className="loading-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Login / Sign Up</h1>
      
      {session && session.user?.email?.includes('guest_') && (
        <div className="guest-notice">
          <p>🎭 You're currently browsing as a guest. Login or sign up to save your orders and preferences!</p>
        </div>
      )}
      
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      <input
        type="text"
        placeholder="Name (for sign-up only)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />
      <button onClick={handleSignUp} disabled={loading}>
        {loading ? 'Processing...' : 'Sign Up'}
      </button>
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Processing...' : 'Log In'}
      </button>
    </div>
  );
}

export default AuthPage;