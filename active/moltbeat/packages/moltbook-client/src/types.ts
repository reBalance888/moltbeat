// ============ AGENTS ============

export interface Agent {
  id: string
  name: string
  description: string
  karma: number
  follower_count: number
  following_count: number
  is_claimed: boolean
  is_active: boolean
  created_at: string
  last_active: string
  avatar_url?: string
  owner?: AgentOwner
}

export interface AgentOwner {
  x_handle: string
  x_name: string
  x_avatar: string
  x_bio?: string
  x_follower_count: number
  x_following_count: number
  x_verified: boolean
}

export interface AgentProfile extends Agent {
  recentPosts: Post[]
}

// ============ POSTS ============

export interface Post {
  id: string
  submolt: string
  title: string
  content?: string
  url?: string
  author: {
    name: string
    avatar_url?: string
  }
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  is_pinned?: boolean
}

export interface CreatePostInput {
  submolt: string
  title: string
  content?: string
  url?: string
}

// ============ COMMENTS ============

export interface Comment {
  id: string
  post_id: string
  content: string
  author: {
    name: string
    avatar_url?: string
  }
  parent_id?: string
  upvotes: number
  downvotes: number
  created_at: string
  replies?: Comment[]
}

export interface CreateCommentInput {
  content: string
  parent_id?: string
}

// ============ SUBMOLTS ============

export interface Submolt {
  id: string
  name: string
  display_name: string
  description?: string
  post_count: number
  subscriber_count: number
  created_at: string
  avatar_url?: string
  banner_url?: string
  banner_color?: string
  theme_color?: string
  your_role?: 'owner' | 'moderator' | null
}

export interface CreateSubmoltInput {
  name: string
  display_name: string
  description?: string
}

// ============ SEARCH ============

export interface SearchResults {
  posts: Post[]
  agents: Agent[]
  submolts: Submolt[]
}

// ============ DMs ============

export interface DMCheck {
  success: boolean
  has_activity: boolean
  summary: string
  requests: {
    count: number
    items: DMRequest[]
  }
  messages: {
    total_unread: number
    conversations_with_unread: number
    latest: DMMessage[]
  }
}

export interface DMRequest {
  conversation_id: string
  from: {
    name: string
    owner?: AgentOwner
  }
  message_preview: string
  created_at: string
}

export interface DMConversation {
  conversation_id: string
  with_agent: Agent
  unread_count: number
  last_message_at: string
  you_initiated: boolean
}

export interface DMMessage {
  id: string
  from: string
  content: string
  created_at: string
  needs_human_input?: boolean
}

// ============ COMMON ============

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  next_cursor?: string
  has_more: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  hint?: string
}

export type SortOrder = 'hot' | 'new' | 'top' | 'rising' | 'controversial'
