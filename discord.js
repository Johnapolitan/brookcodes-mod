/* eslint-disable new-cap */
/* eslint-disable guard-for-in */
/* eslint-disable require-jsdoc */
/* eslint-disable linebreak-style */
/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('dotenv').config();

// Set your emoji "awards" here
const {Client, GatewayIntentBits} = require('discord.js');
const {guildId, token} = require('./config.json');
const {EmbedBuilder} = require('discord.js');
const perspective = require('./perspective.js');

const emojiMap = {
  'FLIRTATION': '💋',
  'TOXICITY': '🧨',
  'INSULT': '👊',
  'INCOHERENT': '🤪',
  'SPAM': '🐟',
};

const BotIcon = 'https://images-ext-1.discordapp.net/external/vzl3NGWAEK1Te1Gad7T5iMDtCSNZctkSGApvhD6JoxM/https/cdn.discordapp.com/embed/avatars/2.png';

// Store some state about user karma.
// TODO: Migrate to a DB, like Firebase
const users = {};

/**
 * Kick bad members out of the guild
 * @param {user} user - user to kick
 * @param {guild} guild - guild to kick user from
 */
async function kickBaddie(user, guild) {
  if (!user) return;
  try {
    await user.kick('Was a jerk');
  } catch (err) {
    console.log(`Could not kick user ${user.author}: ${err}`);
  }
}

/**
 * Analyzes a user's message for attribues
 * and reacts to it.
 * @param {string} message - message the user sent
 * @return {bool} shouldKick - whether or not we should
 * kick the users
 */
async function evaluateMessage(message) {
  let scores;
  try {
    scores = await perspective.analyzeText(message.content);
  } catch (err) {
    console.log(err);
    return false;
  }

  const userid = message.author.id;

  for (const attribute in emojiMap) {
    if (scores[attribute]) {
      message.react(emojiMap[attribute]);
      users[userid][attribute] =
                users[userid][attribute] ?
                users[userid][attribute] + 1 : 1;
    }
  }
  // Return whether or not we should kick the user
  return (users[userid]['TOXICITY'] > process.env.KICK_THRESHOLD);
}

/**
 * Writes current user scores to the channel
 * @return {string} karma - printable karma scores
 */
function getKarma() {
  const scores = [];
  for (const user in users) {
    if (!Object.keys(users[user]).length) continue;
    let score = `<@${user}> - `;
    for (const attr in users[user]) {
      score += `${emojiMap[attr]} : ${users[user][attr]}\t`;
    }
    scores.push(score);
  }
  console.log(scores);
  if (!scores.length) {
    return '';
  }
  return scores.join('\n');
}

// Create an instance of a Discord client
const client = new Client({intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,]
  });

client.on('ready', () => {
  console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const {commandName} = interaction;

  if (commandName === 'ping') {
    await interaction.reply(`Ping: ${client.ws.ping}ms.`);
  } else if (commandName === 'serverinfo') {
    const exampleEmbed = new EmbedBuilder()
        .setColor('#ffd200')
        .setTitle('Server Info')
        .setThumbnail(BotIcon)
        .addFields(
            {name: 'Creation Date', value: `${interaction.guild.createdAt.toDateString()}`, inline: true},
            {name: 'Owner', value: 'johnb_tch#5577', inline: true},
            {name: 'Member Count', value: `${GetNumberOfMembers()}`, inline: true},
        )
        .setTimestamp()
        .setFooter({text: `Requested by: ${interaction.user.tag}`, iconURL: 'https://cdn.discordapp.com/avatars/' + interaction.user.id + '/' + interaction.user.avatar + '.png'});

    await interaction.reply({embeds: [exampleEmbed]});
  } else if (commandName === 'user') {
    const targetUser = interaction.options.getUser('user');
    const userPfp = 'https://cdn.discordapp.com/avatars/' + targetUser.id + '/' + targetUser.avatar + '.png';
    const member = interaction.guild.members.cache.get(targetUser.id);
    const exampleEmbed = new EmbedBuilder()
        .setColor(targetUser.accentColor || '#ffd200')
        .setTitle(targetUser.tag)
        .setThumbnail(userPfp)
        .addFields(
            {name: 'Registered', value: `${targetUser.createdAt.toDateString()}`, inline: false},
            {name: 'Joined', value: `${member.joinedAt.toDateString()}`, inline: false},
        )
        .setTimestamp()
        .setFooter({text: `Requested by: ${interaction.user.tag}`, iconURL: 'https://cdn.discordapp.com/avatars/' + interaction.user.id + '/' + interaction.user.avatar + '.png'});

    await interaction.reply({embeds: [exampleEmbed]});
  } else if (commandName === 'userid') {
    const targetUser = interaction.options.getUser('user');
    await interaction.reply({content: `${targetUser.id}`, ephemeral: true});
  } else if (commandName === 'karma') {
    const karma = getKarma();
    await interaction.reply(karma ? karma : 'No karma yet!');
  }
});

client.on('messageCreate', async (message) => {
  // Ignore messages that aren't from a guild
  // or are from a bot
  if (!message.guild || message.author.bot) return;
  if (message.content === "") return;

  // If we've never seen a user before, add them to memory
  const userid = message.author.id;
  if (!users[userid]) {
    users[userid] = [];
  }

  // Evaluate attributes of user's message
  let shouldKick = false;
  try {
    shouldKick = await evaluateMessage(message);
  } catch (err) {
    console.log(err);
  }
  if (shouldKick) {
    const member = message.member

    kickBaddie(member, message.guild);
    delete users[message.author.id];
    
    message.channel.send(`Kicked user ${message.author.username} from channel`);
    return;
  }
});


// // Log our bot in using the token from https://discordapp.com/developers/applications/me
// client.login(process.env.DISCORD_TOKEN);
function GetNumberOfMembers() {
  const guild = client.guilds.cache.get(guildId);
  return guild.memberCount;
}

client.login(token);