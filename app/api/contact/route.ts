import {
  store,
  response,
  sameOrigin,
  jsonBody,
  limited,
  track,
} from "@/lib/server";
import { z } from "zod";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(200).optional(),
  analytics: z.boolean().optional(),
});
export async function POST(r: Request) {
  try {
    if (!sameOrigin(r))
      return response(
        { error: "Please send your message from this website." },
        403,
      );
    if (await limited(r, "contact", 5, 3600))
      return response(
        { error: "Too many messages. Please try again later or use email." },
        429,
      );
    const b = schema.safeParse(await jsonBody(r, 12000));
    if (!b.success)
      return response(
        {
          error:
            "Please enter your name, valid email, and a message of at least 10 characters.",
        },
        400,
      );
    if (b.data.website) return response({ ok: true });
    const id = crypto.randomUUID();
    await store.set("messages", id, {
      id,
      name: b.data.name,
      email: b.data.email,
      message: b.data.message,
      created: new Date().toISOString(),
      read: 0,
    });
    if (b.data.analytics) await track("contacts").catch(console.error);
    return response({ ok: true });
  } catch (e) {
    console.error(e);
    return response(
      {
        error: "Your message was not sent. Please retry or email me directly.",
      },
      503,
    );
  }
}
