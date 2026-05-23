import { mutation } from "./_generated/server";

const TABLES = ["menu", "orders", "staff", "drivers", "reservations", "reviews"] as const;

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];
    let profilesFixed = 0;
    const allProfiles = await ctx.db.query("profiles").collect();
    for (const p of allProfiles) {
      if (p.userId.includes("|")) {
        const stable = p.userId.split("|")[0];
        await ctx.db.patch(p._id, { userId: stable });
        profilesFixed++;
      }
    }
    results.push(`profiles: ${profilesFixed} rows updated`);

    for (const table of TABLES) {
      const docs = await ctx.db.query(table).collect();
      let updated = 0;
      for (const doc of docs) {
        const val = (doc as any).restaurantId;
        if (typeof val === "string" && val.includes("|")) {
          const stable = val.split("|")[0];
          await ctx.db.patch(doc._id, { restaurantId: stable } as any);
          updated++;
        }
      }
      results.push(`${table}: ${updated} rows updated`);
    }

    return results;
  },
});
