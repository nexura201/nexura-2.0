// ============ TIPOS BASE ============
export type UserRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'USER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
}

export interface Channel {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string | null;
  avatarUrl: string;
  bannerUrl: string;
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// ============ STREAMING ============
export type StreamStatus = 'OFFLINE' | 'STARTING' | 'LIVE' | 'ENDING' | 'ERROR';

export interface StreamKey {
  id: string;
  channelId: string;
  keyHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stream {
  id: string;
  channelId: string;
  title: string;
  categoryId: string | null;
  tags: string[];
  thumbnailUrl: string;
  status: StreamStatus;
  streamKeyId: string;
  startedAt: string | null;
  endedAt: string | null;
  lastHeartbeatAt: string | null;
  viewerCount: number;
  peakViewerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StreamSession {
  id: string;
  streamId: string;
  startedAt: string;
  endedAt: string | null;
  lastHeartbeatAt: string;
  sourceIp: string;
  ingestServer: string;
  status: StreamStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ViewerCount {
  channelId: string;
  current: number;
  peak: number;
  updatedAt: string;
}

// ============ CHAT ============
export type ChatEventType =
  | 'CHAT_MESSAGE'
  | 'CHAT_MESSAGE_DELETED'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'USER_TIMEOUT'
  | 'MODERATOR_ADDED'
  | 'MODERATOR_REMOVED'
  | 'VIP_ADDED'
  | 'VIP_REMOVED'
  | 'CHAT_SETTINGS_UPDATED'
  | 'STREAM_STARTED'
  | 'STREAM_ENDED'
  | 'VIEWER_COUNT_UPDATED'
  | 'PRESENCE_UPDATED';

export interface ChatEvent {
  type: ChatEventType;
  channelId: string;
  payload: any;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  streamId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  message: string;
  createdAt: string;
  deletedAt?: string;
  deletedBy?: string;
  isModerator?: boolean;
  isVIP?: boolean;
}

export interface ChatBan {
  id: string;
  channelId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface ChatTimeout {
  id: string;
  channelId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  expiresAt: string;
  createdAt: string;
}

export interface ChannelModerator {
  id: string;
  channelId: string;
  userId: string;
  assignedBy: string;
  permissions: string[];
  createdAt: string;
}

export interface ChannelVIP {
  id: string;
  channelId: string;
  userId: string;
  assignedBy: string;
  createdAt: string;
}

export interface ChatFilterWord {
  id: string;
  channelId: string;
  word: string;
  createdAt: string;
}

export interface ChatSettings {
  channelId: string;
  slowMode: number;
  followersOnly: boolean;
  blockedWords: string[];
  updatedAt: string;
}

// ============ VOD & CLIPS ============
export type VideoStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'PRIVATE' | 'DELETED';
export type VideoVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
export type ClipStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'DELETED';

export interface Video {
  id: string;
  channelId: string;
  streamId: string;
  title: string;
  description: string;
  status: VideoStatus;
  visibility: VideoVisibility;
  duration: number;
  thumbnailUrl: string;
  videoUrl: string;
  storageKey: string;
  views: number;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Clip {
  id: string;
  channelId: string;
  videoId: string | null;
  streamId: string | null;
  creatorId: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: ClipStatus;
  thumbnailUrl: string;
  videoUrl: string;
  storageKey: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface StorageFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

// ============ NOTIFICATIONS ============
export type NotificationType = 
  | 'STREAM_STARTED'
  | 'NEW_FOLLOWER'
  | 'VIDEO_READY'
  | 'CLIP_READY'
  | 'MENTION'
  | 'MODERATION'
  | 'SYSTEM'
  | 'ACCOUNT';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

// ============ SECURITY ============
export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'EMAIL_CHANGED'
  | 'EMAIL_VERIFIED'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'SESSION_REVOKED_ALL'
  | 'SUSPICIOUS_LOGIN'
  | 'RATE_LIMIT_TRIGGERED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'PERMISSION_DENIED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'API_ABUSE'
  | 'WEBHOOK_FAILURE'
  | 'ADMIN_ACTION'
  | 'OWNER_ACTION';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEvent {
  id: string;
  userId?: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  ipHash?: string;
  userAgentHash?: string;
  metadata?: any;
  createdAt: string;
}

// ============ REPORTS ============
export type ReportTargetType = 'USER' | 'MESSAGE' | 'CHANNEL' | 'VIDEO' | 'CLIP';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'HATEFUL_CONTENT' | 'THREATS' | 'OTHER' | 'CHILD_SAFETY' | 'VIOLENCE' | 'SELF_HARM' | 'ILLEGAL_CONTENT' | 'SEXUAL_CONTENT' | 'FRAUD' | 'SCAM' | 'IMPERSONATION' | 'COPYRIGHT' | 'PRIVATE_INFORMATION';
export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'DISMISSED' | 'CLOSED' | 'ESCALATED';
export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
}

// ============ CATEGORIES ============
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  imageUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ ADDITIONAL TYPES FOR PHASES 6-10 ============

// Analytics
export interface StreamAnalytics {
  streamId: string;
  channelId: string;
  title: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  peakViewers: number;
  averageViewers: number;
  uniqueViewers: number;
  newFollowers: number;
  chatMessages: number;
  status: StreamStatus;
}

export interface VideoAnalytics {
  videoId: string;
  channelId: string;
  title: string;
  views: number;
  duration: number;
  averageWatchTime: number;
  completionRate: number;
  publishedAt: string;
}

export interface ClipAnalytics {
  clipId: string;
  channelId: string;
  title: string;
  views: number;
  shares: number;
  duration: number;
  createdAt: string;
}

export interface DashboardStats {
  totalFollowers: number;
  totalFollowing: number;
  totalViews: number;
  totalStreamHours: number;
  totalVideos: number;
  totalClips: number;
  recentActivity: ChannelActivity[];
  liveStatus: 'LIVE' | 'OFFLINE';
  currentViewers?: number;
}

export interface AnalyticsPeriod {
  period: 'today' | '7days' | '30days' | '90days';
  startDate: string;
  endDate: string;
  streams: StreamAnalytics[];
  videos: VideoAnalytics[];
  clips: ClipAnalytics[];
  totalViews: number;
  totalStreamHours: number;
  newFollowers: number;
}

// Activity
export type ActivityType = 
  | 'STREAM_STARTED'
  | 'STREAM_ENDED'
  | 'VIDEO_PUBLISHED'
  | 'CLIP_CREATED'
  | 'NEW_FOLLOWER'
  | 'FOLLOWER_LEFT';

export interface ChannelActivity {
  id: string;
  channelId: string;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: any;
  createdAt: string;
}

// Monetization
export interface SubscriptionPlan {
  id: string;
  channelId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'MONTH' | 'YEAR';
  providerPriceId?: string;
  benefits: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonetizationSettings {
  channelId: string;
  status: 'DISABLED' | 'SETUP_REQUIRED' | 'ACTIVE' | 'SUSPENDED';
  acceptSubscriptions: boolean;
  acceptDonations: boolean;
  minimumDonation: number;
  maximumDonation: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformMonetizationSettings {
  platformFeePercent: number;
  enabledCurrencies: string[];
  minimumDonation: number;
  maximumDonation: number;
  minimumPayout: number;
  subscriptionsEnabled: boolean;
  donationsEnabled: boolean;
  updatedAt: string;
}

export interface MonetizationDashboardStats {
  totalRevenue: number;
  pendingRevenue: number;
  availableBalance: number;
  totalPaidOut: number;
  activeSubscribers: number;
  totalDonations: number;
  revenueByPeriod: {
    today: number;
    last7Days: number;
    last30Days: number;
    last90Days: number;
  };
}

// Payment
export type PaymentStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type SubscriptionStatus = 
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'INCOMPLETE'
  | 'PAUSED'
  | 'EXPIRED';

export interface Payment {
  id: string;
  userId: string;
  channelId: string;
  subscriptionId?: string;
  provider: string;
  providerPaymentId?: string;
  providerCustomerId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentType: 'SUBSCRIPTION' | 'DONATION' | 'OTHER';
  refundedAmount: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  channelId: string;
  planId: string;
  provider: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Chat additional
export interface ChatModerationAction {
  id: string;
  channelId: string;
  targetUserId: string;
  moderatorId: string;
  action: 'BAN' | 'UNBAN' | 'TIMEOUT' | 'DELETE_MESSAGE' | 'ADD_MODERATOR' | 'REMOVE_MODERATOR' | 'ADD_VIP' | 'REMOVE_VIP';
  reason: string;
  createdAt: string;
}

export interface ChatReport {
  id: string;
  reporterId: string;
  channelId: string;
  messageId: string;
  reportedUserId: string;
  reason: string;
  status: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface StreamHubNotification {
  id: string;
  userId: string;
  type: 'STREAM_STARTED' | 'FOLLOW' | 'MODERATION';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

export interface NotificationPreferences {
  userId: string;
  streamStarted: boolean;
  newFollower: boolean;
  videoReady: boolean;
  clipReady: boolean;
  mention: boolean;
  moderation: boolean;
  system: boolean;
  emailNotifications: boolean;
  updatedAt: string;
}

// Profile
export interface ChannelLink {
  id: string;
  channelId: string;
  title: string;
  url: string;
  type: 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'discord' | 'website' | 'other';
  order: number;
  active: boolean;
  createdAt: string;
}

export interface ChannelSection {
  id: string;
  channelId: string;
  type: 'VIDEOS' | 'CLIPS' | 'ABOUT' | 'CUSTOM';
  title: string;
  content?: string;
  order: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  language: string;
  timezone: string;
  theme: 'dark' | 'light' | 'system';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  updatedAt: string;
}

export interface PrivacySettings {
  showFollowers: boolean;
  showFollowing: boolean;
  showActivity: boolean;
  showEmail: boolean;
  allowMessages: boolean;
}

// Security
export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  ipHash: string;
  country?: string;
  lastActive: string;
  current: boolean;
  createdAt: string;
}

// Extended Security Events
export type ExtendedSecurityEventType = SecurityEventType | 
  'PASSWORD_RESET_REQUESTED' |
  'PASSWORD_RESET_COMPLETED' |
  'EMAIL_CHANGED' |
  'EMAIL_VERIFIED' |
  'SESSION_CREATED' |
  'SESSION_REVOKED' |
  'SESSION_REVOKED_ALL' |
  'TWO_FACTOR_ENABLED' |
  'TWO_FACTOR_DISABLED' |
  'API_ABUSE' |
  'WEBHOOK_FAILURE' |
  'ADMIN_ACTION' |
  'OWNER_ACTION';

// Extended Report
export type ExtendedReportReason = ReportReason | 
  'CHILD_SAFETY' |
  'VIOLENCE' |
  'SEXUAL_CONTENT' |
  'SCAM' |
  'FRAUD' |
  'IMPERSONATION' |
  'COPYRIGHT' |
  'ILLEGAL_CONTENT' |
  'SELF_HARM' |
  'PRIVATE_INFORMATION';

export type ExtendedReportStatus = ReportStatus | 'ESCALATED';

// ============ REELS ============
export type ReelStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'PRIVATE' | 'DELETED';

export interface Reel {
  id: string;
  channelId: string;
  title: string;
  description: string;
  status: ReelStatus;
  videoUrl: string;
  thumbnailUrl: string;
  storageKey: string;
  duration: number; // segundos
  views: number;
  likes: number;
  likedBy: string[]; // userIds que le dieron me gusta
  createdAt: string;
  updatedAt: string;
}
