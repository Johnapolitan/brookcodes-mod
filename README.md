# Hackathon Submission

Main code is located in the `discord.js` file.

## Prompt:  
Hate Speech (Advanced Challenge); 
Develop a project that either tracks, analyzes, or actively combats hate speech online, and raises awareness about the issue.

## Description:
A Discord bot developed to monitor users' messages and ensure that all messages are moderated. This bot was set up using the Discord.JS npm package and the NodeJS server runtime. The bot actively monitors all chat messages sent and analyzes each message using Google's Perspective API. Perspective is a free API that uses machine learning to identify toxic comments. A score is returned from the API and an emoji reaction is applied to the message using the `message.react()` method from the Discord.JS library, indicating what type of toxic message it is, if appropriate. Inappropriate messages are categorized into one of the following groups: flirtatious 🥰, insulting ☠, incoherent 🤷, toxic 💣, or spam 🤖. The bot counts how many inappropriate messages users send and increases the `karma` property associated with each user, creating a leaderboard for human moderators to view. If the user `karma` accrued surpasses a certain amount, the user will be muted and prevented from typing.

###  `evaluateMessage()`

This function is responsible for relaying user messages to the Perspective API and applying an appropriate emoji in response.

```javascript
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
	// Return whether or not we should mute the user
	return (users[userid]["TOXICITY"] > process.env.MUTE_THRESHOLD);
}
```
