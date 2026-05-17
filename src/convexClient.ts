import { ConvexClient } from "convex/browser";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.warn("VITE_CONVEX_URL is not defined. Please run 'npx convex dev' to get your Convex URL.");
}

export const convex = new ConvexClient(convexUrl || "");
