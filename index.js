const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
require("dotenv").config();

const queue = new Set();
const inGame = new Set();
const maxQueueSize = 6;
let queueNumber = 1;
let channelName = '';
let mentionString = '';
let gamePlayers = [];
let queueEmbedMessageId = '';
let pingedUsers = {}; // Object to keep track of users who have been pinged in the game channel
let gameChannelId = ''; // ID of the game channel
let teamAlpha = [], teamBeta = [];
let turn = 'alpha'; // Keeps track of whose turn it is to pick
let CaptainA = '';
let CaptainB = '';
let picksRequired = { alpha: 1, beta: 2 }; // Number of picks each captain needs to make

const mapImages = {
  'Jungle': '1223027916468785263',
  'Ziggurat': '1223027015582744638',
  'Temple-M': '1223029003217141820',
  'Colosseum': '1223026890613194812',
  'Neden-3': '1223026985702260776',
  'Tunnel': '1223028054478291106',
  'Highway': '1223026951955157103',
  'Old School': '1223028992668598413',
  'Station2': '1223026828944609301'
}
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
function isCaptain(userId) {
  // Check if the user is Captain A or Captain B
  return userId === CaptainA || userId === CaptainB;
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.content === '!embed') {
    message.delete().catch(console.error);

    const embed = new EmbedBuilder()
.setColor('#0099ff')
.setTitle('General Queue V3')
.addFields(
        { name: 'Game mode', value: 'V3, CPD, 30 minutes', inline: false },
        { name: 'Map Pool', value: [
          `<:Jungle:${mapImages['Jungle']}> Jungle`,
          `<:Ziggurat:${mapImages['Ziggurat']}> Ziggurat`,
          `<:Temple:${mapImages['Temple-M']}> Temple-M`,
          `<:Colosseum:${mapImages['Colosseum']}> Colosseum`,
          `<:Neden:${mapImages['Neden-3']}> Neden-3`,
          `<:Tunnel:${mapImages['Tunnel']}> Tunnel`,
          `<:Highway:${mapImages['Highway']}> Highway`,
          `<:Oldschool:${mapImages['Old School']}> OldSchool`
        ].join('\n')
      },
        { name: 'Allowed ranks', value: '<@&1223015446001881229>', inline: false },
        { name: 'Current Queue', value: `${queue.size}/${maxQueueSize}`, inline: false },
      )
.setTimestamp(Date.now())
.setFooter({
        iconURL: client.user.displayAvatarURL(),
        text: client.user.tag,
});

    const row = new ActionRowBuilder()
.addComponents(
        new ButtonBuilder()
.setLabel('Join Queue')
.setCustomId('join')
.setStyle('Primary'),
        new ButtonBuilder()
.setLabel('Leave Queue')
.setCustomId('leave')
.setStyle('Danger'),
      );

    const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

    queueEmbedMessageId = sentMessage.id;
  } else if (message.content.startsWith('!p') && message.channel.id === gameChannelId) {
    handlePickCommand(message);
  }
});

async function handlePickCommand(message) {
  // Check if the author of the message is a captain and it's their turn
  if (!isCaptain(message.author.id)) {
    await message.reply("You're not a captain.");
    return;
  }

  if (!isTurn(message.author.id)) {
    await message.reply("It's not your turn to pick.");
    return;
  }

  const mentionedUsers = message.mentions.users.map(user => user.id);
  if (turn === 'alpha') {
    teamAlpha.push(...mentionedUsers);
    turn = 'beta';
  } else if (turn === 'beta') {
    teamBeta.push(...mentionedUsers);
    if (gamePlayers.length > 1) {
      // Assign the last remaining player to Team Alpha
      const remainingPlayers = gamePlayers.filter(player =>!mentionedUsers.includes(player));
      teamAlpha.push(remainingPlayers[0]);
    }
turn = 'alpha';
  }

  // Remove picked players from the gamePlayers array
  gamePlayers = gamePlayers.filter(player =>!mentionedUsers.includes(player));

  // Update the embed with the current teams and available players
  await updateGameEmbed(message.channel);
}

