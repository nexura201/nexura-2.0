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
    createCategory(cat);
  });
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
