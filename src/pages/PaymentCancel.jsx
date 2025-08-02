import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PaymentCancel.css'; // Optional: Add styles

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="payment-cancel-container">
      <div className="cancel-card">
        <img
          src="/assets/payment-failed.svg" // ✅ Replace with your own illustration or use an icon
          alt="Payment Failed"
          className="cancel-icon"
        />
        <h1>Payment Cancelled</h1>
        <p>Your transaction was cancelled before it could be completed.</p>
        <p>If this was a mistake or a network issue, you can retry the payment.</p>
        <div className="cancel-actions">
          <button onClick={() => navigate('/checkout')} className="btn btn-primary">
            Retry Payment
          </button>
          <button onClick={() => navigate('/')} className="btn btn-outline">
            Return to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}
