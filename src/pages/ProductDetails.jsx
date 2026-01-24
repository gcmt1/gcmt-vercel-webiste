import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, ShoppingCart, Heart, Share2,
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp,
  X, Copy, MessageCircle, Facebook, Twitter, Mail, Link,
  Package, Shield, Truck, RotateCcw, ZoomIn, Minus, Plus,
  ChevronLeft, Home, Award, Leaf, Sparkles
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
  
  const mainImageRef = useRef(null);
  const productInfoRef = useRef(null);
  const galleryRef = useRef(null);

  // Touch swipe for mobile gallery
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

        // Process variants/sizes
        const variants = prodData.size 
          ? prodData.size.split(',').map(v => v.trim()).filter(v => v)
          : [];

        // Process key benefits - handle Postgres array format
        const rawBenefits = prodData.key_benefits || '';
        const cleanedBenefits = rawBenefits.replace(/[\{\}"]/g, '');
        const benefits = cleanedBenefits 
          ? cleanedBenefits.split(',').map(b => b.trim()).filter(b => b)
          : [];

        // Process ingredients
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

        // Calculate discount price
        const discountPrice = prodData.product_discount 
          ? +(prodData.product_price * (1 - prodData.product_discount / 100)).toFixed(2)
          : null;

        // Process multiple images
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

  // Scroll listener for mobile sticky actions
  useEffect(() => {
    const handleScroll = () => {
      if (productInfoRef.current) {
        const rect = productInfoRef.current.getBoundingClientRect();
        setShowMobileActions(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Touch handlers for swipe
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

  // Image zoom handler
  const handleMouseMove = useCallback((e) => {
    if (!mainImageRef.current || !isZoomed) return;
    
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isZoomed]);

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
    <div className="stars-container">
      {Array(5).fill(0).map((_, i) => {
        const fillPercent = Math.min(100, Math.max(0, (rating - i) * 100));
        return (
          <div key={i} className="star-wrapper">
            <Star size={18} stroke="#E5E7EB" fill="#E5E7EB" />
            <div className="star-fill" style={{ width: `${fillPercent}%` }}>
              <Star size={18} stroke="#F59E0B" fill="#F59E0B" />
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

  // Calculate savings
  const getSavings = () => {
    if (product.discountPrice && product.price) {
      return (product.price - product.discountPrice).toFixed(2);
    }
    return 0;
  };

  // Loading State
  if (loading) {
    return (
      <div className="product-page">
        <div className="container">
          <div className="skeleton-breadcrumb"></div>
          <div className="product-main skeleton-main">
            <div className="skeleton-gallery">
              <div className="skeleton-main-image pulse"></div>
              <div className="skeleton-thumbnails">
                {[1,2,3,4].map(i => <div key={i} className="skeleton-thumb pulse"></div>)}
              </div>
            </div>
            <div className="skeleton-info">
              <div className="skeleton-title pulse"></div>
              <div className="skeleton-rating pulse"></div>
              <div className="skeleton-desc pulse"></div>
              <div className="skeleton-desc short pulse"></div>
              <div className="skeleton-price pulse"></div>
              <div className="skeleton-variants pulse"></div>
              <div className="skeleton-actions pulse"></div>
              <div className="skeleton-benefits pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="product-page">
        <div className="container">
          <div className="error-container">
            <div className="error-icon">
              <X size={48} />
            </div>
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <button className="btn-primary" onClick={() => navigate(-1)}>
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
      <div className="product-page">
        <div className="container">
          <div className="error-container">
            <div className="error-icon">
              <Package size={48} />
            </div>
            <h2>Product Not Found</h2>
            <p>The product you're looking for doesn't exist or has been removed.</p>
            <button className="btn-primary" onClick={() => navigate('/products')}>
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

      <div className="product-page">
        <div className="container">
          {/* Breadcrumb Navigation */}
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol className="breadcrumb-list">
              <li className="breadcrumb-item">
                <a href="/" className="breadcrumb-link">
                  <Home size={14} />
                  <span>Home</span>
                </a>
              </li>
              <li className="breadcrumb-separator">
                <ChevronRight size={14} />
              </li>
              <li className="breadcrumb-item">
                <a href="/products" className="breadcrumb-link">Products</a>
              </li>
              <li className="breadcrumb-separator">
                <ChevronRight size={14} />
              </li>
              <li className="breadcrumb-item current">
                <span>{product.name}</span>
              </li>
            </ol>
          </nav>

          {/* Main Product Section */}
          <div className="product-main">
            {/* Product Gallery */}
            <section className="product-gallery" ref={galleryRef}>
              <div className="gallery-container">
                {/* Main Image */}
                <div 
                  className={`main-image-wrapper ${isZoomed ? 'zoomed' : ''}`}
                  ref={mainImageRef}
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  onMouseMove={handleMouseMove}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <div className={`image-loader ${imageLoaded ? 'hidden' : ''}`}>
                    <div className="loader-spinner"></div>
                  </div>
                  
                  <img 
                    src={product.images[activeImage]} 
                    alt={`${product.name} - Image ${activeImage + 1}`} 
                    className={`main-image ${imageLoaded ? 'loaded' : ''}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={handleImageError}
                    style={isZoomed ? {
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                    } : {}}
                  />

                  {/* Badges */}
                  <div className="image-badges">
                    {product.discount && (
                      <span className="badge discount-badge">
                        <Sparkles size={12} />
                        {product.discount} OFF
                      </span>
                    )}
                  </div>

                  {/* Zoom indicator */}
                  <div className="zoom-indicator">
                    <ZoomIn size={16} />
                    <span>Hover to zoom</span>
                  </div>

                  {/* Navigation Arrows */}
                  {product.images.length > 1 && (
                    <>
                      <button 
                        className="gallery-nav prev"
                        onClick={() => handleImageNavigation('prev')}
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        className="gallery-nav next"
                        onClick={() => handleImageNavigation('next')}
                        aria-label="Next image"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  {product.images.length > 1 && (
                    <div className="image-counter">
                      <span>{activeImage + 1}</span>
                      <span className="separator">/</span>
                      <span>{product.images.length}</span>
                    </div>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {product.images.length > 1 && (
                  <div className="thumbnails-container">
                    <div className="thumbnails-track">
                      {product.images.map((img, index) => (
                        <button
                          key={index}
                          className={`thumbnail ${activeImage === index ? 'active' : ''}`}
                          onClick={() => handleThumbnailClick(index)}
                          aria-label={`View image ${index + 1}`}
                          aria-current={activeImage === index ? 'true' : 'false'}
                        >
                          <img 
                            src={img} 
                            alt={`${product.name} thumbnail ${index + 1}`}
                            onError={handleImageError}
                          />
                          <div className="thumbnail-overlay"></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dot Indicators for Mobile */}
                {product.images.length > 1 && (
                  <div className="image-dots">
                    {product.images.map((_, index) => (
                      <button
                        key={index}
                        className={`dot ${activeImage === index ? 'active' : ''}`}
                        onClick={() => handleThumbnailClick(index)}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Product Information */}
            <section className="product-info" ref={productInfoRef}>
              {/* Product Header */}
              <div className="product-header">
                <h1 className="product-title">{product.name}</h1>
                
                <div className="product-meta">
                  <div className="rating-section">
                    {renderStars(product.rating)}
                    <span className="rating-value">{product.rating}</span>
                    <span className="reviews-count">({product.reviews} Reviews)</span>
                  </div>
                  <span className="sku-info">SKU: {product.sku.slice(0, 8).toUpperCase()}</span>
                </div>

                {product.shortDescription && (
                  <p className="product-subtitle">{product.shortDescription}</p>
                )}
              </div>

              {/* Pricing Section */}
              <div className="pricing-section">
                <div className="price-wrapper">
                  {product.discountPrice ? (
                    <>
                      <span className="current-price">₹{product.discountPrice.toLocaleString('en-IN')}</span>
                      <span className="original-price">₹{product.price.toLocaleString('en-IN')}</span>
                      <span className="discount-tag">{product.discount} OFF</span>
                    </>
                  ) : (
                    <span className="current-price">₹{product.price.toLocaleString('en-IN')}</span>
                  )}
                </div>
                
                {product.discountPrice && (
                  <div className="savings-info">
                    <Award size={16} />
                    <span>You save ₹{getSavings()}</span>
                  </div>
                )}
                
                <p className="tax-info">Inclusive of all taxes</p>
              </div>

              {/* Size/Variant Selection */}
              {product.variants.length > 0 && (
                <div className="variants-section">
                  <div className="section-header">
                    <h3>Select Size</h3>
                    {selectedVariant && (
                      <span className="selected-variant">Selected: {selectedVariant}</span>
                    )}
                  </div>
                  <div className="variant-options">
                    {product.variants.map((variant, index) => (
                      <button 
                        key={index}
                        className={`variant-btn ${selectedVariant === variant ? 'selected' : ''}`} 
                        onClick={() => setSelectedVariant(variant)}
                        aria-pressed={selectedVariant === variant}
                      >
                        {variant}
                        {selectedVariant === variant && <Check size={14} className="check-icon" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Actions */}
              <div className="purchase-section">
                <div className="quantity-wrapper">
                  <span className="quantity-label">Quantity:</span>
                  <div className="quantity-selector">
                    <button 
                      className="quantity-btn minus" 
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={18} />
                    </button>
                    <input 
                      type="number" 
                      value={quantity} 
                      readOnly 
                      aria-label="Product quantity"
                      className="quantity-input"
                    />
                    <button 
                      className="quantity-btn plus" 
                      onClick={increaseQuantity}
                      disabled={quantity >= product.stock}
                      aria-label="Increase quantity"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <span className="stock-status in-stock">
                    <span className="stock-dot"></span>
                    In Stock
                  </span>
                </div>

                <div className="action-buttons">
                  <AddToCartButton 
                    productId={product.id} 
                    quantity={quantity}
                    selectedVariant={selectedVariant}
                    className="btn-add-cart"
                  />
                  
                  <button 
                    className={`btn-wishlist ${wishlistAdded ? 'active' : ''}`}
                    onClick={addToWishlist}
                    aria-label={wishlistAdded ? "Remove from wishlist" : "Add to wishlist"}
                    title={wishlistAdded ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart size={22} fill={wishlistAdded ? "#EF4444" : "none"} stroke={wishlistAdded ? "#EF4444" : "currentColor"} />
                  </button>
                  
                  <button 
                    className="btn-share"
                    onClick={handleShare}
                    aria-label="Share product"
                    title="Share product"
                  >
                    <Share2 size={22} />
                  </button>
                </div>
              </div>

              {/* Key Benefits */}
              {product.benefits.length > 0 && (
                <div className="benefits-section">
                  <h3 className="section-title">
                    <Leaf size={20} />
                    Key Benefits
                  </h3>
                  <ul className="benefits-list">
                    {product.benefits.map((benefit, i) => (
                      <li key={i} className="benefit-item">
                        <span className="benefit-icon">
                          <Check size={14} />
                        </span>
                        <span className="benefit-text">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trust Badges */}
              <div className="trust-section">
                <div className="trust-badge">
                  <Truck size={20} />
                  <div className="trust-content">
                    <span className="trust-title">Free Shipping</span>
                    <span className="trust-desc">Orders above ₹499</span>
                  </div>
                </div>
                <div className="trust-badge">
                  <RotateCcw size={20} />
                  <div className="trust-content">
                    <span className="trust-title">Easy Returns</span>
                    <span className="trust-desc">7-day return policy</span>
                  </div>
                </div>
                <div className="trust-badge">
                  <Shield size={20} />
                  <div className="trust-content">
                    <span className="trust-title">Secure Payment</span>
                    <span className="trust-desc">100% protected</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Product Details Tabs - Desktop */}
          <section className="product-details-section desktop-tabs">
            <div className="tabs-container">
              <div className="tabs-header" role="tablist">
                <button 
                  className={`tab-btn ${selectedTab === 'description' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('description')}
                  role="tab"
                  aria-selected={selectedTab === 'description'}
                  aria-controls="panel-description"
                >
                  Description
                </button>
                {(product.ingredientsHeading || product.ingredients.length > 0) && (
                  <button 
                    className={`tab-btn ${selectedTab === 'ingredients' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('ingredients')}
                    role="tab"
                    aria-selected={selectedTab === 'ingredients'}
                    aria-controls="panel-ingredients"
                  >
                    Ingredients
                  </button>
                )}
                {(product.howToUseHeading || product.howToUseDescription) && (
                  <button 
                    className={`tab-btn ${selectedTab === 'how-to-use' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('how-to-use')}
                    role="tab"
                    aria-selected={selectedTab === 'how-to-use'}
                    aria-controls="panel-how-to-use"
                  >
                    How to Use
                  </button>
                )}
              </div>
              
              <div className="tabs-content">
                {selectedTab === 'description' && (
                  <div className="tab-panel" id="panel-description" role="tabpanel">
                    {product.descriptionContent && (
                      <div className="content-block">
                        <h3>Product Description</h3>
                        <p>{product.descriptionContent}</p>
                      </div>
                    )}
                    
                    {product.whyChoose && (
                      <div className="content-block highlight">
                        <h3>Why Choose This Product?</h3>
                        <p>{product.whyChoose}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedTab === 'ingredients' && (
                  <div className="tab-panel" id="panel-ingredients" role="tabpanel">
                    {product.ingredientsHeading && (
                      <div className="content-block">
                        <h3>{product.ingredientsHeading}</h3>
                        {product.ingredientsDescription && <p>{product.ingredientsDescription}</p>}
                      </div>
                    )}
                    
                    {product.ingredientsSubheading && (
                      <h4 className="subheading">{product.ingredientsSubheading}</h4>
                    )}
                    
                    {product.ingredients.length > 0 && (
                      <div className="ingredients-table-wrapper">
                        <table className="ingredients-table">
                          <thead>
                            <tr>
                              <th>Ingredient</th>
                              <th>Concentration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.ingredients.map((ing, i) => (
                              <tr key={i}>
                                <td>
                                  <span className="ingredient-name">{ing.name}</span>
                                </td>
                                <td>
                                  <span className="ingredient-percentage">{ing.percentage || '-'}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {selectedTab === 'how-to-use' && (
                  <div className="tab-panel" id="panel-how-to-use" role="tabpanel">
                    {product.howToUseHeading && (
                      <div className="content-block">
                        <h3>{product.howToUseHeading}</h3>
                        {product.howToUseDescription && <p>{product.howToUseDescription}</p>}
                      </div>
                    )}
                    
                    {product.proTips && (
                      <div className="content-block pro-tips">
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
          <section className="product-details-section mobile-accordion">
            <div className="accordion-container">
              {/* Description */}
              <div className={`accordion-item ${expandedAccordion === 'description' ? 'expanded' : ''}`}>
                <button 
                  className="accordion-header"
                  onClick={() => toggleAccordion('description')}
                  aria-expanded={expandedAccordion === 'description'}
                >
                  <span>Description</span>
                  {expandedAccordion === 'description' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <div className="accordion-content">
                  <div className="accordion-body">
                    {product.descriptionContent && (
                      <div className="content-block">
                        <h4>Product Description</h4>
                        <p>{product.descriptionContent}</p>
                      </div>
                    )}
                    {product.whyChoose && (
                      <div className="content-block">
                        <h4>Why Choose This Product?</h4>
                        <p>{product.whyChoose}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              {(product.ingredientsHeading || product.ingredients.length > 0) && (
                <div className={`accordion-item ${expandedAccordion === 'ingredients' ? 'expanded' : ''}`}>
                  <button 
                    className="accordion-header"
                    onClick={() => toggleAccordion('ingredients')}
                    aria-expanded={expandedAccordion === 'ingredients'}
                  >
                    <span>Ingredients</span>
                    {expandedAccordion === 'ingredients' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  <div className="accordion-content">
                    <div className="accordion-body">
                      {product.ingredientsHeading && (
                        <div className="content-block">
                          <h4>{product.ingredientsHeading}</h4>
                          {product.ingredientsDescription && <p>{product.ingredientsDescription}</p>}
                        </div>
                      )}
                      {product.ingredientsSubheading && <h5>{product.ingredientsSubheading}</h5>}
                      {product.ingredients.length > 0 && (
                        <div className="ingredients-list-mobile">
                          {product.ingredients.map((ing, i) => (
                            <div key={i} className="ingredient-item">
                              <span className="ingredient-name">{ing.name}</span>
                              <span className="ingredient-percentage">{ing.percentage || '-'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* How to Use */}
              {(product.howToUseHeading || product.howToUseDescription) && (
                <div className={`accordion-item ${expandedAccordion === 'how-to-use' ? 'expanded' : ''}`}>
                  <button 
                    className="accordion-header"
                    onClick={() => toggleAccordion('how-to-use')}
                    aria-expanded={expandedAccordion === 'how-to-use'}
                  >
                    <span>How to Use</span>
                    {expandedAccordion === 'how-to-use' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  <div className="accordion-content">
                    <div className="accordion-body">
                      {product.howToUseHeading && (
                        <div className="content-block">
                          <h4>{product.howToUseHeading}</h4>
                          {product.howToUseDescription && <p>{product.howToUseDescription}</p>}
                        </div>
                      )}
                      {product.proTips && (
                        <div className="content-block pro-tips-mobile">
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
          <section className="reviews-section">
            <ReviewSystem productId={product.id} />
          </section>
        </div>

        {/* Mobile Sticky Actions */}
        <div className={`mobile-sticky-actions ${showMobileActions ? 'visible' : ''}`}>
          <div className="sticky-price">
            {product.discountPrice ? (
              <>
                <span className="sticky-current">₹{product.discountPrice.toLocaleString('en-IN')}</span>
                <span className="sticky-original">₹{product.price.toLocaleString('en-IN')}</span>
              </>
            ) : (
              <span className="sticky-current">₹{product.price.toLocaleString('en-IN')}</span>
            )}
          </div>
          <AddToCartButton 
            productId={product.id} 
            quantity={quantity}
            selectedVariant={selectedVariant}
            className="btn-sticky-cart"
          />
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="share-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Share Product</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowShareModal(false)}
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="share-product-preview">
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="preview-image"
                    onError={handleImageError}
                  />
                  <div className="preview-details">
                    <h4>{product.name}</h4>
                    <div className="preview-price">
                      <span className="price-current">
                        {product.discountPrice ? `₹${product.discountPrice}` : `₹${product.price}`}
                      </span>
                      {product.discount && (
                        <span className="price-discount">{product.discount} OFF</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="share-options-grid">
                  {shareOptions.map((option) => (
                    <button
                      key={option.name}
                      className="share-option-btn"
                      onClick={option.action}
                      style={{ '--btn-color': option.color }}
                    >
                      <div className="option-icon" style={{ backgroundColor: option.color }}>
                        <option.icon size={20} color="#fff" />
                      </div>
                      <span>{option.name === 'Copy Link' && copySuccess ? 'Copied!' : option.name}</span>
                    </button>
                  ))}
                </div>
                
                <div className="share-url-section">
                  <div className="url-input-wrapper">
                    <input 
                      type="text" 
                      value={getProductUrl()} 
                      readOnly 
                      className="url-input"
                    />
                    <button 
                      className={`copy-btn ${copySuccess ? 'copied' : ''}`}
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

// ChevronRight component for breadcrumb
const ChevronRight = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

export default ProductDetail;
