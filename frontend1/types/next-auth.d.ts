import { User as AppUser } from '@/lib/auth';

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
