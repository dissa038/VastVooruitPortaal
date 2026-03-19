/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addresses from "../addresses.js";
import type * as adviseurProfiles from "../adviseurProfiles.js";
import type * as appointments from "../appointments.js";
import type * as clientFlows from "../clientFlows.js";
import type * as communications from "../communications.js";
import type * as companies from "../companies.js";
import type * as contacts from "../contacts.js";
import type * as costMutations from "../costMutations.js";
import type * as documents from "../documents.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as intermediaries from "../intermediaries.js";
import type * as invoices from "../invoices.js";
import type * as lib_auth from "../lib/auth.js";
import type * as makelaarPortal from "../makelaarPortal.js";
import type * as nieuwbouw from "../nieuwbouw.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as projects from "../projects.js";
import type * as quotes from "../quotes.js";
import type * as timeEntries from "../timeEntries.js";
import type * as trackAndTrace from "../trackAndTrace.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addresses: typeof addresses;
  adviseurProfiles: typeof adviseurProfiles;
  appointments: typeof appointments;
  clientFlows: typeof clientFlows;
  communications: typeof communications;
  companies: typeof companies;
  contacts: typeof contacts;
  costMutations: typeof costMutations;
  documents: typeof documents;
  emailTemplates: typeof emailTemplates;
  intermediaries: typeof intermediaries;
  invoices: typeof invoices;
  "lib/auth": typeof lib_auth;
  makelaarPortal: typeof makelaarPortal;
  nieuwbouw: typeof nieuwbouw;
  notifications: typeof notifications;
  orders: typeof orders;
  products: typeof products;
  projects: typeof projects;
  quotes: typeof quotes;
  timeEntries: typeof timeEntries;
  trackAndTrace: typeof trackAndTrace;
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
