import NextAuth from 'next-auth/next';
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import GoogleProvider from 'next-auth/providers/google';
import clientPromise from "../../../lib/mongodb";

export default NextAuth({
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      })
    ],
    secret: process.env.JWT_SECRET,
    adapter: MongoDBAdapter(clientPromise),
    callbacks: {
      /**
       * @param  {object} session      Session object
       * @param  {object} token        User object    (if using database sessions)
       *                               JSON Web Token (if not using database sessions)
       * @return {object}              Session that will be returned to the client
       */
      async session({ session, user, token }) {
        // Add property to session, like an access_token from a provider.
        session.userId = user.id;
        return session;
      },
    },
    pages: {
      signIn: "/login",
    },
})