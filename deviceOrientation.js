let latestHandler = null;

export const latestEvent = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  event: null,
};

const requestDeviceOrientation = async () => {
  if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') return;
  try {
    const permission = await DeviceOrientationEvent.requestPermission();
    if (permission === 'granted') {
      console.log('Permission granted');
      window.removeEventListener('deviceorientation', latestHandler, true);
      latestHandler = e => {
        latestEvent.alpha = e.alpha;
        latestEvent.beta = e.beta;
        latestEvent.gamma = e.gamma;
        latestEvent.event = e;
      };
      window.addEventListener('deviceorientation', latestHandler, true);
    }
  } catch (e) {
    console.error('No device orientation permission');
  }
};


export const handleDeviceOrientation = async () => {
  const deviceOrientation = document.getElementById('device-orientation');
  if (deviceOrientation.checked) {
    requestDeviceOrientation().catch(console.error);
  } else {
    window.removeEventListener('deviceorientation', latestHandler, true);
  }
  deviceOrientation.addEventListener('change', async (e) => {
    if (deviceOrientation.checked) {
      requestDeviceOrientation().catch(console.error);
    } else {
      window.removeEventListener('deviceorientation', latestHandler, true);
    }
  });

};