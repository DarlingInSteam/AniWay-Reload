import { apiClient } from '@/lib/api';
import { Post, PostsPage, CreatePostRequest, UpdatePostRequest, VoteRequest, PostAttachment, extractMangaReferenceRawTokens, PostAttachmentInput } from '@/types/posts';
import { MangaResponseDTO } from '@/types';

// Temporary in-memory cache & mock fallback
const _postCache = new Map<string, Post>();

function nowIso() { return new Date().toISOString(); }

export class PostService {
  async listUserPosts(userId: number, page = 0, size = 10): Promise<PostsPage> {
    try {
      const resp: any = await apiClient.getUserPosts(userId, page, size);
      // Normalize expected shape
      if (resp && Array.isArray(resp.items)) return resp as PostsPage;
      if (Array.isArray(resp?.content)) {
        return {
          items: resp.content,
            page: resp.page ?? page,
            size: resp.size ?? size,
            total: resp.totalElements ?? resp.total ?? resp.content.length,
            hasNext: (resp.page ?? page) + 1 < (resp.totalPages ?? 0)
        };
      }
      return { items: [], page, size, total: 0, hasNext: false };
    } catch {
      // Mock fallback (empty)
      return { items: [], page, size, total: 0, hasNext: false };
    }
  }

  async getPost(id: string): Promise<Post | null> {
    if (_postCache.has(id)) return _postCache.get(id)!;
    try {
      const p = await apiClient.getPostById(id);
      _postCache.set(id, p);
      return p;
    } catch {
      return null;
    }
  }

  async createPost(userId: number, data: CreatePostRequest): Promise<Post> {
    // Extract references client-side (IDs only). Backend will validate.
    const tokens = extractMangaReferenceRawTokens(data.content);
    try {
  const created = await apiClient.createPost({ content: data.content, attachments: data.attachments });
      _postCache.set(created.id, created);
      return created;
    } catch {
      // Mock optimistic placeholder
      const mock: Post = {
        id: 'temp-' + Math.random().toString(36).slice(2),
        userId,
        content: data.content,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        editedUntil: new Date(Date.now() + 7*24*3600*1000).toISOString(),
        canEdit: true,
        attachments: [],
        references: tokens.map(t => ({ mangaId: parseInt(t) || 0 })),
        stats: { score: 0, up: 0, down: 0 },
      };
      _postCache.set(mock.id, mock);
      return mock;
    }
  }

  async updatePost(id: string, data: UpdatePostRequest): Promise<Post | null> {
    try {
  const updated = await apiClient.updatePost(id, { content: data.content, attachments: data.attachments });
      _postCache.set(updated.id, updated);
      return updated;
    } catch {
      return null;
    }
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      await apiClient.deletePost(id);
      const p = _postCache.get(id);
      if (p) { p.deleted = true; }
      return true;
    } catch {
      return false;
    }
  }

  async vote(postId: string, value: 1 | -1 | 0): Promise<Post | null> {
    try {
      const updated = await apiClient.votePost(postId, value);
      _postCache.set(updated.id, updated);
      return updated;
    } catch {
      // Optimistic adjust if cached
      const p = _postCache.get(postId);
      if (p) {
        const prev = p.stats.userVote || 0;
        if (prev === value) {
          // toggle off
          if (value === 1) { p.stats.up -= 1; p.stats.score -= 1; }
          else if (value === -1) { p.stats.down -= 1; p.stats.score += 1; }
          p.stats.userVote = 0;
        } else {
          // remove old
            if (prev === 1) { p.stats.up -= 1; p.stats.score -= 1; }
            else if (prev === -1) { p.stats.down -= 1; p.stats.score += 1; }
          // apply new
          if (value === 1) { p.stats.up += 1; p.stats.score += 1; }
          else if (value === -1) { p.stats.down += 1; p.stats.score -= 1; }
          p.stats.userVote = value;
        }
        return p;
      }
      return null;
    }
  }

  async uploadImages(files: File[]): Promise<PostAttachmentInput[]> {
    if(files.length===0) return [];
    const formData = new FormData();
    for(const f of files){ formData.append('files', f); }
    try {
      const res = await fetch('/api/posts/attachments', { method: 'POST', body: formData });
      if(!res.ok) return [];
      const arr = await res.json();
      return Array.isArray(arr) ? arr.map((o:any)=>({ filename: o.originalFilename || o.filename || 'image', url: o.url || o.objectUrl || o.path, sizeBytes: o.size || o.sizeBytes || 0 })) : [];
    } catch { return []; }
  }
}

export const postService = new PostService();
