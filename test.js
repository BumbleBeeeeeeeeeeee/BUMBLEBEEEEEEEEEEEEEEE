require("dotenv").config()

const { Client, GatewayIntentBits, EmbedBuilder, MessageActionRow, ButtonBuilder, ActionRowBuilder } = require('discord.js');

const queue = new Set();
const maxQueueSize = 1;

let queueEmbedMessageId

const mapImages = {
  'Jungle': '1223027916468785263',
  'Ziggurat': '1223027015582744638',
  'Temple-M': '1223029003217141820',
  'Colosseum': '1223026890613194812',
  'Neden-3': '1223026985702260776',
  'Tunnel': '1223026951955157103',
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

client.on('ready', (c) => {
  console.log(`ready ${c.user.tag} is online`);
});

client.on('messageCreate', async message => {
  if (message.content === '!embed') { // Command to trigger the embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('General Queue V3')
      .addFields(
        { name: 'Game mode', value: 'V3, CPD, 30 minutes', inline: false },
        { name: 'Map Pool', value: [
          `<:Jungle:1223027916468785263> Jungle`,
          `<:Ziggurat:1223027015582744638> Ziggurat`,
          `<:Temple:1223029003217141820> Temple-M`,
          `<:Colosseum:1223026890613194812> Colosseum`,
          `<:Neden3:1223026985702260776> Neden-3`,
          `<:Tunnel:1223028054478291106> Tunnel`,
          `<:Highway:1223026951955157103> Highway`,
          `<:Oldschool:1223028992668598413> OldSchool`
        ].join('\n')
      },
        { name: 'Allowed ranks', value: '<@&1223015446001881229>', inline: false },
        { name: 'Current Queue', value: queue.size + '/' + maxQueueSize, inline: false },
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

    queueEmbedMessageId = sentMessage.id
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  let content = '';
  switch(interaction.customId){
    case "join":
      if (queue.size >= maxQueueSize) {
        content = 'The queue is full. Please try again later.';
        break;
      }
      if (queue.has(interaction.user.id)) {
        content = 'You are already in the queue.';
        break;
      }
      queue.add(interaction.user.id);
      content = 'You have joined the queue.'
      break;
    case "leave":
      if (!queue.has(interaction.user.id)) {
        content = 'You are not in the queue.'
        break;
      }
      queue.delete(interaction.user.id);
      content = 'You have left the queue.'
      break;
  }

  const updatedEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('General Queue V3')
    .addFields(
      { name: 'Game mode', value: 'V3, CPD, 30 minutes', inline: false },
      { name: 'Map Pool', value: [
          `<:Jungle:1223027916468785263> Jungle`,
          `<:Ziggurat:1223027015582744638> Ziggurat`,
          `<:Temple:1223029003217141820> Temple-M`,
          `<:Colosseum:1223026890613194812> Colosseum`,
          `<:Neden:1223026985702260776> Neden-3`,
          `<:Tunnel:1223028054478291106> Tunnel`,
          `<:Highway:1223026951955157103> Highway`,
          `<:Oldschool:1223028992668598413> OldSchool`
        ].join('\n')
      },
      { name: 'Allowed ranks', value: '<@&1223015446001881229>', inline: false },
      { name: 'Current Queue', value: queue.size + '/' + maxQueueSize, inline: false },
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

  // Check if we have a message ID to update
  if (queueEmbedMessageId) {
    try {
      const originalMessage = await interaction.channel.messages.fetch(queueEmbedMessageId);
      await originalMessage.edit({ embeds: [updatedEmbed]});
    } catch (error) {
      console.error("Couldn't fetch or edit the message:", error);
      // Fallback to sending a new message if the original couldn't be fetched or edited
      const sentMessage = await interaction.channel.send({ embeds: [updatedEmbed], components: [row] });queueEmbedMessageId = sentMessage.id; // Update the stored message ID
    }
  } else {
    // If for some reason the message ID wasn't stored, send a new message and storeits ID
    const sentMessage =await interaction.channel.send({embeds: [updatedEmbed], components: [row] });
    queueEmbedMessageId = sentMessage.id;
  }
  await interaction.reply({ content, ephemeral: true });

  console.log(`Button ${interaction.customId} was clicked`);
  // await interaction.update({ embeds: [embed] });
});


client.login(process.env.TOKEN);
