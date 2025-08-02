// src/hooks/useCart.js
import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const useCart = () => {
  const [loading, setLoading] = useState(false);

  const addToCart = async (productId, quantity = 1) => {
    setLoading(true);
    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = session?.user;

      if (user) {
        // Check for existing item
        const { data: existing, error: selectError } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        if (existing) {
          const { error: updErr } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);

          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('cart_items')
            .insert([{ user_id: user.id, product_id: productId, quantity }]);

          if (insErr) throw insErr;
        }

        return true;
      } else {
        // Guest user
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
        const idx = guestCart.findIndex(i => i.productId === productId);

        if (idx > -1) {
          guestCart[idx].quantity += quantity;
        } else {
          guestCart.push({ productId, quantity });
        }
        sessionStorage.setItem('guest_cart', JSON.stringify(guestCart));

        return true;
      }
    } catch (err) {
      console.error('🚨 Cart error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { addToCart, loading };
};
