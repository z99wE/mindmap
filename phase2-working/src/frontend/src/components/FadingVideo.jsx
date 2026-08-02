import { useEffect, useRef } from 'react';

export default function FadingVideo({ src, className, style, ...props }) {
  const videoRef = useRef(null);
  const rAFRef = useRef(null);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.style.opacity = '0';
    video.loop = false; // Looping handled manually

    const fadeTo = (target, duration) => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      const startOpacity = parseFloat(video.style.opacity) || 0;
      const difference = target - startOpacity;
      const startTime = performance.now();

      const updateFade = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        video.style.opacity = (startOpacity + difference * progress).toString();

        if (progress < 1) {
          rAFRef.current = requestAnimationFrame(updateFade);
        }
      };

      rAFRef.current = requestAnimationFrame(updateFade);
    };

    const handleLoadedData = () => {
      video.style.opacity = '0';
      video.play().catch((e) => console.warn('Autoplay prevented:', e));
      fadeTo(1, 500);
    };

    const handleTimeUpdate = () => {
      const remainingTime = video.duration - video.currentTime;
      if (!fadingOutRef.current && remainingTime <= 0.55 && remainingTime > 0) {
        fadingOutRef.current = true;
        fadeTo(0, 500);
      }
    };

    const handleEnded = () => {
      video.style.opacity = '0';
      setTimeout(() => {
        video.currentTime = 0;
        video.play()
          .then(() => {
            fadingOutRef.current = false;
            fadeTo(1, 500);
          })
          .catch((e) => console.warn('Play failed on end:', e));
      }, 100);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    // If video is already loaded or loads instantly
    if (video.readyState >= 2) {
      handleLoadedData();
    }

    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      style={{ ...style, transition: 'none' }}
      muted
      playsInline
      preload="auto"
      {...props}
    />
  );
}
