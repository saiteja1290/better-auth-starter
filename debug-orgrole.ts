// Add this to your dashboard page temporarily to debug
// Place this in your dashboard page component to check your roles

"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { member, organization, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function debugUserRole() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return { error: "No session" };
        }

        console.log("Current user:", session.user.id, session.user.email);

        // Check if user is admin (global)
        const userData = await db.query.user.findFirst({
            where: eq(user.id, session.user.id)
        });
        
        console.log("User data:", userData);

        // Check organization memberships
        const memberships = await db.query.member.findMany({
            where: eq(member.userId, session.user.id),
            with: {
                organization: true
            }
        });

        console.log("User memberships:", memberships);

        // Check active organization
        const activeOrgId = session.session.activeOrganizationId;
        console.log("Active organization ID:", activeOrgId);

        if (activeOrgId) {
            const activeMembership = await db.query.member.findFirst({
                where: and(
                    eq(member.userId, session.user.id),
                    eq(member.organizationId, activeOrgId)
                )
            });
            console.log("Active membership:", activeMembership);
        }

        return {
            user: userData,
            memberships,
            activeOrgId,
            session: session.user
        };
    } catch (error) {
        console.error("Debug error:", error);
        return { error: "Debug failed" };
    }
}