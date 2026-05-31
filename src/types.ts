import {z} from "zod";

export const ChatMessageSchema = z.object({
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

export const ReloaderMessagesResponseSchema = z.object({
    u_coins: z.string(), // number as string
    coins_addition: z.string(), // number as string
    data: z.array(ChatMessageSchema).default([]),
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>;