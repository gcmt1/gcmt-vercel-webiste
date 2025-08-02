import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import '../styles/PaymentSuccess.css'; // Optional: Add styles

export default function PaymentSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="payment-success-page">
      <div className="success-icon">
      </div>
      <h1>✅ Payment Successful!</h1>
      <p>Your order has been placed and confirmed. Thank you for shopping with us!</p>
      <button onClick={() => navigate('/')} className="btn btn-primary mt-4">
        Go to Homepage
      </button>
    </div>
  );
}
