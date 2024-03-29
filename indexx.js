require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

let queueCount = 0; // Initialize the counter
let queueNumber = 1; // Initialize the queue number

client.on('ready', (c) => {
    console.log(`ready ${c.user.tag} is online`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'embed') {
        let joinButton = new ButtonBuilder()
            .setCustomId('join')
            .setLabel('Join queue')
            .setStyle('Primary'); 

        let leaveButton = new ButtonBuilder()
            .setCustomId('leave')
            .setLabel('Leave queue')
            .setStyle('Danger'); 

        let row = new ActionRowBuilder()
            .addComponents(joinButton, leaveButton);

        const mapList = [
            { name: '<:Jungle:1223027916468785263> Jungle', value: ' ', inline: false },
            { name: '<:Ziggurat:1223027015582744638> Ziggurat', value: ' ', inline: false },
            { name: '<:Temple:1223029003217141820> Temple', value: ' ', inline: false },
            { name: '<:Colosseum:1223026890613194812> Colosseum', value: ' ', inline: false },
            { name: '<:Neden3:1223026985702260776> Neden3', value: ' ', inline: false },
            { name: '<:Tunnel:1223028054478291106> Tunnel', value: ' ', inline: false },
            { name: '<:Highway:1223026951955157103> Highway', value: ' ', inline: false },
            { name: '<:Oldschool:1223028992668598413> Oldschool', value: ' ', inline: false },
            { name: '<:Station2:1223026828944609301> Station2', value: ' ', inline: false },
            { name: '<:Cyberion:1223027758381404302> Cyberion', value: ' ', inline: false },
        ];

        const embed = new EmbedBuilder()
            .setTitle("General Queue V3")
            .setDescription("V3, CPD, 30 minutes")
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp(Date.now())
            .setFooter({
                iconURL: client.user.displayAvatarURL(),
                text: client.user.tag,
            })
            .setColor('Blue')
            .addFields(
                { name: 'Allowed Ranks:', value: '\u200B<@&1223015446001881229> ', inline: true },
                
                ...mapList,
                { name: 'Current queue', value: `${queueCount}/1`, inline: false } // Add the queue count to the embed
            );
        interaction.reply({ embeds: [embed], components: [row] });
    }
});

const categoryId = '1223090438865424424';

// Create a set to store the IDs of the users in the queue
let queue = new Set();
let queueIsFull = false;

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'join') {
        // Check if the user is already in the queue
        if (queue.has(interaction.user.id)) {
            return await interaction.reply({ content: 'You are already in the queue.', ephemeral: true });
        }

        if (queue.size >= 1 || queueIsFull) {
            return await interaction.reply({ content: 'The queue is already full.', ephemeral: true });
        }

        // Add the user to the queue
        queue.add(interaction.user.id);
        queueCount++; // Increment the queue counter

        await interaction.reply({ content: 'You have joined the queue.', ephemeral: true });

        if (queue.size === 1) {
            // Create a new channel in the 'Games' category
            let channelName = `Game-${queueNumber}`;
            console.log(`Creating new channel: ${channelName}`);
            if (!channelName || typeof channelName !== 'string') {
                console.error('Channel name is not defined or not a string');
                return;
            }
            interaction.guild.channels.create({
                name: channelName,
                type: 0,
                parent: categoryId, // 'GAMES' category id
            })
            .then(channel => {
                console.log(`Created new channel ${channel.name} in category ${channel.parent.id}`);
                queueNumber++;

                // Set queue as full
                queueIsFull = true;

                // Reset the queue after 1 second
                setTimeout(() => {
                    queue.clear();
                    queueIsFull = false;
                    queueCount = 0; // Reset the queue counter
                }, 1000);
            })
            .catch(error => {
                console.error(`Failed to create channel: ${error}`);
            });
        }
    } else if (interaction.customId === 'leave') {
        // Remove the user from the queue
        if (queue.delete(interaction.user.id)) {
            queueCount--; // Decrement the queue counter
        }

        await interaction.reply({ content: 'You have left the queue.', ephemeral: true });
    }
});

client.on('messageCreate', async (message) => {
    if (message.content === '/queue') {
        await message.reply(`Current queue: ${queueCount}/1`); // Add the /queue command
    }
});
client.login(process.env.TOKEN);