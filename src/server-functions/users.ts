import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAdminClient } from "@/lib/server/supabase-admin";

async function assertCallerIsAdmin(
  adminClient: ReturnType<typeof createAdminClient>,
  accessToken: string,
) {
  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    throw new Error("Session invalide.");
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    throw new Error("Action réservée aux administrateurs.");
  }

  return userData.user;
}

const createUserSchema = z.object({
  accessToken: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  fullName: z.string().min(1, "Le nom complet est requis."),
  structure: z.string(),
  role: z.enum(["admin", "user"]),
});

export const createUserAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => createUserSchema.parse(data))
  .handler(async ({ data }) => {
    const adminClient = createAdminClient();
    await assertCallerIsAdmin(adminClient, data.accessToken);

    const { data: created, error } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, structure: data.structure },
    });
    if (error || !created.user) {
      throw new Error(error?.message ?? "Échec de la création du compte.");
    }

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      email: data.email,
      full_name: data.fullName,
      structure: data.structure,
      role: data.role,
      password_change_required: true,
    });
    if (profileError) {
      // Roll back the auth user so we don't leave an orphaned login with no profile.
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }

    return { id: created.user.id };
  });

const deleteUserSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.string().uuid(),
});

export const deleteUserAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteUserSchema.parse(data))
  .handler(async ({ data }) => {
    const adminClient = createAdminClient();
    const caller = await assertCallerIsAdmin(adminClient, data.accessToken);

    if (caller.id === data.userId) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    }

    const { error } = await adminClient.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

const updateUserRoleSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.string().uuid(),
  role: z.enum(["admin", "user"]),
});

export const updateUserRoleAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateUserRoleSchema.parse(data))
  .handler(async ({ data }) => {
    const adminClient = createAdminClient();
    const caller = await assertCallerIsAdmin(adminClient, data.accessToken);

    if (caller.id === data.userId) {
      throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    }

    // profiles' RLS trigger blocks role changes for any non-service_role
    // caller, so this must go through the admin client, not a direct
    // client-side update.
    const { error } = await adminClient
      .from("profiles")
      .update({ role: data.role })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
