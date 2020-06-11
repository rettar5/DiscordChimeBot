import Eris = require('eris');

export function joinVoiceChannel(
  bot: Eris.Client,
  voiceChannelId: string,
  joinedChannels: Map<string, Eris.VoiceConnection>,
  textChannel?: Eris.TextChannel
): Promise<Eris.VoiceConnection> {
  return new Promise((_res, _rej) => {
    bot
      .joinVoiceChannel(voiceChannelId)
      .then(connection => {
        console.log(`Joined to voice channel ${voiceChannelId}.`);
        joinedChannels.set(voiceChannelId, connection);
        const reconnect = () => {
          setTimeout(() => {
            joinedChannels.delete(voiceChannelId);
            joinVoiceChannel(bot, voiceChannelId, joinedChannels, textChannel);
          }, 1000);
        };
        connection.on('error', error => {
          console.error('connection error ', error);
          reconnect();
        });
        connection.on('disconnect', error => {
          console.warn('disconnect voice channel ', error);
          reconnect();
        });
        _res(connection);
      })
      .catch(error => {
        console.error(`Could not join to voice channel ${voiceChannelId}.`, error);
        if (textChannel?.id) {
          bot.createMessage(textChannel.id, `ボイスチャンネル接続時にエラーが発生しました。\n${error?.message}`);
        }
        _rej(error);
      });
  });
}

export function leaveVoiceChannel(bot: Eris.Client, channelId: string, joinedChannels: Map<string, Eris.VoiceConnection>): Promise<void> {
  return new Promise((_res, _rej) => {
    bot.leaveVoiceChannel(channelId);
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
