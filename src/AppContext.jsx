import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        // Create guest account
        const guestEmail = `${crypto.randomUUID()}@guest.local`;
        const guestPass = crypto.randomUUID();
        const { data, error } = await supabase.auth.signUp({
          email: guestEmail,
          password: guestPass,
        });
        if (!error) {
          await supabase.from('users').update({ is_guest: true }).eq('id', data.user.id);
          setUser(data.user);
        }
      }
    };

    initSession();

    const handleUnload = async () => {
      if (user && user.email.endsWith('@guest.local')) {
        await supabase.from('users').delete().eq('id', user.id);
        await supabase.auth.signOut();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);

  return (
    <AppContext.Provider value={{ user }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
