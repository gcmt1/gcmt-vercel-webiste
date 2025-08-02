import React from 'react';
import '../styles/FAQPage.css';

const FAQPage = () => {
  return (
    <div className="faq-page">
      <h1>Frequently Asked Questions</h1>
      <div className="faq-item">
        <h2>Are your products 100% natural?</h2>
        <p>Yes, all our products are made from natural ingredients.</p>
      </div>
      <div className="faq-item">
        <h2>Do you ship internationally?</h2>
        <p>Currently, we ship within India. International shipping will be available soon.</p>
      </div>
      {/* Add more FAQs */}
    </div>
  );
};

export default FAQPage;
