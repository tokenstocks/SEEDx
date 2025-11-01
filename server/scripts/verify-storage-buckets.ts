import { supabaseAdmin } from "../lib/supabase";

/**
 * Verification script: Check if all required Supabase storage buckets exist
 * 
 * Required buckets:
 * - kyc (for KYC document uploads)
 * - project-photos (for agricultural project images)
 * - project-documents (for project-related documents)
 */

async function verifyStorageBuckets() {
  console.log("🔍 Verifying Supabase Storage Buckets...\n");

  if (!supabaseAdmin) {
    console.error("❌ Supabase not configured!");
    console.error("   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables");
    process.exit(1);
  }

  const requiredBuckets = [
    { name: "kyc", description: "KYC document uploads" },
    { name: "project-photos", description: "Agricultural project images" },
    { name: "project-documents", description: "Project-related documents" },
  ];

  try {
    // List all buckets
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error("❌ Error listing buckets:", listError.message);
      process.exit(1);
    }

    console.log("📦 Existing buckets:");
    if (buckets && buckets.length > 0) {
      buckets.forEach(bucket => {
        console.log(`   ✓ ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
      });
    } else {
      console.log("   (none)");
    }

    console.log("\n📋 Required buckets:");
    
    let allBucketsExist = true;
    for (const required of requiredBuckets) {
      const exists = buckets?.some(b => b.name === required.name);
      const status = exists ? "✅" : "❌";
      console.log(`   ${status} ${required.name} - ${required.description}`);
      
      if (!exists) {
        allBucketsExist = false;
      }
    }

    console.log("\n" + "=".repeat(60));
    
    if (allBucketsExist) {
      console.log("✅ All required storage buckets exist!");
      console.log("   KYC document upload should work now.");
      console.log("=".repeat(60) + "\n");
      process.exit(0);
    } else {
      console.log("❌ Missing storage buckets detected!");
      console.log("\n📝 To create missing buckets:");
      console.log("   1. Go to: https://supabase.com/dashboard");
      console.log("   2. Select your project");
      console.log("   3. Navigate to Storage → New bucket");
      console.log("   4. Create each missing bucket:");
      
      for (const required of requiredBuckets) {
        const exists = buckets?.some(b => b.name === required.name);
        if (!exists) {
          console.log(`      • Name: "${required.name}"`);
          console.log(`        Public: Yes`);
          console.log(`        File size limit: 10MB`);
        }
      }
      
      console.log("\n   5. Run this script again to verify");
      console.log("=".repeat(60) + "\n");
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }
}

// Run verification
verifyStorageBuckets();
