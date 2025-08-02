import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ProductCard from '../components/ProductCard';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import '../styles/ProductListingPage.css';

export default function ProductListingPage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState('newest');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching products:', error.message);
      } else {
        setProducts(data);
        setFilteredProducts(data);
        
        // Extract unique categories from products
        const uniqueCategories = [...new Set(data.map(product => product.category))].filter(Boolean);
        setCategories(uniqueCategories);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    // Apply filters and search
    let result = [...products];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(product => 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    // Apply sorting
    if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortOption === 'price-asc') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOption === 'price-desc') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortOption === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
    setFilteredProducts(result);
  }, [products, searchTerm, selectedCategory, sortOption]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSortOption('newest');
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="product-listing-container">
      <header className="product-header">
        <h1 className="page-title">Shop Our Collection</h1>
        <p className="subtitle">Discover our curated selection of premium products</p>
      </header>

      <div className="product-controls">
        <div className="search-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>

        <button className="filter-toggle" onClick={toggleFilters}>
          <Filter size={18} />
          <span>Filters</span>
          <ChevronDown size={16} className={`chevron ${showFilters ? 'rotated' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-options">
            <div className="filter-group">
              <label>Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select 
                value={sortOption} 
                onChange={(e) => setSortOption(e.target.value)}
                className="filter-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          <button className="clear-filters" onClick={clearFilters}>
            Clear All Filters
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading our product collection...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-results">
          <h3>No products found</h3>
          {searchTerm || selectedCategory !== 'all' ? (
            <>
              <p>Try adjusting your filters or search criteria</p>
              <button className="reset-search" onClick={clearFilters}>
                Reset Filters
              </button>
            </>
          ) : (
            <p>Our product catalog will be updated soon!</p>
          )}
        </div>
      ) : (
        <>
          <div className="results-summary">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            {selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}
            {searchTerm ? ` matching "${searchTerm}"` : ''}
          </div>
          
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} productId={product.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}