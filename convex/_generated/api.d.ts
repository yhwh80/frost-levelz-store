/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as albums from "../albums.js";
import type * as auth from "../auth.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as files from "../files.js";
import type * as health from "../health.js";
import type * as maintenance from "../maintenance.js";
import type * as purchases from "../purchases.js";
import type * as seed from "../seed.js";
import type * as stripe from "../stripe.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tracks from "../tracks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  albums: typeof albums;
  auth: typeof auth;
  comments: typeof comments;
  crons: typeof crons;
  email: typeof email;
  files: typeof files;
  health: typeof health;
  maintenance: typeof maintenance;
  purchases: typeof purchases;
  seed: typeof seed;
  stripe: typeof stripe;
  subscriptions: typeof subscriptions;
  tracks: typeof tracks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
