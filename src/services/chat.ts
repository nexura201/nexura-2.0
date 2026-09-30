import { v4 as uuidv4 } from 'uuid';
import type {
  ChatMessage,
  ChatBan,
  ChatTimeout,
  ChatModerationAction,
  ChannelModerator,
  ChannelVIP,
  ChatFilterWord,
  ChatSettings,
  ChatReport,
  UserBlock,
  ChatEvent,
  ChatEventType,
  User,
  StreamHubNotification,
} from '../types';
import * as db from './database';

// ============ STORAGE KEYS ============
const CHAT_KEYS = {
  messages: 'nexura_chat_messages',
  bans: 'nexura_chat_bans',
  timeouts: 'nexura_chat_timeouts',
  moderationActions: 'nexura_chat_moderation_actions',
  moderators: 'nexura_chat_moderators',
  vips: 'nexura_chat_vips',
  filterWords: 'nexura_chat_filter_words',
  settings: 'nexura_chat_settings',
  reports: 'nexura_chat_reports',
  blocks: 'nexura_user_blocks',
  notifications: 'nexura_notifications',
  presence: 'nexura_chat_presence',
  rateLimits: 'nexura_chat_rate_limits',
};

// ============ CONFIGURATION ============
const CONFIG = {
  maxMessageLength: 500,
  rateLimitWindow: 5000, // 5 seconds
  rateLimitMaxMessages: 10, // 10 messages per window
  messageTTL: 24 * 60 * 60 * 1000, // 24 hours
  presenceTTL: 30000, // 30 seconds
};

// ============ BROADCAST CHANNEL ============
// Simula WebSockets para comunicación en tiempo real entre pestañas
const channels = new Map<string, BroadcastChannel>();

function getChannel(channelId: string): BroadcastChannel {
  if (!channels.has(channelId)) {
    channels.set(channelId, new BroadcastChannel(`streamhub_chat_${channelId}`));
  }
  return channels.get(channelId)!;
}

export function broadcastEvent(channelId: string, event: ChatEvent): void {
  const channel = getChannel(channelId);
  channel.postMessage(event);
  console.log(`[CHAT] Broadcast: ${event.type}`, event);
}

export function subscribeToChannel(
  channelId: string,
  callback: (event: ChatEvent) => void
): () => void {
  const channel = getChannel(channelId);
  channel.onmessage = (e) => callback(e.data);
  
  return () => {
    channel.onmessage = null;
  };
}

