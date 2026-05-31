import {type ChatMessage, type Gender, ReloaderMessagesResponseSchema} from "./types.ts";
import {chromium} from "playwright";

export class Chatroom2000Client {
    private cookieHeader: string = ""
    messages: ChatMessage[] = []
    pending: { message: string, privat: string, resolve: Function }[] = []
    rateLimitUntil: number = 0

    rateLimited() {
        return Date.now() < this.rateLimitUntil;
    }

    constructor(private name: string, private gender: Gender) {
    }

    async connect() {
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


        await page.locator('input[name="username"]').fill(this.name);
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

        await browser.close();
    }

    async fetchMessages() {
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

        data.data.forEach(m => {
            this.messages.push(m);

            if (m.user === "System") {
                if (m.message === "Spam! Hattest du nicht exakt dasselbe vor kurzem geschrieben?") {
                    this.rateLimitUntil = Date.now() + 5000
                } else if (m.message.match(/Du musst noch \d Sek\. bis zur n&auml;chsten Nachricht warten\./)) {
                    this.rateLimitUntil = Date.now() + 3500
                }

                if (!this.rateLimited() && msg) {
                    msg.resolve()
                }
            }
        })

        return data.data;
    }

    async sendMessage(text: string, privat: string = ""): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pending.push({
                message: text, privat: privat, resolve: resolve
            })
        })
    }
}