function isCaptain(userId) {
  // Check if the user is a captain of either team
  const isAlphaCaptain = teamAlpha[0] === userId;
  const isBetaCaptain = teamBeta[0] === userId;
  return isAlphaCaptain || isBetaCaptain;
}

function isTurn(userId) {
  // Check if it's the correct team's turn based on the team captain
  if (turn === 'alpha' && teamAlpha[0] === userId) {
    return true;
  } else if (turn === 'beta' && teamBeta[0] === userId) {
    return true;
  }
  return false;
}

async function updateGameEmbed(channel) {
  const embed = new EmbedBuilder()
   .setColor('#0099ff')
   .setTitle(`Game ${queueNumber} - General Queue V3`)
   .setDescription('Start Picking!')
   .addFields(
      { name: 'Team Alpha', value: teamAlpha.map(id => `<@${id}>`).join('\n'), inline: true },
      { name: 'Team Beta', value: teamBeta.map(id => `<@${id}>`).join('\n'), inline: true },
      { name: 'Remaining players', value: gamePlayers.map(id => `<@${id}>`).join('\n'), inline: false },
      { name: 'Current Pick', value: `It's <@${turn === 'alpha'? teamAlpha[0] : teamBeta[0]}>` + `'s turn to pick.`, inline: false }
    )
   .setTimestamp(Date.now())
   .setFooter({
      iconURL: client.user.displayAvatarURL(),
      text: client.user.tag,
    });
  try {
    const originalMessage = await channel.messages.fetch(queueEmbedMessageId);
    await originalMessage.edit({ embeds: [embed] });
  } catch (error) {
    console.error("Couldn't fetch or edit the message:", error);
  }
}

