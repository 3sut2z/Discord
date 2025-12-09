const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

const DISCORD_TOKEN = "MTM5NjQ4NjgyMjcxMjA0OTgwNg.GGJ7Sr.s8llK6XNJpAhVTzqYRHSQUJoGLgbrSm5x3UnYQ";
const CLIENT_ID = "1396486822712049806";
const X_BEARER = "AAAAAAAAAAAAAAAAAAAAAIxU5wEAAAAAGQY4qLYosM7%2FwdxG0ovcuYWrG5k%3DGFuaUD3EevCVomsu4lm52slhM2AuwSQVg025kI3fpYLmKVmiir";
const X_USERNAME = "EASFCMOBILE";

// khớp dạng redeem.fcm.ea.com/?redeemCode=XXXX
const REDEEM_PATTERN = /redeem\.fcm\.ea\.com\/\?redeemCode=([A-Z0-9\-]+)/i;

// khớp code "XXXX"
const CODE_PATTERN = /code\s+["']([A-Z0-9\-]{4,64})["']/i;

async function fetchAllTweets() {
    const url =
        `https://api.twitter.com/2/tweets/search/recent?query=from:${X_USERNAME}&max_results=100&tweet.fields=created_at,entities`;
    try {
        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${X_BEARER}` }
        });
        if (!res.data || !res.data.data) return [];
        return res.data.data;
    } catch {
        return [];
    }
}

function extract(tweet) {
    if (tweet.entities && Array.isArray(tweet.entities.urls)) {
        for (const u of tweet.entities.urls) {
            const link = u.expanded_url || "";
            const m = link.match(REDEEM_PATTERN);
            if (m) return { code: m[1], url: `https://redeem.fcm.ea.com/?redeemCode=${m[1]}` };
        }
    }

    const mText = tweet.text.match(REDEEM_PATTERN);
    if (mText) return { code: mText[1], url: `https://redeem.fcm.ea.com/?redeemCode=${mText[1]}` };

    const mCode = tweet.text.match(CODE_PATTERN);
    if (mCode) return { code: mCode[1], url: `https://redeem.fcm.ea.com/?redeemCode=${mCode[1]}` };

    return null;
}

async function registerCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName("code")
            .setDescription("Get all FC Mobile posts containing redeem links or codes")
            .toJSON()
    ];

    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
}

async function main() {
    await registerCommands();

    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== "code") return;

        const tweets = await fetchAllTweets();
        if (tweets.length === 0) {
            await interaction.reply("No data.");
            return;
        }

        const found = [];

        for (const t of tweets) {
            const ex = extract(t);
            if (!ex) continue;

            found.push(
                `Tweet ID: ${t.id}\nCreated: ${t.created_at}\nText: ${t.text}\nCode: ${ex.code}\nRedeem: ${ex.url}`
            );
        }

        if (found.length === 0) {
            await interaction.reply("No redeem posts detected.");
            return;
        }

        await interaction.reply(found.join("\n\n"));
    });

    client.login(DISCORD_TOKEN);
}

main();
