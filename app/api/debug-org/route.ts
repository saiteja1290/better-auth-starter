// Create this as app/api/debug-org/route.ts to debug the issue

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { user, member, organization } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
    try {
        // Get current session
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "No session" });
        }

        // Get user from database
        const currentUser = await db.query.user.findFirst({
            where: eq(user.id, session.user.id)
        });

        // Get all memberships
        const memberships = await db.query.member.findMany({
            where: eq(member.userId, session.user.id),
            with: {
                organization: true
            }
        });

        // Get active organization
        const activeOrgId = session.session.activeOrganizationId;
        let activeMembership = null;

        if (activeOrgId) {
            activeMembership = await db.query.member.findFirst({
                where: and(
                    eq(member.userId, session.user.id),
                    eq(member.organizationId, activeOrgId)
                ),
                with: {
                    organization: true
                }
            });
        }

        // Get full organization with members
        let fullOrg = null;
        if (activeOrgId) {
            fullOrg = await auth.api.getFullOrganization({
                headers: await headers(),
            });
        }

        return NextResponse.json({
            session: {
                userId: session.user.id,
                email: session.user.email,
                activeOrgId: activeOrgId
            },
            currentUser,
            memberships,
            activeMembership,
            fullOrg,
            debug: {
                hasActiveOrg: !!activeOrgId,
                membershipRole: activeMembership?.role,
                canInvite: activeMembership?.role === 'owner' || activeMembership?.role === 'admin'
            }
        });

    } catch (error) {
        console.error("Debug error:", error);
        return NextResponse.json({ 
            error: "Debug failed", 
        }, { status: 500 });
    }
}