const categoryID = '1223090438865424424';

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  let content = '';
  switch (interaction.customId) {
    case "join":
      if (queue.size >= maxQueueSize) {
        content = 'The queue is full. Please try again later.';
        break;
      }

      // Check if the user has been mentioned in the game channel
      if (pingedUsers[interaction.user.id]) {
        content = `You have already been pinged in the game channel for this queue. You cannot join the queue again until the channel is deleted.`;
        break;
      }

      queue.add(interaction.user.id);
      gamePlayers = Array.from(queue);
      content = 'You have joined the queue.';
      break;
    case "leave":
      if (!queue.has(interaction.user.id)) {
        content = 'You are not in the queue.';
        break;
      }

      queue.delete(interaction.user.id);
      gamePlayers = Array.from(queue);
      content = 'You have left the queue.';
      break;
  }

  if (queue.size === maxQueueSize) {
    channelName = `Game-${queueNumber}`;
    mentionString = gamePlayers.map(player => `<@${player}>`).join(', ');

    // Select two random captains from the queue
    const shuffledPlayers = Array.from(queue).sort(() => Math.random() - 0.5);
    CaptainA = shuffledPlayers[0]; // Assigning the first captain
    CaptainB = shuffledPlayers[1]; // Assigning the second captain

    // Mention players in the channel creation message
    interaction.guild.channels.create({
        name: channelName,
        type: 0,parent: categoryID, // 'GAMES' category id
        topic: mentionString, // Mentioning players in the channel topic
        position: 0
    }).then(channel => {
      // Mention players in the channel creation message
      const captainAnnouncement = `Captain A: <@${CaptainA}>\nCaptain B: <@${CaptainB}>`;
      channel.send(captainAnnouncement); // This line sends the announcement message
      channel.send(`Game started. Players: ${mentionString}
${new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Game ${queueNumber}-General Queue V3`)
      .setDescription('Start Picking!')
      .addFields(
          { name: 'Team Alpha', value: `<@${captains[0]}>`, inline: true },
          { name: 'Team Beta', value: `<@${captains[1]}>`, inline: true },
          { name: 'Remaining players', value: gamePlayers.filter(player =>!captains.includes(player)).map(player => `<@${player}>`).join(', '), inline: false },
          { name: 'Current Pick', value: `${interaction.guild.members.cache.get(captains[0])}, use the =p command to pick 1 player`, inline: false }
        )
      .setTimestamp(Date.now())
     .setFooter({iconURL: client.user.displayAvatarURL(),
        text: client.user.tag,
    })}`);
        // Update pingedUsers object
        gamePlayers.forEach(player => {
          pingedUsers[player] = channel.id;
        });
        // Set the gameChannelId variable
        gameChannelId = channel.id;

        // Create the embed
        const embed = new EmbedBuilder()
         .setColor('#0099ff')
         .setTitle(`Game ${queueNumber}-General Queue V3`)
         .setDescription('Start Picking!')
         .addFields(
            { name: 'Team Alpha', value: `<@${captains[0]}>`, inline: true },
            { name: 'Team Beta', value: `<@${captains[1]}>`, inline: true },
            { name: 'Remaining players', value: gamePlayers.filter(player =>!captains.includes(player)).map(player => `<@${player}>`).join(', '), inline: false },
            { name: 'Current Pick', value: `${interaction.guild.members.cache.get(captains[0])}, use the =p command to pick 1 player`, inline: false }
          );

        // Send the embed
        channel.send({ embeds: [embed] });
    });

    queueNumber++;
    // Clear the queue
    queue.clear();
  }

  // Check if the user has been pinged in the game channel
  if (pingedUsers[interaction.user.id]) {
    content = `You are already in a game.`;
  }

  const updatedEmbed = new EmbedBuilder()
   .setColor('#0099ff')
   .setTitle('General Queue V3')
   .addFields(
        { name: 'Game mode', value: 'V3, CPD, 30 minutes', inline: false },
        { name: 'Map Pool', value: [
          `<:Jungle:${mapImages['Jungle']}> Jungle`,
          `<:Ziggurat:${mapImages['Ziggurat']}> Ziggurat`,
          `<:Temple:${mapImages['Temple-M']}> Temple-M`,
          `<:Colosseum:${mapImages['Colosseum']}> Colosseum`,
          `<:Neden:${mapImages['Neden-3']}> Neden-3`,
          `<:Tunnel:${mapImages['Tunnel']}> Tunnel`,
          `<:Highway:${mapImages['Highway']}> Highway`,
          `<:Oldschool:${mapImages['Old School']}> OldSchool`
        ].join('\n')
      },
        { name: 'Allowed ranks', value: '<@&1223015446001881229>', inline: false },
        { name: 'Current Queue', value: `${queue.size}/${maxQueueSize}`, inline: false },
      )
.setTimestamp(Date.now())
   .setFooter({
          iconURL: client.user.displayAvatarURL(),
          text: client.user.tag,
      });

  const row = new ActionRowBuilder()
   .addComponents(
          new ButtonBuilder()
          .setLabel('Join Queue')
          .setCustomId('join')
          .setStyle('Primary'),
          new ButtonBuilder()
          .setLabel('Leave Queue')
          .setCustomId('leave')
          .setStyle('Danger'),
    );

  if(queueEmbedMessageId) {
    try {
      const originalMessage = await interaction.channel.messages.fetch(queueEmbedMessageId);
      if (originalMessage) {
        await originalMessage.edit({ embeds: [updatedEmbed]});
      } else {
        console.error("Couldn't fetch the message:", error);
      }
    } catch (error) {
      console.error("Couldn't fetch or edit the message:", error);
    }
  } else {
    const sentMessage = await interaction.channel.send({ embeds: [updatedEmbed], components: [row] });
    queueEmbedMessageId = sentMessage.id;
  }
  await interaction.reply({ content, ephemeral: true });

  console.log(`Button ${interaction.customId} was clicked`);
});

// Listen for game channel deletions
client.on('channelDelete', deletedChannel => {
  if (deletedChannel.parentId === categoryID && deletedChannel.id === gameChannelId) {
    // Clear the pingedUsers object when the game channel is deleted
    pingedUsers = {};
    gameChannelId = '';

    // Reset the queue if the game channel was deleted
    queue.clear();
    queueNumber = 1;
    queueEmbedMessageId = '';
    gamePlayers = [];
  }
});

client.login(process.env.TOKEN);