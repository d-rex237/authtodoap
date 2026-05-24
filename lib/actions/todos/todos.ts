"use server";

import { db } from "../../db";
import { auth } from "@clerk/nextjs/server";

async function getDbUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await db.users.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  return user;
}

export async function getTodos() {
  try {
    const user = await getDbUser();

    return await db.todo.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    throw new Error("Failed to fetch todos");
  }
}

interface CreateTodoInput {
  text: string;
  completed?: boolean;
  priority?: string;
  category?: string;
  dueAt?: string;
}

export async function createTodo(input: CreateTodoInput) {
  try {
    const user = await getDbUser();

    if (!input.text.trim()) throw new Error("Text is required");

    return await db.todo.create({
      data: {
        text: input.text.trim(),
        priority: input.priority ?? "medium",
        category: input.category ?? "General",
        completed: input.completed ?? false,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Failed to create todo:", error);
    throw new Error("Failed to create todo");
  }
}

export async function toggleTodo(id: string) {
  try {
    const user = await getDbUser();

    const todo = await db.todo.findUnique({ where: { id } });

    if (!todo) throw new Error("Todo not found");
    if (todo.userId !== user.id) throw new Error("Unauthorized");

    return await db.todo.update({
      where: { id },
      data: { completed: !todo.completed },
    });
  } catch (error) {
    console.error("Failed to toggle todo:", error);
    throw new Error("Failed to toggle todo");
  }
}

export async function deleteTodo(id: string) {
  try {
    const user = await getDbUser();

    const todo = await db.todo.findUnique({ where: { id } });

    if (!todo) throw new Error("Todo not found");
    if (todo.userId !== user.id) throw new Error("Unauthorized");

    await db.todo.delete({ where: { id } });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete todo:", error);
    throw new Error("Failed to delete todo");
  }
}
