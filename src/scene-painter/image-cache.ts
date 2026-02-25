// Local scene image cache backed by expo-file-system

import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const CACHE_DIR = `${FileSystem.documentDirectory}scene-cache/`;

interface FileEntry {
  uri: string;
  size: number;
  modificationTime: number;
}

export function getCacheDir(): string {
  return CACHE_DIR;
}

export async function ensureCacheDir(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch (error: unknown) {
    console.warn('[image-cache] ensureCacheDir failed:', error);
  }
}

export async function hashPrompt(promptText: string): Promise<string> {
  try {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      promptText,
    );
  } catch (error: unknown) {
    console.warn('[image-cache] hashPrompt failed:', error);
    return '';
  }
}

export async function getCachedImagePath(promptText: string): Promise<string | null> {
  try {
    const hash = await hashPrompt(promptText);
    if (hash === '') {
      return null;
    }

    const filePath = `${CACHE_DIR}${hash}.png`;
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      return filePath;
    }

    return null;
  } catch (error: unknown) {
    console.warn('[image-cache] getCachedImagePath failed:', error);
    return null;
  }
}

export async function saveToCacheFromUrl(
  remoteUrl: string,
  promptText: string,
): Promise<string> {
  try {
    await ensureCacheDir();

    const hash = await hashPrompt(promptText);
    if (hash === '') {
      return '';
    }

    const localPath = `${CACHE_DIR}${hash}.png`;

    // Skip download if already cached
    const existing = await FileSystem.getInfoAsync(localPath);
    if (existing.exists) {
      return localPath;
    }

    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);
    if (downloadResult.status !== 200) {
      console.warn(
        `[image-cache] Download failed with status ${String(downloadResult.status)}`,
      );
      return '';
    }

    await evictIfNeeded();

    return localPath;
  } catch (error: unknown) {
    console.warn('[image-cache] saveToCacheFromUrl failed:', error);
    return '';
  }
}

export async function evictIfNeeded(): Promise<void> {
  try {
    const fileNames = await FileSystem.readDirectoryAsync(CACHE_DIR);

    // Collect metadata for every cached file
    const entries: FileEntry[] = [];

    for (const name of fileNames) {
      const uri = `${CACHE_DIR}${name}`;
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory) {
        entries.push({
          uri,
          size: info.size ?? 0,
          modificationTime: info.modificationTime ?? 0,
        });
      }
    }

    let totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

    if (totalSize <= MAX_CACHE_SIZE_BYTES) {
      return;
    }

    // Sort oldest first so we delete the least-recently-modified files
    entries.sort((a, b) => a.modificationTime - b.modificationTime);

    for (const entry of entries) {
      if (totalSize <= MAX_CACHE_SIZE_BYTES) {
        break;
      }

      await FileSystem.deleteAsync(entry.uri, { idempotent: true });
      totalSize -= entry.size;
    }
  } catch (error: unknown) {
    console.warn('[image-cache] evictIfNeeded failed:', error);
  }
}
