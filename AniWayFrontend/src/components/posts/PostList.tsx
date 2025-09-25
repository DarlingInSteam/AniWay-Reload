import React, { useEffect, useState } from 'react';
import { postService } from '@/services/postService';
import { Post } from '@/types/posts';
import { PostItem } from './PostItem';

interface PostListProps {
  userId: number;
  currentUserId?: number;
}

export const PostList: React.FC<PostListProps> = ({ userId, currentUserId }) => {
  // Fallback: attempt to read persisted user id if not passed
  if(currentUserId == null){
    const stored = localStorage.getItem('userId') || localStorage.getItem('userID') || localStorage.getItem('currentUserId');
    if(stored) currentUserId = parseInt(stored);
  }
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load(p = 0) {
    setLoading(true);
    const resp = await postService.listUserPosts(userId, p, 10);
    if (p === 0) setPosts(resp.items);
    else setPosts(prev => [...prev, ...resp.items]);
    setHasNext(resp.hasNext);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { load(0); }, [userId]);

  return (
    <div className="space-y-3">
      {posts.length === 0 && !loading && (
        <div className="text-sm text-neutral-400">Постов пока нет.</div>
      )}
      {posts.map(p => (
        <PostItem
          key={p.id}
          post={p}
          currentUserId={currentUserId}
          onUpdated={up => setPosts(ps => ps.map(x => x.id === up.id ? up : x))}
          onDeleted={id => setPosts(ps => ps.filter(x => x.id !== id))}
        />
      ))}
      {hasNext && (
        <div className="flex justify-center">
          <button
            disabled={loading}
            onClick={() => load(page + 1)}
            className="px-3 py-1.5 text-sm bg-neutral-700 rounded hover:bg-neutral-600 disabled:opacity-50"
          >{loading ? 'Загрузка...' : 'Загрузить ещё'}</button>
        </div>
      )}
    </div>
  );
};
