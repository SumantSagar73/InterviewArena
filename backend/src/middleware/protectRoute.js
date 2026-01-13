import { requireAuth, clerkClient } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      // find user in db by clerk ID
      let user = await User.findOne({ clerkId });

      // If user is not found, it might be due to a DB reset. 
      // Let's perform a "Lazy Sync" from Clerk.
      if (!user) {
        console.log(`Auto-syncing user from Clerk: ${clerkId}`);
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);

          user = await User.create({
            clerkId: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
            profileImage: clerkUser.imageUrl,
          });

          // Also sync with Stream
          await upsertStreamUser({
            id: user.clerkId,
            name: user.name,
            image: user.profileImage,
          });

          console.log(`Successfully synced user: ${user.name}`);
        } catch (syncError) {
          console.error("Failed to auto-sync user from Clerk:", syncError.message);
          return res.status(404).json({ message: "User not found and sync failed" });
        }
      }

      // attach user to req
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];
