import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Attempts to find element by id in URL hash and scroll + highlight it.
// Expose a global retrigger function: window.__rehighlightAnchor()
declare global { interface Window { __rehighlightAnchor?: () => void } }

export const AnchorScrollHighlighter: React.FC = () => {
  const { hash } = useLocation();

  useEffect(() => {
    const run = () => {
      if (!hash) return;
      const id = hash.slice(1);
      if (!id) return;
      let attempts = 0;
      const maxAttempts = 40; // up to ~4s
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('anchor-highlight');
            setTimeout(() => el.classList.remove('anchor-highlight'), 3000);
          return;
        }
        attempts++;
        if (attempts < maxAttempts) setTimeout(tryScroll, 120);
      };
      setTimeout(tryScroll, 50);
    };
    run();
    window.__rehighlightAnchor = () => run();
    return () => { if (window.__rehighlightAnchor) delete window.__rehighlightAnchor; };
  }, [hash]);

  return null;
};
