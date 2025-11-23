import NextAuth, { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JwtPayload, User as AppUser } from './auth';

// Extend the User type to include custom properties
declare module 'next-auth' {
  interface User extends AppUser {
    access_token?: string;
    token?: string;
  }
  
  interface Session {
    accessToken?: string;
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    user?: User;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/login/`, {
            method: 'POST',
            body: JSON.stringify(credentials),
            headers: { "Content-Type": "application/json" }
          });
          
          const data = await res.json();
          
          if (res.ok && data) {
            // Ensure the user object has the expected shape
            const user: User = {
              ...data.user,
              access_token: data.access || data.access_token,
              token: data.access || data.access_token,
            };
            return user;
          }
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.token || user.access_token;
        token.user = {
          ...user,
          // Ensure we don't store sensitive tokens in the user object
          token: undefined,
          access_token: undefined
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.user) {
        session.accessToken = token.accessToken;
        session.user = {
          ...token.user,
          // Add any additional user properties here
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
};

export default NextAuth(authOptions);
