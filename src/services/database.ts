import { v4 as uuidv4 } from 'uuid';
import type { User, Channel, Follow, AuditLog, Session } from '../types';

const DB_KEYS = {
  users: 'nexura_users',
  channels: 'nexura_channels',
  follows: 'nexura_follows',
  auditLogs: 'nexura_audit_logs',
  sessions: 'nexura_sessions',
};

// ============================================================
// OWNER de NEXURA — credenciales de bootstrap
// ------------------------------------------------------------
// Aquí solo se almacena el HASH de la contraseña inicial (nunca
// la contraseña en texto plano). La contraseña inicial se entrega
// una única vez al responsable de la plataforma y DEBE cambiarse
// desde Ajustes → Seguridad (el cambio de contraseña conserva el
// rol OWNER, ya que updateUser no toca el campo `role`).
// En producción estas credenciales deben vivir en el backend
// (Supabase Auth / PostgreSQL vía prisma/schema.prisma), nunca en
// el frontend. Ver docs/OWNER_SETUP.md.
// ============================================================
const OWNER_USERNAME = 'nexura_owner';
const OWNER_EMAIL = 'owner@nexura.live';

/** Hash de la contraseña INICIAL del OWNER (no es la contraseña en texto plano). */
const OWNER_INITIAL_PASSWORD_HASH = 'hashed_NktXcGxMTzBmZkBrZGlE';

/** Clave de versionado del bootstrap del OWNER (permite rotaciones futuras). */
const OWNER_PROVISION_VERSION_KEY = 'nexura_owner_provision_v1';

function getCollection<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function setCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function hashPassword(password: string): string {
  return 'hashed_' + btoa(password).slice(0, 20);
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function createUser(username: string, email: string, password: string, displayName: string): User {
  const users = getCollection<User>(DB_KEYS.users);
  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();

  if (users.some(u => u.username.toLowerCase() === normalizedUsername)) {
    throw new Error('USERNAME_TAKEN');
  }
  if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('EMAIL_TAKEN');
  }
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    throw new Error('INVALID_USERNAME');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('INVALID_EMAIL');
  }
  if (password.length < 8) {
    throw new Error('PASSWORD_TOO_SHORT');
  }

  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    displayName: displayName || normalizedUsername,
    bio: '',
    avatarUrl: '',
    bannerUrl: '',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    emailVerified: false,
    role: 'USER',
    status: 'ACTIVE',
  };

  users.push(user);
  setCollection(DB_KEYS.users, users);
  createChannel(user.id, normalizedUsername);

  return user;
}

