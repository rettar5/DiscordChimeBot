import Eris = require('eris');

export function joinVoiceChannel(
  bot: Eris.Client,
  voiceChannelId: string,
  joinedChannels: Map<string, Eris.VoiceConnection>,
  textChannel?: Eris.TextChannel,
  reconnectDelay: number = 10
): Promise<Eris.VoiceConnection> {
  return new Promise((_res, _rej) => {
    bot
      .joinVoiceChannel(voiceChannelId)
      .then(connection => {
        console.log(`Joined to voice channel ${voiceChannelId}.`);
        joinedChannels.set(voiceChannelId, connection);
        const reconnect = () => {
          removeConnectionListeners(connection);
          setTimeout(() => {
            joinedChannels.delete(voiceChannelId);
            joinVoiceChannel(bot, voiceChannelId, joinedChannels, textChannel, reconnectDelay + 10);
          }, reconnectDelay * 1000);
        };
        connection.once('error', error => {
          console.error('connection error ', error);
          reconnect();
        });
        connection.once('disconnect', error => {
          console.warn('disconnect voice channel ', error);
          reconnect();
        });
        _res(connection);
      })
      .catch(error => {
        console.error(`Could not join to voice channel ${voiceChannelId}.`, error);
        _rej(error);
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
