const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

let data = {};

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const id = message.author.id;
  const name = message.author.username;

  if (!data[id]) {
    data[id] = { name: name, total: 0, start: null };
  }

  if (message.content === "A!online") {
    if (data[id].start) {
      return message.reply("Tum already online ho.");
    }

    data[id].start = Date.now();
    message.channel.send(`🟢 ${name} active at ${new Date().toLocaleTimeString()}`);
  }

  if (message.content === "A!offline") {
    if (!data[id].start) {
      return message.reply("Tum already offline ho.");
    }

    const end = Date.now();
    const session = end - data[id].start;

    data[id].total += session;
    const startTime = new Date(data[id].start).toLocaleTimeString();
    const endTime = new Date(end).toLocaleTimeString();

    data[id].start = null;

    message.channel.send(
      `🔴 ${name} was online from ${startTime} to ${endTime}\nTotal today: ${formatTime(data[id].total)}`
    );
  }

  if (message.content === "A!leaderboard") {
    const leaderboard = Object.values(data)
      .sort((a, b) => b.total - a.total)
      .map((u, i) => `${i + 1}. ${u.name} - ${formatTime(u.total)}`)
      .join("\n");

    if (!leaderboard) {
      return message.channel.send("No attendance data yet.");
    }

    message.channel.send(`🏆 Today's Attendance Leaderboard 🏆\n\n${leaderboard}`);
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
