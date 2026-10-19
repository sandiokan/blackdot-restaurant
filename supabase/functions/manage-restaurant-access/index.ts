import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "jsr:@supabase/supabase-js@2";

type AccessRole = "MANAGER" | "EMPLOYEE";
type Action = "list" | "invite" | "change_role" | "revoke" | "accept_invitation";

type RequestBody = {
  action?: Action;
  email?: string;
  role?: AccessRole;
  accessId?: string;
  invitationId?: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const inviteRedirectUrl = Deno.env.get("ACCESS_INVITE_REDIRECT_URL");
const MAX_INVITES_PER_HOUR = 10;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Required Supabase Edge Function secrets are unavailable.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicAuth = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200, origin?: string | null) {
  const headers = new Headers({ "Content-Type": "application/json", "Vary": "Origin" });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function error(message: string, status: number, origin?: string | null) {
  return json({ error: message }, status, origin);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizedEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function validRole(value: unknown): value is AccessRole {
  return value === "MANAGER" || value === "EMPLOYEE";
}

function allowedOrigin(requestOrigin: string | null) {
  if (!inviteRedirectUrl) return null;
  try {
    const configuredOrigin = new URL(inviteRedirectUrl).origin;
    return requestOrigin === configuredOrigin ? configuredOrigin : null;
  } catch {
    return null;
  }
}

function redirectUrlFor(invitationId: string) {
  if (!inviteRedirectUrl) return null;
  try {
    const url = new URL(inviteRedirectUrl);
    url.searchParams.set("invitation", invitationId);
    return url.toString();
  } catch {
    return null;
  }
}

async function authenticatedUser(request: Request): Promise<{ user: User; token: string } | null> {
  const header = request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const { data, error: authError } = await publicAuth.auth.getUser(token);
  if (authError || !data.user) return null;
  return { user: data.user, token };
}

async function ownerRestaurant(userId: string) {
  const { data, error: accessError } = await admin
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", userId)
    .eq("role", "OWNER")
    .maybeSingle();

  if (accessError) throw new Error("Unable to verify restaurant ownership.");
  return data?.restaurant_id ?? null;
}

async function parseBody(request: Request): Promise<RequestBody | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body as RequestBody : null;
  } catch {
    return null;
  }
}

async function expireInvitations(restaurantId: string) {
  const { error: expiryError } = await admin
    .from("restaurant_access_invites")
    .update({ status: "EXPIRED" })
    .eq("restaurant_id", restaurantId)
    .eq("status", "PENDING")
    .lt("expires_at", new Date().toISOString());
  if (expiryError) throw new Error("Unable to refresh invitation status.");
}

async function requireInvitationRateBelowLimit(restaurantId: string, userId: string) {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("restaurant_access_invites")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("created_by", userId)
    .gte("sent_at", cutoff);
  if (countError) throw new Error("Unable to check invitation rate.");
  return (count ?? 0) < MAX_INVITES_PER_HOUR;
}

