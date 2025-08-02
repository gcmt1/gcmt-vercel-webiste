import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/AdminPage.css';
import { Package, UserPlus, Mail } from 'lucide-react';

export default function AdminLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!(await checkAdmin())) return;
    })();
  }, []);

  const checkAdmin = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      navigate('/#/AuthPage');
      return false;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileErr || profile.role !== 'admin') {
      navigate('/');
      return false;
    }

    return true;
  };

  return (
    <div className="admin-landing min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">

        <div
          onClick={() => navigate('/admin-order')}
          className="admin-card bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer p-6 text-center"
        >
          <Package className="mx-auto text-green-600 mb-4" size={32} />
          <h2 className="text-lg font-semibold text-gray-700">Orders Management</h2>
          <p className="text-sm text-gray-500 mt-2">View and manage product orders</p>
        </div>

        <div
          onClick={() => navigate('/admin-subscription')}
          className="admin-card bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer p-6 text-center"
        >
          <UserPlus className="mx-auto text-blue-600 mb-4" size={32} />
          <h2 className="text-lg font-semibold text-gray-700">Newsletter Subscribers</h2>
          <p className="text-sm text-gray-500 mt-2">View all email subscriptions</p>

        </div>

                <div
          onClick={() => navigate('/admin-product-manager')}
          className="admin-card bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer p-6 text-center"
        >
          <UserPlus className="mx-auto text-blue-600 mb-4" size={32} />
          <h2 className="text-lg font-semibold text-gray-700">Admin Product Management</h2>
          <p className="text-sm text-gray-500 mt-2">View & Manage Products</p>
        </div>

        <div
          onClick={() => navigate('/admin-contactform')}
          className="admin-card bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer p-6 text-center"
        >
          <Mail className="mx-auto text-purple-600 mb-4" size={32} />
          <h2 className="text-lg font-semibold text-gray-700">Contact Form Submissions</h2>
          <p className="text-sm text-gray-500 mt-2">See who reached out via contact form</p>
        </div>

      </div>
    </div>
  );
}
