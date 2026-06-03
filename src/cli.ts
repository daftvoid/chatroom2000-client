import blessed from "blessed";
import {Chatroom2000Client} from "./core.ts";
import type {ChatMessage, Gender} from "./types.ts";

interface Conversation {
    id: string;
    messages: string[];
    unread: number;
}

interface AccountState {
    client: Chatroom2000Client;
    conversations: Map<string, Conversation>;
}

interface UIState {
    activeAccount: string;
    activeConversation: string;
}

const accounts = new Map<string, AccountState>();

const ui: UIState = {
    activeAccount: "",
    activeConversation: "public",
};


console.log = () => {}


const screen = blessed.screen({
    smartCSR: true,
});

const accountsList = blessed.list({
    top: 0,
    left: 0,
    width: 20,
    height: "100%",
    border: "line",
    padding: 0,
    alwaysScroll: true,
})

const chatsList = blessed.list({
    top: 0,
    left: 20,
    width: 20,
    height: "100%",
    border: "line",
    padding: 0,
    alwaysScroll: true,
})

const messagesLog = blessed.log({
    top: 0,
    left: 40,
    width: "100%-40",
    height: "100%-3",
    border: "line",
    padding: 0,
    alwaysScroll: true,
});

const input = blessed.textbox({
    bottom: 0,
    left: 40,
    height: 3,
    width: "100%-40",
    border: "line",
    inputOnFocus: true,
});




function getConversation(
    account: AccountState,
    id: string
): Conversation {
    let conv = account.conversations.get(id);

    if (!conv) {
        conv = {
            id,
            messages: [],
            unread: 0,
        };

        account.conversations.set(id, conv);
    }

    return conv;
}


async function addClient(
    username: string,
    gender: Gender
) {
    const client = new Chatroom2000Client(
        username,
        gender
    );

    await client.connect();

    const state: AccountState = {
        client,
        conversations: new Map([
            [
                "public",
                {
                    id: "public",
                    messages: [],
                    unread: 0,
                },
            ],
        ]),
    };

    accounts.set(username, state);

    client.on("message", (message: ChatMessage) => {
        handleIncomingMessage(
            username,
            message
        );
    });

    if (!ui.activeAccount) {
        ui.activeAccount = username;
    }

    render();
}

function handleIncomingMessage(
    accountName: string,
    message: ChatMessage
) {
    const account = accounts.get(accountName);

    if (!account) return;

    const conversationId =
        message.visibility.isPrivate
            ? message.author.username
            : "public";

    const conversation = getConversation(
        account,
        conversationId
    );

    conversation.messages.push(
        `${message.timestamp} ${message.author.username} (${message.author.sex}): ${message.content}`
    );

    const isActive =
        ui.activeAccount === accountName &&
        ui.activeConversation ===
        conversationId;

    if (!isActive) {
        conversation.unread++;
    }

    render();
}


function renderAccounts() {
    const items: string[] = [];

    for (const username of accounts.keys()) {
        const marker = username === ui.activeAccount ? "> " : "  ";
        items.push(`${marker}${username}`);
    }

    accountsList.setItems(items as any);
}

function renderChats() {
    const account = accounts.get(ui.activeAccount);
    if (!account) return;

    const items: string[] = [];

    for (const conv of account.conversations.values()) {
        const marker = conv.id === ui.activeConversation ? "> " : "  ";
        const unread = conv.unread > 0 ? ` (${conv.unread})` : "";
        items.push(`${marker}${conv.id}${unread}`);
    }

    chatsList.setItems(items as any);
}

function renderMessages() {
    messagesLog.setContent("");

    const account =
        accounts.get(ui.activeAccount);

    if (!account) return;

    const conversation = account.conversations.get(ui.activeConversation);

    if (!conversation) return;

    conversation.unread = 0;

    for (const msg of conversation.messages.slice(conversation.messages.length - 100)) {
        messagesLog.add(msg);
    }
}

function render() {
    renderAccounts();
    renderChats();
    renderMessages();
    screen.render();
}

async function handleCommand(
    text: string
) {
    const [cmd, ...args] = text.slice(1).split(/\s+/);

    switch (cmd) {
        case "account": {
            const username = args.join(' ');

            if (username && accounts.has(username)) {
                ui.activeAccount = username;
                ui.activeConversation = "public";
            }

            break;
        }

        case "chat": {
            const username = args.join(' ');

            if (!username) break;

            const account = accounts.get(ui.activeAccount);

            if (!account) break;

            getConversation(account, username);

            ui.activeConversation = username;

            break;
        }

        case "public": {
            ui.activeConversation = "public";
            break;
        }

        case "addaccount": {
            const username = args.join(' ');
            const gender = args[1] as Gender;

            if (
                username &&
                gender
            ) {
                await addClient(username, gender);
            }

            break;
        }

        case "help": {
            messagesLog.add("/addaccount <user> <gender>");
            messagesLog.add("/account <user>");
            messagesLog.add("/chat <user>");
            messagesLog.add("/public");
            break;
        }
    }

    render();
}



input.on(
    "submit",
    async (text: string) => {
        text = text.trim();

        input.clearValue();
        input.focus();

        if (text.startsWith("/")) {
            await handleCommand(text);

            return;
        }

        const account = accounts.get(ui.activeAccount);

        if (!account) return;

        const conversationId = ui.activeConversation;

        try {
            if (conversationId === "public") {
                await account.client.sendMessage(text);
            } else {
                await account.client.sendPrivateMessage(text, conversationId);
            }

            const conversation = getConversation(account, conversationId);

            conversation.messages.push(`You: ${text}`);
        } catch (err) {
            messagesLog.add(String(err));
        }

        render();
    }
);

input.key("enter", () => {
    input.submit();
});

screen.key(["q", "C-c"], () => process.exit(0));
input.key(["C-c"], () => process.exit(0));

screen.append(accountsList);
screen.append(chatsList);
screen.append(messagesLog);
screen.append(input);

screen.render();

input.focus()





await addClient(
    "Cailea_22C",
    "f"
);
