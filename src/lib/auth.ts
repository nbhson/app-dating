import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim() || null; // set via env, never hardcode
export const ADMIN_NAME = "admin";
const LEGACY_ADMIN_EMAIL = "admin@admin.admin";
const ADMIN_EMAILS = new Set(ADMIN_EMAIL ? [ADMIN_EMAIL] : []);

// --- In-memory login rate limiting (per email + per IP-less global bucket) ---
// Mitigates brute-force password guessing. For multi-instance deployments,
// replace with a shared store (e.g. Redis/Upstash).
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    // opportunistic cleanup to avoid unbounded growth
    if (loginAttempts.size > 1000) {
      for (const [k, v] of loginAttempts) if (v.resetAt < now) loginAttempts.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

function clearLoginRateLimit(key: string): void {
  loginAttempts.delete(key);
}

function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase().trim());
}
function isLegacyAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase().trim() === LEGACY_ADMIN_EMAIL;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(process.env.APPLE_CLIENT_ID
      ? [
          Apple({
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = (creds?.email as string)?.toLowerCase().trim();
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;
        if (password.length < 8) return null;

        if (!checkLoginRateLimit(email)) {
          console.warn(`[auth] Rate limit exceeded for ${email}`);
          return null; // too many attempts — deny without leaking timing
        }

        // find user or create with passwordHash (register on first login)
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const passwordHash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email,
              name: email.split("@")[0],
              passwordHash,
              status: "ACTIVE",
              // NOTE: never grant isAdmin on self-registration — admin accounts are
              // provisioned exclusively through the DB seed script.
              isAdmin: false,
              lastActiveAt: new Date(),
            },
          });
        } else {
          if (user.status === "SUSPENDED" || user.status === "DELETED") return null;
          // auto-demote legacy admin email
          if (isLegacyAdminEmail(email) && user.isAdmin) {
            user = await prisma.user.update({ where: { id: user.id }, data: { isAdmin: false } });
          }
          // NOTE: admin privileges are granted ONLY via DB seed — never auto-promoted
          // at login time (prevents account-takeover → admin escalation).
          // Account OAuth-only (passwordHash null) KHÔNG được set password qua
          // đường login — ai biết email là chiếm được account.
          if (!user.passwordHash) {
            return null;
          } else {
            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return null;
            // touch lastActiveAt
            await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
          }
        }
        if (user.status === "SUSPENDED" || user.status === "DELETED") return null;
        clearLoginRateLimit(email); // successful auth — reset counter
        return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;
      // ensure token.id persists from DB if not set
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email as string } });
        if (dbUser) token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        // attach email/id
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
