import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Load .env.local manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf8");
envContent.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length && key.trim() && !key.trim().startsWith("#")) {
    process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadTuxedoHeroVideo() {
  const filePath = "/Users/kylemartinez/Downloads/062624TuxedoCorn 001.mp4";
  const fileBuffer = readFileSync(filePath);
  const fileSizeMB = (fileBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(`File: ${filePath} (${fileSizeMB} MB)`);

  // Ensure public videos bucket exists
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) { console.error("List buckets error:", listErr.message); process.exit(1); }

  const existing = buckets?.find((b) => b.name === "videos");
  if (!existing) {
    console.log("Creating 'videos' bucket (public)...");
    const { error: createErr } = await supabase.storage.createBucket("videos", { public: true });
    if (createErr) { console.error("Create bucket error:", createErr.message); process.exit(1); }
    console.log("Bucket 'videos' created.");
  } else {
    console.log(`'videos' bucket exists (public: ${existing.public}).`);
    if (!existing.public) {
      const { error: updErr } = await supabase.storage.updateBucket("videos", { public: true });
      if (updErr) console.warn("Could not update bucket to public:", updErr.message);
      else console.log("Bucket updated to public.");
    }
  }

  // Upload
  console.log("Uploading tuxedo-hero.mp4...");
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("videos")
    .upload("tuxedo-hero.mp4", fileBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadErr) {
    console.error("Upload error:", uploadErr.message);
    process.exit(1);
  }

  console.log("Upload OK:", JSON.stringify(uploadData));

  // Public URL
  const { data: urlData } = supabase.storage.from("videos").getPublicUrl("tuxedo-hero.mp4");
  const url = urlData.publicUrl;
  console.log(`\n✅ Public URL:\n${url}`);
}

uploadTuxedoHeroVideo().catch((e) => { console.error(e); process.exit(1); });