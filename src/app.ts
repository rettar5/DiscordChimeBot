import Eris, { Constants, TextChannel, VoiceChannel, VoiceConnection } from 'eris';
import { joinVoiceChannel, leaveVoiceChannel, postUsage } from './functions';

import { CronJob } from 'cron';
import exitHook from 'exit-hook';
import fs from 'fs';

require('dotenv').config();
// Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
const joinedChannels = new Map<string, VoiceConnection>();

const discordToken = process.env.RETTAR5_DISCORD_CHIME_BOT_TOKEN;
if (!discordToken) {
  console.error('Could not find of discord bot token.\nPlease set environment variables of "RETTAR5_DISCORD_CHIME_BOT_TOKEN".');
  process.exit(1);
}
const chimeFilePath = process.env.RETTAR5_DISCORD_CHIME_BOT_FILE_PATH;
if (!chimeFilePath || !fs.existsSync(chimeFilePath)) {
  console.error('Could not find of chime file.\nPlease check your environment variables of "RETTAR5_DISCORD_CHIME_BOT_FILE_PATH".');
  process.exit(1);
}

const bot = Eris(discordToken, {
  restMode: true
});

bot.on('ready', () => {
  console.log('Ready!');
});

bot.on('messageCreate', async msg => {
  const [hotword, action, option] = (msg.content || '').split(' ');
  if (hotword === '!chime') {
    const channels = await bot.getRESTGuildChannels(msg.guildID);
    const channelName = option || msg.channel['name'];
    const voiceChannel: VoiceChannel = (channels || [])
      .filter(c => Constants.ChannelTypes.GUILD_VOICE === c.type)
      .map(c => c as VoiceChannel)
      .find(c => c.name === channelName);
    console.log(`textChannelId: ${msg.channel.id}, voiceChannelId: ${voiceChannel?.id}, action: ${action}.`);
    if (!voiceChannel) {
      bot.createMessage(msg.channel.id, `ボイスチャンネル「${channelName}」が見つかりませんでした。`);
      return;
    }

    switch (action) {
      case 'start':
        const connection = await joinVoiceChannel(bot, voiceChannel, msg.channel as TextChannel);
        joinedChannels.set(voiceChannel.id, connection);
        break;

      case 'end':
      case 'stop':
        await leaveVoiceChannel(bot, voiceChannel.id);
        joinedChannels.delete(voiceChannel.id);
        break;

      default:
        await postUsage(bot, msg.channel.id);
        break;
    }
  }
});

bot.on('voiceChannelSwitch', async (member, newChannel, oldChannel) => {
  if (member.id === bot.user.id) {
    console.log(`Switch voice channel from ${oldChannel.name}(${oldChannel.id}) to ${newChannel.name}(${newChannel.id}).`);
    joinedChannels.delete(oldChannel.id);
    const connection = await joinVoiceChannel(bot, newChannel);
    joinedChannels.set(newChannel.id, connection);
  }
});

new CronJob('0 0 * * * *', () => {
  console.log('Will belling chime.');
  joinedChannels.forEach(connection => {
    connection.play(fs.createReadStream(chimeFilePath));
  });
}).start();

exitHook(() => {
  console.log(`Will terminate bot.`);
  joinedChannels.forEach(async (_, channelId) => {
    console.log(`Auto leave channel(${channelId}).`);
    await leaveVoiceChannel(bot, channelId);
  });
});

bot.connect();
