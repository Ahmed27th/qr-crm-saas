import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.string(), // The clerk user ID or unique identifier
    name: v.string(),
    description: v.string(),
    coverImage: v.string(),
    logo: v.string(),
    aboutInfo: v.optional(v.string()),
    aboutImage: v.optional(v.string()),
    openingHours: v.optional(v.string()),
    googleReviewUrl: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  menu: defineTable({
    restaurantId: v.string(),
    category: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    image: v.string(),
    available: v.boolean(),
    popular: v.optional(v.boolean()),
    calories: v.optional(v.number()),
    allergens: v.optional(v.array(v.string())),
    ingredients: v.optional(v.string()),
  }).index("by_restaurantId", ["restaurantId"]),

  orders: defineTable({
    restaurantId: v.string(),
    table: v.string(),
    items: v.number(),
    total: v.number(),
    status: v.string(), // pending, preparing, ready, delivered, cancelled
    source: v.string(), // qr, ubereats, glovo
    orderItems: v.array(v.object({
      name: v.string(),
      qty: v.number(),
      price: v.number(),
    })),
    driverId: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerAddress: v.optional(v.string()),
    deliveryInstructions: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_restaurantId", ["restaurantId"]),

  staff: defineTable({
    restaurantId: v.string(),
    name: v.string(),
    role: v.string(),
    createdAt: v.number(),
  }).index("by_restaurantId", ["restaurantId"]),

  drivers: defineTable({
    restaurantId: v.string(),
    name: v.string(),
    status: v.string(), // available, busy, offline
    phone: v.string(),
    activeOrders: v.number(),
  }).index("by_restaurantId", ["restaurantId"]),

  reservations: defineTable({
    restaurantId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    guests: v.number(),
    status: v.string(), // pending, confirmed, cancelled
    createdAt: v.number(),
  }).index("by_restaurantId", ["restaurantId"])
    .index("by_restaurantId_date", ["restaurantId", "date"]),

  reviews: defineTable({
    restaurantId: v.string(),
    rating: v.number(),
    comment: v.string(),
    userName: v.optional(v.string()),
    status: v.string(), // pending, published_google, internal_resolved
    createdAt: v.number(),
  }).index("by_restaurantId", ["restaurantId"]),

  driverLocations: defineTable({
    driverId: v.string(),
    lat: v.number(),
    lng: v.number(),
    updatedAt: v.number(),
  }).index("by_driverId", ["driverId"]),

  subscriptions: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    planId: v.string(), // 'starter' | 'pro' | 'ultimate'
    billingPeriod: v.string(), // 'monthly' | 'yearly'
    status: v.string(), // 'active' | 'cancelled' | 'expired' | 'past_due'
    lemonSqueezyOrderId: v.optional(v.string()),
    lemonSqueezySubscriptionId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_lemonSqueezyOrderId", ["lemonSqueezyOrderId"])
    .index("by_lemonSqueezySubscriptionId", ["lemonSqueezySubscriptionId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  }).index("by_userId", ["userId"]),
});
