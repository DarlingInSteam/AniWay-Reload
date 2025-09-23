import { CommentSection } from '@/components/comments/CommentSection';
import { useEffect } from 'react';

interface ProfileFooterProps {
  userId: number;
  isOwnProfile: boolean;
  onShare?: () => void;
  onExportData?: () => void;
}

export function ProfileFooter({
  userId,
}: ProfileFooterProps) {
  // Re-run highlighter after profile comment section mounts if hash targets a comment
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash.startsWith('#comment-')) {
      // small delay to ensure comments hook starts fetching
      setTimeout(() => { (window as any).__rehighlightAnchor?.(); }, 120);
    }
  }, [userId]);

  return (
    <div className="space-y-6">
      {/* Комментарии к профилю */}
      <CommentSection
        targetId={userId}
        type="PROFILE"
        title="Комментарии к профилю"
        maxLevel={3}
      />
    </div>
  );
}
