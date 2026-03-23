import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "maddie@example.com";
const DEMO_PASSWORD = "sunrise123";
const DEMO_NAME = "Maddie Test";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not available in production." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: DEMO_NAME,
      passwordHash
    },
    create: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      passwordHash
    }
  });

  return NextResponse.json({
    email: user.email,
    password: DEMO_PASSWORD
  });
}
