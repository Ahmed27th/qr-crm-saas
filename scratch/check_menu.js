
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient("https://hidden-herring-940.convex.cloud");

async function checkMenu() {
  const restaurantId = "demo_restaurant_com";
  console.log(`Checking menu for ${restaurantId}...`);
  try {
    const items = await client.query(api.menu.getItems, { restaurantId });
    console.log("Items count:", items.length);
    console.log("Items:", JSON.stringify(items, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

checkMenu();
