// HomePage.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowRight, Instagram, Star, Shield, Truck, Award, Leaf, X, ShoppingBag, Eye, Heart, ChevronDown, MousePointer2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';
import GCMTVideo from '../assets/marketing-video.mp4';
import GCMTLogo from '../assets/GCMT-logo.png';
import DefaultProductImage from '../assets/product.png';

/* ─── First-Time User Guide Overlay (Single Step) ─── */
const FirstTimeGuide = ({ onClose, buyNowBtnRef }) => {
  const [spotlightStyle, setSpotlightStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});
  const [messageStyle, setMessageStyle] = useState({});
  const [isExiting, setIsExiting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const updatePositions = useCallback(() => {
    if (!buyNowBtnRef || !buyNowBtnRef.current) return;

    const rect = buyNowBtnRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    const padding = 8;
    setSpotlightStyle({
      top: rect.top + scrollY - padding,
      left: rect.left + scrollX - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      borderRadius: '12px',
    });

    // Position arrow above the button
    setArrowStyle({
      top: rect.top + scrollY - 70,
      left: rect.left + scrollX + rect.width / 2 - 24,
    });

    // Position message above the arrow
    const messageWidth = Math.min(320, window.innerWidth - 40);
    let messageLeft = rect.left + scrollX + rect.width / 2 - messageWidth / 2;
    
    // Keep message within viewport
    if (messageLeft < 20) messageLeft = 20;
    if (messageLeft + messageWidth > window.innerWidth - 20) {
      messageLeft = window.innerWidth - messageWidth - 20;
    }

    setMessageStyle({
      top: rect.top + scrollY - 200,
      left: messageLeft,
      width: messageWidth,
    });
  }, [buyNowBtnRef]);

  useEffect(() => {
    if (!buyNowBtnRef || !buyNowBtnRef.current) return;

    // Scroll the hero section into view smoothly
    buyNowBtnRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    const timer = setTimeout(() => {
      updatePositions();
      setIsReady(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [buyNowBtnRef, updatePositions]);

  useEffect(() => {
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions);
    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions);
    };
  }, [updatePositions]);

  const handleGotIt = () => {
    setIsExiting(true);
    setTimeout(() => {
      localStorage.setItem('gcmt_guide_seen', 'true');
      onClose();
    }, 400);
  };

  const handleSkip = () => {
    handleGotIt();
  };

  return (
    <div className={`hp-guide-overlay ${isExiting ? 'hp-guide-overlay--exiting' : ''}`}>
      {/* Dark backdrop with cutout */}
      <svg className="hp-guide-backdrop" preserveAspectRatio="none">
        <defs>
          <mask id="hp-guide-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {isReady && (
              <rect
                x={spotlightStyle.left}
                y={spotlightStyle.top}
                width={spotlightStyle.width}
                height={spotlightStyle.height}
                rx="12"
                ry="12"
                fill="black"
                className="hp-guide-spotlight-rect"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.8)"
          mask="url(#hp-guide-mask)"
        />
      </svg>

      {/* Glowing border around spotlight */}
      {isReady && (
        <div
          className="hp-guide-spotlight-border"
          style={{
            top: spotlightStyle.top,
            left: spotlightStyle.left,
            width: spotlightStyle.width,
            height: spotlightStyle.height,
            borderRadius: spotlightStyle.borderRadius,
          }}
        />
      )}

      {/* Animated pointing arrow */}
      {isReady && (
        <div
          className="hp-guide-arrow hp-guide-arrow--down"
          style={{
            top: arrowStyle.top,
            left: arrowStyle.left,
          }}
        >
          <div className="hp-guide-arrow-inner">
            <MousePointer2 size={28} />
          </div>
        </div>
      )}

      {/* Message box */}
      {isReady && (
        <div
          className="hp-guide-message"
          style={{
            top: messageStyle.top,
            left: messageStyle.left,
            width: messageStyle.width,
          }}
        >
          <div className="hp-guide-message-content">
            <div className="hp-guide-message-emoji">👋</div>
            <h3 className="hp-guide-message-title">Welcome!</h3>
            <p className="hp-guide-message-text">
              Click this <strong>"Buy Now"</strong> button to buy the product.
            </p>
            <p className="hp-guide-message-sub">
              It's easy and fast!
            </p>

            <div className="hp-guide-message-actions">
              <button className="hp-guide-skip-btn" onClick={handleSkip}>
                Skip
              </button>
              <button className="hp-guide-next-btn" onClick={handleGotIt}>
                Got it! 👍
              </button>
            </div>
          </div>

          {/* Decorative pulse */}
          <div className="hp-guide-message-pulse" />
        </div>
      )}

      {/* Close button (top right) */}
      <button className="hp-guide-close-btn" onClick={handleGotIt} aria-label="Close guide">
        <X size={20} />
      </button>

      {/* Top banner */}
      <div className="hp-guide-top-banner">
        <span className="hp-guide-top-banner-icon">🎯</span>
        <span>Quick Guide — See how to buy in seconds!</span>
      </div>
    </div>
  );
};


