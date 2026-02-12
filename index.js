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

  const userId = message.author.id;
  const username = message.author.username;

  if (!data[userId]) {
    data[userId] = { username: username, total: 0, start: null };
  }

  // ONLINE COMMAND
  if (message.content === "A!online") {
    if (data[userId].start) {
      return message.reply("You are already marked as active.");
    }

    data[userId].start = Date.now();
    message.channel.send(`🟢 ${username} is now active at ${new Date().toLocaleTimeString()}`);
  }

  // OFFLINE COMMAND
  if (message.content === "A!offline") {
    if (!data[userId].start) {
      return message.reply("You are already marked as inactive.");
    }

    const endTime = Date.now();
    const sessionTime = endTime - data[userId].start;

    data[userId].total += sessionTime;

    const startTimeFormatted = new Date(data[userId].start).toLocaleTimeString();
    const endTimeFormatted = new Date(endTime).toLocaleTimeString();

    data[userId].start = null;

    message.channel.send(
      `🔴 ${username} was active from ${startTimeFormatted} to ${endTimeFormatted}.\nTotal active time today: ${formatTime(data[userId].total)}`
    );
  }

  // LEADERBOARD COMMAND
  if (message.content === "A!leaderboard") {
    const leaderboard = Object.values(data)
      .sort((a, b) => b.total - a.total)
      .map((user, index) => `${index + 1}. ${user.username} - ${formatTime(user.total)}`)
      .join("\n");

    if (!leaderboard) {
      return message.channel.send("No attendance data available yet.");
    }

    message.channel.send(`🏆 **Today's Attendance Leaderboard** 🏆\n\n${leaderboard}`);
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
