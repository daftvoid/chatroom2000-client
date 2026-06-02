import {
    type ChatMessage,
    type Gender,
    ReloaderMessagesResponseSchema,
    ChatMessageSchema,
    ReloaderUsersResponseSchema, type UserOnline
} from "./types.ts";
import {chromium} from "playwright";
import { EventEmitter } from 'node:events';

export class Chatroom2000Client extends EventEmitter {
    private cookieHeader: string = ""
    private connected = false;

    events: ChatMessage[] = []
    messages: ChatMessage[] = []
    onlineUsers: UserOnline[] = []

    pending: { message: string, privat: string, resolve: Function }[] = []
    rateLimitUntil: number = 0

    rateLimited() {
        return Date.now() < this.rateLimitUntil;
    }

    constructor(public readonly username: string, public readonly gender: Gender) {
        super();
    }

    async connect() {
        if (this.connected) return;
        this.connected = true;

        const browser = await chromium.launch({
            headless: false,
        });

        const page = await browser.newPage();

        await page.goto("https://www.chatroom2000.de/");

        console.log(await page.title());


        const dataStealerAcceptButton = page.locator("button.fc-button.fc-cta-consent")

        await dataStealerAcceptButton.waitFor();
        await dataStealerAcceptButton.click();


        const cookieFirstAcceptButton = page.locator('button[data-cookiefirst-action="accept"]')

        await cookieFirstAcceptButton.waitFor()
        await cookieFirstAcceptButton.click();


        await page.locator('input[name="username"]').fill(this.username);
        await page.locator(`label[for="sex_${this.gender}"]`).click()
        await page.locator('button.loginbutton').click();


        const locator = page.locator("#lay_pw");

        if (await locator.isVisible().catch(() => false)) {
            throw new Error("Error banner is visible");
        }


        await page.waitForURL(/.*\?Chat.*/); // https://www.chatroom2000.de/chat/?Chat

        console.log(await page.title());
        console.log(page.url());

        const cookies = await page.context().cookies();
        console.log(cookies);

        this.cookieHeader = cookies
            .map(c => `${c.name}=${c.value}`)
            .join("; ");

        console.log(this.cookieHeader);

        setInterval(async () => {
            await this.fetchMessages()
        }, 3000)

        setInterval(async () => {
            await this.fetchUsers()
        }, 7000)

        await browser.close();
    }

    private async fetchMessages() {
        const formData = new FormData();

        formData.append("room", "1")

        const msg = this.pending[0];

        if (!this.rateLimited() && msg) {
            formData.append("message", msg.privat !== "" ? `/window: ${msg.message}` : msg.message);
            formData.append("privat", msg.privat)
            formData.append("bold", "normal")
            formData.append("italic", "normal")
            formData.append("color", "")
        }

        const res = await fetch("https://www.chatroom2000.de/chat/?ReloaderMessages", {
            headers: {
                cookie: this.cookieHeader,
                "user-agent": "Mozilla/5.0",
            },
            body: formData,
            method: "POST"
        });

        const raw = await res.json();
        const data = ReloaderMessagesResponseSchema.parse(raw);

        data.data.forEach(rawm => {
            const m = ChatMessageSchema.parse(rawm)

            this.events.push(m);
            this.emit('event', m)

            if (m.author.username === "System") {
                this.emit('system', m)

                if (m.content === "Spam! Hattest du nicht exakt dasselbe vor kurzem geschrieben?") {
                    this.rateLimitUntil = Date.now() + 5000
                } else if (m.content.match(/Du musst noch \d Sek\. bis zur n&auml;chsten Nachricht warten\./)) {
                    this.rateLimitUntil = Date.now() + 3500
                }
            } else if ((m.author.username === this.username) && msg) {
                msg.resolve()
                this.pending.shift()
            }else {
                this.messages.push(m)
                this.emit('message', m)
            }
        })

        return data.data;
    }

    private async fetchUsers() {
        const res = await fetch('https://www.chatroom2000.de/chat/?ReloaderUserOnline', {
            headers: {
                cookie: this.cookieHeader,
                "user-agent": "Mozilla/5.0",
            },
            method: 'POST'
        })

        const raw = await res.json();
        const data = ReloaderUsersResponseSchema.parse(raw);

        this.onlineUsers = data.userOnline;
    }

    async sendMessage(text: string, privat: string = ""): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pending.push({
                message: text, privat: privat, resolve: resolve
            })
        })
    }

    resolveUserId(username: string): string | undefined {
        return this.onlineUsers.find(u => u.user.toLowerCase() === username.toLowerCase())!.user_id ?? undefined
    }

    async sendPrivateMessage(text: string, user: string): Promise<void> {
        const id = this.resolveUserId(user);

        if (!id) throw new Error("Id not found")

        return this.sendMessage(text, id)
    }
}