import { v4 as uuidv4 } from 'uuid';
import type { ChannelLink, ChannelSection, UserPreferences, PrivacySettings } from '../types';

const CHANNEL_LINKS_KEY = 'nexura_channel_links';
const CHANNEL_SECTIONS_KEY = 'nexura_channel_sections';
const USER_PREFS_KEY = 'nexura_user_preferences';

// Lista de usernames reservados
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'owner', 'support', 'help',
  'nexura', 'official', 'system', 'moderator', 'mod',
  'api', 'status', 'blog', 'news', 'contact'
];

export class ProfileService {
  // ========== ENLACES DEL CANAL ==========
  
  // Obtener enlaces de un canal
  static getChannelLinks(channelId: string): ChannelLink[] {
    const links = localStorage.getItem(CHANNEL_LINKS_KEY);
    const allLinks: ChannelLink[] = links ? JSON.parse(links) : [];
    return allLinks
      .filter(l => l.channelId === channelId && l.active)
      .sort((a, b) => a.order - b.order);
  }

  // Agregar un enlace
  static addChannelLink(
    channelId: string,
    title: string,
    url: string,
    type: ChannelLink['type']
  ): ChannelLink | null {
    // Validar URL
    if (!this.isValidUrl(url)) {
      throw new Error('URL inválida. Debe comenzar con https://');
    }

    const links = localStorage.getItem(CHANNEL_LINKS_KEY);
    const allLinks: ChannelLink[] = links ? JSON.parse(links) : [];

    const maxOrder = allLinks
      .filter(l => l.channelId === channelId)
      .reduce((max, l) => Math.max(max, l.order), -1);

    const newLink: ChannelLink = {
      id: uuidv4(),
      channelId,
      title,
      url,
      type,
      order: maxOrder + 1,
      active: true,
      createdAt: new Date().toISOString(),
    };

    allLinks.push(newLink);
    localStorage.setItem(CHANNEL_LINKS_KEY, JSON.stringify(allLinks));
    return newLink;
  }

  // Actualizar un enlace
  static updateChannelLink(linkId: string, updates: Partial<ChannelLink>): boolean {
    const links = localStorage.getItem(CHANNEL_LINKS_KEY);
    const allLinks: ChannelLink[] = links ? JSON.parse(links) : [];
    
    const index = allLinks.findIndex(l => l.id === linkId);
    if (index === -1) return false;

    if (updates.url && !this.isValidUrl(updates.url)) {
      throw new Error('URL inválida');
    }

    allLinks[index] = { ...allLinks[index], ...updates };
    localStorage.setItem(CHANNEL_LINKS_KEY, JSON.stringify(allLinks));
    return true;
  }

  // Eliminar un enlace
  static deleteChannelLink(linkId: string): boolean {
    const links = localStorage.getItem(CHANNEL_LINKS_KEY);
    const allLinks: ChannelLink[] = links ? JSON.parse(links) : [];
    
    const filtered = allLinks.filter(l => l.id !== linkId);
    if (filtered.length === allLinks.length) return false;
    
    localStorage.setItem(CHANNEL_LINKS_KEY, JSON.stringify(filtered));
    return true;
  }

  // Reordenar enlaces
  static reorderChannelLinks(channelId: string, linkIds: string[]): void {
    const links = localStorage.getItem(CHANNEL_LINKS_KEY);
    const allLinks: ChannelLink[] = links ? JSON.parse(links) : [];
    
    linkIds.forEach((linkId, index) => {
      const link = allLinks.find(l => l.id === linkId);
      if (link && link.channelId === channelId) {
        link.order = index;
      }
    });

    localStorage.setItem(CHANNEL_LINKS_KEY, JSON.stringify(allLinks));
  }

  // Validar URL
  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  // Verificar si un username es reservado
  static isReservedUsername(username: string): boolean {
    return RESERVED_USERNAMES.includes(username.toLowerCase());
  }

  // ========== SECCIONES DEL CANAL ==========
  
  // Obtener secciones de un canal
  static getChannelSections(channelId: string): ChannelSection[] {
    const sections = localStorage.getItem(CHANNEL_SECTIONS_KEY);
    const allSections: ChannelSection[] = sections ? JSON.parse(sections) : [];
    return allSections
      .filter(s => s.channelId === channelId && s.visible)
      .sort((a, b) => a.order - b.order);
  }

