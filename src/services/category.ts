import { v4 as uuidv4 } from 'uuid';
import * as db from './database';

/**
 * CategoryService - Sistema de categorías
 */

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

const CATEGORY_KEYS = {
  categories: 'nexura_categories',
};

// ============ CATEGORY OPERATIONS ============

/**
 * Obtener todas las categorías
 */
export function getAllCategories(): Category[] {
  const categories = getCollection<Category>(CATEGORY_KEYS.categories);
  return categories.filter(c => c.active).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Obtener categoría por ID
 */
export function getCategoryById(id: string): Category | null {
  const categories = getCollection<Category>(CATEGORY_KEYS.categories);
  return categories.find(c => c.id === id) || null;
}

/**
 * Obtener categoría por slug
 */
export function getCategoryBySlug(slug: string): Category | null {
  const categories = getCollection<Category>(CATEGORY_KEYS.categories);
  return categories.find(c => c.slug.toLowerCase() === slug.toLowerCase()) || null;
}

/**
 * Crear categoría (solo OWNER/ADMIN)
 */
export function createCategory(data: { name: string; description?: string; icon?: string }): Category {
  const categories = getCollection<Category>(CATEGORY_KEYS.categories);
  
  // Generate slug
  const slug = data.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Check if slug exists
  if (categories.some(c => c.slug === slug)) {
    throw new Error('CATEGORY_SLUG_EXISTS');
  }
  
  const category: Category = {
    id: uuidv4(),
    name: data.name,
    slug,
    description: data.description || '',
    icon: data.icon || '📁',
    imageUrl: '',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  categories.push(category);
  setCollection(CATEGORY_KEYS.categories, categories);
  
  return category;
}

/**
 * Actualizar categoría
 */
export function updateCategory(id: string, data: Partial<Category>): Category {
  const categories = getCollection<Category>(CATEGORY_KEYS.categories);
  const idx = categories.findIndex(c => c.id === id);
  
  if (idx === -1) {
    throw new Error('CATEGORY_NOT_FOUND');
  }
  
  Object.assign(categories[idx], data, { updatedAt: new Date().toISOString() });
  setCollection(CATEGORY_KEYS.categories, categories);
  
  return categories[idx];
}

/**
 * Eliminar categoría
 */
export function deleteCategory(id: string): boolean {
  const categories = getCollection<Category>(CATEGORY_KEYS.categories);
  const filtered = categories.filter(c => c.id !== id);
  
  if (filtered.length === categories.length) {
    throw new Error('CATEGORY_NOT_FOUND');
  }
  
  setCollection(CATEGORY_KEYS.categories, filtered);
  return true;
}

/**
 * Inicializar categorías por defecto
 */
export function initializeDefaultCategories(): void {
  const categories = getCollection<Category>(CATEGORY_KEYS.categories);
  
  if (categories.length > 0) return;
  
  const defaultCategories = [
    { name: 'Gaming', icon: '🎮', description: 'Videojuegos y esports' },
    { name: 'Just Chatting', icon: '💬', description: 'Charlas y comunidad' },
    { name: 'Música', icon: '🎵', description: 'Música en vivo y producciones' },
    { name: 'Deportes', icon: '⚽', description: 'Deportes y fitness' },
    { name: 'Tecnología', icon: '💻', description: 'Programación y tecnología' },
    { name: 'Arte', icon: '🎨', description: 'Arte digital y tradicional' },
    { name: 'Cocina', icon: '🍳', description: 'Cocina y gastronomía' },
    { name: 'IRL', icon: '🌍', description: 'Vida real y viajes' },
    { name: 'Educación', icon: '📚', description: 'Aprendizaje y tutoriales' },
    { name: 'Noticias', icon: '📰', description: 'Actualidad y noticias' },
    { name: 'Entretenimiento', icon: '🎭', description: 'Entretenimiento general' },
  ];
  
  defaultCategories.forEach(cat => {
    // No duplicar: solo crear si el slug no existe ya
    const slug = toSlug(cat.name);
    if (!categories.some(c => c.slug === slug)) {
      createCategory(cat);
    }
  });
}

/**
 * Generar slug a partir de un nombre (normaliza acentos, mayúsculas, etc.)
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Asegurar que las categorías por defecto existan sin duplicar las actuales.
 * Se llama al montar la sección de Categorías para garantizar contenido base.
 */
export function ensureDefaultCategories(): void {
  initializeDefaultCategories();
}

// ============ AGREGACIÓN DE CONTENIDO POR CATEGORÍA ============

export interface CategoryContentCounts {
  liveStreams: number;
  channels: number;
  videos: number;
  clips: number;
  total: number;
}

/**
 * Obtener estadísticas agregadas de contenido por categoría.
 * Usa `categoryId` cuando está disponible (canales y streams).
 * Para videos/clips, se agrupan por la categoría del canal asociado.
 * Nota: los datos se inyectan desde la capa de presentación para evitar
 * imports circulares entre servicios.
 */
export function getContentCountsByCategory(inputs: {
  categories: Category[];
  channels: Array<{ id: string; categoryId: string | null }>;
  streams?: Array<{ channelId: string; categoryId?: string | null }>;
  videos?: Array<{ channelId: string }>;
  clips?: Array<{ channelId: string }>;
}): Record<string, CategoryContentCounts> {
  const { categories, channels, streams = [], videos = [], clips = [] } = inputs;

  const counts: Record<string, CategoryContentCounts> = {};
  for (const cat of categories) {
    counts[cat.id] = { liveStreams: 0, channels: 0, videos: 0, clips: 0, total: 0 };
  }

  const channelCategory: Record<string, string | null> = {};
  for (const ch of channels) {
    channelCategory[ch.id] = ch.categoryId;
    if (ch.categoryId && counts[ch.categoryId]) counts[ch.categoryId].channels += 1;
  }

  for (const s of streams) {
    const cid = s.categoryId ?? channelCategory[s.channelId] ?? null;
    if (cid && counts[cid]) counts[cid].liveStreams += 1;
  }

  for (const v of videos) {
    const cid = channelCategory[v.channelId] ?? null;
    if (cid && counts[cid]) counts[cid].videos += 1;
  }

  for (const c of clips) {
    const cid = channelCategory[c.channelId] ?? null;
    if (cid && counts[cid]) counts[cid].clips += 1;
  }

  for (const id of Object.keys(counts)) {
    const c = counts[id];
    c.total = c.videos + c.clips;
  }

  return counts;
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
