/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as devices from "../devices.js";
import type * as driverLocations from "../driverLocations.js";
import type * as drivers from "../drivers.js";
import type * as http from "../http.js";
import type * as menu from "../menu.js";
import type * as orders from "../orders.js";
import type * as profiles from "../profiles.js";
import type * as push from "../push.js";
import type * as reservations from "../reservations.js";
import type * as reviews from "../reviews.js";
import type * as staff from "../staff.js";
import type * as stripe from "../stripe.js";
import type * as subscriptionConfig from "../subscriptionConfig.js";
import type * as subscriptions from "../subscriptions.js";
import type * as testSubscriptions from "../testSubscriptions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  devices: typeof devices;
  driverLocations: typeof driverLocations;
  drivers: typeof drivers;
  http: typeof http;
  menu: typeof menu;
  orders: typeof orders;
  profiles: typeof profiles;
  push: typeof push;
  reservations: typeof reservations;
  reviews: typeof reviews;
  staff: typeof staff;
  stripe: typeof stripe;
  subscriptionConfig: typeof subscriptionConfig;
  subscriptions: typeof subscriptions;
  testSubscriptions: typeof testSubscriptions;
  users: typeof users;
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
