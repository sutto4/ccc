import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

const handler = NextAuth({
  providers: [Discord({
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  })],
  secret: process.env.NEXTAUTH_SECRET,
});
export { handler as GET, handler as POST };
