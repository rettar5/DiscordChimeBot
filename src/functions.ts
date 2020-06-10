import Eris = require('eris');

export function joinVoiceChannel(
  bot: Eris.Client,
  voiceChannel: Eris.AnyGuildChannel,
  msg: Eris.Message<Eris.TextableChannel>
): Promise<Eris.VoiceConnection> {
  return new Promise((_res, _rej) => {
    bot
      .joinVoiceChannel(voiceChannel.id)
      .then(connection => {
        console.log(`Joined to voice channel to ${voiceChannel.name}(${voiceChannel.id}).`);
        _res(connection);
      })
      .catch(error => {
        console.error(`Could not join to voice channel ${voiceChannel.name}(${voiceChannel.id}).`, error);
        bot.createMessage(msg.channel.id, `ボイスチャンネル接続時にエラーが発生しました。\n${error?.message}`);
        _rej(error);
      });
  });
}

export function leaveVoiceChannel(bot: Eris.Client, channelId: string): Promise<void> {
  return new Promise((_res, _rej) => {
    bot.leaveVoiceChannel(channelId);
    _res();
  });
}

export function postUsage(bot: Eris.Client, channelId: string): Promise<void> {
  return new Promise((_res, _rej) => {
    bot.createMessage(channelId, `Usage: !chime (start|end) [Optional]チャンネル名`);
    _res();
  });
}
