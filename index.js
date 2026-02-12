const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits
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

function formatISTTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
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
    ),

  new SlashCommandBuilder()
    .setName('spendtime')
    .setDescription('Admin check total online time of a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

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

    const now = Date.now();
    data[interaction.user.id].start = now;
    data[interaction.user.id].lastOnline = now;

    const timeIST = formatISTTime(now);
    const serverName = interaction.member.displayName;

    return interaction.reply(
      `**🟢 ${serverName} online at ${timeIST} IST**`
    );
  }

  // OFFLINE
  if (command === 'offline') {

    if (!data[interaction.user.id]?.start) {
      return interaction.reply({ content: "You are already offline.", ephemeral: true });
    }

    const now = Date.now();
    const session = now - data[interaction.user.id].start;

    data[interaction.user.id].total += session;
    data[interaction.user.id].start = null;
    data[interaction.user.id].lastOffline = now;

    const timeIST = formatISTTime(now);
    const serverName = interaction.member.displayName;

    return interaction.reply(
      `**🔴 ${serverName} offline at ${timeIST} IST**`
    );
  }

  // TIME REPORT
  if (command === 'time') {

    if (!data[userId] || (!data[userId].lastOnline && data[userId].total === 0)) {
      return interaction.reply("No attendance record found.");
    }

    let total = data[userId].total;

    if (data[userId].start) {
      total += Date.now() - data[userId].start;
    }

    const onlineTime = data[userId].lastOnline
      ? formatISTTime(data[userId].lastOnline)
      : "N/A";

    const offlineTime = data[userId].lastOffline
      ? formatISTTime(data[userId].lastOffline)
      : (data[userId].start ? "Still Online" : "N/A");

    return interaction.reply(
`📊 **Attendance Report – ${targetUser.username}**

Online: ${onlineTime} IST
Offline: ${offlineTime} IST

Total Today: ${formatDuration(total)}`
    );
  }

  // SPENDTIME
  if (command === 'spendtime') {

    const target = interaction.options.getUser('user');
    const targetId = target.id;

    if (!data[targetId]) {
      return interaction.reply("No data found for this user.");
    }

    let total = data[targetId].total;

    if (data[targetId].start) {
      total += Date.now() - data[targetId].start;
    }

    return interaction.reply(
`📊 **SPEND TIME REPORT**

User: <@${targetId}>
Total Online Time: ${formatDuration(total)}`
    );
  }

});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
