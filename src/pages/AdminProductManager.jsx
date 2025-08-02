import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, PlusCircle, Save, X, AlertCircle, CheckCircle, HelpCircle, Upload, ImageIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/AdminProductManager.module.css';

export default function AdminProductManager() {
    const [products, setProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({});
    const [isNew, setIsNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
            if (!error) {
                setProducts(data || []);
            } else {
                setErrors({ fetch: 'Failed to load products. Please refresh the page.' });
            }
        } catch (err) {
            setErrors({ fetch: 'Network error. Please check your connection.' });
        }
        setLoading(false);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.product_name?.trim()) newErrors.product_name = 'Product name is required';
        if (!formData.product_price || isNaN(formData.product_price) || formData.product_price <= 0) newErrors.product_price = 'Valid price is required';
        if (formData.product_discount && (isNaN(formData.product_discount) || formData.product_discount < 0 || formData.product_discount > 100)) newErrors.product_discount = 'Discount must be between 0-100%';
        if (!formData.product_sub_description?.trim()) newErrors.product_sub_description = 'Short description is required';
        if (!formData.product_description?.trim()) newErrors.product_description = 'Full description is required';
        if (formData.size && formData.size.includes(',,')) newErrors.size = 'Remove extra commas between size variants';
        if (formData.ingredients_name && formData.percentage) {
            const ingredients = formData.ingredients_name.split(',').filter(i => i.trim());
            const percentages = formData.percentage.split(',').filter(p => p.trim());
            if (ingredients.length !== percentages.length) newErrors.ingredients_percentage = 'Number of ingredients must match number of percentages';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const navigate = useNavigate();

    const checkAdmin = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
            navigate('/login');
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

    useEffect(() => {
        checkAdmin();
    }, []);

    // Image upload functions
    const uploadImageToSupabase = async (file) => {
        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            // Upload to Supabase storage
            const { data, error } = await supabase.storage
                .from('product-image')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('product-image')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handleImageUpload = async (files) => {
        if (!files || files.length === 0) return;

        setUploadingImages(true);
        setErrors(prev => ({ ...prev, imageUpload: undefined }));

        try {
            const uploadPromises = Array.from(files).map(file => {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    throw new Error(`${file.name} is not a valid image file`);
                }
                
                // Validate file size (5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                    throw new Error(`${file.name} is too large. Please use images under 5MB`);
                }

                return uploadImageToSupabase(file);
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            
            // Add uploaded URLs to existing images
            const currentImages = formData.product_image ? formData.product_image.split(',').map(img => img.trim()).filter(Boolean) : [];
            const allImages = [...currentImages, ...uploadedUrls];
            
            setFormData(prev => ({
                ...prev,
                product_image: allImages.join(',')
            }));

            setSuccess(`Successfully uploaded ${uploadedUrls.length} image(s)!`);
            setTimeout(() => setSuccess(''), 3000);

        } catch (error) {
            setErrors(prev => ({ ...prev, imageUpload: error.message }));
        } finally {
            setUploadingImages(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files);
        }
    };

    const removeImage = (indexToRemove) => {
        const currentImages = formData.product_image ? formData.product_image.split(',').map(img => img.trim()).filter(Boolean) : [];
        const updatedImages = currentImages.filter((_, index) => index !== indexToRemove);
        setFormData(prev => ({
            ...prev,
            product_image: updatedImages.join(',')
        }));
    };

    const handleEdit = (product) => {
        setEditingProduct(product.id);
        setFormData({ ...product });
        setIsNew(false);
        setErrors({});
        setSuccess('');
    };

    const handleDelete = async (id) => {
        const product = products.find(p => p.id === id);
        if (window.confirm(`Are you sure you want to delete "${product?.product_name}"? This action cannot be undone.`)) {
            setLoading(true);
            try {
                const { error } = await supabase.from('products').delete().eq('id', id);
                if (!error) {
                    setSuccess('Product deleted successfully!');
                    fetchProducts();
                } else {
                    setErrors({ delete: 'Delete failed: ' + error.message });
                }
            } catch (err) {
                setErrors({ delete: 'Network error during deletion.' });
            }
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const updateData = {
                ...formData,
                product_price: parseFloat(formData.product_price),
                product_discount: formData.product_discount ? parseFloat(formData.product_discount) : null,
                size: formData.size?.split(',').map(s => s.trim()).filter(s => s).join(',') || null,
                key_benefits: formData.key_benefits?.split(',').map(b => b.trim()).filter(b => b).join(',') || null,
                ingredients_name: formData.ingredients_name?.split(',').map(i => i.trim()).filter(i => i).join(',') || null,
                percentage: formData.percentage?.split(',').map(p => p.trim()).filter(p => p).join(',') || null,
                product_image: formData.product_image?.split(',').map(img => img.trim()).filter(img => img).join(',') || null,
            };
            const { error } = await supabase.from('products').update(updateData).eq('id', editingProduct);
            if (!error) {
                setEditingProduct(null);
                setSuccess('Product updated successfully!');
                fetchProducts();
            } else {
                setErrors({ update: 'Update failed: ' + error.message });
            }
        } catch (err) {
            setErrors({ update: 'Network error during update.' });
        }
        setLoading(false);
    };

    const handleAddNew = () => {
        setEditingProduct(null);
        setFormData({
            product_name: '',
            product_price: '',
            product_discount: '',
            product_sub_description: '',
            product_description: '',
            size: '',
            product_image: '',
            key_benefits: '',
            ingredients_name: '',
            percentage: '',
            why_choose_product: '',
            ingredients_heading: '',
            ingredients_description: '',
            ingredients_subheading: '',
            how_to_use_heading: '',
            how_to_use_description: '',
            pro_tips: '',
        });
        setIsNew(true);
        setErrors({});
        setSuccess('');
    };

    const handleCreate = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const createData = {
                ...formData,
                product_price: parseFloat(formData.product_price),
                product_discount: formData.product_discount ? parseFloat(formData.product_discount) : null,
                size: formData.size?.split(',').map(s => s.trim()).filter(s => s).join(',') || null,
                key_benefits: formData.key_benefits?.split(',').map(b => b.trim()).filter(b => b).join(',') || null,
                ingredients_name: formData.ingredients_name?.split(',').map(i => i.trim()).filter(i => i).join(',') || null,
                percentage: formData.percentage?.split(',').map(p => p.trim()).filter(p => p).join(',') || null,
                product_image: formData.product_image?.split(',').map(img => img.trim()).filter(img => img).join(',') || null,
            };
            const { error } = await supabase.from('products').insert([createData]);
            if (!error) {
                setIsNew(false);
                setSuccess('Product created successfully!');
                fetchProducts();
            } else {
                setErrors({ create: 'Creation failed: ' + error.message });
            }
        } catch (err) {
            setErrors({ create: 'Network error during creation.' });
        }
        setLoading(false);
    };

    const calculateDiscountedPrice = (price, discount) => {
        if (!discount) return price;
        return price - (price * discount / 100);
    };

    const renderProductCard = (product) => {
        // Get the first image URL from product_image (comma-separated)
        let imageUrl = '';
        if (product.product_image) {
            const imgs = Array.isArray(product.product_image)
                ? product.product_image
                : product.product_image.split(',').map(img => img.trim()).filter(Boolean);
            imageUrl = imgs[0] || '';
        }

        return (
            <div key={product.id} className={styles.pmProductCard}>
                <div className={styles.pmCardHeader}>
                    {imageUrl && (
                        <div className={styles.pmProductImageWrapper}>
                            <img
                                src={imageUrl}
                                alt={product.product_name}
                                className={styles.pmProductImage}
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    )}
                    <div className={styles.pmCardContent}>
                        <h3 className={styles.pmProductTitle}>{product.product_name}</h3>
                        <div className={styles.pmPriceSection}>
                            <span className={styles.pmCurrentPrice}>
                                ₹{calculateDiscountedPrice(product.product_price, product.product_discount).toFixed(2)}
                            </span>
                            {product.product_discount > 0 && (
                                <>
                                    <span className={styles.pmOriginalPrice}>₹{product.product_price}</span>
                                    <span className={styles.pmDiscountBadge}>{product.product_discount}% OFF</span>
                                </>
                            )}
                        </div>
                        <div className={styles.pmMetaInfo}>
                            {product.size && <span className={styles.pmSizeBadge}>Sizes: {product.size.split(',').length}</span>}
                        </div>
                    </div>
                    <div className={styles.pmActionButtons}>
                        <button
                            onClick={() => handleEdit(product)}
                            className={styles.pmEditBtn}
                            title="Edit Product"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            onClick={() => handleDelete(product.id)}
                            className={styles.pmDeleteBtn}
                            title="Delete Product"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
                <p className={styles.pmProductDescription}>{product.product_sub_description}</p>
            </div>
        );
    };

    const renderImageUploadSection = () => {
        const currentImages = formData.product_image ? formData.product_image.split(',').map(img => img.trim()).filter(Boolean) : [];

        return (
            <div className={styles.pmImageUploadSection}>
                <label className={styles.pmImageUploadLabel}>Product Images</label>
                
                {/* Drag and Drop Area */}
                <div 
                    className={`${styles.pmDropZone} ${dragActive ? styles.pmDropZoneActive : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className={styles.pmDropZoneContent}>
                        {uploadingImages ? (
                            <div className={styles.pmUploadingState}>
                                <div className={styles.pmLoadingSpinner}></div>
                                <p>Uploading images...</p>
                            </div>
                        ) : (
                            <>
                                <Upload size={48} className={styles.pmUploadIcon} />
                                <h3>Drag & Drop Images Here</h3>
                                <p>or click to browse files</p>
                                <p className={styles.pmUploadHint}>Supports: JPG, PNG, GIF, WEBP (Max 5MB each)</p>
                            </>
                        )}
                    </div>
                    
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files)}
                        style={{ display: 'none' }}
                    />
                </div>

                {errors.imageUpload && (
                    <p className={styles.pmErrorText}>{errors.imageUpload}</p>
                )}

                {/* Image Preview Grid */}
                {currentImages.length > 0 && (
                    <div className={styles.pmImagePreviewGrid}>
                        <h4 className={styles.pmPreviewTitle}>Uploaded Images ({currentImages.length})</h4>
                        <div className={styles.pmImageGrid}>
                            {currentImages.map((imageUrl, index) => (
                                <div key={index} className={styles.pmImagePreviewItem}>
                                    <img 
                                        src={imageUrl} 
                                        alt={`Product ${index + 1}`}
                                        className={styles.pmPreviewImage}
                                        onError={e => { 
                                            e.target.src = '/placeholder-image.png'; 
                                        }}
                                    />
                                    <div className={styles.pmImageOverlay}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImage(index);
                                            }}
                                            className={styles.pmRemoveImageBtn}
                                            title="Remove Image"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    {index === 0 && (
                                        <div className={styles.pmPrimaryImageBadge}>Primary</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Manual URL Input (fallback) */}
                <div className={styles.pmManualUrlSection}>
                    <label className={styles.pmManualUrlLabel}>
                        Or add image URLs manually (comma-separated)
                    </label>
                    <textarea 
                        name="product_image" 
                        value={formData.product_image || ''} 
                        onChange={handleChange} 
                        rows="2"
                        className={styles.pmManualImageInput}
                        placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                    />
                </div>
            </div>
        );
    };

    const renderForm = () => (
        <div className={styles.pmModalOverlay}>
            <div className={styles.pmModalContent}>
                <div className={styles.pmModalHeader}>
                    <div>
                        <h2 className={styles.pmModalTitle}>
                            {isNew ? 'Add New Product' : 'Edit Product'}
                        </h2>
                        <p className={styles.pmModalSubtitle}>
                            Fill in the product details carefully. All changes are saved directly to the database.
                        </p>
                    </div>
                    <div className={styles.pmModalActions}>
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className={styles.pmHelpBtn}
                            title="Show Help"
                        >
                            <HelpCircle size={20} />
                        </button>
                        <button
                            onClick={() => { setEditingProduct(null); setIsNew(false); }}
                            className={styles.pmCloseBtn}
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {showHelp && (
                    <div className={styles.pmHelpSection}>
                        <h3 className={styles.pmHelpTitle}>Help Guide:</h3>
                        <ul className={styles.pmHelpList}>
                            <li>• <strong>Required fields:</strong> Product name, price, short description, full description</li>
                            <li>• <strong>Image Upload:</strong> Drag & drop multiple images or click to browse. Images are automatically uploaded to Supabase storage</li>
                            <li>• <strong>Primary Image:</strong> The first image will be used as the main product image</li>
                            <li>• <strong>Comma-separated fields:</strong> Use commas to separate multiple values (e.g., "Small,Medium,Large")</li>
                            <li>• <strong>Ingredients:</strong> Make sure ingredient names and percentages match in count</li>
                        </ul>
                    </div>
                )}

                <form className={styles.pmForm} onSubmit={(e) => e.preventDefault()}>
                    {/* Basic Information */}
                    <div className={styles.pmFormSection}>
                        <label>Product Name *</label>
                        <input name="product_name" value={formData.product_name || ''} onChange={handleChange} />
                        {errors.product_name && <p className={styles.pmErrorText}>{errors.product_name}</p>}

                        <label>Price (₹) *</label>
                        <input name="product_price" type="number" value={formData.product_price || ''} onChange={handleChange} />
                        {errors.product_price && <p className={styles.pmErrorText}>{errors.product_price}</p>}

                        <label>Discount (%)</label>
                        <input name="product_discount" type="number" value={formData.product_discount || ''} onChange={handleChange} />

                        <label>Short Description *</label>
                        <textarea name="product_sub_description" value={formData.product_sub_description || ''} onChange={handleChange} rows="2" />
                        {errors.product_sub_description && <p className={styles.pmErrorText}>{errors.product_sub_description}</p>}

                        <label>Full Product Description *</label>
                        <textarea name="product_description" value={formData.product_description || ''} onChange={handleChange} rows="4" />
                        {errors.product_description && <p className={styles.pmErrorText}>{errors.product_description}</p>}
                    </div>

                    {/* Image Upload Section */}
                    {renderImageUploadSection()}

                    {/* Advanced Information */}
                    <div className={styles.pmFormSection}>
                        <label>Size Variants (comma-separated)</label>
                        <input name="size" value={formData.size || ''} onChange={handleChange} />
                        {errors.size && <p className={styles.pmErrorText}>{errors.size}</p>}

                        <label>Key Benefits (comma-separated)</label>
                        <input name="key_benefits" value={formData.key_benefits || ''} onChange={handleChange} />

                        <label>Why Choose This Product?</label>
                        <textarea name="why_choose_product" value={formData.why_choose_product || ''} onChange={handleChange} rows="2" />

                        <label>Ingredients Heading</label>
                        <input name="ingredients_heading" value={formData.ingredients_heading || ''} onChange={handleChange} />

                        <label>Ingredients Description</label>
                        <textarea name="ingredients_description" value={formData.ingredients_description || ''} onChange={handleChange} rows="2" />

                        <label>Ingredients Subheading</label>
                        <input name="ingredients_subheading" value={formData.ingredients_subheading || ''} onChange={handleChange} />

                        <label>Ingredient Names (comma-separated)</label>
                        <input name="ingredients_name" value={formData.ingredients_name || ''} onChange={handleChange} />

                        <label>Ingredient Percentages (comma-separated, must match ingredients)</label>
                        <input name="percentage" value={formData.percentage || ''} onChange={handleChange} />
                        {errors.ingredients_percentage && <p className={styles.pmErrorText}>{errors.ingredients_percentage}</p>}

                        <label>How To Use Heading</label>
                        <input name="how_to_use_heading" value={formData.how_to_use_heading || ''} onChange={handleChange} />

                        <label>How To Use Description</label>
                        <textarea name="how_to_use_description" value={formData.how_to_use_description || ''} onChange={handleChange} rows="2" />

                        <label>Pro Tips</label>
                        <textarea name="pro_tips" value={formData.pro_tips || ''} onChange={handleChange} rows="2" />
                    </div>
                </form>
                
                {/* Form Actions */}
                <div className={styles.pmFormActions}>
                    <button
                        onClick={() => { setEditingProduct(null); setIsNew(false); }}
                        className={styles.pmCancelBtn}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={isNew ? handleCreate : handleUpdate}
                        disabled={loading || uploadingImages}
                        className={styles.pmSubmitBtn}
                    >
                        {loading ? (
                            <div className={styles.pmLoadingSpinner}></div>
                        ) : (
                            <Save size={16} />
                        )}
                        {loading ? 'Saving...' : (isNew ? 'Create Product' : 'Update Product')}
                    </button>
                </div>
                
                {/* Error and Success Messages */}
                {Object.keys(errors).length > 0 && (
                    <div className={styles.pmErrorContainer}>
                        <div className={styles.pmErrorHeader}>
                            <AlertCircle size={20} />
                            <span className={styles.pmErrorTitle}>Please fix the following errors:</span>
                        </div>
                        <ul className={styles.pmErrorList}>
                            {Object.values(errors).map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {success && (
                    <div className={styles.pmSuccessContainer}>
                        <div className={styles.pmSuccessHeader}>
                            <CheckCircle size={20} />
                            <span className={styles.pmSuccessTitle}>{success}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className={styles.pmContainer}>
            <div className={styles.pmMainContent}>
                {/* Header */}
                <div className={styles.pmHeader}>
                    <div>
                        <h1 className={styles.pmMainTitle}>Product Manager</h1>
                        <p className={styles.pmSubtitle}>Manage your products efficiently. Add, edit, or delete products as needed.</p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className={styles.pmAddNewBtn}
                        title="Add New Product"
                    >
                        <PlusCircle size={20} />
                        Add New Product
                    </button>
                </div>
                
                {/* Product List */}
                <div className={styles.pmProductList}>
                    {loading ? (
                        <div className={styles.pmLoading}>Loading products...</div>
                    ) : (
                        products.length > 0 ? (
                            products.map(renderProductCard)
                        ) : (
                            <div className={styles.pmNoProducts}>
                                No products found. Please add a new product.
                            </div>
                        )
                    )}
                </div>
                
                {/* Form Modal */}
                {(editingProduct !== null || isNew) && renderForm()}
            </div>
        </div>
    );
}