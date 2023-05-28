export const getSoundBuffer = (soundFileName) => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", soundFileName, true);
    request.responseType = "arraybuffer";
    request.onload = function (e) {
      resolve(request.response);
    };
    request.send();
  })
}

export const loadAudio = async (soundFileName) => {
  const ctx = new AudioContext();
  const mainVolume = ctx.createGain();
  mainVolume.connect(ctx.destination);
  const sound = {
    source: ctx.createBufferSource(),
    volume: ctx.createGain(),
  }

  sound.source.connect(sound.volume);
  sound.volume.connect(mainVolume);
  sound.source.loop = true;

  const soundBuffer = await getSoundBuffer(soundFileName);
  try {
    sound.buffer = await ctx.decodeAudioData(soundBuffer)
    sound.source.buffer = sound.buffer;
    sound.source.start(ctx.currentTime);
  } catch (e) {
    console.error(e)
  }

  const panner = ctx.createPanner();
  const filter = ctx.createBiquadFilter();

  sound.source.connect(panner);
  panner.connect(filter);
  filter.connect(ctx.destination);

  filter.type = 'peaking';
  filter.frequency.value = 1000;
  filter.gain.value = 25;
  filter.Q.value = 1;


  return [sound, panner];
}