import { createAccessControl } from "better-auth/plugins/access";

const statement = {
    // Organization permissions
    organization: ["create", "read", "update", "delete", "invite_member", "remove_member"],
    // Member permissions
    member: ["read", "invite", "remove"],
    // Project permissions (you can add more as needed)
    project: ["create", "read", "update", "delete"],
} as const;

const ac = createAccessControl(statement);

// Member role - basic permissions
const member = ac.newRole({
    organization: ["read"],
    member: ["read"],
    project: ["create", "read"],
});

// Admin role - can manage organization and members
const admin = ac.newRole({
    organization: ["read", "update", "invite_member", "remove_member"],
    member: ["read", "invite", "remove"],
    project: ["create", "read", "update", "delete"],
});

// Owner role - full permissions
const owner = ac.newRole({
    organization: ["create", "read", "update", "delete", "invite_member", "remove_member"],
    member: ["read", "invite", "remove"],
    project: ["create", "read", "update", "delete"],
});

export { ac, admin, member, owner, statement };