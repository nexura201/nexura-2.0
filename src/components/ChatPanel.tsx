import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage, User } from '../types';
import * as chatService from '../services/chat';
import {
  Send, Ban, Clock, Trash2, Shield, Crown, MoreVertical,
  AlertCircle, Users, Settings, X
} from 'lucide-react';

interface ChatPanelProps {
  channelId: string;
  streamId: string;
  streamerId: string;
}

export function ChatPanel({ channelId, streamId, streamerId }: ChatPanelProps) {
  const { user } = useAuth();
  const {
    messages,
    isConnected,
    connectionStatus,
    presenceCount,
    sendMessage,
    deleteMessage,
    banUser,
    timeoutUser,
    isBanned,
    isTimedOut,
    timeoutRemaining,
    canSendMessages,
  } = useChat({ channelId, streamId });

  const [inputValue, setInputValue] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showModerationMenu, setShowModerationMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !canSendMessages) return;

    sendMessage(inputValue);
    setInputValue('');
  };

  const handleUserClick = (message: ChatMessage) => {
    if (!user) return;
    
    // Don't show menu for own messages
    if (message.userId === user.id) return;

    setSelectedMessage(message);
    setShowModerationMenu(true);
  };

  const handleTimeout = (duration: number) => {
    if (!selectedMessage || !user) return;
    timeoutUser(selectedMessage.userId, 'Timeout desde el chat', duration);
    setShowModerationMenu(false);
    setSelectedMessage(null);
  };

  const handleBan = () => {
    if (!selectedMessage || !user) return;
    banUser(selectedMessage.userId, 'Ban desde el chat', null);
    setShowModerationMenu(false);
    setSelectedMessage(null);
  };

  const handleDelete = () => {
    if (!selectedMessage || !user) return;
    deleteMessage(selectedMessage.id);
    setShowModerationMenu(false);
    setSelectedMessage(null);
  };

  const isModerator = user && (
    chatService.isChannelModerator(channelId, user.id) ||
    streamerId === user.id
  );

  return (
    <div className="flex flex-col h-full bg-bg-card border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-muted" />
          <span className="text-sm font-medium text-white">Chat en vivo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{presenceCount} conectados</span>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-success' :
            connectionStatus === 'connecting' ? 'bg-warning animate-pulse' :
            'bg-danger'
          }`} />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-8">
            <p>Sé el primero en escribir algo</p>
          </div>
        ) : (
          messages.map(message => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isModerator={!!isModerator}
              isStreamer={message.userId === streamerId}
              onClick={() => handleUserClick(message)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        {isBanned ? (
          <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-center">
            <p className="text-danger text-sm font-medium">Has sido baneado del chat</p>
          </div>
        ) : isTimedOut ? (
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-3 text-center">
            <p className="text-warning text-sm font-medium">
              Silenciado por {timeoutRemaining} segundos
            </p>
          </div>
        ) : !user ? (
          <div className="bg-bg-elevated border border-border rounded-lg px-4 py-3 text-center">
            <p className="text-text-secondary text-sm">
              Inicia sesión para participar en el chat
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Enviar un mensaje"
              maxLength={500}
              className="flex-1 bg-bg-input border border-border rounded-lg px-4 py-2 text-sm text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
              disabled={!canSendMessages}
            />
            <button
              type="submit"
              disabled={!canSendMessages || !inputValue.trim()}
              className="bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Moderation Menu */}
      {showModerationMenu && selectedMessage && isModerator && (
        <ModerationMenu
          message={selectedMessage}
          onTimeout={handleTimeout}
          onBan={handleBan}
          onDelete={handleDelete}
          onClose={() => {
            setShowModerationMenu(false);
            setSelectedMessage(null);
          }}
        />
      )}
    </div>
  );
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isModerator: boolean;
  isStreamer: boolean;
  onClick: () => void;
}

function ChatMessageItem({ message, isModerator, isStreamer, onClick }: ChatMessageItemProps) {
  if (message.deletedAt) {
    return (
      <div className="text-text-muted text-xs italic py-1">
        [Mensaje eliminado]
      </div>
    );
  }

  return (
    <div
      className="group flex gap-2 hover:bg-bg-elevated/50 rounded px-2 py-1 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.avatarUrl ? (
          <img
            src={message.avatarUrl}
            alt={message.displayName}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
            {message.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Role badges */}
          {isStreamer && (
            <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-medium">
              STREAMER
            </span>
          )}
          {message.isModerator && !isStreamer && (
            <span className="text-[10px] bg-success text-white px-1.5 py-0.5 rounded font-medium">
              MOD
            </span>
          )}
          {message.isVIP && (
            <span className="text-[10px] bg-warning text-white px-1.5 py-0.5 rounded font-medium">
              VIP
            </span>
          )}
          
          {/* Username */}
          <span className={`text-sm font-medium ${
            isStreamer ? 'text-primary-light' :
            message.isModerator ? 'text-success' :
            message.isVIP ? 'text-warning' :
            'text-white'
          }`}>
            {message.displayName}
          </span>
        </div>
        
        {/* Message text */}
        <p className="text-sm text-text-secondary break-words">
          {message.message}
        </p>
      </div>

      {/* Moderation actions (visible on hover for moderators) */}
      {isModerator && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4 text-text-muted" />
        </div>
      )}
    </div>
  );
}

interface ModerationMenuProps {
  message: ChatMessage;
  onTimeout: (duration: number) => void;
  onBan: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ModerationMenu({ message, onTimeout, onBan, onDelete, onClose }: ModerationMenuProps) {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Moderar usuario</h3>
          <button onClick={onClose} className="text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-bg-elevated rounded-lg p-3 mb-4">
          <p className="text-sm text-text-muted">Usuario:</p>
          <p className="text-white font-medium">{message.displayName}</p>
          <p className="text-sm text-text-muted mt-2">Mensaje:</p>
          <p className="text-text-secondary text-sm">{message.message}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary mb-2">Silenciar temporalmente:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onTimeout(60)}
              className="bg-bg-elevated hover:bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white transition-colors"
            >
              1 minuto
            </button>
            <button
              onClick={() => onTimeout(300)}
              className="bg-bg-elevated hover:bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white transition-colors"
            >
              5 minutos
            </button>
            <button
              onClick={() => onTimeout(600)}
              className="bg-bg-elevated hover:bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white transition-colors"
            >
              10 minutos
            </button>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <button
              onClick={onBan}
              className="w-full bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Banear permanentemente
            </button>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <button
              onClick={onDelete}
              className="w-full bg-bg-elevated hover:bg-bg-input border border-border text-text-secondary hover:text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar mensaje
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
