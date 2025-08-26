import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";

import OrganizationInvitationEmail from "@/components/emails/organization-invitation";
import ForgotPasswordEmail from "@/components/emails/reset-password";
import VerifyEmail from "@/components/emails/verify-email";
import { getActiveOrganization } from "@/server/organizations";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { 
    organization, 
    twoFactor,
    admin,
    multiSession,
    bearer,
    openAPI,
    oAuthProxy
} from "better-auth/plugins";
import { Resend } from "resend";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const auth = betterAuth({
    appName: "Better Auth Starter",
    baseURL: process.env.BETTER_AUTH_URL,
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            await resend.emails.send({
                from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
                to: user.email,
                subject: "Verify your email",
                react: VerifyEmail({ username: user.name, verifyUrl: url }),
            });
        },
        sendOnSignUp: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
            await resend.emails.send({
                from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
                to: user.email,
                subject: "Reset your password",
                react: ForgotPasswordEmail({ 
                    username: user.name, 
                    resetUrl: url, 
                    userEmail: user.email 
                }),
            });
        },
        requireEmailVerification: false
    },
    databaseHooks: {
        session: {
            create: {
                before: async (session) => {
                    const organization = await getActiveOrganization(session.userId)
                    return {
                        data: {
                            ...session,
                            activeOrganizationId: organization?.id
                        }
                    }
                }
            }
        }
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    plugins: [
        // Simplified organization plugin - no custom permissions
        organization({
            async sendInvitationEmail(data) {
                const inviteLink = `${process.env.BETTER_AUTH_URL}/accept-invitation/${data.id}`

                await resend.emails.send({
                    from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
                    to: data.email,
                    subject: "You've been invited to join our organization",
                    react: OrganizationInvitationEmail({
                        email: data.email,
                        invitedByUsername: data.inviter.user.name,
                        invitedByEmail: data.inviter.user.email,
                        teamName: data.organization.name,
                        inviteLink
                    })
                })
            }
            // Remove the roles and ac configuration for now - use defaults
        }),
        
        // Two Factor Authentication
        twoFactor({
            otpOptions: {
                async sendOTP({ user, otp }) {
                    await resend.emails.send({
                        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
                        to: user.email,
                        subject: "Your OTP Code",
                        html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
                    });
                },
            },
        }),
        
        // Passkey authentication

        
        // Admin plugin
        admin({
            adminUserIds: [
                // Add your admin user IDs here after first signup
            ],
        }),
        
        // Multi-session support
        multiSession(),
        
        // Bearer token support for API
        bearer(),
        
        // OpenAPI documentation
        openAPI(),
        
        // OAuth proxy
        oAuthProxy(),
        
        // Device authorization

        
        // Next.js cookies
        nextCookies()
    ]
});