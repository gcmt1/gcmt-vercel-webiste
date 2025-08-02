import React from 'react';

const PoliciesPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-10">
        Our Policies
      </h1>

      {/* Refund & Cancellation Policy */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Refund & Cancellation Policy</h2>
        <p className="mb-2">
          At GCMT Shop, we are committed to providing high-quality herbal wellness products to our customers. Please read our Refund & Cancellation Policy carefully before making a purchase.
        </p>
        <p className="mb-2 font-semibold">1. Cancellations:</p>
        <p className="mb-2">We do not accept order cancellations once the order has been placed and confirmed. Kindly ensure that all details are accurate before confirming your purchase.</p>
        <p className="mb-2 font-semibold">2. Refunds:</p>
        <p className="mb-2">We regret to inform you that we do not offer refunds on any products sold through our website. Each item is carefully packed and shipped with utmost care to preserve its quality and safety.</p>
        <p className="mb-2 font-semibold">3. Returns and Replacements:</p>
        <p className="mb-2">
          While we do not allow returns or refunds, we do offer replacements strictly under the following circumstances:
        </p>
        <ul className="list-disc list-inside mb-2">
          <li>The product received is incorrect (i.e., different from what was ordered)</li>
          <li>The product is received in a damaged or defective condition</li>
        </ul>
        <p className="mb-2">To initiate a replacement request, please contact our support team within <strong>48 hours of delivery</strong> with:</p>
        <ul className="list-disc list-inside mb-2">
          <li>Order ID</li>
          <li>Unboxing video or photo of the damaged/incorrect product</li>
          <li>Description of the issue</li>
        </ul>
        <p className="mb-2 font-semibold">4. Replacement Process Timeline:</p>
        <p className="mb-2">
          Upon receiving your replacement request, our support team will evaluate the claim. If approved, a replacement will be dispatched within <strong>5–7 business days</strong>, subject to product availability.
        </p>
      </section>

      {/* Terms & Conditions */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Terms & Conditions</h2>
        <p className="mb-2">
          {/* Insert your custom Terms & Conditions here */}
        </p>
      </section>

      {/* Privacy Policy */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
        <p className="mb-2">GCMT Shop is committed to protecting your privacy. This policy outlines how we collect, use, and protect your personal information.</p>
        <p className="mb-2 font-semibold">1. Information We Collect:</p>
        <ul className="list-disc list-inside mb-2">
          <li>Full name</li>
          <li>Address</li>
          <li>Phone number</li>
          <li>Email address</li>
          <li>Order and transaction history</li>
        </ul>
        <p className="mb-2 font-semibold">2. Purpose of Collection:</p>
        <ul className="list-disc list-inside mb-2">
          <li>Processing and fulfilling your orders</li>
          <li>Ensuring successful delivery through our courier partners</li>
          <li>Providing customer support and service updates</li>
          <li>Marketing and promotional activities aimed at improving your experience</li>
        </ul>
        <p className="mb-2 font-semibold">3. Data Sharing:</p>
        <p className="mb-2">We do not sell or rent your personal information to third parties. Your data may only be shared with our logistics partners and third-party service providers involved in delivering the purchased products and services.</p>
        <p className="mb-2 font-semibold">4. Analytics & Cookies:</p>
        <p className="mb-2">While we do not currently use cookies or analytics tools, we may use tools like Google Analytics in the future to analyze website traffic and improve our service.</p>
        <p className="mb-2 font-semibold">5. Data Protection:</p>
        <p className="mb-2">We implement industry-standard security measures to safeguard your data from unauthorized access or misuse.</p>
        <p className="mb-2 font-semibold">6. Your Rights:</p>
        <p className="mb-2">You may contact us at any time to update, correct, or delete your personal information from our database.</p>
      </section>

      {/* Delivery & Shipping Policy */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Delivery & Shipping Policy</h2>
        <p className="mb-2">GCMT Shop is dedicated to ensuring timely and secure delivery of all orders across India. Please review our shipping policies below.</p>
        <p className="mb-2 font-semibold">1. Serviceable Locations:</p>
        <p className="mb-2">We currently ship our products across all major regions and cities within India. We do not offer international shipping at this time.</p>
        <p className="mb-2 font-semibold">2. Delivery Partner:</p>
        <p className="mb-2">We use <strong>Delhivery</strong>, one of India’s most trusted logistics providers, to deliver all orders.</p>
        <p className="mb-2 font-semibold">3. Shipping Timeframe:</p>
        <ul className="list-disc list-inside mb-2">
          <li><strong>Metro Cities:</strong> 3–5 business days</li>
          <li><strong>Tier 2/3 Cities and Rural Areas:</strong> 5–9 business days</li>
        </ul>
        <p className="mb-2 font-semibold">4. Order Processing Time:</p>
        <p className="mb-2">All orders are processed within <strong>1–2 business days</strong> from the time of order confirmation. Orders placed on weekends or public holidays will be processed on the next working day.</p>
        <p className="mb-2 font-semibold">5. Shipping Charges:</p>
        <p className="mb-2">Any applicable shipping charges will be clearly mentioned at checkout before payment. We strive to keep shipping costs minimal.</p>
        <p className="mb-2 font-semibold">6. Delivery Delays:</p>
        <p className="mb-2">While we aim for timely delivery, unforeseen circumstances (e.g., natural disasters, strikes, courier delays) may occasionally cause delays. GCMT Shop is not liable for such delays.</p>
        <p className="mb-2 font-semibold">7. Product Inspection:</p>
        <p className="mb-2">We ensure all products are packed securely. If you receive a damaged or incorrect item, please report it within <strong>48 hours of delivery</strong> for a replacement.</p>
        <p className="mb-2 font-semibold">8. Delivery Confirmation:</p>
        <p className="mb-2">Once an order is shipped, you will receive tracking details. It is the customer’s responsibility to ensure someone is available to receive the package at the provided address.</p>
      </section>

      {/* Footer */}
      <div className="text-sm text-center text-gray-500 mt-12">
        &copy; {new Date().getFullYear()} Gold Coin Multitrade Pvt. Ltd. All rights reserved.
      </div>
    </div>
  );
};

export default PoliciesPage;
