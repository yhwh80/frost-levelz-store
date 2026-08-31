import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 15 minutes. Alerts only after two consecutive failures, so a redeploy
// or a momentary blip doesn't send an email — worst case you hear about a real
// outage within about half an hour.
crons.interval(
  "site health check",
  { minutes: 15 },
  internal.health.check,
  {}
);

export default crons;
