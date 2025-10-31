import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

// In production, Supabase credentials are mandatory
// In development, warn but allow startup for frontend development
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  const errorMessage = 
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required. " +
    "Get these from your Supabase project settings: Project Settings → API";
  
  if (!IS_DEVELOPMENT) {
    throw new Error(errorMessage);
  }
  
  console.warn("\n⚠️  WARNING: " + errorMessage);
  console.warn("⚠️  KYC document upload will not work until Supabase is configured.\n");
}

// Create a placeholder client in development if credentials are missing
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export { supabaseAdmin };

/**
 * Uploads a file to Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @param file - The file buffer
 * @param contentType - The file content type
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Deletes a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
