import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import AddToCartButton from './AddToCartButton';
import { Star, ShoppingCart, Eye, Heart } from 'lucide-react';
import '../styles/ProductCard.css';
import DefaultProductImage from '../assets/product.png';

export default function ProductCard({ productId }) {
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
      <div className="product-card product-card--skeleton">
        <div className="product-card__skeleton-image"></div>
        <div className="product-card__skeleton-content">
          <div className="product-card__skeleton-title"></div>
          <div className="product-card__skeleton-text"></div>
          <div className="product-card__skeleton-price"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="product-card product-card--error">{error}</div>;
  }

  return (
    <div 
      className="product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="product-card__inner" onClick={handleCardClick}>
        <div className="product-card__image-container">
          <img
            src={product.image}
            alt={product.name}
            className="product-card__image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DefaultProductImage;
            }}
          />

          {product.discount && (
            <div className="product-card__discount-badge">-{product.discount} OFF</div>
          )}

          {!product.inStock && (
            <div className="product-card__out-of-stock-overlay">
              <span>Out of Stock</span>
            </div>
          )}

          <div className={`product-card__actions ${isHovered ? 'product-card__actions--show' : ''}`}>
            <button 
              className="product-card__action-btn product-card__quick-view-btn" 
              onClick={handleQuickView}
              aria-label="Quick view"
            >
              <Eye size={18} />
            </button>
            <button 
              className={`product-card__action-btn product-card__favorite-btn ${isFavorite ? 'product-card__favorite--active' : ''}`} 
              onClick={toggleFavorite}
              aria-label="Add to favorites"
            >
              <Heart size={18} />
            </button>
          </div>
        </div>

        <div className="product-card__info">
          {product.category && (
            <div className="product-card__category">{product.category}</div>
          )}

          <h3 className="product-card__name">{product.name}</h3>

          <div className="product-card__rating">
            <div className="product-card__stars">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={14} 
                  className={i < Math.floor(product.rating) ? 'product-card__star--filled' : 'product-card__star--empty'} 
                  fill={i < Math.floor(product.rating) ? "#FFB800" : "none"}
                  stroke={i < Math.floor(product.rating) ? "#FFB800" : "#CBD5E0"}
                />
              ))}
            </div>
            <span className="product-card__rating-value">{product.rating}</span>
          </div>

          {product.shortDescription && (
            <p className="product-card__description">{product.shortDescription}</p>
          )}

          <div className="product-card__price-container">
            {product.discountPrice ? (
              <>
                <span className="product-card__price--current">₹{product.discountPrice}</span>
                <span className="product-card__price--original">₹{product.price}</span>
              </>
            ) : (
              <span className="product-card__price--current">₹{product.price}</span>
            )}
          </div>
        </div>
      </div>

      <div className="product-card__footer" onClick={(e) => e.stopPropagation()}>
        <AddToCartButton 
          productId={product.id} 
          quantity={1} 
          disabled={!product.inStock}
          className="product-card__add-to-cart-btn"
        >
          <ShoppingCart size={16} />
          <span>{product.inStock ? 'Add to Cart' : 'Out of Stock'}</span>
        </AddToCartButton>
      </div>
    </div>
  );
}
