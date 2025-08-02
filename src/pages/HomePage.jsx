import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/HomePage.css';
import productPhoto from '../assets/Product1.jpg';
import logo from '../assets/GCMT-logo.png';
import marketingvideo from '../assets/marketing-video.mp4';
import { ArrowRight, Instagram, Star, Shield, Users, Award, Truck } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    { 
      quote: "My teeth feel cleaner and whiter after just 2 weeks of using GCMT's herbal charcoal toothpaste. The natural ingredients give me confidence in what I'm putting in my mouth.", 
      author: "Dr. Suresh Chauhan", 
      location: "Surat",
      verified: true
    },
    { 
      quote: "As a mother, I trust GCMT's natural products for my family. Their customer service answered all my questions about ingredients and safety.", 
      author: "Pooja Mehta", 
      location: "Mumbai",
      verified: true
    },
    { 
      quote: "Been using their natural fertilizers for my organic farm. The quality is consistent and my crop yields have improved significantly.", 
      author: "Ramesh Patel", 
      location: "Gandhinagar",
      verified: true
    },
  ];

  const trustIndicators = [
    { icon: Shield, title: "100% Natural", subtitle: "Chemical-free guarantee" },
    { icon: Users, title: "5000+ Happy Customers", subtitle: "Trusted across India" },
    { icon: Award, title: "Quality Certified", subtitle: "Lab tested products" },
    { icon: Truck, title: "Fast Delivery", subtitle: "Free shipping available" }
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data);
        setIsDataFetched(true);
      }
    };
    fetchProducts();
  }, []);

  // Auto-rotate testimonials every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <>
      <Helmet>
        <title>GCMT Shop | Premium Herbal Charcoal Toothpaste & Natural Agricultural Products</title>
        <meta
          name="description"
          content="India's trusted herbal brand. GCMT's premium charcoal toothpaste and natural fertilizers. 100% chemical-free, scientifically tested. Free shipping on first order."
        />
        <meta name="keywords" content="herbal toothpaste, charcoal toothpaste, natural dental care, organic fertilizer, GCMT shop, ayurvedic products" />
        <meta property="og:title" content="GCMT Shop | Premium Herbal Products Made in India" />
        <meta
          property="og:description"
          content="Trusted by 5000+ customers. Premium herbal charcoal toothpaste and natural agricultural products. 100% chemical-free guarantee."
        />
        <meta property="og:image" content="https://gcmtshop.com/images/toothpaste.jpg" />
        <meta property="og:url" content="https://gcmtshop.com/" />
        <link rel="canonical" href="https://gcmtshop.com/" />
      </Helmet>

      <div className="homepage">
        {/* Trust-building announcement bar */}
        <div className="announcement-bar">
          <p>✅ Trusted by 5000+ customers | 🚚 Free shipping on orders above ₹500 | 🔒 100% Secure Checkout | 📞 24/7 Customer Support</p>
        </div>

        {/* Hero section with stronger value proposition */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">
              <span>🏆 India's #1 Herbal Brand</span>
            </div>
            <h1>
              Transform Your Health with 
              <span className="highlight"> Nature's Wisdom</span>
            </h1>
            <p className="hero-subtitle">
              Premium herbal products crafted from ancient Ayurvedic traditions, 
              scientifically validated for modern families. Trusted by over 5,000 satisfied customers across India.
            </p>
            
            {/* Value propositions */}
            <div className="hero-benefits">
              <div className="benefit-pill">✅ 100% Chemical-Free</div>
              <div className="benefit-pill">✅ Lab Tested & Certified</div>
              <div className="benefit-pill">✅ 30-Day Money Back</div>
            </div>

            <div className="hero-cta">
              <Link to="/products">
                <button className="primary-button">
                  Shop Premium Products
                  <ArrowRight size={18} />
                </button>
              </Link>
              <Link to="/about">
                <button className="secondary-button">Our Heritage & Quality Promise</button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="hero-social-proof">
              <div className="rating">
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#FFD700" color="#FFD700" />
                  ))}
                </div>
                <span>4.8/5 from 2,000+ reviews</span>
              </div>
            </div>
          </div>
          
          <div className="hero-image">
            <video
              src={marketingvideo}
              alt="GCMT Premium Herbal Products"
              className="hero-img"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="hero-trust-badge">
              <div className="badge-content">
                <Shield size={24} />
                <span>Quality Guaranteed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Trust indicators section */}
        <section className="trust-indicators">
          <div className="trust-grid">
            {trustIndicators.map((indicator, index) => {
              const IconComponent = indicator.icon;
              return (
                <div key={index} className="trust-item">
                  <IconComponent size={32} className="trust-icon" />
                  <h4>{indicator.title}</h4>
                  <p>{indicator.subtitle}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Featured products with better positioning */}
        <section className="featured-products">
          <div className="section-header">
            <div className="header-content">
              <h2>Our Bestselling Products</h2>
              <p>Handpicked natural solutions trusted by thousands of families</p>
            </div>
            <Link to="/products" className="view-all">
              View All Products <ArrowRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {isDataFetched && products.length > 0 ? (
              products.map(product => (
                <ProductCard key={product.id} productId={product.id} />
              ))
            ) : (
              <div className="products-loading">
                <p>Loading our premium products...</p>
              </div>
            )}
          </div>
        </section>

        {/* Enhanced benefits section */}
        <section className="benefits">
          <div className="benefits-container">
            <div className="benefit-image">
              <img src={logo} alt="GCMT Quality Promise" className="benefit-img" />
              <div className="quality-badge">
                <Award size={20} />
                <span>Premium Quality</span>
              </div>
            </div>
            <div className="benefit-content">
              <div className="section-badge">Why Choose GCMT</div>
              <h2>The Science Behind Our Natural Solutions</h2>
              <p className="benefit-intro">
                Every GCMT product combines time-tested Ayurvedic wisdom with modern scientific validation, 
                ensuring you get the best of both worlds.
              </p>
              
              <ul className="benefits-list">
                <li>
                  <div className="benefit-icon">🌿</div>
                  <div className="benefit-text">
                    <h3>100% Natural Ingredients</h3>
                    <p>Ethically sourced herbs with zero artificial additives, preservatives, or harmful chemicals</p>
                  </div>
                </li>
                <li>
                  <div className="benefit-icon">🔬</div>
                  <div className="benefit-text">
                    <h3>Scientifically Validated</h3>
                    <p>Traditional formulations rigorously tested in certified laboratories for safety and efficacy</p>
                  </div>
                </li>
                <li>
                  <div className="benefit-icon">🌱</div>
                  <div className="benefit-text">
                    <h3>Sustainably Sourced</h3>
                    <p>Direct partnerships with organic farmers, supporting sustainable agriculture and fair trade</p>
                  </div>
                </li>
                <li>
                  <div className="benefit-icon">⚗️</div>
                  <div className="benefit-text">
                    <h3>Maximum Potency</h3>
                    <p>Advanced extraction methods ensure optimal bioavailability and therapeutic effectiveness</p>
                  </div>
                </li>
              </ul>
              
              <div className="benefit-cta">
                <Link to="/about">
                  <button className="secondary-button">Learn About Our Quality Process</button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced testimonials with verification */}
        <section className="testimonials">
          <div className="section-header">
            <h2>Real Stories from Real Customers</h2>
            <p>Join thousands of satisfied customers who trust GCMT for their family's health</p>
          </div>
          
          <div className="testimonial-carousel">
            <div className="testimonial-container">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index} 
                  className={`testimonial-card ${index === activeTestimonial ? 'active' : ''}`}
                  style={{ display: index === activeTestimonial ? 'block' : 'none' }}
                >
                  <div className="testimonial-header">
                    <div className="testimonial-stars">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} fill="#FFD700" color="#FFD700" />
                      ))}
                    </div>
                    {testimonial.verified && (
                      <div className="verification-badge">
                        <Shield size={14} />
                        <span>Verified Customer</span>
                      </div>
                    )}
                  </div>
                  <blockquote>"{testimonial.quote}"</blockquote>
                  <div className="testimonial-author">
                    <div className="author-info">
                      <p className="author-name">{testimonial.author}</p>
                      <span className="author-location">{testimonial.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="testimonial-controls">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`testimonial-dot ${index === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(index)}
                  aria-label={`View testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Professional Instagram section */}
        <section className="instagram-feed">
          <div className="section-header">
            <div className="header-content">
              <h2>Follow Our Journey</h2>
              <p>Stay updated with our latest products, tips, and customer success stories</p>
            </div>
            <a 
              href="https://www.instagram.com/gcmt.shop.official/?utm_source=ig_web_button_share_sheet" 
              className="view-all" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Follow @gcmt.shop.official <Instagram size={16} />
            </a>
          </div>
          
          <div className="instagram-grid">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="instagram-post">
                <img src={logo} alt={`GCMT Instagram post ${i + 1}`} />
                <div className="instagram-overlay">
                  <Instagram size={24} />
                  <span>View on Instagram</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA section */}
        <section className="final-cta">
          <div className="cta-content">
            <h2>Ready to Experience Natural Wellness?</h2>
            <p>Join thousands of satisfied customers and start your journey to better health today</p>
            <div className="cta-buttons">
              <Link to="/products">
                <button className="primary-button large">
                  Shop Now & Get Free Shipping
                  <ArrowRight size={20} />
                </button>
              </Link>
            </div>
            <div className="cta-guarantee">
              <Shield size={16} />
              <span>30-Day Money Back Guarantee</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;