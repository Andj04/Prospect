import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { createUserAdmin, deleteUserAdmin, updateUserRoleAdmin } from "@/server-functions/users";
import type { AppUser, Role } from "@/lib/types";
import { USERS_KEY } from "./keys";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  structure: string;
  role: Role;
  password_change_required: boolean;
};

function mapUser(row: ProfileRow): AppUser {
  return {
    id: row.id,
    nomComplet: row.full_name,
    email: row.email,
    structure: row.structure,
    role: row.role,
    passwordChangeRequired: row.password_change_required,
  };
}

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async (): Promise<AppUser[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, structure, role, password_change_required")
        .order("full_name");
      if (error) throw error;
      return (data as ProfileRow[]).map(mapUser);
    },
  });
}

async function requireAccessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée, reconnectez-vous.");
  return token;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      fullName: string;
      structure: string;
      role: Role;
    }) => {
      const accessToken = await requireAccessToken();
      return createUserAdmin({ data: { accessToken, ...input } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const accessToken = await requireAccessToken();
      return deleteUserAdmin({ data: { accessToken, userId } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const accessToken = await requireAccessToken();
      return updateUserRoleAdmin({ data: { accessToken, userId, role } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}
