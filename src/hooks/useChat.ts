import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, ChatEvent, ChatSettings } from '../types';
import * as chatService from '../services/chat';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface UseChatOptions {
  channelId: string;
  streamId: string;
  enabled?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  presenceCount: number;
  chatSettings: ChatSettings;
  sendMessage: (message: string) => void;
  deleteMessage: (messageId: string) => void;
  banUser: (userId: string, reason: string, duration?: number | null) => void;
  unbanUser: (userId: string) => void;
  timeoutUser: (userId: string, reason: string, duration: number) => void;
  isBanned: boolean;
  isTimedOut: boolean;
  timeoutRemaining: number;
  canSendMessages: boolean;
}

export function useChat({ channelId, streamId, enabled = true }: UseChatOptions): UseChatReturn {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<UseChatReturn['connectionStatus']>('disconnected');
  const [presenceCount, setPresenceCount] = useState(0);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(chatService.getChatSettings(channelId));
  const [isBanned, setIsBanned] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [timeoutRemaining, setTimeoutRemaining] = useState(0);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connect to chat channel
  const connect = useCallback(() => {
    if (!user || !enabled) return;

    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      // Load initial messages
      const initialMessages = chatService.getChannelMessages(channelId);
      setMessages(initialMessages);

      // Subscribe to real-time events
      const unsubscribe = chatService.subscribeToChannel(channelId, (event: ChatEvent) => {
        handleChatEvent(event);
      });

      unsubscribeRef.current = unsubscribe;

      // Update presence
      chatService.updatePresence(channelId, user.id);

      // Start presence heartbeat
      presenceIntervalRef.current = setInterval(() => {
        chatService.updatePresence(channelId, user.id);
        setPresenceCount(chatService.getChannelPresenceCount(channelId));
      }, 10000); // Every 10 seconds

      setIsConnected(true);
      setIsConnecting(false);
      setConnectionStatus('connected');

      // Check ban/timeout status
      checkUserStatus();
    } catch (error) {
      console.error('[CHAT] Connection error:', error);
      setIsConnecting(false);
      setConnectionStatus('disconnected');
    }
  }, [channelId, user, enabled]);

  // Disconnect from chat channel
  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }

    if (user) {
      chatService.removePresence(channelId, user.id);
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, [channelId, user]);

  // Handle incoming chat events
  const handleChatEvent = useCallback((event: ChatEvent) => {
    switch (event.type) {
      case 'CHAT_MESSAGE':
        setMessages(prev => [...prev, event.payload]);
        break;

      case 'CHAT_MESSAGE_DELETED':
        setMessages(prev =>
          prev.map(m =>
            m.id === event.payload.messageId
              ? { ...m, deletedAt: event.payload.deletedAt, deletedBy: event.payload.deletedBy }
              : m
          )
        );
        break;

      case 'USER_JOINED':
      case 'USER_LEFT':
      case 'PRESENCE_UPDATED':
        setPresenceCount(chatService.getChannelPresenceCount(channelId));
        break;

      case 'CHAT_SETTINGS_UPDATED':
        setChatSettings(event.payload);
        break;

      case 'USER_BANNED':
        if (event.payload.userId === user?.id) {
          setIsBanned(true);
          addToast('error', 'Has sido baneado del chat');
        }
        break;

      case 'USER_UNBANNED':
        if (event.payload.userId === user?.id) {
          setIsBanned(false);
          addToast('success', 'Has sido desbaneado del chat');
        }
        break;

      case 'USER_TIMEOUT':
        if (event.payload.userId === user?.id) {
          setIsTimedOut(true);
          addToast('warning', `Has sido silenciado por ${event.payload.duration} segundos`);
        }
        break;
    }
  }, [user, channelId, addToast]);

  // Check if user is banned or timed out
  const checkUserStatus = useCallback(() => {
    if (!user) return;

    const banned = chatService.isUserBanned(channelId, user.id);
    setIsBanned(banned);

    const timeout = chatService.getUserTimeout(channelId, user.id);
    if (timeout) {
      setIsTimedOut(true);
      const remaining = Math.max(0, Math.ceil((new Date(timeout.expiresAt).getTime() - Date.now()) / 1000));
      setTimeoutRemaining(remaining);
    } else {
      setIsTimedOut(false);
      setTimeoutRemaining(0);
    }
  }, [channelId, user]);

  // Update timeout countdown
  useEffect(() => {
    if (!isTimedOut) return;

    const interval = setInterval(() => {
      checkUserStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimedOut, checkUserStatus]);

  // Connect on mount
  useEffect(() => {
    if (enabled && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, user, connect, disconnect]);

  // Send message
  const sendMessage = useCallback((message: string) => {
    if (!user || !streamId) return;

    const result = chatService.sendMessage(channelId, streamId, user.id, message);

    if ('error' in result) {
      // Handle error
      switch (result.error) {
        case 'CHAT_RATE_LIMITED':
          addToast('warning', 'Estás enviando mensajes demasiado rápido');
          break;
        case 'CHAT_USER_BANNED':
          addToast('error', 'Has sido baneado del chat');
          setIsBanned(true);
          break;
        case 'CHAT_USER_TIMEOUT':
          addToast('warning', 'Estás silenciado temporalmente');
          break;
        case 'CHAT_FOLLOWERS_ONLY':
          addToast('warning', 'Solo seguidores pueden escribir en este chat');
          break;
        case 'CHAT_SLOW_MODE':
          addToast('warning', 'Slow mode activo, espera antes de enviar otro mensaje');
          break;
        case 'CHAT_MESSAGE_TOO_LONG':
          addToast('error', 'El mensaje es demasiado largo');
          break;
        case 'CHAT_WORD_BLOCKED':
          addToast('error', 'El mensaje contiene palabras no permitidas');
          break;
        default:
          addToast('error', 'Error al enviar el mensaje');
      }
    }
  }, [channelId, streamId, user, addToast]);

  // Delete message (moderation)
  const deleteMessage = useCallback((messageId: string) => {
    if (!user) return;

    const success = chatService.deleteMessage(messageId, user.id);
    if (success) {
      addToast('success', 'Mensaje eliminado');
    } else {
      addToast('error', 'No tienes permiso para eliminar este mensaje');
    }
  }, [user, addToast]);

  // Ban user (moderation)
  const banUser = useCallback((userId: string, reason: string, duration: number | null = null) => {
    if (!user) return;

    const result = chatService.banUser(channelId, userId, user.id, reason, duration);
    if ('error' in result) {
      addToast('error', result.error);
    } else {
      addToast('success', 'Usuario baneado');
    }
  }, [channelId, user, addToast]);

  // Unban user (moderation)
  const unbanUser = useCallback((userId: string) => {
    if (!user) return;

    const success = chatService.unbanUser(channelId, userId, user.id);
    if (success) {
      addToast('success', 'Usuario desbaneado');
    } else {
      addToast('error', 'Error al desbanear usuario');
    }
  }, [channelId, user, addToast]);

  // Timeout user (moderation)
  const timeoutUser = useCallback((userId: string, reason: string, duration: number) => {
    if (!user) return;

    const result = chatService.timeoutUser(channelId, userId, user.id, reason, duration);
    if ('error' in result) {
      addToast('error', result.error);
    } else {
      addToast('success', `Usuario silenciado por ${duration} segundos`);
    }
  }, [channelId, user, addToast]);

  // Check if user can send messages
  const canSendMessages = !isBanned && !isTimedOut && isConnected;

  return {
    messages,
    isConnected,
    isConnecting,
    connectionStatus,
    presenceCount,
    chatSettings,
    sendMessage,
    deleteMessage,
    banUser,
    unbanUser,
    timeoutUser,
    isBanned,
    isTimedOut,
    timeoutRemaining,
    canSendMessages,
  };
}
