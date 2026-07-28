import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/items/${id}`;

    const qrSvg = await QRCode.toString(url, {
      type: "svg",
      width: 400,
      margin: 2,
      color: {
        dark: "#1d4ed8",
        light: "#ffffff",
      },
    });

    return new NextResponse(qrSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat QR Code" },
      { status: 500 }
    );
  }
}