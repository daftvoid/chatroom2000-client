import { chromium } from "playwright";
import {ReloaderMessagesResponseSchema} from "./types.ts";
import {green} from "./colors.ts";
import {Chatroom2000Client} from "./core.ts";


const suffix = crypto.randomUUID()
    .replace(/[^a-z]/gi, "")
    .slice(0, 3);

const username = `Lena_${suffix}`;

const client = new Chatroom2000Client(username, "f")

await client.connect();

client.sendMessage("hiii").then(r => console.log("message sent"))

while (true) {
    const msgs = await client.fetchMessages()

    msgs.map(m => {
        console.log(`${m.user}: ${m.message}` + (m.privat !== "0" ? " " + green("(privat)") : ""));
    })

    await new Promise(resolve => setTimeout(resolve, 2000));
}

