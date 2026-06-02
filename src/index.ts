import { chromium } from "playwright";
import {type ChatMessage, ReloaderMessagesResponseSchema} from "./types.ts";
import {green} from "./colors.ts";
import {Chatroom2000Client} from "./core.ts";


const suffix = crypto.randomUUID()
    .replace(/[^a-z]/gi, "")
    .slice(0, 3);

const username = `Kiara_${suffix}`;

const client = new Chatroom2000Client(username, "f")

await client.connect();

// client.sendMessage("<span><img src=\"smilies/79.png\" width=\"99px\" height=\"67px\"></span>").then(r => console.log("message sent"))

client.sendMessage('hi').then(r => console.log("message sent"))

client.on('message', (msg: ChatMessage) => {
    if (!msg.visibility.isPrivate) return;

    console.log(`${msg.author.username}: ${msg.content}`)
})