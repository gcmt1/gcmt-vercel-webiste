import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom'; // 🔥 ADDED
import '../styles/CartPage.css';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';

function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate(); // 🔥 ADDED

  useEffect(() => {
    let isMounted = true;

    const fetchCartItems = async () => {
      setLoading(true);
      try {
        if (!user?.id) {
          const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
          if (isMounted) setCartItems(guestCart);
        } else {
          const { data, error } = await supabase
            .from('cart_items')
            .select(`
              id,
              product_id,
              quantity,
              products (
                product_name,
                product_price,
                product_image
              )
            `)
            .eq('user_id', user.id);

          if (error) throw error;

          if (isMounted) {
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
        }
      } catch (err) {
        console.error('Fetch cart error:', err.message);
        showToast('Failed to load cart', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCartItems();

    return () => {
      isMounted = false;
    };
  }, [user?.id, showToast]);

  const updateQuantity = async (productId, change) => {
    const updatedItems = cartItems.map(item =>
      item.productId === productId
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    );
    setCartItems(updatedItems);

    try {
      if (user) {
        const updatedItem = updatedItems.find(i => i.productId === productId);
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: updatedItem.quantity })
          .eq('user_id', user.id)
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        sessionStorage.setItem('guest_cart', JSON.stringify(updatedItems));
      }
      showToast('Quantity updated', 'success');
    } catch (err) {
      console.error('Update quantity error:', err.message);
      showToast('Failed to update quantity', 'error');
    }
  };

  const removeItem = async productId => {
    const updatedItems = cartItems.filter(item => item.productId !== productId);
    setCartItems(updatedItems);

    try {
      if (user) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        sessionStorage.setItem('guest_cart', JSON.stringify(updatedItems));
      }
      showToast('Item removed', 'success');
    } catch (err) {
      console.error('Remove item error:', err.message);
      showToast('Failed to remove item', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    showToast('Redirecting to checkout...', 'success'); // ✅ Toast message
    navigate('/checkout'); // ✅ Redirect immediately
  };

  const calculateTotal = () =>
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
  const calculateSubtotal = (price, quantity) => price * quantity;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold mb-8 text-gray-800">Shopping Cart</h1>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-pulse">
            <div className="h-8 w-28 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 w-full bg-gray-200 rounded mb-4"></div>
            <div className="h-32 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : cartItems.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-medium text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
          <a href="#/products" className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors">
            Continue Shopping
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="hidden md:grid grid-cols-12 border-b py-4 px-6 text-sm font-medium text-gray-500">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-center">Subtotal</div>
              </div>

              {cartItems.map(item => (
                <div key={item.productId} className="grid grid-cols-1 md:grid-cols-12 py-6 px-4 md:px-6 border-b last:border-b-0 items-center">
                  <div className="col-span-6 flex items-center mb-4 md:mb-0">
                    <div className="relative h-20 w-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 size={16} className="mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2 text-center text-gray-800 md:font-medium">
                    <span className="inline-block md:hidden text-gray-500 mr-2">Price:</span>
                    ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="col-span-2 flex justify-center my-4 md:my-0">
                    <div className="flex items-center border rounded-md">
                      <button
                        type="button"
                        className="flex items-center justify-center h-8 w-8 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                        onClick={() => updateQuantity(item.productId, -1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        disabled={item.quantity === 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        className="flex items-center justify-center h-8 w-8 text-gray-600 hover:text-gray-800"
                        onClick={() => updateQuantity(item.productId, 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2 text-center font-medium text-gray-900">
                    <span className="inline-block md:hidden text-gray-500 mr-2">Subtotal:</span>
                    ₹{calculateSubtotal(item.price, item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 sticky top-8">
              <h2 className="text-lg font-semibold mb-4 pb-4 border-b">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              
              <div className="flex justify-between font-semibold text-lg pt-4 border-t">
                <span>Total</span>
                <span>₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <button 
                type="button" 
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-md font-medium transition-colors flex items-center justify-center"
                onClick={handlePlaceOrder}
              >
                Proceed to Checkout
              </button>
              
              <div className="mt-4 text-center">
                <a href="#/products" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                  Continue Shopping
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartPage;
