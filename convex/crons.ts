import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.weekly(
  "cleanup old data",
  { hourUTC: 3, minuteUTC: 0, dayOfWeek: "monday" },
  internal.cleanup.runInternal,
  { months: 12 }
);

export default crons;
