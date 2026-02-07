import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, ShoppingCart, Heart, Share2,
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp,
  X, Copy, MessageCircle, Facebook, Twitter, Mail, Link,
  Package, Shield, Truck, RotateCcw, ZoomIn, Minus, Plus,
  ChevronLeft, Home, Award, Leaf, Sparkles, Zap
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import '../styles/ProductDetails.css';
import AddToCartButton from '../components/AddToCartButton';
import { Helmet } from "react-helmet-async";
import ReviewSystem from '../components/ReviewSystem';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlistAdded, setWishlistAdded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('description');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState('description');
  const [buyNowLoading, setBuyNowLoading] = useState(false);

  const mainImageRef = useRef(null);
  const productInfoRef = useRef(null);
  const galleryRef = useRef(null);
  const actionsRef = useRef(null);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);

        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (prodErr) throw prodErr;

        const variants = prodData.size
          ? prodData.size.split(',').map(v => v.trim()).filter(v => v)
          : [];

        const rawBenefits = prodData.key_benefits || '';
        const cleanedBenefits = rawBenefits.replace(/[\{\}"]/g, '');
        const benefits = cleanedBenefits
          ? cleanedBenefits.split(',').map(b => b.trim()).filter(b => b)
          : [];

        const ingredientNames = prodData.ingredients_name
          ? prodData.ingredients_name.split(',').map(n => n.trim()).filter(n => n)
          : [];
        const percentages = prodData.percentage
          ? prodData.percentage.split(',').map(p => p.trim())
          : [];

        const ingredients = ingredientNames.map((name, i) => ({
          name,
          percentage: percentages[i] || ''
        }));

        const discountPrice = prodData.product_discount
          ? +(prodData.product_price * (1 - prodData.product_discount / 100)).toFixed(2)
          : null;

        let images = [];
        if (prodData.product_image) {
          if (prodData.product_image.includes(',')) {
            images = prodData.product_image
              .split(',')
              .map(img => img.trim())
              .filter(img => img && img.length > 0);
          } else {
            images = [prodData.product_image.trim()];
          }
        }
        if (images.length === 0) {
          images = ['/api/placeholder/600/600'];
        }

        const productData = {
          id: prodData.id,
          name: prodData.product_name,
          shortDescription: prodData.product_sub_description || '',
          price: prodData.product_price,
          discountPrice,
          discount: prodData.product_discount ? `${prodData.product_discount}%` : null,
          discountValue: prodData.product_discount || 0,
          rating: 4.5,
          reviews: "1+",
          stock: 50,
          sku: prodData.id,
          createdAt: prodData.created_at,
          images,
          variants,
          benefits,
          descriptionContent: prodData.product_description || '',
          whyChoose: prodData.why_choose_product || '',
          ingredientsHeading: prodData.ingredients_heading || '',
          ingredientsDescription: prodData.ingredients_description || '',
          ingredientsSubheading: prodData.ingredients_subheading || '',
          ingredients,
          howToUseHeading: prodData.how_to_use_heading || '',
          howToUseDescription: prodData.how_to_use_description || '',
          proTips: prodData.pro_tips || '',
          // Keep raw data for cart insertion
          _raw: {
            product_name: prodData.product_name,
            product_price: prodData.product_price,
            product_image: prodData.product_image || '',
          }
        };

        setProduct(productData);
        setSelectedVariant(variants[0] || '');

      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Unable to load product information.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProduct();
      window.scrollTo(0, 0);
    }
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      if (actionsRef.current) {
        const rect = actionsRef.current.getBoundingClientRect();
        setShowMobileActions(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && product?.images?.length > 1) {
      setActiveImage(prev => (prev + 1) % product.images.length);
    }
    if (isRightSwipe && product?.images?.length > 1) {
      setActiveImage(prev => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!mainImageRef.current || !isZoomed) return;

    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isZoomed]);

  // ==================== BUY NOW HANDLER ====================
  // This mirrors exactly how Checkout.jsx reads cart items
  const handleBuyNow = async () => {
    try {
      setBuyNowLoading(true);

      // Check for authenticated user via Supabase
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // ===== LOGGED-IN USER FLOW =====
        // Checkout reads from 'cart_items' table with:
        // supabase.from('cart_items').select('id, product_id, quantity, products:products(...)').eq('user_id', user.id)
        
        // Check if this product already exists in cart
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
          // Product already in cart - update quantity
          const existingItem = existingItems[0];
          const newQuantity = existingItem.quantity + quantity;
          
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.id);

          if (updateError) {
            console.error('Error updating cart item:', updateError);
            throw new Error('Failed to update cart');
          }
          
          console.log('✅ Updated cart item quantity:', newQuantity);
        } else {
          // Product not in cart - insert new item
          const { error: insertError } = await supabase
            .from('cart_items')
            .insert({
              user_id: authUser.id,
              product_id: product.id,
              quantity: quantity,
            });

          if (insertError) {
            console.error('Error inserting cart item:', insertError);
            throw new Error('Failed to add to cart');
          }
          
          console.log('✅ Added new item to cart_items');
        }

        // Navigate to checkout
        navigate('/checkout');

      } else {
        // ===== GUEST USER FLOW =====
        // Checkout reads guest cart from: JSON.parse(sessionStorage.getItem('guest_cart')) || []
        // Expected format per item: { id, productId, name, price, image, quantity }
        
        const guestCart = JSON.parse(sessionStorage.getItem('guest_cart')) || [];
        
        // Check if product already exists in guest cart
        const existingIndex = guestCart.findIndex(
          item => item.productId === product.id
        );

        if (existingIndex !== -1) {
          // Update quantity of existing item
          guestCart[existingIndex].quantity += quantity;
          console.log('✅ Updated guest cart item quantity:', guestCart[existingIndex].quantity);
        } else {
          // Add new item matching the format Checkout expects
          // When Checkout fetches for guests, it reads these fields directly:
          // item.id, item.productId, item.name, item.price, item.image, item.quantity
          const firstImage = product.images[0] || '';
          
          guestCart.push({
            id: `guest_${product.id}_${Date.now()}`,
            productId: product.id,
            name: product.name,
            price: product.discountPrice || product.price,
            image: firstImage,
            quantity: quantity,
          });
          
          console.log('✅ Added new item to guest cart');
        }

        // Save back to sessionStorage
        sessionStorage.setItem('guest_cart', JSON.stringify(guestCart));

        // Navigate to checkout
        navigate('/checkout');
      }

    } catch (err) {
      console.error('Buy Now error:', err);
      // Show a basic alert since we may not have toast context
      alert(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBuyNowLoading(false);
    }
  };

  // Share functionality
  const getProductUrl = () => window.location.href;

  const getShareText = () => {
    const price = product.discountPrice ? `₹${product.discountPrice}` : `₹${product.price}`;
    const discount = product.discount ? ` (${product.discount} OFF!)` : '';
    return `Check out ${product.name} - ${product.shortDescription} at ${price}${discount}`;
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      action: () => {
        const text = encodeURIComponent(getShareText());
        const url = encodeURIComponent(getProductUrl());
        window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
      }
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      action: () => {
        const url = encodeURIComponent(getProductUrl());
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
      }
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: '#1DA1F2',
      action: () => {
        const text = encodeURIComponent(getShareText());
        const url = encodeURIComponent(getProductUrl());
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
      }
    },
    {
      name: 'Email',
      icon: Mail,
      color: '#EA4335',
      action: () => {
        const subject = encodeURIComponent(`Check out ${product.name}`);
        const body = encodeURIComponent(`${getShareText()}\n\n${getProductUrl()}`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
      }
    },
    {
      name: 'Copy Link',
      icon: Link,
      color: '#6B7280',
      action: () => copyToClipboard()
    }
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getProductUrl());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = getProductUrl();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      navigator.share({
        title: product.name,
        text: getShareText(),
        url: getProductUrl(),
      }).catch(() => setShowShareModal(true));
    } else {
      setShowShareModal(true);
    }
  };

  const renderStars = (rating) => (
    <div className="pd-stars-container">
      {Array(5).fill(0).map((_, i) => {
        const fillPercent = Math.min(100, Math.max(0, (rating - i) * 100));
        return (
          <div key={i} className="pd-star-wrapper">
            <Star size={16} stroke="#E5E7EB" fill="#E5E7EB" />
            <div className="pd-star-fill" style={{ width: `${fillPercent}%` }}>
              <Star size={16} stroke="#F59E0B" fill="#F59E0B" />
            </div>
          </div>
        );
      })}
    </div>
  );

  const decreaseQuantity = () => quantity > 1 && setQuantity(q => q - 1);
  const increaseQuantity = () => quantity < product?.stock && setQuantity(q => q + 1);
  const addToWishlist = () => setWishlistAdded(w => !w);

  const handleImageNavigation = (direction) => {
    if (!product?.images?.length) return;
    setImageLoaded(false);
    if (direction === 'prev') {
      setActiveImage(i => (i - 1 + product.images.length) % product.images.length);
    } else {
      setActiveImage(i => (i + 1) % product.images.length);
    }
  };

  const handleThumbnailClick = (index) => {
    if (index >= 0 && index < product.images.length && index !== activeImage) {
      setImageLoaded(false);
      setActiveImage(index);
    }
  };

  const handleImageError = (e) => {
    e.target.src = '/api/placeholder/600/600';
  };

  const toggleAccordion = (tab) => {
    setExpandedAccordion(expandedAccordion === tab ? null : tab);
  };

  const getSavings = () => {
    if (product.discountPrice && product.price) {
      return (product.price - product.discountPrice).toFixed(2);
    }
    return 0;
  };

  // Loading State
  if (loading) {
    return (
      <div className="pd-page">
        <div className="pd-container">
          <div className="pd-skeleton-breadcrumb"></div>
          <div className="pd-main pd-skeleton-main">
            <div className="pd-skeleton-gallery">
              <div className="pd-skeleton-main-image pd-pulse"></div>
              <div className="pd-skeleton-thumbnails">
                {[1, 2, 3, 4].map(i => <div key={i} className="pd-skeleton-thumb pd-pulse"></div>)}
              </div>
            </div>
            <div className="pd-skeleton-info">
              <div className="pd-skeleton-title pd-pulse"></div>
              <div className="pd-skeleton-rating pd-pulse"></div>
              <div className="pd-skeleton-desc pd-pulse"></div>
              <div className="pd-skeleton-desc pd-short pd-pulse"></div>
              <div className="pd-skeleton-price pd-pulse"></div>
              <div className="pd-skeleton-variants pd-pulse"></div>
              <div className="pd-skeleton-actions pd-pulse"></div>
              <div className="pd-skeleton-benefits pd-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pd-page">
        <div className="pd-container">
          <div className="pd-error-container">
            <div className="pd-error-icon">
              <X size={48} />
            </div>
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <button className="pd-btn-primary" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pd-page">
        <div className="pd-container">
          <div className="pd-error-container">
            <div className="pd-error-icon">
              <Package size={48} />
            </div>
            <h2>Product Not Found</h2>
            <p>The product you're looking for doesn't exist or has been removed.</p>
            <button className="pd-btn-primary" onClick={() => navigate('/products')}>
              <ArrowLeft size={20} />
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{product.name} | GCMT Shop</title>
        <meta name="description" content={product.shortDescription || product.descriptionContent} />
        <meta property="og:title" content={`${product.name} | GCMT Shop`} />
        <meta property="og:description" content={product.shortDescription || product.descriptionContent} />
        <meta property="og:image" content={product.images[0]} />
        <meta property="og:url" content={`https://gcmtshop.com/product/${product.id}`} />
        <link rel="canonical" href={`https://gcmtshop.com/product/${product.id}`} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: product.name,
            image: product.images,
            description: product.shortDescription || product.descriptionContent,
            sku: product.sku || product.id,
            brand: { "@type": "Brand", name: "GCMT Shop" },
            offers: {
              "@type": "Offer",
              url: `https://gcmtshop.com/product/${product.id}`,
              priceCurrency: "INR",
              price: product.discountPrice || product.price,
              availability: product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition"
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.rating || 4.5,
              reviewCount: 10
            }
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://gcmtshop.com" },
              { "@type": "ListItem", position: 2, name: "Products", item: "https://gcmtshop.com/products" },
              { "@type": "ListItem", position: 3, name: product.name, item: `https://gcmtshop.com/product/${product.id}` }
            ]
          })}
        </script>
      </Helmet>

      <div className="pd-page">
        <div className="pd-container">
          {/* Breadcrumb Navigation */}
          <nav className="pd-breadcrumb" aria-label="Breadcrumb">
            <ol className="pd-breadcrumb-list">
              <li className="pd-breadcrumb-item">
                <a href="/" className="pd-breadcrumb-link">
                  <Home size={14} />
                  <span>Home</span>
                </a>
              </li>
              <li className="pd-breadcrumb-separator">
                <ChevronRight size={14} />
              </li>
              <li className="pd-breadcrumb-item">
                <a href="/products" className="pd-breadcrumb-link">Products</a>
              </li>
              <li className="pd-breadcrumb-separator">
                <ChevronRight size={14} />
              </li>
              <li className="pd-breadcrumb-item pd-current">
                <span>{product.name}</span>
              </li>
            </ol>
          </nav>

          {/* Main Product Section */}
          <div className="pd-main">
            {/* Product Gallery */}
            <section className="pd-gallery" ref={galleryRef}>
              <div className="pd-gallery-container">
                {/* Vertical Thumbnails - Desktop Only */}
                {product.images.length > 1 && (
                  <div className="pd-thumbnails-vertical">
                    {product.images.map((img, index) => (
                      <button
                        key={index}
                        className={`pd-thumbnail ${activeImage === index ? 'pd-active' : ''}`}
                        onClick={() => handleThumbnailClick(index)}
                        aria-label={`View image ${index + 1}`}
                        aria-current={activeImage === index ? 'true' : 'false'}
                      >
                        <img
                          src={img}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          onError={handleImageError}
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Image */}
                <div
                  className={`pd-main-image-wrapper ${isZoomed ? 'pd-zoomed' : ''}`}
                  ref={mainImageRef}
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  onMouseMove={handleMouseMove}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <div className={`pd-image-loader ${imageLoaded ? 'pd-hidden' : ''}`}>
                    <div className="pd-loader-spinner"></div>
                  </div>

                  <img
                    src={product.images[activeImage]}
                    alt={`${product.name} - Image ${activeImage + 1}`}
                    className={`pd-main-image ${imageLoaded ? 'pd-loaded' : ''}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={handleImageError}
                    style={isZoomed ? {
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                    } : {}}
                  />

                  {/* Badges */}
                  <div className="pd-image-badges">
                    {product.discount && (
                      <span className="pd-badge pd-discount-badge">
                        <Sparkles size={12} />
                        {product.discount} OFF
                      </span>
                    )}
                  </div>

                  {/* Zoom indicator - Desktop only */}
                  <div className="pd-zoom-indicator">
                    <ZoomIn size={16} />
                    <span>Hover to zoom</span>
                  </div>

                  {/* Navigation Arrows */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        className="pd-gallery-nav pd-prev"
                        onClick={() => handleImageNavigation('prev')}
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        className="pd-gallery-nav pd-next"
                        onClick={() => handleImageNavigation('next')}
                        aria-label="Next image"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}

                  {/* Image Counter - Mobile */}
                  {product.images.length > 1 && (
                    <div className="pd-image-counter">
                      <span>{activeImage + 1}</span>
                      <span className="pd-separator">/</span>
                      <span>{product.images.length}</span>
                    </div>
                  )}

                  {/* Wishlist & Share buttons on image - Mobile */}
                  <div className="pd-image-actions-mobile">
                    <button
                      className={`pd-img-action-btn ${wishlistAdded ? 'pd-active' : ''}`}
                      onClick={addToWishlist}
                      aria-label={wishlistAdded ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart size={20} fill={wishlistAdded ? "#EF4444" : "none"} stroke={wishlistAdded ? "#EF4444" : "currentColor"} />
                    </button>
                    <button
                      className="pd-img-action-btn"
                      onClick={handleShare}
                      aria-label="Share product"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Dot Indicators for Mobile */}
                {product.images.length > 1 && (
                  <div className="pd-image-dots">
                    {product.images.map((_, index) => (
                      <button
                        key={index}
                        className={`pd-dot ${activeImage === index ? 'pd-active' : ''}`}
                        onClick={() => handleThumbnailClick(index)}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Product Information */}
            <section className="pd-info" ref={productInfoRef}>
              {/* Product Header */}
              <div className="pd-header">
                <h1 className="pd-title">{product.name}</h1>

                <div className="pd-meta">
                  <div className="pd-rating-section">
                    {renderStars(product.rating)}
                    <span className="pd-rating-value">{product.rating}</span>
                    <span className="pd-reviews-count">({product.reviews} Reviews)</span>
                  </div>
                  <span className="pd-sku-info">SKU: {product.sku.toString().slice(0, 8).toUpperCase()}</span>
                </div>

                {product.shortDescription && (
                  <p className="pd-subtitle">{product.shortDescription}</p>
                )}
              </div>

              {/* Pricing Section */}
              <div className="pd-pricing">
                <div className="pd-price-wrapper">
                  {product.discountPrice ? (
                    <>
                      <span className="pd-current-price">₹{product.discountPrice.toLocaleString('en-IN')}</span>
                      <span className="pd-original-price">₹{product.price.toLocaleString('en-IN')}</span>
                      <span className="pd-discount-tag">{product.discount} OFF</span>
                    </>
                  ) : (
                    <span className="pd-current-price">₹{product.price.toLocaleString('en-IN')}</span>
                  )}
                </div>

                {product.discountPrice && (
                  <div className="pd-savings-info">
                    <Award size={16} />
                    <span>You save ₹{getSavings()}</span>
                  </div>
                )}

                <p className="pd-tax-info">Inclusive of all taxes</p>
              </div>

              {/* Size/Variant Selection */}
              {product.variants.length > 0 && (
                <div className="pd-variants">
                  <div className="pd-section-header">
                    <h3>Select Size</h3>
                    {selectedVariant && (
                      <span className="pd-selected-variant">Selected: {selectedVariant}</span>
                    )}
                  </div>
                  <div className="pd-variant-options">
                    {product.variants.map((variant, index) => (
                      <button
                        key={index}
                        className={`pd-variant-btn ${selectedVariant === variant ? 'pd-selected' : ''}`}
                        onClick={() => setSelectedVariant(variant)}
                        aria-pressed={selectedVariant === variant}
                      >
                        {variant}
                        {selectedVariant === variant && <Check size={14} className="pd-check-icon" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="pd-quantity-section">
                <span className="pd-quantity-label">Quantity:</span>
                <div className="pd-quantity-controls">
                  <div className="pd-quantity-selector">
                    <button
                      className="pd-qty-btn"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      readOnly
                      aria-label="Product quantity"
                      className="pd-qty-input"
                    />
                    <button
                      className="pd-qty-btn"
                      onClick={increaseQuantity}
                      disabled={quantity >= product.stock}
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="pd-stock-status pd-in-stock">
                    <span className="pd-stock-dot"></span>
                    In Stock
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pd-action-buttons" ref={actionsRef}>
                <div className="pd-primary-actions">
                  <AddToCartButton
                    productId={product.id}
                    quantity={quantity}
                    selectedVariant={selectedVariant}
                    className="pd-btn-add-cart"
                  />
                  <button
                    className="pd-btn-buy-now"
                    onClick={handleBuyNow}
                    disabled={buyNowLoading}
                  >
                    {buyNowLoading ? (
                      <div className="pd-btn-spinner"></div>
                    ) : (
                      <>
                        <Zap size={20} />
                        <span>Buy Now</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pd-secondary-actions">
                  <button
                    className={`pd-btn-wishlist ${wishlistAdded ? 'pd-active' : ''}`}
                    onClick={addToWishlist}
                    aria-label={wishlistAdded ? "Remove from wishlist" : "Add to wishlist"}
                    title={wishlistAdded ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart size={20} fill={wishlistAdded ? "#EF4444" : "none"} stroke={wishlistAdded ? "#EF4444" : "currentColor"} />
                    <span className="pd-btn-label">Wishlist</span>
                  </button>

                  <button
                    className="pd-btn-share"
                    onClick={handleShare}
                    aria-label="Share product"
                    title="Share product"
                  >
                    <Share2 size={20} />
                    <span className="pd-btn-label">Share</span>
                  </button>
                </div>
              </div>

              {/* Key Benefits */}
              {product.benefits.length > 0 && (
                <div className="pd-benefits">
                  <h3 className="pd-section-title">
                    <Leaf size={18} />
                    Key Benefits
                  </h3>
                  <ul className="pd-benefits-list">
                    {product.benefits.map((benefit, i) => (
                      <li key={i} className="pd-benefit-item">
                        <span className="pd-benefit-icon">
                          <Check size={14} />
                        </span>
                        <span className="pd-benefit-text">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trust Badges */}
              <div className="pd-trust-section">
                <div className="pd-trust-badge">
                  <Truck size={20} />
                  <div className="pd-trust-content">
                    <span className="pd-trust-title">Free Shipping</span>
                    <span className="pd-trust-desc">Orders above ₹499</span>
                  </div>
                </div>
                <div className="pd-trust-badge">
                  <RotateCcw size={20} />
                  <div className="pd-trust-content">
                    <span className="pd-trust-title">Easy Returns</span>
                    <span className="pd-trust-desc">7-day return policy</span>
                  </div>
                </div>
                <div className="pd-trust-badge">
                  <Shield size={20} />
                  <div className="pd-trust-content">
                    <span className="pd-trust-title">Secure Payment</span>
                    <span className="pd-trust-desc">100% protected</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Product Details Tabs - Desktop */}
          <section className="pd-details-section pd-desktop-tabs">
            <div className="pd-tabs-container">
              <div className="pd-tabs-header" role="tablist">
                <button
                  className={`pd-tab-btn ${selectedTab === 'description' ? 'pd-active' : ''}`}
                  onClick={() => setSelectedTab('description')}
                  role="tab"
                  aria-selected={selectedTab === 'description'}
                  aria-controls="pd-panel-description"
                >
                  Description
                </button>
                {(product.ingredientsHeading || product.ingredients.length > 0) && (
                  <button
                    className={`pd-tab-btn ${selectedTab === 'ingredients' ? 'pd-active' : ''}`}
                    onClick={() => setSelectedTab('ingredients')}
                    role="tab"
                    aria-selected={selectedTab === 'ingredients'}
                    aria-controls="pd-panel-ingredients"
                  >
                    Ingredients
                  </button>
                )}
                {(product.howToUseHeading || product.howToUseDescription) && (
                  <button
                    className={`pd-tab-btn ${selectedTab === 'how-to-use' ? 'pd-active' : ''}`}
                    onClick={() => setSelectedTab('how-to-use')}
                    role="tab"
                    aria-selected={selectedTab === 'how-to-use'}
                    aria-controls="pd-panel-how-to-use"
                  >
                    How to Use
                  </button>
                )}
              </div>

              <div className="pd-tabs-content">
                {selectedTab === 'description' && (
                  <div className="pd-tab-panel" id="pd-panel-description" role="tabpanel">
                    {product.descriptionContent && (
                      <div className="pd-content-block">
                        <h3>Product Description</h3>
                        <p>{product.descriptionContent}</p>
                      </div>
                    )}
                    {product.whyChoose && (
                      <div className="pd-content-block pd-highlight">
                        <h3>Why Choose This Product?</h3>
                        <p>{product.whyChoose}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedTab === 'ingredients' && (
                  <div className="pd-tab-panel" id="pd-panel-ingredients" role="tabpanel">
                    {product.ingredientsHeading && (
                      <div className="pd-content-block">
                        <h3>{product.ingredientsHeading}</h3>
                        {product.ingredientsDescription && <p>{product.ingredientsDescription}</p>}
                      </div>
                    )}
                    {product.ingredientsSubheading && (
                      <h4 className="pd-subheading">{product.ingredientsSubheading}</h4>
                    )}
                    {product.ingredients.length > 0 && (
                      <div className="pd-ingredients-table-wrapper">
                        <table className="pd-ingredients-table">
                          <thead>
                            <tr>
                              <th>Ingredient</th>
                              <th>Concentration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.ingredients.map((ing, i) => (
                              <tr key={i}>
                                <td><span className="pd-ingredient-name">{ing.name}</span></td>
                                <td><span className="pd-ingredient-pct">{ing.percentage || '-'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {selectedTab === 'how-to-use' && (
                  <div className="pd-tab-panel" id="pd-panel-how-to-use" role="tabpanel">
                    {product.howToUseHeading && (
                      <div className="pd-content-block">
                        <h3>{product.howToUseHeading}</h3>
                        {product.howToUseDescription && <p>{product.howToUseDescription}</p>}
                      </div>
                    )}
                    {product.proTips && (
                      <div className="pd-content-block pd-pro-tips">
                        <h4>
                          <Sparkles size={18} />
                          Pro Tips
                        </h4>
                        <p>{product.proTips}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Product Details Accordion - Mobile */}
          <section className="pd-details-section pd-mobile-accordion">
            <div className="pd-accordion-container">
              <div className={`pd-accordion-item ${expandedAccordion === 'description' ? 'pd-expanded' : ''}`}>
                <button
                  className="pd-accordion-header"
                  onClick={() => toggleAccordion('description')}
                  aria-expanded={expandedAccordion === 'description'}
                >
                  <span>Description</span>
                  {expandedAccordion === 'description' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <div className="pd-accordion-content">
                  <div className="pd-accordion-body">
                    {product.descriptionContent && (
                      <div className="pd-content-block">
                        <h4>Product Description</h4>
                        <p>{product.descriptionContent}</p>
                      </div>
                    )}
                    {product.whyChoose && (
                      <div className="pd-content-block">
                        <h4>Why Choose This Product?</h4>
                        <p>{product.whyChoose}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(product.ingredientsHeading || product.ingredients.length > 0) && (
                <div className={`pd-accordion-item ${expandedAccordion === 'ingredients' ? 'pd-expanded' : ''}`}>
                  <button
                    className="pd-accordion-header"
                    onClick={() => toggleAccordion('ingredients')}
                    aria-expanded={expandedAccordion === 'ingredients'}
                  >
                    <span>Ingredients</span>
                    {expandedAccordion === 'ingredients' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  <div className="pd-accordion-content">
                    <div className="pd-accordion-body">
                      {product.ingredientsHeading && (
                        <div className="pd-content-block">
                          <h4>{product.ingredientsHeading}</h4>
                          {product.ingredientsDescription && <p>{product.ingredientsDescription}</p>}
                        </div>
                      )}
                      {product.ingredientsSubheading && <h5>{product.ingredientsSubheading}</h5>}
                      {product.ingredients.length > 0 && (
                        <div className="pd-ingredients-list-mobile">
                          {product.ingredients.map((ing, i) => (
                            <div key={i} className="pd-ingredient-item">
                              <span className="pd-ingredient-name">{ing.name}</span>
                              <span className="pd-ingredient-pct">{ing.percentage || '-'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(product.howToUseHeading || product.howToUseDescription) && (
                <div className={`pd-accordion-item ${expandedAccordion === 'how-to-use' ? 'pd-expanded' : ''}`}>
                  <button
                    className="pd-accordion-header"
                    onClick={() => toggleAccordion('how-to-use')}
                    aria-expanded={expandedAccordion === 'how-to-use'}
                  >
                    <span>How to Use</span>
                    {expandedAccordion === 'how-to-use' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  <div className="pd-accordion-content">
                    <div className="pd-accordion-body">
                      {product.howToUseHeading && (
                        <div className="pd-content-block">
                          <h4>{product.howToUseHeading}</h4>
                          {product.howToUseDescription && <p>{product.howToUseDescription}</p>}
                        </div>
                      )}
                      {product.proTips && (
                        <div className="pd-content-block pd-pro-tips-mobile">
                          <h5>
                            <Sparkles size={16} />
                            Pro Tips
                          </h5>
                          <p>{product.proTips}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Reviews Section */}
          <section className="pd-reviews-section">
            <ReviewSystem productId={product.id} />
          </section>
        </div>

        {/* Sticky Bottom Actions */}
        <div className={`pd-sticky-actions ${showMobileActions ? 'pd-visible' : ''}`}>
          <div className="pd-sticky-inner">
            <div className="pd-sticky-price">
              {product.discountPrice ? (
                <>
                  <span className="pd-sticky-current">₹{product.discountPrice.toLocaleString('en-IN')}</span>
                  <span className="pd-sticky-original">₹{product.price.toLocaleString('en-IN')}</span>
                </>
              ) : (
                <span className="pd-sticky-current">₹{product.price.toLocaleString('en-IN')}</span>
              )}
            </div>
            <div className="pd-sticky-buttons">
              <AddToCartButton
                productId={product.id}
                quantity={quantity}
                selectedVariant={selectedVariant}
                className="pd-btn-sticky-cart"
              />
              <button
                className="pd-btn-sticky-buy"
                onClick={handleBuyNow}
                disabled={buyNowLoading}
              >
                {buyNowLoading ? (
                  <div className="pd-btn-spinner-sm"></div>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Buy Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="pd-modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="pd-share-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pd-modal-header">
                <h3>Share Product</h3>
                <button
                  className="pd-modal-close"
                  onClick={() => setShowShareModal(false)}
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="pd-modal-body">
                <div className="pd-share-preview">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="pd-preview-image"
                    onError={handleImageError}
                  />
                  <div className="pd-preview-details">
                    <h4>{product.name}</h4>
                    <div className="pd-preview-price">
                      <span className="pd-price-current">
                        {product.discountPrice ? `₹${product.discountPrice}` : `₹${product.price}`}
                      </span>
                      {product.discount && (
                        <span className="pd-price-discount">{product.discount} OFF</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pd-share-options-grid">
                  {shareOptions.map((option) => (
                    <button
                      key={option.name}
                      className="pd-share-option-btn"
                      onClick={option.action}
                    >
                      <div className="pd-option-icon" style={{ backgroundColor: option.color }}>
                        <option.icon size={20} color="#fff" />
                      </div>
                      <span>{option.name === 'Copy Link' && copySuccess ? 'Copied!' : option.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pd-share-url">
                  <div className="pd-url-wrapper">
                    <input
                      type="text"
                      value={getProductUrl()}
                      readOnly
                      className="pd-url-input"
                    />
                    <button
                      className={`pd-copy-btn ${copySuccess ? 'pd-copied' : ''}`}
                      onClick={copyToClipboard}
                    >
                      {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                      <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const ChevronRight = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

export default ProductDetail;
