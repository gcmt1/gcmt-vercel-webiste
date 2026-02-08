import React, { useEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import "./SmoothExperience.css";

const SmoothExperience = ({ children }) => {
  const location = useLocation();
  const wrapperRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const prefersReducedMotion = useRef(false);

  // ─── Detect reduced motion preference ───
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mediaQuery.matches;

    const handler = (e) => {
      prefersReducedMotion.current = e.matches;
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // ─── Apply global smooth scroll + performance styles ───
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Smooth scroll behavior
    html.style.scrollBehavior = prefersReducedMotion.current
      ? "auto"
      : "smooth";

    // Font smoothing
    body.style.webkitFontSmoothing = "antialiased";
    body.style.mozOsxFontSmoothing = "grayscale";
    body.style.textRendering = "optimizeLegibility";

    // Prevent layout thrashing on mobile
    body.style.overscrollBehavior = "none";

    // iOS momentum scrolling
    body.style.webkitOverflowScrolling = "touch";

    return () => {
      html.style.scrollBehavior = "";
      body.style.webkitFontSmoothing = "";
      body.style.mozOsxFontSmoothing = "";
      body.style.textRendering = "";
      body.style.overscrollBehavior = "";
      body.style.webkitOverflowScrolling = "";
    };
  }, []);

  // ─── Passive scroll listener for performance ───
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", () => {}, { passive: true });
    window.addEventListener("touchmove", () => {}, { passive: true });
    window.addEventListener("wheel", () => {}, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // ─── Optimize images + iframes with lazy loading ───
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;

            // Lazy load images with data-src
            if (el.tagName === "IMG" && el.dataset.src) {
              el.src = el.dataset.src;
              el.removeAttribute("data-src");
            }

            // Add visible class for fade-in animations
            el.classList.add("se-visible");
            observer.unobserve(el);
          }
        });
      },
      {
        rootMargin: "50px 0px",
        threshold: 0.01,
      }
    );

    // Observe all animatable elements
    const timer = setTimeout(() => {
      if (wrapperRef.current) {
        const elements = wrapperRef.current.querySelectorAll(
          "img[data-src], .se-animate, .se-fade-in, .se-slide-up"
        );
        elements.forEach((el) => observer.observe(el));
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [location.pathname]);

  // ─── Page transition on route change ───
  useEffect(() => {
    if (prefersReducedMotion.current) {
      setIsVisible(true);
      return;
    }

    setIsTransitioning(true);
    setIsVisible(false);

    // Short fade out, then fade in
    const fadeInTimer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
        setTimeout(() => setIsTransitioning(false), 350);
      });
    });

    return () => cancelAnimationFrame(fadeInTimer);
  }, [location.pathname]);

  // ─── Debounced resize handler ───
  useEffect(() => {
    let resizeTimer;

    const handleResize = () => {
      document.body.classList.add("se-resizing");
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.body.classList.remove("se-resizing");
      }, 300);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // ─── Preload links on hover for faster navigation ───
  const handleMouseOver = useCallback((e) => {
    const link = e.target.closest("a[href]");
    if (
      link &&
      link.href &&
      link.href.startsWith(window.location.origin) &&
      !link.dataset.preloaded
    ) {
      link.dataset.preloaded = "true";

      // Create a prefetch hint
      const prefetchLink = document.createElement("link");
      prefetchLink.rel = "prefetch";
      prefetchLink.href = link.href;
      document.head.appendChild(prefetchLink);

      // Clean up after 30s
      setTimeout(() => {
        if (prefetchLink.parentNode) {
          prefetchLink.parentNode.removeChild(prefetchLink);
        }
      }, 30000);
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`smooth-experience-wrapper ${
        isVisible ? "se-page-visible" : "se-page-hidden"
      } ${isTransitioning ? "se-transitioning" : ""}`}
      onMouseOver={handleMouseOver}
    >
      {children}
    </div>
  );
};

export default SmoothExperience;