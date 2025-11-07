import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function CircuitOverlay() {
  const gridElements = useMemo(() => {
    const elements = [];
    const numBoxes = 15;
    const numLines = 20;
    const numDots = 30;

    for (let i = 0; i < numBoxes; i++) {
      elements.push({
        type: 'box',
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        width: Math.random() * 8 + 4,
        height: Math.random() * 8 + 4,
        delay: Math.random() * 2,
      });
    }

    for (let i = 0; i < numLines; i++) {
      const isHorizontal = Math.random() > 0.5;
      elements.push({
        type: 'line',
        x1: Math.random() * 100,
        y1: Math.random() * 100,
        x2: isHorizontal ? Math.random() * 100 : Math.random() * 100,
        y2: isHorizontal ? Math.random() * 100 : Math.random() * 100,
        delay: Math.random() * 3,
      });
    }

    for (let i = 0; i < numDots; i++) {
      elements.push({
        type: 'dot',
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2.5,
      });
    }

    return elements;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ffcc" stopOpacity="0" />
            <stop offset="50%" stopColor="#00ffcc" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00ffcc" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridElements.map((element, index) => {
          if (element.type === 'box') {
            return (
              <motion.rect
                key={`box-${index}`}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill="none"
                stroke="#00ffcc"
                strokeWidth="0.15"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1, 1],
                  opacity: [0, 0.6, 0.4],
                }}
                transition={{
                  duration: 3,
                  delay: element.delay,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              />
            );
          }

          if (element.type === 'line') {
            return (
              <motion.line
                key={`line-${index}`}
                x1={element.x1}
                y1={element.y1}
                x2={element.x2}
                y2={element.y2}
                stroke="url(#lineGradient)"
                strokeWidth="0.2"
                strokeLinecap="round"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1],
                  opacity: [0, 0.5, 0.3],
                }}
                transition={{
                  duration: 2.5,
                  delay: element.delay,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
              />
            );
          }

          if (element.type === 'dot') {
            return (
              <motion.circle
                key={`dot-${index}`}
                cx={element.x}
                cy={element.y}
                r="0.2"
                fill="#00ffcc"
                filter="url(#glow)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 1],
                  opacity: [0, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  delay: element.delay,
                  repeat: Infinity,
                  repeatDelay: 2.5,
                }}
              />
            );
          }

          return null;
        })}

        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <rect x="10" y="15" width="8" height="6" fill="none" stroke="#00ffcc" strokeWidth="0.15" />
          <line x1="10" y1="18" x2="18" y2="18" stroke="#00ffcc" strokeWidth="0.1" />
          <line x1="14" y1="15" x2="14" y2="21" stroke="#00ffcc" strokeWidth="0.1" />
        </motion.g>

        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{
            duration: 3.5,
            delay: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <rect x="75" y="25" width="10" height="8" fill="none" stroke="#00ffcc" strokeWidth="0.15" />
          <rect x="76" y="26" width="3" height="3" fill="none" stroke="#00ffcc" strokeWidth="0.1" />
          <rect x="81" y="26" width="3" height="3" fill="none" stroke="#00ffcc" strokeWidth="0.1" />
        </motion.g>

        <motion.path
          d="M 20 80 L 30 80 L 30 85 L 25 85 L 25 90"
          fill="none"
          stroke="#00ffcc"
          strokeWidth="0.15"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 1, 1],
            opacity: [0, 0.6, 0.4],
          }}
          transition={{
            duration: 3,
            delay: 0.5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        />

        <motion.path
          d="M 85 70 L 90 70 L 90 80 L 85 80"
          fill="none"
          stroke="#00ffcc"
          strokeWidth="0.15"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 1, 1],
            opacity: [0, 0.5, 0.3],
          }}
          transition={{
            duration: 2.5,
            delay: 1.5,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />

      </svg>
    </div>
  );
}