// ============ UTILITY FUNCTIONS ============
function getCollection<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getObject<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setObject<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ============ MESSAGE OPERATIONS ============
export function sendMessage(
  channelId: string,
  streamId: string,
  userId: string,
  message: string
): ChatMessage | { error: string } {
  const user = db.getUserById(userId);
  if (!user) return { error: 'CHAT_UNAUTHORIZED' };
  if (user.status !== 'ACTIVE') return { error: 'CHAT_USER_BANNED' };

  // Check if user is banned from channel
  if (isUserBanned(channelId, userId)) {
    return { error: 'CHAT_USER_BANNED' };
  }

  // Check if user is timed out
  const timeout = getUserTimeout(channelId, userId);
  if (timeout && new Date(timeout.expiresAt) > new Date()) {
    return { error: 'CHAT_USER_TIMEOUT' };
  }

  // Check followers only
  const settings = getChatSettings(channelId);
  if (settings.followersOnly) {
    const channel = db.getAllChannels().find(c => c.id === channelId);
    if (channel) {
      const isOwner = channel.userId === userId;
      const isMod = isChannelModerator(channelId, userId);
      const isFollower = db.isFollowing(userId, channel.userId);
      
      if (!isOwner && !isMod && !isFollower) {
        return { error: 'CHAT_FOLLOWERS_ONLY' };
      }
    }
  }

  // Check slow mode
  if (settings.slowMode > 0) {
    const isMod = isChannelModerator(channelId, userId);
    const channel = db.getAllChannels().find(c => c.id === channelId);
    const isOwner = channel?.userId === userId;
    
    if (!isMod && !isOwner) {
      const lastMessage = getLastUserMessage(channelId, userId);
      if (lastMessage) {
        const timeSince = Date.now() - new Date(lastMessage.createdAt).getTime();
        if (timeSince < settings.slowMode * 1000) {
          return { error: 'CHAT_SLOW_MODE' };
        }
      }
    }
  }

  // Check rate limit
  if (isRateLimited(userId)) {
    return { error: 'CHAT_RATE_LIMITED' };
  }

  // Validate message
  if (message.length > CONFIG.maxMessageLength) {
    return { error: 'CHAT_MESSAGE_TOO_LONG' };
  }

  if (message.trim().length === 0) {
    return { error: 'CHAT_EMPTY_MESSAGE' };
  }

  // Check blocked words
  const filteredMessage = filterMessage(channelId, message);
  if (filteredMessage === null) {
    return { error: 'CHAT_WORD_BLOCKED' };
  }

  // Check if user is blocked by streamer
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (channel && isUserBlocked(channel.userId, userId)) {
    return { error: 'CHAT_USER_BLOCKED' };
  }

  // Create message
  const chatMessage: ChatMessage = {
    id: uuidv4(),
    channelId,
    streamId,
    userId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    message: filteredMessage,
    createdAt: new Date().toISOString(),
    isModerator: isChannelModerator(channelId, userId),
    isVIP: isChannelVIP(channelId, userId),
  };

  // Save message
  const messages = getCollection<ChatMessage>(CHAT_KEYS.messages);
  messages.push(chatMessage);
  setCollection(CHAT_KEYS.messages, messages);

  // Update rate limit
  updateRateLimit(userId);

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'CHAT_MESSAGE',
    channelId,
    payload: chatMessage,
    timestamp: new Date().toISOString(),
  });

  return chatMessage;
}

export function getChannelMessages(channelId: string, limit = 100): ChatMessage[] {
  const messages = getCollection<ChatMessage>(CHAT_KEYS.messages);
  return messages
    .filter(m => m.channelId === channelId && !m.deletedAt)
    .slice(-limit);
}

export function deleteMessage(messageId: string, moderatorId: string): boolean {
  const messages = getCollection<ChatMessage>(CHAT_KEYS.messages);
  const idx = messages.findIndex(m => m.id === messageId);
  
  if (idx === -1) return false;

  const message = messages[idx];
  
  // Verify moderator has permission
  const channel = db.getAllChannels().find(c => c.id === message.channelId);
  if (!channel) return false;
  
  const isOwner = channel.userId === moderatorId;
  const isMod = isChannelModerator(message.channelId, moderatorId);
  const isSelf = message.userId === moderatorId;
  
  if (!isOwner && !isMod && !isSelf) return false;

  messages[idx].deletedAt = new Date().toISOString();
  messages[idx].deletedBy = moderatorId;
  setCollection(CHAT_KEYS.messages, messages);

  // Log moderation action
  logModerationAction(
    message.channelId,
    message.userId,
    moderatorId,
    'DELETE_MESSAGE',
    `Deleted message ${messageId}`
  );

  // Broadcast event
  broadcastEvent(message.channelId, {
    type: 'CHAT_MESSAGE_DELETED',
    channelId: message.channelId,
    payload: { messageId, deletedBy: moderatorId },
    timestamp: new Date().toISOString(),
  });

  return true;
}

function getLastUserMessage(channelId: string, userId: string): ChatMessage | null {
  const messages = getCollection<ChatMessage>(CHAT_KEYS.messages);
  const userMessages = messages.filter(m => m.channelId === channelId && m.userId === userId);
  return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
}

