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

require("dotenv").config();

// Set your emoji "awards" here
const { Client, GatewayIntentBits } = require("discord.js");
const { guildId, token } = require("./config.json");
const { EmbedBuilder } = require("discord.js");
const perspective = require("./perspective.js");

const emojiMap = {
	"FLIRTATION": "🥰",
	"TOXICITY": "🧨",
	"INSULT": "☠",
	"INCOHERENT": "🤷",
	"SPAM": "🤖",
};

const BotIcon = "https://imgs.search.brave.com/gZqaw4czA4iDONF0af4WKZI8o4zgardMOiuozm0x10k/rs:fit:400:400:1/g:ce/aHR0cHM6Ly9wYnMu/dHdpbWcuY29tL3By/b2ZpbGVfaW1hZ2Vz/Lzk2OTI0NTE5Mzcx/MDA2NzcxNy9xZUN4/X2Fjc180MDB4NDAw/LmpwZw";

const users = {};

/**
 * Kick bad members out of the guild
 * @param {user} user - user to kick
 * @param {guild} guild - guild to kick user from
 */
async function kickBaddie(user, guild) {
	if (!user) return;
	try {
		await user.kick("Was a jerk");
	}
	catch (err) {
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
	}
	catch (err) {
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
	return (users[userid]["TOXICITY"] > process.env.KICK_THRESHOLD);
}

/**
 * Writes current user scores to the channel
 * @return {string} karma - printable karma scores
 */
function getKarma() {
	const scores = [];
	let ToReturn = "";
	for (const user in users) {
		if (!Object.keys(users[user]).length) continue;

		let score = `<@${user}> - `;
		for (const attr in users[user]) {
			score += `${emojiMap[attr]} : ${users[user][attr]}\t`;
		}
		scores.push(score);
	}
	if (!scores.length) {
		return "";
	}
	if (scores.length === 0) {
		ToReturn = "";
	}
	else {
		ToReturn = new EmbedBuilder()
			.setColor("#ffd200")
			.addFields(
				{ name: "Karma Leaderboard", value: `${ scores.join("\n") }` },
			)
			.setTimestamp();
	}
	return ToReturn;
}

// Create an instance of a Discord client
const client = new Client({ intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers],
});

client.on("ready", () => {
	console.log("Ready!");
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === "ping") {
		await interaction.reply(`Ping: ${client.ws.ping}ms.`);
	}
	else if (commandName === "serverinfo") {
		const exampleEmbed = new EmbedBuilder()
			.setColor("#ffd200")
			.setTitle("Server Info")
			.setThumbnail(BotIcon)
			.addFields(
				{ name: "Creation Date", value: `${interaction.guild.createdAt.toDateString()}`, inline: false },
				{ name: "Owner", value: "johnb_tch#5577", inline: false },
				{ name: "Member Count", value: `${getNumberOfMembers()}`, inline: false },
			)
			.setTimestamp()
			.setFooter({ text: `Requested by: ${interaction.user.tag}`, iconURL: "https://cdn.discordapp.com/avatars/" + interaction.user.id + "/" + interaction.user.avatar + ".png" });

		await interaction.reply({ embeds: [exampleEmbed] });
	}
	else if (commandName === "user") {
		const targetUser = interaction.options.getUser("user");
		const userPfp = "https://cdn.discordapp.com/avatars/" + targetUser.id + "/" + targetUser.avatar + ".png";
		const member = interaction.guild.members.cache.get(targetUser.id);
		const exampleEmbed = new EmbedBuilder()
			.setColor(targetUser.accentColor || "#ffd200")
			.setTitle(targetUser.tag)
			.setThumbnail(userPfp)
			.addFields(
				{ name: "Registered", value: `${targetUser.createdAt.toDateString()}`, inline: false },
				{ name: "Joined", value: `${member.joinedAt.toDateString()}`, inline: false },
			)
			.setTimestamp()
			.setFooter({ text: `Requested by: ${interaction.user.tag}`, iconURL: "https://cdn.discordapp.com/avatars/" + interaction.user.id + "/" + interaction.user.avatar + ".png" });

		await interaction.reply({ embeds: [exampleEmbed] });
	}
	else if (commandName === "userid") {
		const targetUser = interaction.options.getUser("user");
		await interaction.reply({ content: `${targetUser.id}`, ephemeral: true });
	}
	else if (commandName === "karma") {
		const karma = getKarma();
		if (typeof (karma) === "string") {
			await interaction.reply("No karma yet!");
		}
		else {
			await interaction.reply({ embeds: [karma] });
		}
	}
});

client.on("messageCreate", async (message) => {
	if (!message.guild || message.author.bot) return;
	if (message.content === "") return;

	const userid = message.author.id;
	if (!users[userid]) {
		users[userid] = [];
	}

	let shouldKick = false;
	try {
		shouldKick = await evaluateMessage(message);
	}
	catch (err) {
		console.log(err);
	}
	if (shouldKick) {
		const member = message.member;

		kickBaddie(member, message.guild);
		delete users[message.author.id];

		message.channel.send(`Kicked user ${message.author.username} from channel`);
		return;
	}
});


function getNumberOfMembers() {
	const guild = client.guilds.cache.get(guildId);
	return guild.memberCount;
}

client.login(token);