  // Crear sección por defecto para un canal nuevo
  static createDefaultSections(channelId: string): void {
    const defaultSections: Omit<ChannelSection, 'id' | 'createdAt' | 'updatedAt'>[] = [
      { channelId, type: 'VIDEOS', title: 'Videos', order: 0, visible: true },
      { channelId, type: 'CLIPS', title: 'Clips', order: 1, visible: true },
      { channelId, type: 'ABOUT', title: 'Acerca de', order: 2, visible: true },
    ];

    const sections = localStorage.getItem(CHANNEL_SECTIONS_KEY);
    const allSections: ChannelSection[] = sections ? JSON.parse(sections) : [];

    defaultSections.forEach(section => {
      allSections.push({
        ...section,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    localStorage.setItem(CHANNEL_SECTIONS_KEY, JSON.stringify(allSections));
  }

  // Agregar sección personalizada
  static addCustomSection(channelId: string, title: string, content: string): ChannelSection {
    const sections = localStorage.getItem(CHANNEL_SECTIONS_KEY);
    const allSections: ChannelSection[] = sections ? JSON.parse(sections) : [];

    const maxOrder = allSections
      .filter(s => s.channelId === channelId)
      .reduce((max, s) => Math.max(max, s.order), -1);

    const newSection: ChannelSection = {
      id: uuidv4(),
      channelId,
      type: 'CUSTOM',
      title,
      content,
      order: maxOrder + 1,
      visible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    allSections.push(newSection);
    localStorage.setItem(CHANNEL_SECTIONS_KEY, JSON.stringify(allSections));
    return newSection;
  }

  // Actualizar sección
  static updateSection(sectionId: string, updates: Partial<ChannelSection>): boolean {
    const sections = localStorage.getItem(CHANNEL_SECTIONS_KEY);
    const allSections: ChannelSection[] = sections ? JSON.parse(sections) : [];
    
    const index = allSections.findIndex(s => s.id === sectionId);
    if (index === -1) return false;

    allSections[index] = { 
      ...allSections[index], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    localStorage.setItem(CHANNEL_SECTIONS_KEY, JSON.stringify(allSections));
    return true;
  }

  // Eliminar sección
  static deleteSection(sectionId: string): boolean {
    const sections = localStorage.getItem(CHANNEL_SECTIONS_KEY);
    const allSections: ChannelSection[] = sections ? JSON.parse(sections) : [];
    
    const filtered = allSections.filter(s => s.id !== sectionId);
    if (filtered.length === allSections.length) return false;
    
    localStorage.setItem(CHANNEL_SECTIONS_KEY, JSON.stringify(filtered));
    return true;
  }

  // ========== PREFERENCIAS DE USUARIO ==========
  
  // Obtener preferencias de un usuario
  static getUserPreferences(userId: string): UserPreferences {
    const prefs = localStorage.getItem(USER_PREFS_KEY);
    const allPrefs: UserPreferences[] = prefs ? JSON.parse(prefs) : [];
    
    const userPrefs = allPrefs.find(p => p.userId === userId);
    if (userPrefs) return userPrefs;

    // Preferencias por defecto
    return {
      userId,
      language: 'es',
      timezone: 'America/Montevideo',
      theme: 'dark',
      notifications: {
        userId,
        streamStarted: true,
        newFollower: true,
        videoReady: true,
        clipReady: true,
        mention: true,
        moderation: true,
        system: true,
        emailNotifications: false,
        updatedAt: new Date().toISOString(),
      },
      privacy: {
        showFollowers: true,
        showFollowing: true,
        showActivity: true,
        showEmail: false,
        allowMessages: true,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  // Actualizar preferencias
  static updateUserPreferences(userId: string, updates: Partial<UserPreferences>): void {
    const prefs = localStorage.getItem(USER_PREFS_KEY);
    let allPrefs: UserPreferences[] = prefs ? JSON.parse(prefs) : [];
    
    const index = allPrefs.findIndex(p => p.userId === userId);
    const currentPrefs = index !== -1 ? allPrefs[index] : this.getUserPreferences(userId);
    
    const updatedPrefs: UserPreferences = {
      ...currentPrefs,
      ...updates,
      userId,
      updatedAt: new Date().toISOString(),
    };

    if (index !== -1) {
      allPrefs[index] = updatedPrefs;
    } else {
      allPrefs.push(updatedPrefs);
    }

    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(allPrefs));
  }

  // Actualizar configuración de privacidad
  static updatePrivacySettings(userId: string, privacy: Partial<PrivacySettings>): void {
    const prefs = this.getUserPreferences(userId);
    this.updateUserPreferences(userId, {
      privacy: { ...prefs.privacy, ...privacy },
    });
  }
}