// ============ RATE LIMITING ============
function isRateLimited(userId: string): boolean {
  const rateLimits = getObject<Record<string, number[]>>(CHAT_KEYS.rateLimits) || {};
  const userLimits = rateLimits[userId] || [];
  
  const now = Date.now();
  const recentMessages = userLimits.filter(t => now - t < CONFIG.rateLimitWindow);
  
  return recentMessages.length >= CONFIG.rateLimitMaxMessages;
}

function updateRateLimit(userId: string): void {
  const rateLimits = getObject<Record<string, number[]>>(CHAT_KEYS.rateLimits) || {};
  const userLimits = rateLimits[userId] || [];
  
  const now = Date.now();
  const recentMessages = userLimits.filter(t => now - t < CONFIG.rateLimitWindow);
  recentMessages.push(now);
  
  rateLimits[userId] = recentMessages;
  setObject(CHAT_KEYS.rateLimits, rateLimits);
}

// ============ BAN OPERATIONS ============
export function banUser(
  channelId: string,
  userId: string,
  moderatorId: string,
  reason: string,
  duration: number | null = null // null = permanent
): ChatBan | { error: string } {
  // Verify permission
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return { error: 'CHANNEL_NOT_FOUND' };
  
  const isOwner = channel.userId === moderatorId;
  const isMod = isChannelModerator(channelId, moderatorId);
  
  if (!isOwner && !isMod) return { error: 'CHAT_FORBIDDEN' };

  // Cannot ban streamer owner
  if (userId === channel.userId) return { error: 'CHAT_CANNOT_BAN_OWNER' };

  // Cannot ban another moderator (unless you're the owner)
  if (isChannelModerator(channelId, userId) && !isOwner) {
    return { error: 'CHAT_CANNOT_BAN_MODERATOR' };
  }

  const ban: ChatBan = {
    id: uuidv4(),
    channelId,
    userId,
    moderatorId,
    reason,
    expiresAt: duration ? new Date(Date.now() + duration * 1000).toISOString() : null,
    createdAt: new Date().toISOString(),
  };

  const bans = getCollection<ChatBan>(CHAT_KEYS.bans);
  bans.push(ban);
  setCollection(CHAT_KEYS.bans, bans);

  // Log action
  logModerationAction(channelId, userId, moderatorId, 'BAN', reason);

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'USER_BANNED',
    channelId,
    payload: { userId, reason, expiresAt: ban.expiresAt },
    timestamp: new Date().toISOString(),
  });

  return ban;
}

export function unbanUser(
  channelId: string,
  userId: string,
  moderatorId: string
): boolean {
  // Verify permission
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return false;
  
  const isOwner = channel.userId === moderatorId;
  const isMod = isChannelModerator(channelId, moderatorId);
  
  if (!isOwner && !isMod) return false;

  const bans = getCollection<ChatBan>(CHAT_KEYS.bans);
  const filtered = bans.filter(b => !(b.channelId === channelId && b.userId === userId));
  setCollection(CHAT_KEYS.bans, filtered);

  // Log action
  logModerationAction(channelId, userId, moderatorId, 'UNBAN', 'User unbanned');

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'USER_UNBANNED',
    channelId,
    payload: { userId },
    timestamp: new Date().toISOString(),
  });

  return true;
}

export function isUserBanned(channelId: string, userId: string): boolean {
  const bans = getCollection<ChatBan>(CHAT_KEYS.bans);
  const ban = bans.find(b => b.channelId === channelId && b.userId === userId);
  
  if (!ban) return false;
  
  // Check if ban has expired
  if (ban.expiresAt && new Date(ban.expiresAt) < new Date()) {
    // Remove expired ban
    const filtered = bans.filter(b => b.id !== ban.id);
    setCollection(CHAT_KEYS.bans, filtered);
    return false;
  }
  
  return true;
}

export function getChannelBans(channelId: string): ChatBan[] {
  const bans = getCollection<ChatBan>(CHAT_KEYS.bans);
  return bans.filter(b => b.channelId === channelId);
}

