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
  fs.readFile(
    '.joinedChannelIds.json',
    {
      encoding: 'utf-8'
    },
    (error, str) => {
      if (str) {
        try {
          JSON.parse(str).forEach(async (id: string) => {
            await joinVoiceChannel(bot, id, joinedChannels);
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  );
});

bot.on('messageCreate', async msg => {
  const [hotword, action, option] = (msg.content || '').split(' ');
  if (hotword === '!chime') {
    try {
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
          await joinVoiceChannel(bot, voiceChannel.id, joinedChannels, msg.channel as TextChannel);
          break;

        case 'end':
        case 'stop':
          await leaveVoiceChannel(bot, voiceChannel.id, joinedChannels);
          break;

        case 'ring':
        case 'rings':
          const con = joinedChannels.get(voiceChannel.id);
          if (con) {
            con.play(fs.createReadStream(chimeFilePath));
          }
          break;

        default:
          await postUsage(bot, msg.channel.id);
          break;
      }
    } catch (error) {
      console.error(error);
    }
  }
});

bot.on('voiceChannelSwitch', async (member, newChannel, oldChannel) => {
  if (member.id === bot.user.id) {
    console.log(`Switch voice channel from ${oldChannel.name}(${oldChannel.id}) to ${newChannel.name}(${newChannel.id}).`);
    await leaveVoiceChannel(bot, oldChannel.id, joinedChannels);
    try {
      await joinVoiceChannel(bot, newChannel.id, joinedChannels);
    } catch (error) {
      console.error(error);
    }
  }
});

bot.on('error', async (error, id) => {
  console.error(`error shard id: ${id} `, error);
  setTimeout(async () => {
    try {
      await bot.connect();
    } catch (e) {
      console.error(e);
    }
  }, 10 * 1000);
});

new CronJob('0 0 * * * *', () => {
  console.log('Will belling chime.');
  joinedChannels.forEach(connection => {
    try {
      connection.play(fs.createReadStream(chimeFilePath));
    } catch (error) {
      console.error(error);
    }
  });
}).start();

exitHook(() => {
  console.log(`Will terminate bot.`);
  const ids = JSON.stringify(Array.from(joinedChannels.keys()));
  fs.writeFileSync('.joinedChannelIds.json', ids);
  joinedChannels.forEach(async (_, channelId) => {
    console.log(`Auto leave channel(${channelId}).`);
    try {
      await leaveVoiceChannel(bot, channelId, joinedChannels);
    } catch (error) {
      console.error(error);
    }
  });
});

bot.connect();
