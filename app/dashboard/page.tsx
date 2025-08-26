import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import UserCard from "@/components/user-card";
import { OrganizationCard } from "@/components/organization-card";

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    const [activeSessions, deviceSessions, organization] = await Promise.all([
        auth.api.listSessions({
            headers: await headers(),
        }),
        auth.api.listDeviceSessions({
            headers: await headers(),
        }),
        auth.api.getFullOrganization({
            headers: await headers(),
        }),
    ]).catch((e) => {
        console.log(e);
        return [[], [], null];
    });

    return (
        <div className="w-full">
            <div className="flex gap-4 flex-col">
                <UserCard
                    session={JSON.parse(JSON.stringify(session))}
                    activeSessions={JSON.parse(JSON.stringify(activeSessions))}
                />
                <OrganizationCard
                    activeOrganization={JSON.parse(JSON.stringify(organization))}
                />
            </div>
        </div>
    );
}