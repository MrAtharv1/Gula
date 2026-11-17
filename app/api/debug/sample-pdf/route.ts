import { NextResponse } from "next/server";
import fs from "fs";

export async function GET() {
  const samplePath = "C:\\Users\\intel\\Downloads\\Praveen_Chauhan-1.pdf";
  if (!fs.existsSync(samplePath)) {
    return new NextResponse("Sample file not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(samplePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Praveen_Chauhan-1.pdf"',
    },
  });
}
