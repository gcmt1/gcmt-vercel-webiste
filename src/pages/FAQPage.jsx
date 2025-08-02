import React from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/FAQPage.css';

const FAQPage = () => {
  const faqs = [
    {
      question: 'Are your products 100% natural?',
      answer: 'Yes, all our products are made from natural ingredients.',
    },
    {
      question: 'Do you ship internationally?',
      answer:
        'Currently, we ship within India. International shipping will be available soon.',
    },
    {
      question: 'Are your products safe for daily use?',
      answer:
        'Absolutely! Our products are crafted using safe and natural ingredients, suitable for daily use.',
    },
    {
      question: 'How can I track my order?',
      answer:
        'Once your order is shipped, you will receive an email with a tracking link to monitor your delivery.',
    },
  ];

  // JSON-LD for FAQPage Rich Snippet
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="faq-page">
      <Helmet>
        <title>Frequently Asked Questions | GCMT Shop</title>
        <meta
          name="description"
          content="Find answers to common questions about GCMT Shop's herbal products, shipping, and more."
        />
        <meta
          name="keywords"
          content="GCMT Shop FAQ, herbal product questions, shipping, order tracking"
        />
        <link rel="canonical" href="https://gcmtshop.com/faq" />

        {/* FAQPage JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <h1>Frequently Asked Questions</h1>
      {faqs.map((faq, index) => (
        <div className="faq-item" key={index}>
          <h2>{faq.question}</h2>
          <p>{faq.answer}</p>
        </div>
      ))}
    </div>
  );
};

export default FAQPage;