// ============ TIMEOUT OPERATIONS ============
export function timeoutUser(
  channelId: string,
  userId: string,
  moderatorId: string,
  reason: string,
  duration: number // seconds
): ChatTimeout | { error: string } {
  // Verify permission
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return { error: 'CHANNEL_NOT_FOUND' };
  
  const isOwner = channel.userId === moderatorId;
  const isMod = isChannelModerator(channelId, moderatorId);
  
  if (!isOwner && !isMod) return { error: 'CHAT_FORBIDDEN' };

  const timeout: ChatTimeout = {
    id: uuidv4(),
    channelId,
    userId,
    moderatorId,
    reason,
    expiresAt: new Date(Date.now() + duration * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  const timeouts = getCollection<ChatTimeout>(CHAT_KEYS.timeouts);
  timeouts.push(timeout);
  setCollection(CHAT_KEYS.timeouts, timeouts);

  // Log action
  logModerationAction(channelId, userId, moderatorId, 'TIMEOUT', `${reason} (${duration}s)`);

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'USER_TIMEOUT',
    channelId,
    payload: { userId, reason, expiresAt: timeout.expiresAt },
    timestamp: new Date().toISOString(),
  });

  return timeout;
}

export function getUserTimeout(channelId: string, userId: string): ChatTimeout | null {
  const timeouts = getCollection<ChatTimeout>(CHAT_KEYS.timeouts);
  const timeout = timeouts.find(t => t.channelId === channelId && t.userId === userId);
  
  if (!timeout) return null;
  
  // Check if timeout has expired
  if (new Date(timeout.expiresAt) < new Date()) {
    // Remove expired timeout
    const filtered = timeouts.filter(t => t.id !== timeout.id);
    setCollection(CHAT_KEYS.timeouts, filtered);
    return null;
  }
  
  return timeout;
}

// ============ MODERATOR OPERATIONS ============
export function addModerator(
  channelId: string,
  userId: string,
  assignedBy: string
): ChannelModerator | { error: string } {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return { error: 'CHANNEL_NOT_FOUND' };
  
  // Only channel owner can add moderators
  if (channel.userId !== assignedBy) return { error: 'CHAT_FORBIDDEN' };

  const mod: ChannelModerator = {
    id: uuidv4(),
    channelId,
    userId,
    assignedBy,
    permissions: ['DELETE_MESSAGES', 'TIMEOUT_USERS', 'BAN_USERS', 'MANAGE_CHAT', 'MANAGE_WORD_FILTER', 'VIEW_REPORTS'],
    createdAt: new Date().toISOString(),
  };

  const mods = getCollection<ChannelModerator>(CHAT_KEYS.moderators);
  mods.push(mod);
  setCollection(CHAT_KEYS.moderators, mods);

  // Log action
  logModerationAction(channelId, userId, assignedBy, 'ADD_MODERATOR', 'User promoted to moderator');

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'MODERATOR_ADDED',
    channelId,
    payload: { userId },
    timestamp: new Date().toISOString(),
  });

  return mod;
}

export function removeModerator(
  channelId: string,
  userId: string,
  removedBy: string
): boolean {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return false;
  
  // Only channel owner can remove moderators
  if (channel.userId !== removedBy) return false;

  const mods = getCollection<ChannelModerator>(CHAT_KEYS.moderators);
  const filtered = mods.filter(m => !(m.channelId === channelId && m.userId === userId));
  setCollection(CHAT_KEYS.moderators, filtered);

  // Log action
  logModerationAction(channelId, userId, removedBy, 'REMOVE_MODERATOR', 'User demoted from moderator');

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'MODERATOR_REMOVED',
    channelId,
    payload: { userId },
    timestamp: new Date().toISOString(),
  });

  return true;
}

export function isChannelModerator(channelId: string, userId: string): boolean {
  const mods = getCollection<ChannelModerator>(CHAT_KEYS.moderators);
  return mods.some(m => m.channelId === channelId && m.userId === userId);
}

