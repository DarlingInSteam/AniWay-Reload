export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface FriendView {
  friendUserId: number;
  since: string | null;
  sourceRequestId?: string | null;
}

export interface FriendSummary {
  friends: number;
  incomingPending: number;
  outgoingPending: number;
}

export interface FriendRequestView {
  id: string;
  requesterId: number;
  receiverId: number;
  status: FriendRequestStatus;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string | null;
}

export type ConversationType = 'PRIVATE' | 'CHANNEL';

export interface MessageView {
  id: string;
  senderId: number;
  content: string;
  replyToMessageId?: string | null;
  createdAt: string;
  editedAt?: string | null;
}

export interface MessagePageView {
  messages: MessageView[];
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface ConversationView {
  id: string;
  type: ConversationType;
  categoryId?: number | null;
  categoryTitle?: string | null;
  participantIds: number[];
  lastMessage?: MessageView | null;
  unreadCount: number;
  createdAt: string;
  lastMessageAt?: string | null;
}

export interface InboxSummaryView {
  directUnread: number;
  channelUnread: number;
  pendingFriendRequests: number;
}

export interface CategoryView {
  id: number;
  slug: string;
  title: string;
  description: string;
  isDefault: boolean;
  isArchived: boolean;
  unreadCount: number;
}

export interface CreateCategoryPayload {
  title: string;
  slug?: string | null;
  description?: string | null;
  isDefault?: boolean | null;
}

export interface UpdateCategoryPayload {
  title?: string | null;
  description?: string | null;
  isArchived?: boolean | null;
  isDefault?: boolean | null;
}

export type CategoryUnreadMap = Record<number, number>;
