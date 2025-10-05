import React from 'react';
import ProfilePanel from './ProfilePanel';
import MessagesWorkspace from '@/components/messages/MessagesWorkspace';

interface ProfileMessagesPanelProps {
  currentUserId?: number | null;
}

export const ProfileMessagesPanel: React.FC<ProfileMessagesPanelProps> = ({ currentUserId }) => {
  return (
    <ProfilePanel title="Личные сообщения" className="space-y-6">
      <MessagesWorkspace currentUserId={currentUserId} />
    </ProfilePanel>
  );
};

export default ProfileMessagesPanel;
