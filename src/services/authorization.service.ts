import type { User, UserRole } from '../types';
import * as db from './database';
import * as ChatService from './chat';

/**
 * AuthorizationService - Centraliza la lógica de autorización
 * 
 * IMPORTANTE: Nunca confiar en roles enviados desde el frontend.
 * Siempre verificar permisos en el backend.
 */

export class AuthorizationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class AuthorizationService {
  /**
   * Verifica que el usuario esté autenticado
   */
  static requireAuth(userId: string | null): User {
    if (!userId) {
      throw new AuthorizationError(
        'UNAUTHORIZED',
        'Debes iniciar sesión para realizar esta acción',
        401
      );
    }

    const user = db.getUserById(userId);
    if (!user) {
      throw new AuthorizationError(
        'USER_NOT_FOUND',
        'Usuario no encontrado',
        404
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new AuthorizationError(
        'ACCOUNT_NOT_ACTIVE',
        'Tu cuenta no está activa',
        403
      );
    }

    return user;
  }

  /**
   * Verifica que el usuario tenga rol USER o superior
   */
  static requireUser(userId: string | null): User {
    const user = this.requireAuth(userId);
    return user;
  }

  /**
   * Verifica que el usuario sea MODERATOR o superior
   */
  static requireModerator(userId: string | null): User {
    const user = this.requireAuth(userId);
    
    const allowedRoles: UserRole[] = ['MODERATOR', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user.role)) {
      throw new AuthorizationError(
        'INSUFFICIENT_PERMISSIONS',
        'Se requieren permisos de moderador',
        403
      );
    }

    return user;
  }

  /**
   * Verifica que el usuario sea ADMIN o superior
   */
  static requireAdmin(userId: string | null): User {
    const user = this.requireAuth(userId);
    
    const allowedRoles: UserRole[] = ['ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user.role)) {
      throw new AuthorizationError(
        'INSUFFICIENT_PERMISSIONS',
        'Se requieren permisos de administrador',
        403
      );
    }

    return user;
  }

  /**
   * Verifica que el usuario sea OWNER
   */
  static requireOwner(userId: string | null): User {
    const user = this.requireAuth(userId);
    
    if (user.role !== 'OWNER') {
      throw new AuthorizationError(
        'INSUFFICIENT_PERMISSIONS',
        'Se requieren permisos de propietario',
        403
      );
    }

    return user;
  }

  /**
   * Verifica que el usuario sea propietario del canal
   */
  static requireChannelOwner(userId: string | null, channelId: string): User {
    const user = this.requireAuth(userId);
    
    const channel = db.getAllChannels().find(c => c.id === channelId);
    if (!channel) {
      throw new AuthorizationError(
        'CHANNEL_NOT_FOUND',
        'Canal no encontrado',
        404
      );
    }

    if (channel.userId !== user.id && user.role !== 'OWNER') {
      throw new AuthorizationError(
        'NOT_CHANNEL_OWNER',
        'No eres propietario de este canal',
        403
      );
    }

    return user;
  }

  /**
   * Verifica que el usuario sea moderador del canal
   */
  static requireChannelModerator(userId: string | null, channelId: string): User {
    const user = this.requireAuth(userId);
    
    const channel = db.getAllChannels().find(c => c.id === channelId);
    if (!channel) {
      throw new AuthorizationError(
        'CHANNEL_NOT_FOUND',
        'Canal no encontrado',
        404
      );
    }

    // OWNER siempre tiene acceso
    if (user.role === 'OWNER') {
      return user;
    }

    // Verificar si es propietario del canal
    if (channel.userId === user.id) {
      return user;
    }

    // Verificar si es moderador del canal
    const isModerator = ChatService.isChannelModerator(channelId, user.id);
    
    if (!isModerator) {
      throw new AuthorizationError(
        'NOT_CHANNEL_MODERATOR',
        'No eres moderador de este canal',
        403
      );
    }

    return user;
  }

  /**
   * Verifica ownership de un recurso (previene IDOR)
   */
  static requireOwnership(userId: string | null, resourceOwnerId: string): User {
    const user = this.requireAuth(userId);
    
    if (user.id !== resourceOwnerId && user.role !== 'OWNER' && user.role !== 'ADMIN') {
      throw new AuthorizationError(
        'NOT_OWNER',
        'No tienes permiso para acceder a este recurso',
        403
      );
    }

    return user;
  }

  /**
   * Verifica si un usuario puede realizar una acción específica
   */
  static canPerformAction(userId: string, action: string, resourceId?: string): boolean {
    const user = db.getUserById(userId);
    if (!user || user.status !== 'ACTIVE') {
      return false;
    }

    // Matriz de permisos
    const permissions: Record<UserRole, string[]> = {
      OWNER: ['*'], // Todos los permisos
      ADMIN: [
        'manage_users',
        'manage_reports',
        'manage_moderation',
        'review_content',
        'apply_sanctions',
        'view_analytics',
      ],
      MODERATOR: [
        'moderate_assigned_channels',
        'delete_messages',
        'timeout_users',
        'ban_users',
        'review_channel_reports',
      ],
      USER: [
        'manage_own_account',
        'follow_channels',
        'participate_in_chat',
        'create_content',
        'report_content',
      ],
    };

    const userPermissions = permissions[user.role];
    
    // OWNER tiene todos los permisos
    if (userPermissions.includes('*')) {
      return true;
    }

    return userPermissions.includes(action);
  }

  /**
   * Registra una acción de auditoría
   */
  static logAction(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    details: string,
    metadata?: any
  ): void {
    db.createAuditLog(actorId, action, targetType, targetId, details);
    
    // En producción, también registrar en SecurityService
    // SecurityService.logSecurityEvent(...)
  }
}
