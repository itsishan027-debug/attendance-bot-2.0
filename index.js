const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; 
const GUILD_ID = process.env.GUILD_ID; 

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let data = {};

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Slash Commands Define
const commands = [
  new SlashCommandBuilder()
    .setName('online')
    .setDescription('Mark yourself as active'),

  new SlashCommandBuilder()
    .setName('offline')
    .setDescription('Mark yourself as inactive'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View today’s attendance leaderboard')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// Register Slash Commands
(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const username = interaction.user.username;

  if (!data[userId]) {
    data[userId] = { username: username, total: 0, start: null };
  }

  // ONLINE
  if (interaction.commandName === 'online') {
    if (data[userId].start) {
      return interaction.reply({ content: "You are already active.", ephemeral: true });
    }

    data[userId].start = Date.now();
    return interaction.reply(`🟢 ${username} is now active at ${new Date().toLocaleTimeString()}`);
  }

  // OFFLINE
  if (interaction.commandName === 'offline') {
    if (!data[userId].start) {
      return interaction.reply({ content: "You are already inactive.", ephemeral: true });
    }

    const endTime = Date.now();
    const session = endTime - data[userId].start;

    data[userId].total += session;

    const startTime = new Date(data[userId].start).toLocaleTimeString();
    const endFormatted = new Date(endTime).toLocaleTimeString();

    data[userId].start = null;

    return interaction.reply(
      `🔴 ${username} was active from ${startTime} to ${endFormatted}\nTotal today: ${formatTime(data[userId].total)}`
    );
  }

  // LEADERBOARD
  if (interaction.commandName === 'leaderboard') {
    const leaderboard = Object.values(data)
      .sort((a, b) => b.total - a.total)
      .map((u, i) => `${i + 1}. ${u.username} - ${formatTime(u.total)}`)
      .join("\n");

    if (!leaderboard) {
      return interaction.reply("No attendance data yet.");
    }

    return interaction.reply(`🏆 **Today's Attendance Leaderboard** 🏆\n\n${leaderboard}`);
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