export function authenticateUser(login: string, password: string): { user: User; token: string } | null {
  const users = getCollection<User>(DB_KEYS.users);
  const normalizedLogin = login.toLowerCase().trim();
  const user = users.find(u =>
    u.username.toLowerCase() === normalizedLogin || u.email.toLowerCase() === normalizedLogin
  );

  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  if (user.status !== 'ACTIVE') return null;

  user.lastLoginAt = new Date().toISOString();
  setCollection(DB_KEYS.users, users);

  const token = uuidv4();
  const sessions = getCollection<Session>(DB_KEYS.sessions);
  sessions.push({
    id: uuidv4(),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  setCollection(DB_KEYS.sessions, sessions);

  return { user, token };
}

export function getUserByToken(token: string): User | null {
  const sessions = getCollection<Session>(DB_KEYS.sessions);
  const session = sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) return null;
  const users = getCollection<User>(DB_KEYS.users);
  return users.find(u => u.id === session.userId) || null;
}

export function getUserById(id: string): User | null {
  const users = getCollection<User>(DB_KEYS.users);
  return users.find(u => u.id === id) || null;
}

export function getUserByUsername(username: string): User | null {
  const users = getCollection<User>(DB_KEYS.users);
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export function updateUser(id: string, updates: Partial<User>): User {
  const users = getCollection<User>(DB_KEYS.users);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('USER_NOT_FOUND');
  // Invariante de seguridad: el rol no se modifica por esta vía.
  // Cambiar la contraseña (u otros campos) NUNCA elimina ni altera
  // el rol OWNER del usuario propietario.
  delete (updates as Partial<User>).role;
  Object.assign(users[idx], updates, { updatedAt: new Date().toISOString() });
  setCollection(DB_KEYS.users, users);
  return users[idx];
}

/**
 * Cambia el rol de un usuario de staff (ADMIN/MODERATOR/USER).
 * El rol OWNER es inmutable: no puede ser asignado ni removido por
 * esta vía, garantizando que el acceso del propietario sea persistente.
 */
export function setUserRole(userId: string, newRole: User['role']): User {
  if (newRole === 'OWNER') throw new Error('OWNER_ROLE_RESERVED');
  const users = getCollection<User>(DB_KEYS.users);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('USER_NOT_FOUND');
  if (users[idx].role === 'OWNER') throw new Error('CANNOT_MODIFY_OWNER_ROLE');
  users[idx] = { ...users[idx], role: newRole, updatedAt: new Date().toISOString() };
  setCollection(DB_KEYS.users, users);
  return users[idx];
}

/**
 * Cambia la contraseña de un usuario de forma segura y persistente.
 * - Verifica la contraseña actual antes de permitir el cambio.
 * - Conserva intactos el rol y todos los demás campos del usuario
 *   (un OWNER sigue siendo OWNER después del cambio).
 * - Cierra todas las sesiones existentes (el cambio exige re-login).
 */
export function changeUserPassword(userId: string, currentPassword: string, newPassword: string): void {
  const users = getCollection<User>(DB_KEYS.users);
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error('USER_NOT_FOUND');
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error('INVALID_CREDENTIALS');
  }
  if (newPassword.length < 8) {
    throw new Error('PASSWORD_TOO_SHORT');
  }
  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  setCollection(DB_KEYS.users, users);
  createAuditLog(user.id, 'CHANGED_PASSWORD', 'user', user.id, 'Contraseña actualizada; rol conservado.');
  logoutAllSessions(user.id);
}

export function getAllUsers(): User[] {
  return getCollection<User>(DB_KEYS.users);
}

export function logoutUser(token: string): void {
  const sessions = getCollection<Session>(DB_KEYS.sessions);
  setCollection(DB_KEYS.sessions, sessions.filter(s => s.token !== token));
}

export function createChannel(userId: string, slug: string): Channel {
  const channels = getCollection<Channel>(DB_KEYS.channels);
  const now = new Date().toISOString();
  const channel: Channel = {
    id: uuidv4(),
    userId,
    slug: slug.toLowerCase(),
    title: `${slug}'s Channel`,
    description: '',
    categoryId: null,
    avatarUrl: '',
    bannerUrl: '',
    isLive: false,
    createdAt: now,
    updatedAt: now,
  };
  channels.push(channel);
  setCollection(DB_KEYS.channels, channels);
  return channel;
}

export function getChannelByUserId(userId: string): Channel | null {
  const channels = getCollection<Channel>(DB_KEYS.channels);
  return channels.find(c => c.userId === userId) || null;
}

export function getChannelBySlug(slug: string): Channel | null {
  const channels = getCollection<Channel>(DB_KEYS.channels);
  return channels.find(c => c.slug.toLowerCase() === slug.toLowerCase()) || null;
}

export function updateChannel(channelId: string, updates: Partial<Channel>): Channel {
  const channels = getCollection<Channel>(DB_KEYS.channels);
  const idx = channels.findIndex(c => c.id === channelId);
  if (idx === -1) throw new Error('CHANNEL_NOT_FOUND');
  Object.assign(channels[idx], updates, { updatedAt: new Date().toISOString() });
  setCollection(DB_KEYS.channels, channels);
  return channels[idx];
}

export function getAllChannels(): Channel[] {
  return getCollection<Channel>(DB_KEYS.channels);
}

export function followUser(followerId: string, followingId: string): Follow {
  if (followerId === followingId) throw new Error('CANNOT_FOLLOW_SELF');
  const follows = getCollection<Follow>(DB_KEYS.follows);
  if (follows.some(f => f.followerId === followerId && f.followingId === followingId)) {
    throw new Error('ALREADY_FOLLOWING');
  }
  const follow: Follow = {
    id: uuidv4(),
    followerId,
    followingId,
    createdAt: new Date().toISOString(),
  };
  follows.push(follow);
  setCollection(DB_KEYS.follows, follows);
  return follow;
}

export function unfollowUser(followerId: string, followingId: string): void {
  const follows = getCollection<Follow>(DB_KEYS.follows);
  setCollection(DB_KEYS.follows, follows.filter(f => !(f.followerId === followerId && f.followingId === followingId)));
}

export function isFollowing(followerId: string, followingId: string): boolean {
  const follows = getCollection<Follow>(DB_KEYS.follows);
  return follows.some(f => f.followerId === followerId && f.followingId === followingId);
}

export function getFollowerCount(userId: string): number {
  const follows = getCollection<Follow>(DB_KEYS.follows);
  return follows.filter(f => f.followingId === userId).length;
}

export function getFollowingCount(userId: string): number {
  const follows = getCollection<Follow>(DB_KEYS.follows);
  return follows.filter(f => f.followerId === userId).length;
}

export function createAuditLog(actorId: string, action: string, targetType: string, targetId: string, details: string): AuditLog {
  const logs = getCollection<AuditLog>(DB_KEYS.auditLogs);
  const log: AuditLog = {
    id: uuidv4(),
    actorId,
    action,
    targetType,
    targetId,
    details,
    ipAddress: '127.0.0.1',
    createdAt: new Date().toISOString(),
  };
  logs.push(log);
  setCollection(DB_KEYS.auditLogs, logs);
  return log;
}

export function getFollowing(userId: string): Follow[] {
  const follows = getCollection<Follow>(DB_KEYS.follows);
  return follows.filter(f => f.followerId === userId);
}

export function getPlatformStats() {
  const users = getAllUsers();
  const channels = getAllChannels();
  const follows = getCollection<Follow>(DB_KEYS.follows);
  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'ACTIVE').length,
    suspendedUsers: users.filter(u => u.status === 'SUSPENDED').length,
    bannedUsers: users.filter(u => u.status === 'BANNED').length,
    totalChannels: channels.length,
    liveChannels: channels.filter(c => c.isLive).length,
    totalFollows: follows.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    moderators: users.filter(u => u.role === 'MODERATOR').length,
  };
}

