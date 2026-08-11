'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((mod) => mod.DotLottieReact),
  { ssr: false }
);

interface LottieAnimationProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  autoplay?: boolean;
  loop?: boolean;
}

export default function LottieAnimation({
  src,
  className,
  style,
  autoplay = true,
  loop = true,
}: LottieAnimationProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dotLottie, setDotLottie] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotLottieRefCallback = useCallback((instance: any) => {
    if (instance) {
      setDotLottie(instance);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !dotLottie) return;

    const resizeObserver = new ResizeObserver(() => {
      try {
        if (typeof dotLottie.resize === 'function') {
          dotLottie.resize();
        }
      } catch {
        // ignore resize errors
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [dotLottie]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        className={className}
        style={style}
        dotLottieRefCallback={dotLottieRefCallback}
        renderConfig={{
          autoResize: true,
          devicePixelRatio: typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2,
        }}
      />
    </div>
  );
}
