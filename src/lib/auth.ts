import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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
              lastActiveAt: new Date(),
            },
          });
        } else {
          if (user.status === "SUSPENDED" || user.status === "DELETED") return null;
          // legacy/demo users without password -> set password on first use
          if (!user.passwordHash) {
            const passwordHash = await bcrypt.hash(password, 10);
            user = await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash, lastActiveAt: new Date() },
            });
          } else {
            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return null;
            // touch lastActiveAt
            await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
          }
        }
        if (user.status === "SUSPENDED" || user.status === "DELETED") return null;
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
