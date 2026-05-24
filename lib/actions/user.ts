"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "../db";

export async function syncUser() {
  try {
    const user = await currentUser();
    if (!user) return null;

    const existingUser = await db.users.findUnique({
      where: { clerkId: user.id },
    });

    if (existingUser) return existingUser;

    const dbUser = await db.users.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? "",
        phone: user.phoneNumbers[0]?.phoneNumber ?? "",
      },
    });

    return dbUser;
  } catch (error) {
    console.error("Error syncing user:", error);
    return null;
  }
}
