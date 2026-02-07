import React, { useEffect, useState } from 'react';
import { ArrowRight, Instagram, Star, Shield, Truck, Award, Leaf, X, ShoppingBag, Eye, Heart } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';
import GCMTVideo from '../assets/marketing-video.mp4';
import GCMTLogo from '../assets/GCMT-logo.png';
import DefaultProductImage from '../assets/product.png';

/* ─── Inline "Buy Now" Product Card ─── */
const HomepageProductCard = ({ productId }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
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
        if (data.product_image) {
          const { data: imageData, error: imageError } = supabase
            .storage
            .from('product-image')
            .getPublicUrl(data.product_image);
          if (!imageError && imageData && imageData.publicUrl) {
            imageUrl = imageData.publicUrl;
          }
        }

        const productData = {
          id: data.id,
          name: data.product_name,
          shortDescription: data.product_sub_description,
          price: Number(data.product_price).toFixed(2),
          discount: data.product_discount ? `${data.product_discount}%` : null,
          discountPrice: data.product_discount
            ? (data.product_price * (1 - data.product_discount / 100)).toFixed(2)
            : null,
          image: imageUrl,
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

  const handleBuyNow = (e) => {
    e.stopPropagation();
    if (!product || !product.inStock) return;

    // Build cart item matching checkout expectations
    const cartItem = {
      product_id: product.id,
      quantity: 1,
    };

    // Store as a single-item cart so checkout picks it up
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const alreadyIndex = existingCart.findIndex(
      (item) => item.product_id === product.id
    );
    if (alreadyIndex > -1) {
      existingCart[alreadyIndex].quantity += 1;
    } else {
      existingCart.push(cartItem);
    }
    localStorage.setItem('cart', JSON.stringify(existingCart));

    // Navigate to checkout
    navigate('/checkout');
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
      <div className="hp-product-card hp-product-card--skeleton">
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
    return <div className="hp-product-card hp-product-card--error">{error}</div>;
  }

  return (
    <div
      className="hp-product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
                  ₹{product.price}
                </span>
              </>
            ) : (
              <span className="hp-product-card__price--current">
                ₹{product.price}
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
          disabled={!product.inStock}
        >
          <ShoppingBag size={16} />
          <span>{product.inStock ? 'Buy Now' : 'Out of Stock'}</span>
        </button>
      </div>
    </div>
  );
};

/* ─── Main HomePage Component ─── */
const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const navigate = useNavigate();

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
          <div className="hp-hero-grid">
            {/* Hero Content — badge + stats only, text removed */}
            <div className="hp-hero-content">
              <div className="hp-hero-badge">✨ India's #1 Herbal Brand</div>

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
                  className="hp-btn-primary"
                  onClick={() => navigate('/products')}
                >
                  Shop Now <ArrowRight size={18} />
                </button>
                <button
                  className="hp-btn-secondary"
                  onClick={() => navigate('/about')}
                >
                  Learn Our Story
                </button>
              </div>
            </div>

            {/* Hero Video */}
            <div className="hp-hero-video-container">
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
              products.map((product) => (
                <HomepageProductCard
                  key={product.id}
                  productId={product.id}
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
