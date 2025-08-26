"use server";

import { db } from "@/db/drizzle";
import { member, organization, invitation } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { getCurrentUser } from "./users";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getOrganizations() {
    const { currentUser } = await getCurrentUser();

    const members = await db.query.member.findMany({
        where: eq(member.userId, currentUser.id),
    });

    const organizations = await db.query.organization.findMany({
        where: inArray(organization.id, members.map((member) => member.organizationId)),
    });

    return organizations;
}

export async function getActiveOrganization(userId: string) {
    const memberUser = await db.query.member.findFirst({
        where: eq(member.userId, userId),
    });

    if (!memberUser) {
        return null;
    }

    const activeOrganization = await db.query.organization.findFirst({
        where: eq(organization.id, memberUser.organizationId),
    });

    return activeOrganization;
}

export async function getOrganizationBySlug(slug: string) {
    try {
        const organizationBySlug = await db.query.organization.findFirst({
            where: eq(organization.slug, slug),
            with: {
                members: {
                    with: {
                        user: true,
                    },
                },
            },
        });

        return organizationBySlug;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getFullOrganization() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return null;
        }

        const activeOrgId = session.session.activeOrganizationId;
        if (!activeOrgId) {
            return null;
        }

        const org = await db.query.organization.findFirst({
            where: eq(organization.id, activeOrgId),
            with: {
                members: {
                    with: {
                        user: true,
                    },
                },
                invitations: true
            },
        });

        return org;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function createOrganization(data: {
    name: string;
    slug?: string;
    logo?: string;
}) {
    try {
        const result = await auth.api.createOrganization({
            body: {
                name: data.name,
                slug: String(data.slug),
                logo: String(data.logo),
            },
            headers: await headers(),
        });

        return result;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create organization");
    }
}

// Helper function to check if user can invite members
export async function canInviteMembers(userId: string, organizationId: string) {
    const membership = await db.query.member.findFirst({
        where: and(
            eq(member.userId, userId),
            eq(member.organizationId, organizationId)
        )
    });

    if (!membership) {
        return false;
    }

    // Only owners and admins can invite members
    return membership.role === 'owner' || membership.role === 'admin';
}

// Helper function to check user's role in organization
export async function getUserRoleInOrganization(userId: string, organizationId: string) {
    const membership = await db.query.member.findFirst({
        where: and(
            eq(member.userId, userId),
            eq(member.organizationId, organizationId)
        )
    });

    return membership?.role || null;
}