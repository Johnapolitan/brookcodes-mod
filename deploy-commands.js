/* eslint-disable linebreak-style */
const {REST, SlashCommandBuilder, Routes} = require('discord.js');
const {clientId, guildId, token} = require('./config.json');

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('??'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Retrieves information on the server'),
  new SlashCommandBuilder().setName('karma').setDescription('View total karma of all users'),
  new SlashCommandBuilder()
      .setName('user')
      .setDescription('Retries information user provided. ')
      .addUserOption((option) =>
        option.setName('user')
            .setDescription('User to get info on')
            .setRequired(true),
      ),
  new SlashCommandBuilder()
      .setName('userid')
      .setDescription('Retries provided user\'s UserId. ')
      .addUserOption((option) =>
        option.setName('user')
            .setDescription('User to get ID of')
            .setRequired(true),
      ),
].map((command) => command.toJSON());

const rest = new REST({version: '10'}).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: commands})
    .then((data) => console.log(`Successfully registered ${data.length} application commands.`))
    .catch(console.error);