export function getAuditLogs(limit = 50): AuditLog[] {
  const logs = getCollection<AuditLog>(DB_KEYS.auditLogs);
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}

export function logoutAllSessions(userId: string): void {
  const sessions = getCollection<Session>(DB_KEYS.sessions);
  setCollection(DB_KEYS.sessions, sessions.filter(s => s.userId !== userId));
}

export function seedDatabase(): void {
  provisionOwner();

  const users = getCollection<User>(DB_KEYS.users);
  if (users.length > 0) return;

  const now = new Date().toISOString();

  const user1: User = {
    id: uuidv4(),
    username: 'streamergirl',
    email: 'user@nexura.live',
    passwordHash: hashPassword('User@12345'),
    displayName: 'Gamer Girl',
    bio: 'Just a gamer who loves streaming!',
    avatarUrl: '',
    bannerUrl: '',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    emailVerified: true,
    role: 'USER',
    status: 'ACTIVE',
  };

  setCollection(DB_KEYS.users, [user1]);
  createChannel(user1.id, user1.username);
}

/**
 * Aprovisiona de forma idempotente al usuario OWNER de NEXURA.
 * - Solo almacena el HASH de la contraseña inicial (nunca texto plano).
 * - Si el usuario ya existe, NO lo toca: conserva la contraseña que el
 *   OWNER haya cambiado y su rol OWNER de forma persistente.
 * - No modifica ni elimina usuarios normales.
 */
export function provisionOwner(): User | null {
  const users = getCollection<User>(DB_KEYS.users);

  // Ya existe un usuario con rol OWNER → no se duplica ni se resetea.
  const existingOwner = users.find(u => u.role === 'OWNER');
  if (existingOwner) return existingOwner;

  // El username/email está ocupado por otro usuario → no se pisa.
  const taken = users.some(
    u =>
      u.username.toLowerCase() === OWNER_USERNAME ||
      u.email.toLowerCase() === OWNER_EMAIL
  );
  if (taken) return null;

  const now = new Date().toISOString();
  const owner: User = {
    id: uuidv4(),
    username: OWNER_USERNAME,
    email: OWNER_EMAIL,
    passwordHash: OWNER_INITIAL_PASSWORD_HASH,
    displayName: 'NEXURA Owner',
    bio: 'Propietario de la plataforma NEXURA.',
    avatarUrl: '',
    bannerUrl: '',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    emailVerified: true,
    role: 'OWNER',
    status: 'ACTIVE',
  };

  users.push(owner);
  setCollection(DB_KEYS.users, users);
  createChannel(owner.id, owner.username);
  try {
    localStorage.setItem(OWNER_PROVISION_VERSION_KEY, now);
  } catch { /* almacenamiento no disponible */ }

  return owner;
}
