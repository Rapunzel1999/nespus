import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const users=sqliteTable('users',{
  id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull(),
  phone:text('phone'),phoneHash:text('phone_hash').unique(),phoneVerifiedAt:integer('phone_verified_at'),
  status:text('status').notNull().default('active'),createdAt:integer('created_at').notNull(),
});
export const listings=sqliteTable('listings',{
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull().references(()=>users.id),
  title:text('title').notNull(),transaction:text('transaction').notNull(),type:text('type').notNull(),
  city:text('city').notNull().default('Cluj-Napoca'),district:text('district').notNull(),
  price:real('price').notNull(),currency:text('currency').notNull(),area:real('area').notNull(),rooms:integer('rooms').notNull(),
  description:text('description').notNull(),photos:text('photos').notNull(),exactAddress:text('exact_address').notNull().default(''),
  relationship:text('relationship').notNull(),rentDeposit:real('rent_deposit'),rentCosts:text('rent_costs').notNull().default(''),monthlyCosts:real('monthly_costs'),
  status:text('status').notNull().default('draft'),ownershipStatus:text('ownership_status').notNull().default('declared'),
  acceptsContacts:integer('accepts_contacts').notNull().default(1),contactHours:text('contact_hours').notNull().default(''),
  riskSignals:text('risk_signals').notNull().default('[]'),moderationReason:text('moderation_reason').notNull().default(''),
  createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),availableUntil:integer('available_until'),
},t=>[index('listing_feed').on(t.status,t.availableUntil),index('listing_owner').on(t.ownerId)]);
export const favorites=sqliteTable('favorites',{
  userId:text('user_id').notNull().references(()=>users.id),listingId:text('listing_id').notNull().references(()=>listings.id),
},t=>[uniqueIndex('favorite_pair').on(t.userId,t.listingId)]);
export const declarations=sqliteTable('declarations',{
  id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),kind:text('kind').notNull(),
  version:text('version').notNull(),listingId:text('listing_id').notNull().references(()=>listings.id),
  acceptedAt:integer('accepted_at').notNull(),textSnapshot:text('text_snapshot').notNull(),
});
export const contactRequests=sqliteTable('contact_requests',{
  id:text('id').primaryKey(),listingId:text('listing_id').notNull().references(()=>listings.id),
  requesterId:text('requester_id').notNull().references(()=>users.id),ownerId:text('owner_id').notNull().references(()=>users.id),
  purpose:text('purpose').notNull(),status:text('status').notNull().default('requested'),
  phoneShared:integer('phone_shared').notNull().default(0),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),
},t=>[uniqueIndex('contact_pair').on(t.listingId,t.requesterId),index('contact_owner').on(t.ownerId)]);
export const messages=sqliteTable('messages',{
  id:text('id').primaryKey(),conversationId:text('conversation_id').notNull().references(()=>contactRequests.id),
  senderId:text('sender_id').notNull().references(()=>users.id),body:text('body').notNull(),createdAt:integer('created_at').notNull(),
},t=>[index('messages_conversation').on(t.conversationId,t.createdAt)]);
export const blocks=sqliteTable('blocks',{
  blockerId:text('blocker_id').notNull().references(()=>users.id),blockedId:text('blocked_id').notNull().references(()=>users.id),createdAt:integer('created_at').notNull(),
},t=>[uniqueIndex('blocked_pair').on(t.blockerId,t.blockedId)]);
export const reports=sqliteTable('reports',{
  id:text('id').primaryKey(),reporterId:text('reporter_id').notNull().references(()=>users.id),
  listingId:text('listing_id').references(()=>listings.id),conversationId:text('conversation_id').references(()=>contactRequests.id),
  reason:text('reason').notNull(),details:text('details').notNull(),status:text('status').notNull().default('open'),
  decisionReason:text('decision_reason').notNull().default(''),createdAt:integer('created_at').notNull(),
});
export const appeals=sqliteTable('appeals',{
  id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),reportId:text('report_id').references(()=>reports.id),
  reason:text('reason').notNull(),status:text('status').notNull().default('open'),decisionReason:text('decision_reason').notNull().default(''),createdAt:integer('created_at').notNull(),
});
export const auditEvents=sqliteTable('audit_events',{
  id:text('id').primaryKey(),actorId:text('actor_id').notNull(),action:text('action').notNull(),targetId:text('target_id').notNull(),
  reason:text('reason').notNull().default(''),createdAt:integer('created_at').notNull(),
},t=>[index('audit_target_action_time').on(t.targetId,t.action,t.createdAt)]);
export const phoneChallenges=sqliteTable('phone_challenges',{
  userId:text('user_id').primaryKey().references(()=>users.id),phone:text('phone').notNull(),providerSid:text('provider_sid').notNull(),expiresAt:integer('expires_at').notNull(),
});
export const rateLimits=sqliteTable('rate_limits',{
  key:text('key').primaryKey(),hits:integer('hits').notNull(),expiresAt:integer('expires_at').notNull(),
});
export const viewings=sqliteTable('viewings',{
  id:text('id').primaryKey(),conversationId:text('conversation_id').notNull().references(()=>contactRequests.id),
  proposedBy:text('proposed_by').notNull().references(()=>users.id),startsAt:integer('starts_at').notNull(),status:text('status').notNull().default('requested'),createdAt:integer('created_at').notNull(),
});

export const savedSearches=sqliteTable('saved_searches',{
  id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),
  queryJson:text('query_json').notNull(),seenEvent:integer('seen_event').notNull(),createdAt:integer('created_at').notNull(),
},t=>[uniqueIndex('saved_search_pair').on(t.userId,t.queryJson)]);
export const editorDrafts=sqliteTable('editor_drafts',{
  userId:text('user_id').primaryKey().references(()=>users.id),payload:text('payload').notNull(),
  revision:integer('revision').notNull(),updatedAt:integer('updated_at').notNull(),
});
