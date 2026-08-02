import { useEffect, useState, useRef, useMemo, useCallback } from 'react';

export default function DecryptedText({
  text = "",
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  encryptedClassName = '',
  animateOn = 'hover',
  clickMode = 'once',
  ...props
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(animateOn !== 'click');

  const intervalRef = useRef(null);
  const pointerRef = useRef(0);
  const orderRef = useRef([]);

  const availableChars = useMemo(() => {
    return useOriginalCharsOnly
      ? Array.from(new Set(text.split(''))).filter(char => char !== ' ')
      : characters.split('');
  }, [useOriginalCharsOnly, text, characters]);

  const shuffleText = useCallback(
    (originalText, currentRevealed) => {
      return originalText
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' ';
          if (currentRevealed.has(index)) return char;
          const randomIndex = Math.floor(Math.random() * availableChars.length);
          return availableChars[randomIndex];
        })
        .join('');
    },
    [availableChars]
  );

  const startAnimation = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setRevealedIndices(new Set());
    pointerRef.current = 0;

    // Generate indices to reveal
    const indices = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== ' ') {
        indices.push(i);
      }
    }

    if (revealDirection === 'end') {
      indices.reverse();
    } else if (revealDirection === 'center') {
      // Sort from center outward
      const mid = text.length / 2;
      indices.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    }

    orderRef.current = indices;

    let currentIterations = 0;
    const activeRevealed = new Set();

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (sequential) {
        if (pointerRef.current < orderRef.current.length) {
          activeRevealed.add(orderRef.current[pointerRef.current]);
          pointerRef.current += 1;
          setRevealedIndices(new Set(activeRevealed));
          setDisplayText(shuffleText(text, activeRevealed));
        } else {
          clearInterval(intervalRef.current);
          setIsAnimating(false);
          setDisplayText(text);
          setHasAnimated(true);
        }
      } else {
        if (currentIterations < maxIterations) {
          setDisplayText(shuffleText(text, activeRevealed));
          currentIterations += 1;
        } else {
          clearInterval(intervalRef.current);
          setIsAnimating(false);
          setDisplayText(text);
          setHasAnimated(true);
        }
      }
    }, speed);
  }, [text, speed, maxIterations, sequential, revealDirection, shuffleText]);

  useEffect(() => {
    if (animateOn === 'view' && !hasAnimated) {
      startAnimation();
    }
  }, [animateOn, hasAnimated, startAnimation]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' || animateOn === 'inViewHover') {
      startAnimation();
    }
  };

  const handleClick = () => {
    if (animateOn === 'click') {
      if (clickMode === 'toggle' && hasAnimated) {
        setHasAnimated(false);
        setDisplayText(text.split('').map(() => availableChars[0]).join(''));
      } else {
        startAnimation();
      }
    }
  };

  return (
    <span
      className={parentClassName}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      style={{ display: 'inline-block', whiteSpace: 'pre-wrap', cursor: 'pointer' }}
      {...props}
    >
      {displayText.split('').map((char, index) => {
        const isRevealed = revealedIndices.has(index) || hasAnimated;
        return (
          <span
            key={index}
            className={isRevealed ? className : encryptedClassName}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
