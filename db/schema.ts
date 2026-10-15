import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

// Anonymous ownership is an HttpOnly capability, ready to be linked to an account.
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  providerSubject: text('provider_subject').notNull().unique(),
  createdAt: integer('created_at').notNull(),
});
export const gifts = sqliteTable('gifts', {
  id: text('id').primaryKey(),
  ownerHash: text('owner_hash').notNull(),
  accountId: text('account_id').references(()=>accounts.id),
  payload: text('payload').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table=>[index('gift_owner_created').on(table.ownerHash,table.createdAt),index('gift_expiry').on(table.expiresAt)]);

// Reserved for verified payment-provider webhooks. No public route writes here.
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  accountId: text('account_id').references(()=>accounts.id),
  giftId: text('gift_id').references(()=>gifts.id, {onDelete:'set null'}),
  providerEventId: text('provider_event_id').unique(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('RON'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
});
