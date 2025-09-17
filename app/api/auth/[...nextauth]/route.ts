import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = 'nodejs'; // critical for crypto operations
export const dynamic = 'force-dynamic'; // avoids static caching on session

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
