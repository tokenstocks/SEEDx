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

/**
 * Ensures a storage bucket exists, creates it if it doesn't
 * @param bucketName - The name of the bucket to ensure exists
 * @param isPublic - Whether the bucket should be public (default: true)
 */
export async function ensureBucketExists(bucketName: string, isPublic: boolean = true): Promise<void> {
  if (!supabaseAdmin) {
    console.warn(`Skipping bucket creation for ${bucketName} - Supabase not configured`);
    return;
  }

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error(`Error listing buckets:`, listError);
      return;
    }

    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: isPublic,
        fileSizeLimit: 10485760, // 10MB
      });

      if (error) {
        if (error.message.includes("row-level security policy")) {
          console.warn(`⚠️  Cannot create bucket '${bucketName}' - Row-Level Security enabled on Supabase`);
          console.warn(`   Please create the bucket manually in Supabase Dashboard:`);
          console.warn(`   Storage → Create bucket → Name: "${bucketName}" → Public: ${isPublic}`);
        } else {
          console.error(`Error creating bucket ${bucketName}:`, error.message);
        }
      } else {
        console.log(`✓ Created storage bucket: ${bucketName}`);
      }
    } else {
      console.log(`✓ Storage bucket exists: ${bucketName}`);
    }
  } catch (error: any) {
    console.error(`Error ensuring bucket ${bucketName} exists:`, error.message);
  }
}

/**
 * Initialize all required storage buckets
 */
export async function initializeStorageBuckets(): Promise<void> {
  if (!supabaseAdmin) {
    console.warn("⚠️  Skipping storage bucket initialization - Supabase not configured");
    return;
  }

  console.log("\nInitializing storage buckets...");
  await ensureBucketExists("kyc", true);
  await ensureBucketExists("project-photos", true);
  await ensureBucketExists("project-documents", true);
  await ensureBucketExists("bank-deposits", true);
  console.log("Storage bucket initialization complete\n");
}
