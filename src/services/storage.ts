import { v4 as uuidv4 } from 'uuid';
import type { StorageFile } from '../types';

/**
 * StorageService - Abstracción para almacenamiento de archivos
 * 
 * En desarrollo: usa localStorage/IndexedDB para simular almacenamiento
 * En producción: usar S3, Cloudflare R2, MinIO, etc.
 */

const STORAGE_KEYS = {
  files: 'nexura_storage_files',
};

// ============ STORAGE PROVIDER INTERFACE ============
export interface StorageProvider {
  upload(key: string, file: File | Blob, prefix?: string): Promise<StorageFile>;
  download(key: string): Promise<Blob | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

// ============ LOCAL STORAGE PROVIDER (Development) ============
class LocalStorageProvider implements StorageProvider {
  async upload(key: string, file: File | Blob): Promise<StorageFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const storageFile: StorageFile = {
          key,
          url: reader.result as string,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
        };

        // Store in IndexedDB for large files
        this.storeInIndexedDB(key, reader.result as string)
          .then(() => resolve(storageFile))
          .catch(reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async download(key: string): Promise<Blob | null> {
    const data = await this.getFromIndexedDB(key);
    if (!data) return null;
    
    // Convert data URL to blob
    const response = await fetch(data);
    return response.blob();
  }

  async delete(key: string): Promise<boolean> {
    await this.removeFromIndexedDB(key);
    return true;
  }

  async exists(key: string): Promise<boolean> {
    const data = await this.getFromIndexedDB(key);
    return data !== null;
  }

  getUrl(key: string): string {
    // Return the data URL from IndexedDB
    return ''; // Will be populated by download()
  }

  private async storeInIndexedDB(key: string, data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nexura_storage', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains('files')) {
          db.close();
          const upgradeRequest = indexedDB.open('nexura_storage', 2);
          upgradeRequest.onupgradeneeded = (event) => {
            const upgradeDb = (event.target as IDBOpenDBRequest).result;
            upgradeDb.createObjectStore('files', { keyPath: 'key' });
          };
          upgradeRequest.onsuccess = () => {
            const upgradeDb = upgradeRequest.result;
            const transaction = upgradeDb.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            store.put({ key, data });
            transaction.oncomplete = () => {
              upgradeDb.close();
              resolve();
            };
          };
          upgradeRequest.onerror = () => reject(upgradeRequest.error);
        } else {
          const transaction = db.transaction(['files'], 'readwrite');
          const store = transaction.objectStore('files');
          store.put({ key, data });
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
        }
      };
    });
  }

  private async getFromIndexedDB(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nexura_storage', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains('files')) {
          db.close();
          resolve(null);
          return;
        }
        
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result?.data || null);
        };
        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };
    });
  }

  private async removeFromIndexedDB(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nexura_storage', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains('files')) {
          db.close();
          resolve();
          return;
        }
        
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        store.delete(key);
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  }
}

// ============ S3 STORAGE PROVIDER (Production) ============
class S3StorageProvider implements StorageProvider {
  private endpoint: string;
  private bucket: string;
  private accessKey: string;
  private secretKey: string;

  constructor() {
    // In production, these would come from environment variables
    this.endpoint = '';
    this.bucket = '';
    this.accessKey = '';
    this.secretKey = '';
  }

  async upload(key: string, file: File | Blob): Promise<StorageFile> {
    // TODO: Implement S3 upload with AWS SDK
    throw new Error('S3 upload not implemented yet');
  }

  async download(key: string): Promise<Blob | null> {
    // TODO: Implement S3 download
    throw new Error('S3 download not implemented yet');
  }

  async delete(key: string): Promise<boolean> {
    // TODO: Implement S3 delete
    throw new Error('S3 delete not implemented yet');
  }

  async exists(key: string): Promise<boolean> {
    // TODO: Implement S3 exists check
    throw new Error('S3 exists not implemented yet');
  }

  getUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}

// ============ STORAGE SERVICE ============
class StorageService {
  private provider: StorageProvider;

  constructor() {
    // Use local storage for development, S3 for production
    // In production, check environment variable
    const useS3 = false; // TODO: Read from environment
    this.provider = useS3 ? new S3StorageProvider() : new LocalStorageProvider();
  }

  /**
   * Generate a secure storage key
   */
  generateKey(prefix: string, extension: string = ''): string {
    const timestamp = Date.now();
    const random = uuidv4();
    const key = `${prefix}/${timestamp}_${random}`;
    return extension ? `${key}.${extension}` : key;
  }

  /**
   * Upload a file
   */
  async upload(file: File | Blob, prefix: string = 'uploads'): Promise<StorageFile> {
    const extension = file instanceof File ? (file.name.split('.').pop() || '') : '';
    const key = this.generateKey(prefix, extension);
    return this.provider.upload(key, file);
  }

  /**
   * Download a file
   */
  async download(key: string): Promise<Blob | null> {
    return this.provider.download(key);
  }

  /**
   * Delete a file
   */
  async delete(key: string): Promise<boolean> {
    return this.provider.delete(key);
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  /**
   * Get the URL for a file
   */
  getUrl(key: string): string {
    return this.provider.getUrl(key);
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, options: {
    maxSize?: number; // bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): { valid: boolean; error?: string } {
    const { maxSize = 100 * 1024 * 1024, allowedTypes, allowedExtensions } = options;

    // Check size
    if (file.size > maxSize) {
      return { valid: false, error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` };
    }

    // Check MIME type
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return { valid: false, error: `Invalid file type: ${file.type}` };
    }

    // Check extension
    if (allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return { valid: false, error: `Invalid file extension: .${extension}` };
      }
    }

    return { valid: true };
  }
}

// Export singleton instance
export const storageService = new StorageService();
