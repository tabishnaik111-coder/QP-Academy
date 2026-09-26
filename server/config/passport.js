import "dotenv/config";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import User from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:5000/api/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails?.[0]?.value
            ?.trim()
            .toLowerCase();

        if (!email) {
          return done(
            new Error(
              "Google account email could not be retrieved."
            )
          );
        }

        let user = await User.findOne({
          email,
        });

        if (!user) {
          user = await User.create({
            name:
              profile.displayName ||
              "QPA Student",

            email,

            passwordHash:
              `google_${profile.id}_${Date.now()}`,

            profileImage:
              profile.photos?.[0]?.value || "",

            role: "student",

            isActive: true,

            lastLogin: new Date(),
          });
        } else {
          if (!user.isActive) {
            return done(
              new Error(
                "This account has been deactivated."
              )
            );
          }

          user.lastLogin = new Date();

          if (
            !user.profileImage &&
            profile.photos?.[0]?.value
          ) {
            user.profileImage =
              profile.photos[0].value;
          }

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        console.error(
          "Google authentication error:",
          error
        );

        return done(error);
      }
    }
  )
);

export default passport;