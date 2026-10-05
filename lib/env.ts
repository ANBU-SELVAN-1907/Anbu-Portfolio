// Server-only variables. Never import this module from a client component.
// Next.js loads .env.local locally; Vercel supplies deployment environment variables.
export const env = process.env;
