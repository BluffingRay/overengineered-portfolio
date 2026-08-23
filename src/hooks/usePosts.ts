'use client';

import { useCallback } from 'react';
import type { Post } from '@/types/schema';
import { usePortfolioData } from './usePortfolioData';

/**
 * Blog mutations — every operation is ONE document transaction so the
 * undo/history stack stays coherent, same discipline as block edits.
 */
export function usePosts() {
  const { data, mutate } = usePortfolioData();

  const posts = data.posts ?? [];

  const createPost = useCallback(() => {
    const id = crypto.randomUUID();
    mutate((current) => ({
      ...current,
      posts: [
        {
          id,
          title: '',
          content: '<p></p>',
          status: 'draft' as const,
        },
        ...(current.posts ?? []),
      ],
    }));
    return id;
  }, [mutate]);

  const updatePost = useCallback(
    (id: string, patch: Partial<Post>) => {
      mutate((current) => ({
        ...current,
        posts: (current.posts ?? []).map((post) =>
          post.id === id ? { ...post, ...patch } : post,
        ),
      }));
    },
    [mutate],
  );

  /** Publishing stamps publishedAt once; re-publishing never moves it. */
  const setPostStatus = useCallback(
    (id: string, status: 'draft' | 'published') => {
      mutate((current) => ({
        ...current,
        posts: (current.posts ?? []).map((post) => {
          if (post.id !== id) return post;
          if (status === 'published') {
            return {
              ...post,
              status,
              publishedAt:
                post.publishedAt ?? new Date().toISOString().slice(0, 10),
            };
          }
          return {
            ...post,
            status,
            publishedAt: post.publishedAt,
          };
        }),
      }));
    },
    [mutate],
  );

  const deletePost = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        posts: (current.posts ?? []).filter((post) => post.id !== id),
      }));
    },
    [mutate],
  );

  return { posts, createPost, updatePost, setPostStatus, deletePost };
}
