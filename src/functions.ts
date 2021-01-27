import Eris = require('eris');
require('dotenv').config();
const chimeVolume: number = (() => {
  const str = process.env.RETTAR5_DISCORD_CHIME_BOT_VOLUME;
  try {
    const num = parseFloat(str);
    if (isNaN(num) || num < 0 || 2 < num) {
      throw Error('Invalid chime volume, Please set RETTAR5_DISCORD_CHIME_BOT_VOLUME in 0 < x < 2.');
    }
    return num;
  } catch (e) {
    console.warn(e);
    return 1;
  }
})();

export function joinVoiceChannel(
  bot: Eris.Client,
  voiceChannelId: string,
  joinedChannels: Map<string, Eris.VoiceConnection>,
  textChannel?: Eris.TextChannel,
  reconnectDelay: number = 10
): Promise<Eris.VoiceConnection> {
  return new Promise((_res, _rej) => {
    const reconnect = (connection?: Eris.VoiceConnection) => {
      if (connection) {
        removeConnectionListeners(connection);
      }
      setTimeout(() => {
        joinedChannels.delete(voiceChannelId);
        joinVoiceChannel(bot, voiceChannelId, joinedChannels, textChannel, reconnectDelay + 10);
      }, reconnectDelay * 1000);
    };
    bot
      .joinVoiceChannel(voiceChannelId)
      .then(connection => {
        console.log(`Joined to voice channel ${voiceChannelId}.`);
        joinedChannels.set(voiceChannelId, connection);
        connection.setVolume(chimeVolume);

        connection.on('error', error => {
          console.error(`connection error ${voiceChannelId}.`, error);
        });
        connection.on('disconnect', error => {
          console.warn(`disconnect voice channel ${voiceChannelId}.`, error);
        });
        _res(connection);
      })
      .catch(error => {
        console.error(`Could not join to voice channel ${voiceChannelId}.`, error);
        if (100 < reconnectDelay) {
          _rej(error);
          return;
        }
        reconnect();
      });
  });
}

export function leaveVoiceChannel(bot: Eris.Client, channelId: string, joinedChannels: Map<string, Eris.VoiceConnection>): Promise<void> {
  return new Promise((_res, _rej) => {
    bot.leaveVoiceChannel(channelId);
    const connection = joinedChannels.get(channelId);
    if (connection) {
      removeConnectionListeners(connection);
    }
    joinedChannels.delete(channelId);
    _res();
  });
}

export function postUsage(bot: Eris.Client, channelId: string): Promise<void> {
  return new Promise((_res, _rej) => {
    bot.createMessage(channelId, `Usage: !chime (start|end|rings) [Optional]チャンネル名`);
    _res();
  });
}

function removeConnectionListeners(connection: Eris.VoiceConnection) {
  connection.removeAllListeners('error');
  connection.removeAllListeners('disconnect');
}
