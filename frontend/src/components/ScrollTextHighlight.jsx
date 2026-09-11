import React, { useState, useEffect, useRef } from 'react';

export default function ScrollTextHighlight({ text, className = '' }) {
  const containerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      // Calculate how far into the viewport the element is (0 to 1)
      const visibleRatio = Math.min(1, Math.max(0, (windowHeight - rect.top) / (windowHeight + rect.height * 0.5)));
      setScrollProgress(visibleRatio);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const words = text.split(' ');
  const highlightedWordCount = Math.floor(words.length * scrollProgress);

  return (
    <p ref={containerRef} className={`leading-relaxed transition-all duration-300 ${className}`}>
      {words.map((word, idx) => {
        const isHighlighted = idx <= highlightedWordCount;
        return (
          <span
            key={idx}
            className={`transition-colors duration-200 ${
              isHighlighted ? 'text-slate-900 font-semibold' : 'text-slate-400 opacity-70'
            }`}
          >
            {word}{' '}
          </span>
        );
      })}
    </p>
  );
}