async function rollbackPendingInvitation(invitationId: string) {
  await admin
    .from("restaurant_access_invites")
    .delete()
    .eq("id", invitationId)
    .eq("status", "PENDING");
}

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get("Origin");
  const corsOrigin = allowedOrigin(requestOrigin);

  if (request.method === "OPTIONS") {
    return corsOrigin ? new Response(null, { status: 204, headers: new Headers({
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    }) }) : error("Origin not allowed.", 403);
  }

  if (request.method !== "POST") return error("Method not allowed.", 405, corsOrigin);
  if (requestOrigin && !corsOrigin) return error("Origin not allowed.", 403);

  const identity = await authenticatedUser(request);
  if (!identity) return error("Authentication required.", 401, corsOrigin);

  const body = await parseBody(request);
  if (!body?.action) return error("Invalid request.", 400, corsOrigin);

  try {
    if (body.action === "accept_invitation") {
      if (!isUuid(body.invitationId) || !identity.user.email) return error("Invalid invitation.", 400, corsOrigin);
      const { data, error: acceptError } = await admin.rpc("accept_restaurant_access_invitation", {
        target_invitation_id: body.invitationId,
        authenticated_user_id: identity.user.id,
        authenticated_email: identity.user.email,
      });
      if (acceptError) return error("Invitation cannot be accepted.", 403, corsOrigin);
      return json({ access: data?.[0] ?? null }, 200, corsOrigin);
    }

    const restaurantId = await ownerRestaurant(identity.user.id);
    if (!restaurantId) return error("Owner authorization required.", 403, corsOrigin);

    if (body.action === "list") {
      await expireInvitations(restaurantId);
      const [{ data: access, error: accessError }, { data: invitations, error: inviteError }] = await Promise.all([
        admin.from("restaurant_users").select("id, user_id, role, created_at").eq("restaurant_id", restaurantId).order("created_at", { ascending: true }),
        admin.from("restaurant_access_invites").select("id, email, role, status, created_at, sent_at, expires_at, accepted_at, revoked_at, invited_user_id").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }),
      ]);
      if (accessError || inviteError) throw new Error("Unable to load access records.");
      const accessWithEmail = await Promise.all((access ?? []).map(async (entry) => {
        const { data } = await admin.auth.admin.getUserById(entry.user_id);
        return { ...entry, email: data.user?.email ?? null };
      }));
      return json({ access: accessWithEmail, invitations }, 200, corsOrigin);
    }

    if (body.action === "invite") {
      const email = normalizedEmail(body.email);
      if (!email || !validRole(body.role)) return error("Invalid invitation data.", 400, corsOrigin);
      const redirectTo = redirectUrlFor("placeholder");
      if (!redirectTo) return error("Invitation redirect is not configured.", 503, corsOrigin);
      if (!await requireInvitationRateBelowLimit(restaurantId, identity.user.id)) return error("Invitation rate limit reached. Try again later.", 429, corsOrigin);

      const { data: existingUserId, error: lookupError } = await admin.rpc("find_auth_user_id_by_email", { target_email: email });
      if (lookupError) throw new Error("Unable to verify recipient.");

      if (existingUserId) {
        const { count: existingAccessCount, error: existingAccessError } = await admin
          .from("restaurant_users")
          .select("id", { count: "exact", head: true })
          .eq("user_id", existingUserId);
        if (existingAccessError) throw new Error("Unable to verify recipient access.");
        if ((existingAccessCount ?? 0) > 0) return error("This account already has restaurant access.", 409, corsOrigin);
      }

      const { data: invitation, error: invitationError } = await admin
        .from("restaurant_access_invites")
        .insert({ restaurant_id: restaurantId, email, role: body.role, created_by: identity.user.id, invited_user_id: existingUserId ?? null })
        .select("id")
        .single();
      if (invitationError || !invitation) {
        if (invitationError?.code === "23505") return error("An active invitation already exists for this email.", 409, corsOrigin);
        throw new Error("Unable to create invitation.");
      }

      const redirect = redirectUrlFor(invitation.id);
      if (!redirect) {
        await rollbackPendingInvitation(invitation.id);
        return error("Invitation redirect is not configured.", 503, corsOrigin);
      }

      if (existingUserId) {
        const { error: signInError } = await publicAuth.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: redirect },
        });
        if (signInError) {
          await rollbackPendingInvitation(invitation.id);
          throw new Error("Unable to send access email.");
        }
      } else {
        const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: redirect });
        if (inviteError) {
          await rollbackPendingInvitation(invitation.id);
          throw new Error("Unable to send invitation email.");
        }
      }

      return json({ invitationId: invitation.id, status: "PENDING" }, 201, corsOrigin);
    }

    if (!isUuid(body.accessId)) return error("Invalid access record.", 400, corsOrigin);
    const { data: target, error: targetError } = await admin
      .from("restaurant_users")
      .select("id, user_id, role, created_at")
      .eq("id", body.accessId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (targetError || !target) return error("Access record not found.", 404, corsOrigin);
    if (target.role === "OWNER") return error("Owner access cannot be changed or revoked.", 403, corsOrigin);

    if (body.action === "change_role") {
      if (!validRole(body.role)) return error("Invalid role.", 400, corsOrigin);
      const { error: roleError } = await admin
        .from("restaurant_users")
        .update({ role: body.role })
        .eq("id", target.id)
        .eq("restaurant_id", restaurantId)
        .in("role", ["MANAGER", "EMPLOYEE"]);
      if (roleError) throw new Error("Unable to update role.");
      return json({ id: target.id, role: body.role }, 200, corsOrigin);
    }

    if (body.action === "revoke") {
      const { error: revokeError } = await admin
        .from("restaurant_users")
        .delete()
        .eq("id", target.id)
        .eq("restaurant_id", restaurantId)
        .in("role", ["MANAGER", "EMPLOYEE"]);
      if (revokeError) throw new Error("Unable to revoke access.");
      const { error: invitationUpdateError } = await admin
        .from("restaurant_access_invites")
        .update({ status: "REVOKED", revoked_at: new Date().toISOString() })
        .eq("restaurant_id", restaurantId)
        .eq("invited_user_id", target.user_id)
        .in("status", ["PENDING", "ACCEPTED"]);
      if (invitationUpdateError) {
        const { error: restoreError } = await admin
          .from("restaurant_users")
          .insert({ id: target.id, user_id: target.user_id, restaurant_id: restaurantId, role: target.role, created_at: target.created_at });
        if (restoreError) throw new Error("Access revocation requires support.");
        throw new Error("Access revocation could not be completed.");
      }
      return json({ id: target.id, status: "REVOKED" }, 200, corsOrigin);
    }

    return error("Unsupported action.", 400, corsOrigin);
  } catch (caught) {
    console.error("manage-restaurant-access failed", caught);
    return error("Access management operation failed.", 500, corsOrigin);
  }
});
