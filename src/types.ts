import {z} from "zod";

export const RawChatMessageSchema = z.object({
    id: z.string(), // empty if private
    user: z.string(), // username
    user_id: z.string(), // number as string
    message: z.string(), // message
    time: z.string(), // time in MET, like "10:07"
    privat: z.string(), // private id, 0 if chat is public
    css: z.string(), // legit css string
    priv: z.string(), // often "user" literal
    sex: z.enum(["m", "f", "d", "n"]), // sex, n for user: "System" apparently
    bg: z.string(), // idk
    user_av: z.string(), // idk
    user_medal: z.string(), // idk
    user_medal_title: z.string(), // title of the user medal
})

export type RawChatMessage = z.infer<typeof RawChatMessageSchema>;

export const ChatMessageSchema = RawChatMessageSchema.transform(raw => ({
    id: Number(raw.id),
    author: {
        id: Number(raw.user_id),
        username: raw.user,
        sex: raw.sex,
        avatarUrl: raw.user_av
    },
    timestamp: raw.time,
    visibility:
        raw.privat === "0"
            ? {
                type: "public",
                isPrivate: false
            }
            : {
                type: "private",
                isPrivate: true,
                conversationId: Number(raw.privat),
            },
    content: raw.message.trim(),
    medal: {
        id: raw.user_medal,
        title: raw.user_medal_title,
    },
    style: {
        css: raw.css,
        background: raw.bg
    }
}))

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ReloaderMessagesResponseSchema = z.object({
    u_coins: z.string(), // number as string
    coins_addition: z.string(), // number as string
    data: z.array(RawChatMessageSchema).default([]),
})

export type Gender = "m" | "f" | "d"

