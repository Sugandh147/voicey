import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (key) {
    try {
      const dir = path.join(process.cwd(), "public", "demo-voices");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const arrayBuffer = await req.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(path.join(dir, `${key}.wav`), buffer);
      console.log(`Saved mock voice file to public/demo-voices/${key}.wav`);
    } catch (err) {
      console.error("Error saving mock voice file:", err);
    }
  }
  return new NextResponse(null, { status: 200 });
}
