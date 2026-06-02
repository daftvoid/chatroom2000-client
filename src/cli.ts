import blessed from "blessed";
import {Chatroom2000Client} from "./core.ts";
import type {ChatMessage} from "./types.ts";

console.log = () => {}

const client = new Chatroom2000Client(`Cailea_22${crypto.randomUUID().replace(/[^a-z]/gi, '').slice(0,2)}`, 'f');

client.connect();

const screen = blessed.screen({
    smartCSR: true,
});

const messages = blessed.log({
    top: 0,
    left: 0,
    width: "100%",
    height: "100%-3",
    border: "line",
    padding: 0,
    alwaysScroll: true,
});

const input = blessed.textbox({
    bottom: 0,
    height: 3,
    width: "100%",
    border: "line",
    inputOnFocus: true,
});

input.on("submit", (text: string) => {
    if (text.trim() === "") {
        return;
    }

    if (text.startsWith("@")) {
        const [ rawuser, ...rawmessage ] = text.split(' ')

        const user = rawuser!.slice(1)
        const message = rawmessage.join(' ')

        client.sendPrivateMessage(message, user).then(() => {
            messages.add(`\x1b[36mYou\x1b[0m -> \x1b[32m${user}\x1b[0m: ${message}`)
        }).catch(() => {
            messages.add(`\x1b[30mUser: ${user} does not exist.\x1b[0m`)
        })
    } else {
        client.sendMessage(text).then(() => {
            messages.add(`\x1b[36mYou\x1b[0m -> \x1b[32m*\x1b[0m: ${text}`)
        })
    }

    input.clearValue();
    screen.render();
    input.focus();
});

input.key("enter", () => {
    input.submit();
});

screen.key(["q", "C-c"], () => process.exit(0));
input.key(["C-c"], () => process.exit(0));

screen.append(messages);
screen.append(input);

screen.render();

input.focus()


client.on('message', (message: ChatMessage) => {
    if (message.visibility.isPrivate || message.author.username === client.username) {
        messages.add(`${message.timestamp} \x1b[32m${message.author.username}\x1b[0m (${message.author.sex}): ${message.content}`)
    }

})