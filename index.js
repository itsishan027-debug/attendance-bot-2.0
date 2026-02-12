const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
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

const commands = [
  new SlashCommandBuilder().setName('online').setDescription('Mark yourself as active'),
  new SlashCommandBuilder().setName('offline').setDescription('Mark yourself as inactive'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View today’s attendance leaderboard')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const member = interaction.member;
  const userId = interaction.user.id;
  const username = member.displayName;
  const roleColor = member.displayHexColor === "#000000"
    ? 0x2b2d31
    : member.displayHexColor;

  if (!data[userId]) {
    data[userId] = { username: username, total: 0, start: null };
  }

  // ONLINE
  if (interaction.commandName === 'online') {
    if (data[userId].start) {
      return interaction.reply({ content: "You are already active.", ephemeral: true });
    }

    data[userId].start = Date.now();

    const embed = new EmbedBuilder()
      .setColor(roleColor)
      .setTitle("🟢 Attendance Started")
      .setDescription(`<@${userId}> is now active`)
      .addFields(
        { name: "Start Time", value: new Date().toLocaleTimeString(), inline: true }
      )
      .setFooter({ text: "Aries Attendance System" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // OFFLINE
  if (interaction.commandName === 'offline') {
    if (!data[userId].start) {
      return interaction.reply({ content: "You are already inactive.", ephemeral: true });
    }

    const endTime = Date.now();
    const session = endTime - data[userId].start;
    data[userId].total += session;

    const embed = new EmbedBuilder()
      .setColor(roleColor)
      .setTitle("🔴 Attendance Ended")
      .setDescription(`<@${userId}> is now inactive`)
      .addFields(
        { name: "Session Time", value: formatTime(session), inline: true },
        { name: "Total Today", value: formatTime(data[userId].total), inline: true }
      )
      .setFooter({ text: "Aries Attendance System" })
      .setTimestamp();

    data[userId].start = null;

    return interaction.reply({ embeds: [embed] });
  }

  // LEADERBOARD
  if (interaction.commandName === 'leaderboard') {
    const sorted = Object.values(data)
      .sort((a, b) => b.total - a.total);

    if (sorted.length === 0) {
      return interaction.reply("No attendance data yet.");
    }

    const description = sorted
      .map((u, i) => `**${i + 1}.** ${u.username} — ${formatTime(u.total)}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🏆 Today's Attendance Leaderboard")
      .setDescription(description)
      .setFooter({ text: "Aries Clan Activity Board" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
