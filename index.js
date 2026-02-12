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

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatIST(timestamp) {
  return new Date(timestamp).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

const commands = [
  new SlashCommandBuilder()
    .setName('online')
    .setDescription('Mark yourself as online'),

  new SlashCommandBuilder()
    .setName('offline')
    .setDescription('Mark yourself as offline'),

  new SlashCommandBuilder()
    .setName('time')
    .setDescription('Check attendance report')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user')
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error(error);
  }
})();

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userId = targetUser.id;

  if (!data[userId]) {
    data[userId] = {
      total: 0,
      start: null,
      lastOnline: null,
      lastOffline: null
    };
  }

  // ONLINE
  if (command === 'online') {

    if (data[interaction.user.id]?.start) {
      return interaction.reply({ content: "You are already online.", ephemeral: true });
    }

    data[interaction.user.id].start = Date.now();
    data[interaction.user.id].lastOnline = Date.now();

    return interaction.reply(
      `**🟢 <@${interaction.user.id}> is now ONLINE**`
    );
  }

  // OFFLINE
  if (command === 'offline') {

    if (!data[interaction.user.id]?.start) {
      return interaction.reply({ content: "You are already offline.", ephemeral: true });
    }

    const end = Date.now();
    const session = end - data[interaction.user.id].start;

    data[interaction.user.id].total += session;
    data[interaction.user.id].start = null;
    data[interaction.user.id].lastOffline = end;

    return interaction.reply(
      `**🔴 <@${interaction.user.id}> is now OFFLINE**`
    );
  }

  // TIME REPORT
  if (command === 'time') {

    if (!data[userId] || (!data[userId].lastOnline && data[userId].total === 0)) {
      return interaction.reply("No attendance record found.");
    }

    const onlineTime = data[userId].lastOnline
      ? formatIST(data[userId].lastOnline)
      : "N/A";

    const offlineTime = data[userId].lastOffline
      ? formatIST(data[userId].lastOffline)
      : (data[userId].start ? "Still Online" : "N/A");

    return interaction.reply(
`📊 **Attendance Report – ${targetUser.username}**

Online: ${onlineTime}
Offline: ${offlineTime}

Total Today: ${formatDuration(data[userId].total)}`
    );
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
