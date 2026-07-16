import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const BUCKET = "logos";
const PREFIX = "categories/";

function extensionFromType(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const previousPathRaw = String(form.get("previousPath") || "").trim();
  const categoryName = String(form.get("categoryName") || "category")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PNG, JPG, WEBP, or SVG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 2MB)." }, { status: 400 });
  }

  const ext = extensionFromType(file.type);
  const filePath = `${PREFIX}${categoryName || "tool"}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  if (previousPathRaw && previousPathRaw.startsWith(PREFIX) && previousPathRaw !== filePath) {
    await supabase.storage.from(BUCKET).remove([previousPathRaw]);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return NextResponse.json({ success: true, url: data.publicUrl, path: filePath });
}

export async function DELETE(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { path } = (await request.json().catch(() => ({}))) as { path?: string };
  const safePath = String(path || "").trim();
  if (!safePath || !safePath.startsWith(PREFIX)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const { error } = await supabase.storage.from(BUCKET).remove([safePath]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
