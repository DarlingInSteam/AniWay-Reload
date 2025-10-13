import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfilePanel from './ProfilePanel';
import type { FriendView as FriendDto } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';

interface ProfileFriendListProps {
  friends: FriendDto[];
  users: Record<number, UserMini>;
  title?: string;
  emptyMessage?: string;
  highlightSelf?: boolean;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('');
  return initials || 'U';
}

export const ProfileFriendList: React.FC<ProfileFriendListProps> = ({
  friends,
  users,
  title = 'Друзья',
  emptyMessage = 'Список друзей пуст',
}) => {
  return (
    <ProfilePanel title={title} className="space-y-5">
      {friends.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {friends.map(friend => {
            const info = users[friend.friendUserId];
            const displayName = info?.displayName || info?.username || `ID ${friend.friendUserId}`;
            const avatar = info?.avatar;
            return (
              <Link
                key={friend.friendUserId}
                to={`/profile/${friend.friendUserId}`}
                className="group flex items-center gap-3 rounded-xl border border-transparent bg-white/5 px-3 py-2 transition hover:border-white/30 hover:bg-white/10"
              >
                <Avatar className="h-11 w-11 border border-white/10 bg-black/40">
                  {avatar ? (
                    <AvatarImage src={avatar} alt={displayName} />
                  ) : (
                    <AvatarFallback>{initialsFromName(displayName)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                    {displayName}
                  </span>
                  <span className="truncate text-xs text-slate-400">
                    @{info?.username || friend.friendUserId}
                  </span>
                  {friend.since && (
                    <span className="truncate text-[11px] text-slate-500">С {new Date(friend.since).toLocaleDateString()}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </ProfilePanel>
  );
};

export default ProfileFriendList;
