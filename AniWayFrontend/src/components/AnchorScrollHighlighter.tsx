import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Attempts to find element by id in URL hash and scroll + highlight it.
export const AnchorScrollHighlighter: React.FC = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1); // remove '#'
    let attempts = 0;
    const maxAttempts = 15; // ~1.5s with 100ms interval
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('anchor-highlight');
        setTimeout(() => el.classList.remove('anchor-highlight'), 2500);
        return;
      }
      attempts++;
      if (attempts < maxAttempts) setTimeout(tryScroll, 100);
    };
    // Initial small delay to ensure page content began rendering
    setTimeout(tryScroll, 60);
  }, [hash]);

  return null;
};