export function getChannelModerators(channelId: string): ChannelModerator[] {
  const mods = getCollection<ChannelModerator>(CHAT_KEYS.moderators);
  return mods.filter(m => m.channelId === channelId);
}

// ============ VIP OPERATIONS ============
export function addVIP(
  channelId: string,
  userId: string,
  assignedBy: string
): ChannelVIP | { error: string } {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return { error: 'CHANNEL_NOT_FOUND' };
  
  // Only channel owner or moderators can add VIPs
  const isOwner = channel.userId === assignedBy;
  const isMod = isChannelModerator(channelId, assignedBy);
  
  if (!isOwner && !isMod) return { error: 'CHAT_FORBIDDEN' };

  const vip: ChannelVIP = {
    id: uuidv4(),
    channelId,
    userId,
    assignedBy,
    createdAt: new Date().toISOString(),
  };

  const vips = getCollection<ChannelVIP>(CHAT_KEYS.vips);
  vips.push(vip);
  setCollection(CHAT_KEYS.vips, vips);

  // Log action
  logModerationAction(channelId, userId, assignedBy, 'ADD_VIP', 'User granted VIP status');

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'VIP_ADDED',
    channelId,
    payload: { userId },
    timestamp: new Date().toISOString(),
  });

  return vip;
}

export function removeVIP(
  channelId: string,
  userId: string,
  removedBy: string
): boolean {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return false;
  
  const isOwner = channel.userId === removedBy;
  const isMod = isChannelModerator(channelId, removedBy);
  
  if (!isOwner && !isMod) return false;

  const vips = getCollection<ChannelVIP>(CHAT_KEYS.vips);
  const filtered = vips.filter(v => !(v.channelId === channelId && v.userId === userId));
  setCollection(CHAT_KEYS.vips, filtered);

  // Log action
  logModerationAction(channelId, userId, removedBy, 'REMOVE_VIP', 'User VIP status revoked');

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'VIP_REMOVED',
    channelId,
    payload: { userId },
    timestamp: new Date().toISOString(),
  });

  return true;
}

export function isChannelVIP(channelId: string, userId: string): boolean {
  const vips = getCollection<ChannelVIP>(CHAT_KEYS.vips);
  return vips.some(v => v.channelId === channelId && v.userId === userId);
}

export function getChannelVIPs(channelId: string): ChannelVIP[] {
  const vips = getCollection<ChannelVIP>(CHAT_KEYS.vips);
  return vips.filter(v => v.channelId === channelId);
}

