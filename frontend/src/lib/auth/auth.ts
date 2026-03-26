// ============================================================================
// NEXTAUTH.JS v5 CONFIGURATION - Authentication for Hayoss
// ============================================================================

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ============================================================================
// Prisma Client Instance
// ============================================================================

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================================================
// Auth Configuration
// ============================================================================

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/account/login',
    signOut: '/account/logout',
    error: '/account/error',
    newUser: '/account',
  },
  providers: [
    // ========================================================================
    // Google OAuth Provider
    // ========================================================================
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),

    // ========================================================================
    // Credentials Provider (Email + Password)
    // ========================================================================
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          include: { customer: true },
        });

        if (!user || !user.password) {
          return null;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.customer?.firstName ?? 'Client',
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    // ========================================================================
    // JWT Callback - Add user info to token
    // ========================================================================
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      // Handle session update
      if (trigger === 'update' && session) {
        token.name = session.name;
      }

      return token;
    },

    // ========================================================================
    // Session Callback - Add user info to session
    // ========================================================================
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    // ========================================================================
    // SignIn Callback - Create Customer profile on first login
    // ========================================================================
    async signIn({ user, account }) {
      // For OAuth providers, create customer profile if it doesn't exist
      if (account?.provider !== 'credentials' && user.email) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { email: user.email },
        });

        if (!existingCustomer && user.id) {
          await prisma.customer.create({
            data: {
              userId: user.id,
              email: user.email,
              firstName: user.name?.split(' ')[0] ?? 'Client',
              lastName: user.name?.split(' ').slice(1).join(' ') ?? '',
              isVerified: true,
            },
          });
        } else if (existingCustomer && !existingCustomer.userId && user.id) {
          // Link existing customer to new user account
          await prisma.customer.update({
            where: { email: user.email },
            data: { userId: user.id },
          });
        }
      }

      return true;
    },
  },
  events: {
    // ========================================================================
    // Event: User Created
    // ========================================================================
    async createUser({ user }) {
      // Create customer profile for new users
      if (user.email && user.id) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { email: user.email },
        });

        if (!existingCustomer) {
          await prisma.customer.create({
            data: {
              userId: user.id,
              email: user.email,
              firstName: user.name?.split(' ')[0] ?? 'Client',
              lastName: user.name?.split(' ').slice(1).join(' ') ?? '',
              isVerified: true, // OAuth users are considered verified
            },
          });
        }
      }
    },
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export { prisma };
