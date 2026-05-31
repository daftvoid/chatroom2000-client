import { chromium } from "playwright";
import {ReloaderMessagesResponseSchema} from "./types.ts";
import {green} from "./colors.ts";

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


await page.locator('input[name="username"]').fill(`Lena_${crypto.randomUUID().slice(0,3)}`);
await page.locator('label[for="sex_f"]').click()
await page.locator('button.loginbutton').click();


await page.waitForURL(/.*\?Chat.*/); // https://www.chatroom2000.de/chat/?Chat
console.log(await page.title());
console.log(page.url());

const cookies = await page.context().cookies();
console.log(cookies);


const cookieHeader = cookies
    .map(c => `${c.name}=${c.value}`)
    .join("; ");

console.log(cookieHeader);

await browser.close();



const messages = []

while (true) {
    const res = await fetch("https://www.chatroom2000.de/chat/?ReloaderMessages", {
        headers: {
            cookie: cookieHeader,
            "user-agent": "Mozilla/5.0"
        },
    });

    const raw = await res.json();
    const data = ReloaderMessagesResponseSchema.parse(raw);

    data.data.map(m => {
        console.log(`${m.user}: ${m.message}` + (m.privat !== "0" ? green("(privat)") : ""));
    })

    await new Promise(resolve => setTimeout(resolve, 2000));
}

