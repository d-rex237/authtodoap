"use client";

import {
  createTodo,
  deleteTodo,
  getTodos,
  toggleTodo,
} from "@/lib/actions/todos/todos";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useGetTodos() {
  return useQuery({
    queryKey: ["getTodos"],
    queryFn: getTodos,
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getTodos"] });
    },
    onError: (error) => {
      console.error("Failed to create todo:", error);
    },
  });
}

export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getTodos"] });
    },
    onError: (error) => {
      console.error("Failed to toggle todo:", error);
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getTodos"] });
    },
    onError: (error) => {
      console.error("Failed to delete todo:", error);
    },
  });
}
