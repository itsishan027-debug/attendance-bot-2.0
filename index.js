const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== EXPRESS SERVER (24/7 KEEP ALIVE) =====
app.get("/", (req, res) => {
  res.send("Bot is running 24/7 🚀");
});

app.listen(PORT, () => console.log("Web server started on port " + PORT));

// ===== DISCORD BOT CONFIG =====
const TOKEN = process.env.TOKEN;

// ✅ Your Server & Channel IDs
const TARGET_SERVER_ID = "1434084048719843420";
const TARGET_CHANNEL_ID = "1471509183215173664";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== DATA STORAGE =====
let data = {};

function saveData() {
  fs.writeFileSync("./attendance.json", JSON.stringify(data, null, 2));
}

function loadData() {
  if (fs.existsSync("./attendance.json")) {
    data = JSON.parse(fs.readFileSync("./attendance.json"));
  }
}

loadData();

// ===== TIME FORMAT =====
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// ===== MAIN ATTENDANCE SYSTEM (ROLE-FREE) =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Server + Channel check
  if (!message.guild || message.guild.id !== TARGET_SERVER_ID) return;
  if (message.channel.id !== TARGET_CHANNEL_ID) return;

  const content = message.content.trim();
  const userId = message.author.id;

  if (!data[userId]) {
    data[userId] = { total: 0, start: null };
  }

  // ===== ONLINE =====
  if (/^online$/i.test(content)) {
    await message.delete().catch(() => {});

    if (data[userId].start) return;

    data[userId].start = Date.now();
    saveData();

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(`🟢 <@${userId}> is now **ONLINE**`)
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  // ===== OFFLINE =====
  if (/^offline$/i.test(content)) {
    await message.delete().catch(() => {});

    if (!data[userId].start) return;

    const session = Date.now() - data[userId].start;
    data[userId].total += session;
    data[userId].start = null;

    saveData();

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription(
        `🔴 <@${userId}> is now **OFFLINE**\n\n` +
        `Session: ${formatDuration(session)}\n` +
        `Total: ${formatDuration(data[userId].total)}`
      )
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  // ===== LEADERBOARD =====
  if (/^leaderboard$/i.test(content)) {
    await message.delete().catch(() => {});

    const sorted = Object.entries(data)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    let leaderboard = "";
    sorted.forEach((user, index) => {
      leaderboard += `**${index + 1}.** <@${user[0]}> - ${formatDuration(user[1].total)}\n`;
    });

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle("🏆 Top 10 Attendance Leaderboard")
      .setDescription(leaderboard || "No data available.")
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
});

// ===== CRASH PROTECTION =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ===== LOGIN =====
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
