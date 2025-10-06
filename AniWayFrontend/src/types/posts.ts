export interface PostAttachment {
  id?: string;
  type: 'IMAGE';
  url: string;
  width?: number;
  height?: number;
  createdAt?: string;
}

export interface PostReferenceResolved {
  mangaId: number;
  title?: string;
  coverImageUrl?: string;
  slug?: string;
}

export interface PostStats {
  score: number;
  up: number;
  down: number;
  userVote?: 1 | -1 | 0;
  commentsCount?: number;
}

export interface Post {
  id: string;
  userId: number;
  author?: import('./index').User;
  content: string; // markdown raw
  createdAt: string;
  updatedAt: string;
  editedUntil?: string;
  canEdit?: boolean; // client derived
  canDelete?: boolean;
  attachments: PostAttachment[];
  references: PostReferenceResolved[];
  stats: PostStats;
  deleted?: boolean;
}

export interface PostAttachmentInput {
  filename: string;
  url: string;
  sizeBytes: number;
}

export interface CreatePostRequest {
  content: string;
  attachments?: PostAttachmentInput[];
}

export interface UpdatePostRequest {
  content: string;
  attachments?: PostAttachmentInput[];
}

export interface VoteRequest {
  value: 1 | -1 | 0;
}

export interface PostsPage {
  items: Post[];
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
}

export const MANGA_REF_REGEX = /\[\[manga:([^\]]+)\]\]/gi;

export function extractMangaReferenceRawTokens(content: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = MANGA_REF_REGEX.exec(content)) !== null) {
    const token = match[1].trim();
    if (token) out.push(token);
  }
  return Array.from(new Set(out));
}
