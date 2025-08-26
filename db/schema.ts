import { relations } from "drizzle-orm";
import { boolean, pgEnum, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

// Define user role enum
export const userRole = pgEnum("user_role", ["admin", "user"]);

export const user = pgTable("user", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
    // Admin plugin fields
    role: userRole('role').default("user").notNull(),
    // Two-factor fields
    twoFactorEnabled: boolean('two_factor_enabled').$defaultFn(() => false).notNull(),
    twoFactorSecret: text('two_factor_secret'),
    twoFactorBackupCodes: text('two_factor_backup_codes'),
    // Ban fields
    banned: boolean('banned').$defaultFn(() => false).notNull(),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),
});

export const session = pgTable("session", {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    activeOrganizationId: text('active_organization_id'),
    // For impersonation
    impersonatedBy: text('impersonated_by'),
});

export const account = pgTable("account", {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable("verification", {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
});

export const organization = pgTable("organization", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique(),
    logo: text('logo'),
    createdAt: timestamp('created_at').notNull(),
    metadata: text('metadata')
});

export const organizationRelations = relations(organization, ({ many }) => ({
    members: many(member),
    invitations: many(invitation)
}));

export type Organization = typeof organization.$inferSelect;

export const role = pgEnum("role", ["member", "admin", "owner"]);
export type Role = (typeof role.enumValues)[number];

export const member = pgTable("member", {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    role: role('role').default("member").notNull(),
    createdAt: timestamp('created_at').notNull()
});

export const memberRelations = relations(member, ({ one }) => ({
    organization: one(organization, {
        fields: [member.organizationId],
        references: [organization.id]
    }),
    user: one(user, {
        fields: [member.userId],
        references: [user.id]
    })
}));

export type Member = typeof member.$inferSelect & {
    user: typeof user.$inferSelect;
};

export type User = typeof user.$inferSelect;

export const invitation = pgTable("invitation", {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').default("pending").notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    inviterId: text('inviter_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

// Passkey tables
export const passkey = pgTable("passkey", {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    webauthnUserID: text('webauthn_user_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    createdAt: timestamp('created_at').notNull(),
});

// OAuth2 tables for custom OAuth provider
export const oAuthClient = pgTable("oauth_client", {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull().unique(),
    clientSecret: text('client_secret').notNull(),
    name: text('name').notNull(),
    redirectUris: text('redirect_uris').notNull(),
    icon: text('icon'),
    createdAt: timestamp('created_at').notNull(),
});

export const oAuthCode = pgTable("oauth_code", {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    clientId: text('client_id').notNull().references(() => oAuthClient.clientId, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    redirectUri: text('redirect_uri').notNull(),
    scope: text('scope'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
});

// Device Authorization tables
export const deviceCode = pgTable("device_code", {
    id: text('id').primaryKey(),
    deviceCode: text('device_code').notNull().unique(),
    userCode: text('user_code').notNull().unique(),
    clientId: text('client_id'),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').default("pending").notNull(), // pending, approved, denied, expired
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
});

export const schema = { 
    user, 
    session, 
    account, 
    verification, 
    organization, 
    member, 
    invitation, 
    organizationRelations, 
    memberRelations,
    passkey,
    oAuthClient,
    oAuthCode,
    deviceCode
};