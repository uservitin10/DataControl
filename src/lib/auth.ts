import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

const entraTenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;
const entraIssuer =
  process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ??
  (entraTenantId ? `https://login.microsoftonline.com/${entraTenantId}/v2.0` : undefined);

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const result = await pool.query(
          `SELECT id, email, display_name, role, password_hash, must_reset_password
           FROM profiles WHERE email = $1`,
          [email]
        );
        const user = result.rows[0];
        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
          role: user.role,
          mustResetPassword: user.must_reset_password,
        };
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: entraIssuer,
    }),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      // Login local (Credentials) já foi validado no authorize() acima
      if (account?.provider === "credentials") return true;

      // Login via Microsoft Entra ID: garante que existe um profile vinculado
      if (account?.provider === "microsoft-entra-id") {
        if (!user.email) return false;

        const existing = await pool.query(
          "SELECT id, role FROM profiles WHERE email = $1",
          [user.email]
        );

        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO profiles (email, display_name, role)
             VALUES ($1, $2, $3)`,
            [user.email, user.name ?? user.email, "viewer"]
          );
        }
      }

      return true;
    },
    jwt: async ({ token, user, account }) => {
      if (user) {
        token.role = user.role;
        token.mustResetPassword = user.mustResetPassword;
      }

      if (account?.provider === "microsoft-entra-id" && token.email) {
        const result = await pool.query(
          "SELECT id, role, must_reset_password FROM profiles WHERE email = $1",
          [token.email]
        );
        const profile = result.rows[0];
        if (profile) {
          token.sub = profile.id;
          token.role = profile.role;
          token.mustResetPassword = profile.must_reset_password;
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub as string;
      session.user.role = token.role as string;
      session.user.mustResetPassword = token.mustResetPassword as boolean;

      if (token.sub) {
        const profileResult = await pool.query(
          "SELECT role FROM profiles WHERE id = $1",
          [token.sub]
        );
        const currentRole = profileResult.rows[0]?.role;
        if (currentRole) {
          session.user.role = currentRole as string;
        }
      }

      return session;
    },
  },
});

export { loadClientUser, getClientUserState } from "@/lib/auth-client";