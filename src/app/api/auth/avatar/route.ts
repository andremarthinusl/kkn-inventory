import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupabase } from "@/lib/supabase";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `avatar-${session.user.id}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let imageUrl = "";

    // Try Supabase Storage first
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        // Fallback to local
        imageUrl = await saveLocal(filename, buffer);
      } else {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filename);
        imageUrl = urlData.publicUrl;
      }
    } else {
      // No Supabase key configured — save locally
      imageUrl = await saveLocal(filename, buffer);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "UPDATE_PROFILE",
        description: "Mengubah foto profil",
      },
    });

    return NextResponse.json({ image: imageUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Gagal mengupload foto" }, { status: 500 });
  }
}

async function saveLocal(filename: string, buffer: Buffer): Promise<string> {
  const avatarsDir = path.join(process.cwd(), "public", "avatars");
  await mkdir(avatarsDir, { recursive: true });
  await writeFile(path.join(avatarsDir, filename), buffer);
  return `/avatars/${filename}`;
}