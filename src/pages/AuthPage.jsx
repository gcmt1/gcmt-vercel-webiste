import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom';
import '../styles/AuthPage.css';

function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    createGuestAccountIfNeeded();
  }, []);

  const createGuestAccountIfNeeded = async () => {
    const guestId = localStorage.getItem('guest_user_id');
    if (!guestId) {
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const guestEmail = `guest_${randomSuffix}@example.com`;
      const guestPassword = Math.random().toString(36).substring(2, 10);

      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
      });

      if (error) {
        console.error('❌ Failed to create guest account:', error);
      } else if (data?.user) {
        const userId = data.user.id;
        const { error: profileError } = await supabase.from('users').insert({
          id: userId,
          email: guestEmail,
          name: 'Guest User',
          role: 'guest'
        });

        if (profileError) {
          console.error('❌ Failed to create guest profile:', profileError);
        } else {
          localStorage.setItem('guest_user_id', userId);
          console.log('✅ Guest account created and saved to localStorage');
        }
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

  return (
    <div className="auth-page">
      <h1>Login / Sign Up</h1>
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
