import React, { useState, useEffect, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export default function ScrambleText({ text = '', className = '', speed = 30, autoRun = false }) {
  const [displayText, setDisplayText] = useState(text);
  const isScrambling = useRef(false);
  const intervalRef = useRef(null);

  const scramble = () => {
    if (isScrambling.current) return;
    isScrambling.current = true;
    let iteration = 0;
    const maxIterations = text.length * 2;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration / 2) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );

      if (iteration >= maxIterations) {
        clearInterval(intervalRef.current);
        setDisplayText(text);
        isScrambling.current = false;
      }
      iteration += 1;
    }, speed);
  };

  useEffect(() => {
    if (autoRun) {
      scramble();
    } else {
      setDisplayText(text);
    }
    return () => clearInterval(intervalRef.current);
  }, [text, autoRun]);

  return (
    <span
      onMouseEnter={scramble}
      className={`inline-block cursor-default transition-colors ${className}`}
    >
      {displayText}
    </span>
  );
}
