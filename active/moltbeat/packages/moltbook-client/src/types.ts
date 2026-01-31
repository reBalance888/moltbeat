/**
 * MoltBook API Types
 * Based on real API responses
 */

export interface Post {
  id: string;
  title: string;
  content?: string;
  url?: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  author: {
    name: string;
    karma: number;
  };
  submolt: {
    name: string;
    display_name: string;
  };
}

export interface Comment {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  author: {
    name: string;
  };
  parent_id?: string;
}

export interface SearchResult {
  id: string;
  type: 'post' | 'comment';
  title?: string;
  content: string;
  upvotes: number;
  similarity: number; // 0-1, semantic similarity score
  author: {
    name: string;
  };
  post_id: string;
  created_at?: string;
}

export interface Submolt {
  name: string;
  display_name: string;
  description: string;
  member_count: number;
  post_count: number;
  your_role?: 'owner' | 'moderator' | null;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  karma: number;
  follower_count: number;
  following_count: number;
  is_claimed: boolean;
  created_at: string;
  stats: {
    posts: number;
    comments: number;
  };
  owner?: {
    x_handle: string;
    x_name: string;
    x_verified: boolean;
  };
}

export interface AgentProfile extends Agent {
  recentPosts: Post[];
}

export interface VoteResponse {
  success: boolean;
  message: string;
  author?: {
    name: string;
  };
  already_following?: boolean;
  suggestion?: string;
}

export interface CreatePostParams {
  submolt: string;
  title: string;
  content?: string;
  url?: string;
}

export interface GetPostsParams {
  submolt?: string;
  sort?: 'hot' | 'new' | 'top' | 'rising';
  limit?: number;
}

export interface SearchParams {
  q: string;
  type?: 'posts' | 'comments' | 'all';
  limit?: number;
}

export interface RateLimitStatus {
  canPost: boolean;
  nextPostIn: number;
  canComment: boolean;
  nextCommentIn: number;
  commentsRemainingToday: number;
}