/* ─── Hero Product Card Component ─── */
const HeroProductCard = React.forwardRef(({ productId, buyNowBtnRef }, ref) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error.message);
        setError('Could not load product.');
      } else {
        let imageUrl = DefaultProductImage;
        let rawImagePath = data.product_image || '';
        if (data.product_image) {
          let firstImage = data.product_image;
          if (data.product_image.includes(',')) {
            firstImage = data.product_image.split(',')[0].trim();
          }
          const { data: imageData, error: imageError } = supabase
            .storage
            .from('product-image')
            .getPublicUrl(firstImage);
          if (!imageError && imageData && imageData.publicUrl) {
            imageUrl = imageData.publicUrl;
          }
          rawImagePath = firstImage;
        }

        const productData = {
          id: data.id,
          name: data.product_name,
          shortDescription: data.product_sub_description,
          price: Number(data.product_price),
          priceFormatted: Number(data.product_price).toFixed(2),
          discount: data.product_discount ? `${data.product_discount}%` : null,
          discountValue: data.product_discount || 0,
          discountPrice: data.product_discount
            ? +(data.product_price * (1 - data.product_discount / 100)).toFixed(2)
            : null,
          image: imageUrl,
          rawImagePath: rawImagePath,
          category: data.category,
          rating: data.rating || 4.5,
          inStock: data.in_stock !== false,
        };
        setProduct(productData);
      }
      setLoading(false);
    }
    fetchProduct();
  }, [productId]);

  const handleBuyNow = async (e) => {
    e.stopPropagation();
    if (!product || !product.inStock) return;

    try {
      setBuyNowLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { data: existingItems, error: fetchError } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', authUser.id)
          .eq('product_id', product.id);

        if (fetchError) {
          console.error('Error checking cart:', fetchError);
          throw new Error('Failed to check cart');
        }

        if (existingItems && existingItems.length > 0) {
          const existingItem = existingItems[0];
          const newQuantity = existingItem.quantity + 1;

          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.id);

          if (updateError) {
            console.error('Error updating cart item:', updateError);
            throw new Error('Failed to update cart');
          }
        } else {
          const { error: insertError } = await supabase
            .from('cart_items')
            .insert({
              user_id: authUser.id,
              product_id: product.id,
              quantity: 1,
            });

          if (insertError) {
            console.error('Error inserting cart item:', insertError);
            throw new Error('Failed to add to cart');
          }
        }

        navigate('/checkout');

      } else {
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];

        const existingIndex = guestCart.findIndex(
          item => item.productId === product.id
        );

        if (existingIndex !== -1) {
          guestCart[existingIndex].quantity += 1;
        } else {
          guestCart.push({
            id: `guest_${product.id}_${Date.now()}`,
            productId: product.id,
            name: product.name,
            price: product.discountPrice || product.price,
            image: product.rawImagePath,
            quantity: 1,
          });
        }

        sessionStorage.setItem('guest_cart', JSON.stringify(guestCart));
        navigate('/checkout');
      }

    } catch (err) {
      console.error('Buy Now error:', err);
      alert(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBuyNowLoading(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${productId}`);
  };

  const toggleFavorite = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="hp-hero-product-card hp-hero-product-card--skeleton" ref={ref}>
        <div className="hp-hero-product-card__skeleton-image" />
        <div className="hp-hero-product-card__skeleton-content">
          <div className="hp-hero-product-card__skeleton-title" />
          <div className="hp-hero-product-card__skeleton-text" />
          <div className="hp-hero-product-card__skeleton-price" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="hp-hero-product-card hp-hero-product-card--error" ref={ref}>{error}</div>;
  }

  return (
    <div
      className="hp-hero-product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={ref}
    >
      <div className="hp-hero-product-card__inner" onClick={handleCardClick}>
        <div className="hp-hero-product-card__image-container">
          <img
            src={product.image}
            alt={product.name}
            className="hp-hero-product-card__image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DefaultProductImage;
            }}
          />

          {product.discount && (
            <div className="hp-hero-product-card__discount-badge">
              -{product.discount} OFF
            </div>
          )}

          {!product.inStock && (
            <div className="hp-hero-product-card__out-of-stock-overlay">
              <span>Out of Stock</span>
            </div>
          )}

          <div
            className={`hp-hero-product-card__actions ${
              isHovered ? 'hp-hero-product-card__actions--show' : ''
            }`}
          >
            <button
              className="hp-hero-product-card__action-btn hp-hero-product-card__quick-view-btn"
              onClick={handleQuickView}
              aria-label="Quick view"
            >
              <Eye size={16} />
            </button>
            <button
              className={`hp-hero-product-card__action-btn hp-hero-product-card__favorite-btn ${
                isFavorite ? 'hp-hero-product-card__favorite--active' : ''
              }`}
              onClick={toggleFavorite}
              aria-label="Add to favorites"
            >
              <Heart size={16} />
            </button>
          </div>
        </div>

        <div className="hp-hero-product-card__info">
          {product.category && (
            <div className="hp-hero-product-card__category">{product.category}</div>
          )}

          <h3 className="hp-hero-product-card__name">{product.name}</h3>

          <div className="hp-hero-product-card__rating">
            <div className="hp-hero-product-card__stars">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  fill={i < Math.floor(product.rating) ? '#FFB800' : 'none'}
                  stroke={
                    i < Math.floor(product.rating) ? '#FFB800' : '#CBD5E0'
                  }
                />
              ))}
            </div>
            <span className="hp-hero-product-card__rating-value">
              {product.rating}
            </span>
          </div>

          <div className="hp-hero-product-card__price-container">
            {product.discountPrice ? (
              <>
                <span className="hp-hero-product-card__price--current">
                  ₹{product.discountPrice}
                </span>
                <span className="hp-hero-product-card__price--original">
                  ₹{product.priceFormatted}
                </span>
              </>
            ) : (
              <span className="hp-hero-product-card__price--current">
                ₹{product.priceFormatted}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="hp-hero-product-card__footer"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="hp-hero-product-card__buy-now-btn"
          onClick={handleBuyNow}
          disabled={!product.inStock || buyNowLoading}
          ref={buyNowBtnRef}
        >
          {buyNowLoading ? (
            <span>Adding...</span>
          ) : (
            <>
              <ShoppingBag size={16} />
              <span>{product.inStock ? 'Buy Now' : 'Out of Stock'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

HeroProductCard.displayName = 'HeroProductCard';


/* ─── Inline "Buy Now" Product Card (for products section) ─── */
const HomepageProductCard = React.forwardRef(({ productId, isFirstCard }, ref) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error.message);
        setError('Could not load product.');
      } else {
        let imageUrl = DefaultProductImage;
        let rawImagePath = data.product_image || '';
        if (data.product_image) {
          let firstImage = data.product_image;
          if (data.product_image.includes(',')) {
            firstImage = data.product_image.split(',')[0].trim();
          }
          const { data: imageData, error: imageError } = supabase
            .storage
            .from('product-image')
            .getPublicUrl(firstImage);
          if (!imageError && imageData && imageData.publicUrl) {
            imageUrl = imageData.publicUrl;
          }
          rawImagePath = firstImage;
        }

        const productData = {
          id: data.id,
          name: data.product_name,
          shortDescription: data.product_sub_description,
          price: Number(data.product_price),
          priceFormatted: Number(data.product_price).toFixed(2),
          discount: data.product_discount ? `${data.product_discount}%` : null,
          discountValue: data.product_discount || 0,
          discountPrice: data.product_discount
            ? +(data.product_price * (1 - data.product_discount / 100)).toFixed(2)
            : null,
          image: imageUrl,
          rawImagePath: rawImagePath,
          category: data.category,
          rating: data.rating || 4.5,
          inStock: data.in_stock !== false,
        };
        setProduct(productData);
      }
      setLoading(false);
    }
    fetchProduct();
  }, [productId]);

  const handleBuyNow = async (e) => {
    e.stopPropagation();
    if (!product || !product.inStock) return;

    try {
      setBuyNowLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { data: existingItems, error: fetchError } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', authUser.id)
          .eq('product_id', product.id);

        if (fetchError) {
          console.error('Error checking cart:', fetchError);
          throw new Error('Failed to check cart');
        }

        if (existingItems && existingItems.length > 0) {
          const existingItem = existingItems[0];
          const newQuantity = existingItem.quantity + 1;

          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.id);

          if (updateError) {
            console.error('Error updating cart item:', updateError);
            throw new Error('Failed to update cart');
          }
        } else {
          const { error: insertError } = await supabase
            .from('cart_items')
            .insert({
              user_id: authUser.id,
              product_id: product.id,
              quantity: 1,
            });

          if (insertError) {
            console.error('Error inserting cart item:', insertError);
            throw new Error('Failed to add to cart');
          }
        }

        navigate('/checkout');

      } else {
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];

        const existingIndex = guestCart.findIndex(
          item => item.productId === product.id
        );

        if (existingIndex !== -1) {
          guestCart[existingIndex].quantity += 1;
        } else {
          guestCart.push({
            id: `guest_${product.id}_${Date.now()}`,
            productId: product.id,
            name: product.name,
            price: product.discountPrice || product.price,
            image: product.rawImagePath,
            quantity: 1,
          });
        }

        sessionStorage.setItem('guest_cart', JSON.stringify(guestCart));
        navigate('/checkout');
      }

    } catch (err) {
      console.error('Buy Now error:', err);
      alert(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBuyNowLoading(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${productId}`);
  };

  const toggleFavorite = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="hp-product-card hp-product-card--skeleton" ref={isFirstCard ? ref : null}>
        <div className="hp-product-card__skeleton-image" />
        <div className="hp-product-card__skeleton-content">
          <div className="hp-product-card__skeleton-title" />
          <div className="hp-product-card__skeleton-text" />
          <div className="hp-product-card__skeleton-price" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="hp-product-card hp-product-card--error" ref={isFirstCard ? ref : null}>{error}</div>;
  }

  return (
    <div
      className="hp-product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={isFirstCard ? ref : null}
    >
      <div className="hp-product-card__inner" onClick={handleCardClick}>
        <div className="hp-product-card__image-container">
          <img
            src={product.image}
            alt={product.name}
            className="hp-product-card__image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DefaultProductImage;
            }}
          />

          {product.discount && (
            <div className="hp-product-card__discount-badge">
              -{product.discount} OFF
            </div>
          )}

          {!product.inStock && (
            <div className="hp-product-card__out-of-stock-overlay">
              <span>Out of Stock</span>
            </div>
          )}

          <div
            className={`hp-product-card__actions ${
              isHovered ? 'hp-product-card__actions--show' : ''
            }`}
          >
            <button
              className="hp-product-card__action-btn hp-product-card__quick-view-btn"
              onClick={handleQuickView}
              aria-label="Quick view"
            >
              <Eye size={18} />
            </button>
            <button
              className={`hp-product-card__action-btn hp-product-card__favorite-btn ${
                isFavorite ? 'hp-product-card__favorite--active' : ''
              }`}
              onClick={toggleFavorite}
              aria-label="Add to favorites"
            >
              <Heart size={18} />
            </button>
          </div>
        </div>

        <div className="hp-product-card__info">
          {product.category && (
            <div className="hp-product-card__category">{product.category}</div>
          )}

          <h3 className="hp-product-card__name">{product.name}</h3>

          <div className="hp-product-card__rating">
            <div className="hp-product-card__stars">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < Math.floor(product.rating) ? '#FFB800' : 'none'}
                  stroke={
                    i < Math.floor(product.rating) ? '#FFB800' : '#CBD5E0'
                  }
                />
              ))}
            </div>
            <span className="hp-product-card__rating-value">
              {product.rating}
            </span>
          </div>

          {product.shortDescription && (
            <p className="hp-product-card__description">
              {product.shortDescription}
            </p>
          )}

          <div className="hp-product-card__price-container">
            {product.discountPrice ? (
              <>
                <span className="hp-product-card__price--current">
                  ₹{product.discountPrice}
                </span>
                <span className="hp-product-card__price--original">
                  ₹{product.priceFormatted}
                </span>
              </>
            ) : (
              <span className="hp-product-card__price--current">
                ₹{product.priceFormatted}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="hp-product-card__footer"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="hp-product-card__buy-now-btn"
          onClick={handleBuyNow}
          disabled={!product.inStock || buyNowLoading}
        >
          {buyNowLoading ? (
            <span>Adding...</span>
          ) : (
            <>
              <ShoppingBag size={16} />
              <span>{product.inStock ? 'Buy Now' : 'Out of Stock'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

HomepageProductCard.displayName = 'HomepageProductCard';


/* ─── Main HomePage Component ─── */
const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [heroProductId, setHeroProductId] = useState(null);
  const navigate = useNavigate();

  // Ref for the Buy Now button on the hero product card
  const heroBuyNowBtnRef = useRef(null);

  // Check if user is visiting for the first time
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('gcmt_guide_seen');
    if (!hasSeenGuide) {
      // Delay showing guide to let the page load and render
      const timer = setTimeout(() => {
        setShowGuide(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, []);

  const testimonials = [
    {
      quote:
        'The quality of their products is outstanding, will buy again! My teeth have never felt cleaner.',
      author: 'Suresh Chauhan',
      location: 'Surat',
      rating: 5,
    },
    {
      quote:
        'Their customer service is exceptional. The charcoal toothpaste works wonders!',
      author: 'Pooja Mehta',
      location: 'Mumbai',
      rating: 5,
    },
    {
      quote:
        'I appreciate their commitment to quality. Natural ingredients make all the difference.',
      author: 'Ramesh Patel',
      location: 'Gandhinagar',
      rating: 5,
    },
  ];

  const benefits = [
    {
      icon: '🌿',
      title: '100% Natural Ingredients',
      description:
        'Ethically sourced herbs with no artificial additives or fillers',
    },
    {
      icon: '🔬',
      title: 'Scientifically Validated',
      description:
        'Traditional formulations backed by modern clinical research',
    },
    {
      icon: '🌱',
      title: 'Sustainably Harvested',
      description:
        'Supporting local farmers and sustainable agricultural practices',
    },
    {
      icon: '⚗️',
      title: 'Potent Extracts',
      description:
        'Concentrated herbal extracts for maximum bioavailability',
    },
  ];

  const features = [
    {
      icon: <Truck className="hp-feature-icon" />,
      text: 'Free Shipping on Your First Order',
    },
    {
      icon: <Shield className="hp-feature-icon" />,
      text: '100% Secure Payment',
    },
    { icon: <Award className="hp-feature-icon" />, text: 'UPI Available' },
    { icon: <Leaf className="hp-feature-icon" />, text: 'Made in India' },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(3);

      if (error) {
        console.error('Error fetching products:', error.message);
      } else {
        setProducts(data);
        // Set the first product as the hero product
        if (data && data.length > 0) {
          const firstInStock = data.find((p) => p.in_stock !== false) || data[0];
          setHeroProductId(firstInStock.id);
        }
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="hp-homepage">
      {/* First Time Guide Overlay - Single Step */}
      {showGuide && heroProductId && (
        <FirstTimeGuide
          onClose={() => setShowGuide(false)}
          buyNowBtnRef={heroBuyNowBtnRef}
        />
      )}

      {/* Announcement Bar */}
      <div className="hp-announcement-bar">
        <p>
          🎉 Free shipping on your first order | 100% Secure Checkout | Limited
          Time Offer! | UPI Available
        </p>
      </div>

      {/* Hero Section */}
      <section className="hp-hero">
        <div className="hp-container">
          <div className="hp-hero-grid hp-hero-grid--with-product">
            {/* Hero Content */}
            <div className="hp-hero-content">
              <div className="hp-hero-badge">✨ India's #1 Herbal Brand</div>

              <h1 className="hp-hero-title">
                Premium Herbal <span className="hp-text-gradient">Wellness</span> Products
              </h1>

              <p className="hp-hero-subtitle">
                Discover the power of nature with our scientifically formulated herbal products.
              </p>

              <div className="hp-hero-stats">
                <div className="hp-hero-stat">
                  <span className="hp-hero-stat-number">50K+</span>
                  <span className="hp-hero-stat-label">Happy Customers</span>
                </div>
                <div className="hp-hero-stat">
                  <span className="hp-hero-stat-number">4.8★</span>
                  <span className="hp-hero-stat-label">Average Rating</span>
                </div>
                <div className="hp-hero-stat">
                  <span className="hp-hero-stat-number">100%</span>
                  <span className="hp-hero-stat-label">Natural</span>
                </div>
              </div>

              <div className="hp-hero-buttons">
                <button
                  className="hp-btn-secondary"
                  onClick={() => navigate('/about')}
                >
                  Learn Our Story
                </button>
                <button
                  className="hp-btn-tertiary"
                  onClick={() => navigate('/products')}
                >
                  View All Products <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Hero Product Card - The main focus for guide */}
            <div className="hp-hero-product-wrapper">
              <div className="hp-hero-product-label">
                <span>🔥 Best Seller</span>
              </div>
              {heroProductId ? (
                <HeroProductCard
                  productId={heroProductId}
                  buyNowBtnRef={heroBuyNowBtnRef}
                />
              ) : (
                <div className="hp-hero-product-card hp-hero-product-card--skeleton">
                  <div className="hp-hero-product-card__skeleton-image" />
                  <div className="hp-hero-product-card__skeleton-content">
                    <div className="hp-hero-product-card__skeleton-title" />
                    <div className="hp-hero-product-card__skeleton-price" />
                  </div>
                </div>
              )}
            </div>

            {/* Hero Video - Now smaller */}
            <div className="hp-hero-video-container hp-hero-video-container--compact">
              <div className="hp-hero-video-wrapper">
                <video
                  className="hp-hero-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={GCMTLogo}
                >
                  <source src={GCMTVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="hp-floating-element hp-floating-element--star">
                <Star fill="currentColor" size={18} />
              </div>
              <div className="hp-floating-element hp-floating-element--leaf">
                <Leaf size={18} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="hp-features-bar">
        <div className="hp-container">
          <div className="hp-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="hp-feature-item">
                {feature.icon}
                <span className="hp-feature-text">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="hp-products-section">
        <div className="hp-container">
          <div className="hp-section-header">
            <h2 className="hp-section-title">
              Our Latest{' '}
              <span className="hp-text-gradient">Products</span>
            </h2>
            <p className="hp-section-subtitle">
              Discover our premium collection of herbal wellness products,
              crafted with the finest natural ingredients
            </p>
            <div className="hp-section-divider" />
          </div>

          <div className="hp-products-grid">
            {loading ? (
              <div className="hp-loading-container">
                <div className="hp-loading-spinner" />
                <p>Loading our amazing products...</p>
              </div>
            ) : (
              products.map((product, index) => (
                <HomepageProductCard
                  key={product.id}
                  productId={product.id}
                  isFirstCard={index === 0}
                />
              ))
            )}
          </div>

          <div className="hp-text-center">
            <button
              className="hp-btn-primary"
              onClick={() => navigate('/products')}
            >
              View All Products <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="hp-benefits-section">
        <div className="hp-container">
          <div className="hp-benefits-grid">
            <div className="hp-benefits-image-container">
              <img
                src={GCMTLogo}
                alt="GCMT Herbal Products"
                className="hp-benefits-image"
              />
              <div className="hp-benefits-badge">
                <span className="hp-benefits-badge-number">100%</span>
                <span className="hp-benefits-badge-text">Natural</span>
              </div>
            </div>

            <div className="hp-benefits-content">
              <h2 className="hp-benefits-title">
                The GCMT{' '}
                <span className="hp-text-gradient">Herbal</span>{' '}
                Difference
              </h2>
              <p className="hp-benefits-subtitle">
                Experience the perfect blend of ancient wisdom and modern
                innovation
              </p>

              <div className="hp-benefits-list">
                {benefits.map((benefit, index) => (
                  <div key={index} className="hp-benefit-item">
                    <div className="hp-benefit-icon">{benefit.icon}</div>
                    <div className="hp-benefit-text">
                      <h3>{benefit.title}</h3>
                      <p>{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="hp-btn-primary"
                onClick={() => navigate('/about')}
              >
                Learn More About Our Process
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="hp-testimonials-section">
        <div className="hp-container">
          <div className="hp-section-header">
            <h2 className="hp-section-title">
              Customer{' '}
              <span className="hp-text-gradient">Experiences</span>
            </h2>
            <p className="hp-section-subtitle">
              What our happy customers say about us
            </p>
          </div>

          <div className="hp-testimonial-carousel-container">
            <div className="hp-testimonial-carousel">
              <div
                className="hp-testimonial-slides"
                style={{
                  transform: `translateX(-${activeTestimonial * 100}%)`,
                }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="hp-testimonial-slide">
                    <div className="hp-testimonial-card">
                      <div className="hp-testimonial-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            fill="#FFD700"
                            color="#FFD700"
                            size={18}
                          />
                        ))}
                      </div>
                      <blockquote className="hp-testimonial-quote">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>
                      <div className="hp-testimonial-author">
                        {testimonial.author}
                      </div>
                      <div className="hp-testimonial-location">
                        {testimonial.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hp-testimonial-controls">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`hp-testimonial-dot ${
                    index === activeTestimonial ? 'hp-active' : ''
                  }`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <section className="hp-instagram-section">
        <div className="hp-container">
          <div className="hp-section-header">
            <h2 className="hp-section-title">
              Follow Our{' '}
              <span className="hp-text-gradient">Journey</span>
            </h2>
            <a
              href="https://www.instagram.com/gcmt.shop.official/?utm_source=ig_web_button_share_sheet"
              target="_blank"
              rel="noopener noreferrer"
              className="hp-instagram-link"
            >
              @gcmt.shop.official <Instagram size={18} />
            </a>
          </div>

          <div className="hp-instagram-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="hp-instagram-post">
                <img src={GCMTLogo} alt={`Instagram post ${i + 1}`} />
                <div className="hp-instagram-overlay">
                  <Instagram />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="hp-video-modal">
          <div className="hp-video-modal-content">
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="hp-video-modal-close"
            >
              <X />
            </button>
            <video controls autoPlay>
              <source src={GCMTVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
