import { CommentSection } from '@/components/comments/CommentSection';

interface ProfileFooterProps {
  userId: number;
  isOwnProfile: boolean;
  onShare?: () => void;
  onExportData?: () => void;
}

export function ProfileFooter({
  userId,
}: ProfileFooterProps) {

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
