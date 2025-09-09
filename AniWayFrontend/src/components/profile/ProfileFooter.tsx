import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share, Download, MoreVertical } from 'lucide-react';
import { CommentSection } from '@/components/comments/CommentSection';

interface ProfileFooterProps {
  userId: number;
  isOwnProfile: boolean;
  onShare?: () => void;
  onExportData?: () => void;
}

export function ProfileFooter({
  userId,
  isOwnProfile,
  onShare,
  onExportData
}: ProfileFooterProps) {

  return (
    <div className="space-y-6">
      {/* Действия с профилем */}
      <Card className="bg-white/3 backdrop-blur-md border border-white/8 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onShare}
              variant="outline"
              className="border-white/15 bg-white/3 text-gray-300 hover:bg-white/8"
            >
              <Share className="w-4 h-4 mr-2" />
              Поделиться профилем
            </Button>

            {isOwnProfile && (
              <Button
                onClick={onExportData}
                variant="outline"
                className="border-white/15 bg-white/3 text-gray-300 hover:bg-white/8"
              >
                <Download className="w-4 h-4 mr-2" />
                Экспорт данных
              </Button>
            )}

            <Button
              variant="outline"
              className="border-white/15 bg-white/3 text-gray-300 hover:bg-white/8"
            >
              <MoreVertical className="w-4 h-4 mr-2" />
              Ещё
            </Button>
          </div>
        </CardContent>
      </Card>

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