// ============ FILTER WORDS ============
export function addFilterWord(
  channelId: string,
  word: string,
  addedBy: string
): ChatFilterWord | { error: string } {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return { error: 'CHANNEL_NOT_FOUND' };
  
  const isOwner = channel.userId === addedBy;
  const isMod = isChannelModerator(channelId, addedBy);
  
  if (!isOwner && !isMod) return { error: 'CHAT_FORBIDDEN' };

  const filterWord: ChatFilterWord = {
    id: uuidv4(),
    channelId,
    word: word.toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  const words = getCollection<ChatFilterWord>(CHAT_KEYS.filterWords);
  words.push(filterWord);
  setCollection(CHAT_KEYS.filterWords, words);

  return filterWord;
}

export function removeFilterWord(channelId: string, wordId: string, removedBy: string): boolean {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return false;
  
  const isOwner = channel.userId === removedBy;
  const isMod = isChannelModerator(channelId, removedBy);
  
  if (!isOwner && !isMod) return false;

  const words = getCollection<ChatFilterWord>(CHAT_KEYS.filterWords);
  const filtered = words.filter(w => !(w.id === wordId && w.channelId === channelId));
  setCollection(CHAT_KEYS.filterWords, filtered);

  return true;
}

export function getFilterWords(channelId: string): ChatFilterWord[] {
  const words = getCollection<ChatFilterWord>(CHAT_KEYS.filterWords);
  return words.filter(w => w.channelId === channelId);
}

function filterMessage(channelId: string, message: string): string | null {
  const words = getFilterWords(channelId);
  if (words.length === 0) return message;

  let filtered = message;
  const lowerMessage = message.toLowerCase();

  for (const word of words) {
    if (lowerMessage.includes(word.word)) {
      // Block message entirely
      return null;
    }
  }

  return filtered;
}

// ============ CHAT SETTINGS ============
export function getChatSettings(channelId: string): ChatSettings {
  const settings = getObject<ChatSettings>(`${CHAT_KEYS.settings}_${channelId}`);
  
  if (!settings) {
    return {
      channelId,
      slowMode: 0,
      followersOnly: false,
      blockedWords: [],
      updatedAt: new Date().toISOString(),
    };
  }
  
  return settings;
}

export function updateChatSettings(
  channelId: string,
  updates: Partial<ChatSettings>,
  updatedBy: string
): ChatSettings | { error: string } {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return { error: 'CHANNEL_NOT_FOUND' };
  
  const isOwner = channel.userId === updatedBy;
  const isMod = isChannelModerator(channelId, updatedBy);
  
  if (!isOwner && !isMod) return { error: 'CHAT_FORBIDDEN' };

  const current = getChatSettings(channelId);
  const updated: ChatSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  setObject(`${CHAT_KEYS.settings}_${channelId}`, updated);

  // Broadcast event
  broadcastEvent(channelId, {
    type: 'CHAT_SETTINGS_UPDATED',
    channelId,
    payload: updated,
    timestamp: new Date().toISOString(),
  });

  return updated;
}

// ============ USER BLOCKS ============
export function blockUser(blockerId: string, blockedId: string): UserBlock | { error: string } {
  if (blockerId === blockedId) return { error: 'CANNOT_BLOCK_SELF' };

  const block: UserBlock = {
    id: uuidv4(),
    blockerId,
    blockedId,
    createdAt: new Date().toISOString(),
  };

  const blocks = getCollection<UserBlock>(CHAT_KEYS.blocks);
  blocks.push(block);
  setCollection(CHAT_KEYS.blocks, blocks);

  return block;
}

export function unblockUser(blockerId: string, blockedId: string): boolean {
  const blocks = getCollection<UserBlock>(CHAT_KEYS.blocks);
  const filtered = blocks.filter(b => !(b.blockerId === blockerId && b.blockedId === blockedId));
  setCollection(CHAT_KEYS.blocks, filtered);
  return true;
}

export function isUserBlocked(blockerId: string, blockedId: string): boolean {
  const blocks = getCollection<UserBlock>(CHAT_KEYS.blocks);
  return blocks.some(b => b.blockerId === blockerId && b.blockedId === blockedId);
}

// ============ REPORTS ============
export function createReport(
  reporterId: string,
  channelId: string,
  messageId: string,
  reportedUserId: string,
  reason: string
): ChatReport {
  const report: ChatReport = {
    id: uuidv4(),
    reporterId,
    channelId,
    messageId,
    reportedUserId,
    reason,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  const reports = getCollection<ChatReport>(CHAT_KEYS.reports);
  reports.push(report);
  setCollection(CHAT_KEYS.reports, reports);

  return report;
}

export function getChannelReports(channelId: string): ChatReport[] {
  const reports = getCollection<ChatReport>(CHAT_KEYS.reports);
  return reports.filter(r => r.channelId === channelId);
}

// ============ MODERATION LOG ============
function logModerationAction(
  channelId: string,
  targetUserId: string,
  moderatorId: string,
  action: ChatModerationAction['action'],
  reason: string
): void {
  const log: ChatModerationAction = {
    id: uuidv4(),
    channelId,
    targetUserId,
    moderatorId,
    action,
    reason,
    createdAt: new Date().toISOString(),
  };

  const logs = getCollection<ChatModerationAction>(CHAT_KEYS.moderationActions);
  logs.push(log);
  setCollection(CHAT_KEYS.moderationActions, logs);

  // Also log to audit log
  db.createAuditLog(moderatorId, action, 'chat', targetUserId, reason);
}

export function getModerationLog(channelId: string): ChatModerationAction[] {
  const logs = getCollection<ChatModerationAction>(CHAT_KEYS.moderationActions);
  return logs
    .filter(l => l.channelId === channelId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============ PRESENCE ============
export function updatePresence(channelId: string, userId: string): void {
  const presence = getObject<Record<string, Record<string, number>>>(CHAT_KEYS.presence) || {};
  
  if (!presence[channelId]) {
    presence[channelId] = {};
  }
  
  presence[channelId][userId] = Date.now();
  setObject(CHAT_KEYS.presence, presence);

  // Broadcast presence update
  broadcastEvent(channelId, {
    type: 'PRESENCE_UPDATED',
    channelId,
    payload: { userId, action: 'JOIN' },
    timestamp: new Date().toISOString(),
  });
}

export function removePresence(channelId: string, userId: string): void {
  const presence = getObject<Record<string, Record<string, number>>>(CHAT_KEYS.presence) || {};
  
  if (presence[channelId]) {
    delete presence[channelId][userId];
    setObject(CHAT_KEYS.presence, presence);

    // Broadcast presence update
    broadcastEvent(channelId, {
      type: 'PRESENCE_UPDATED',
      channelId,
      payload: { userId, action: 'LEAVE' },
      timestamp: new Date().toISOString(),
    });
  }
}

export function getChannelPresence(channelId: string): string[] {
  const presence = getObject<Record<string, Record<string, number>>>(CHAT_KEYS.presence) || {};
  const channelPresence = presence[channelId] || {};
  
  const now = Date.now();
  const activeUsers: string[] = [];
  
  for (const [userId, lastSeen] of Object.entries(channelPresence)) {
    if (now - lastSeen < CONFIG.presenceTTL) {
      activeUsers.push(userId);
    }
  }
  
  return activeUsers;
}

export function getChannelPresenceCount(channelId: string): number {
  return getChannelPresence(channelId).length;
}

// ============ NOTIFICATIONS ============
export function createNotification(
  userId: string,
  type: StreamHubNotification['type'],
  title: string,
  message: string,
  metadata?: any
): void {
  const notifications = getCollection<StreamHubNotification>(CHAT_KEYS.notifications);
  
  const notification: StreamHubNotification = {
    id: uuidv4(),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    metadata,
  };
  
  notifications.push(notification);
  setCollection(CHAT_KEYS.notifications, notifications);
}

export function getUserNotifications(userId: string): StreamHubNotification[] {
  const notifications = getCollection<StreamHubNotification>(CHAT_KEYS.notifications);
  return notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationRead(notificationId: string, userId: string): boolean {
  const notifications = getCollection<StreamHubNotification>(CHAT_KEYS.notifications);
  const idx = notifications.findIndex(n => n.id === notificationId && n.userId === userId);
  
  if (idx === -1) return false;
  
  notifications[idx].read = true;
  setCollection(CHAT_KEYS.notifications, notifications);
  
  return true;
}

export function getUnreadNotificationCount(userId: string): number {
  const notifications = getCollection<StreamHubNotification>(CHAT_KEYS.notifications);
  return notifications.filter(n => n.userId === userId && !n.read).length;
}

// ============ CLEANUP ============
export function cleanupOldMessages(): void {
  const messages = getCollection<ChatMessage>(CHAT_KEYS.messages);
  const now = Date.now();
  
  const filtered = messages.filter(m => {
    const age = now - new Date(m.createdAt).getTime();
    return age < CONFIG.messageTTL;
  });
  
  setCollection(CHAT_KEYS.messages, filtered);
}

// Run cleanup every hour
setInterval(cleanupOldMessages, 60 * 60 * 1000);
