import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { ENV } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  if (ENV.SUPABASE_URL && ENV.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('⚡ Supabase client initialized.');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
    }
  } else {
    console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. Local storage fallback will be used.');
  }

  return supabase;
}

export function saveFileLocally(
  bucketName: 'chat-media' | 'stickers' | 'avatars',
  filePath: string,
  fileBuffer: Buffer
): string {
  // Primary local uploads folder in project directory
  let localUploadDir = path.join(__dirname, '..', '..', 'uploads', bucketName);
  try {
    if (!fs.existsSync(localUploadDir)) {
      fs.mkdirSync(localUploadDir, { recursive: true });
    }
  } catch {
    // Container/serverless fallback if root project directory is read-only
    localUploadDir = path.join(os.tmpdir(), 'talkcross_uploads', bucketName);
    if (!fs.existsSync(localUploadDir)) {
      fs.mkdirSync(localUploadDir, { recursive: true });
    }
  }

  const sanitizedFileName = filePath.replace(/[^a-zA-Z0-9._()-]/g, '_');
  const fullLocalPath = path.join(localUploadDir, sanitizedFileName);
  fs.writeFileSync(fullLocalPath, fileBuffer);

  const localUrl = `/uploads/${bucketName}/${sanitizedFileName}`;
  console.log(`Saved file locally at: ${localUrl}`);
  return localUrl;
}

export async function uploadFile(
  bucketName: 'chat-media' | 'stickers' | 'avatars',
  filePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getSupabaseClient();

  if (client) {
    try {
      // Ensure bucket exists (ignoring error if already exists)
      try {
        await client.storage.createBucket(bucketName, { public: true });
      } catch (err) {
        // bucket might already exist
      }

      const { data, error } = await client.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } catch (error) {
      console.warn(`Supabase Storage upload warning (${bucketName}), falling back to local storage:`, error);
      // Fall through to local fallback rather than failing the user request
    }
  }

  // Guaranteed fallback: Store locally
  return saveFileLocally(bucketName, filePath, fileBuffer);
}
