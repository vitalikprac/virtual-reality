export const getWebcamStream = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      resolve(stream);
    } catch (e) {
      reject(e);
    }
  });
};

export const getWebcamEnabled = () => {
  return document.getElementById('webcam').checked;
};


export const handleWebcam = (video) => {
  const webcam = document.getElementById('webcam');
  webcam.addEventListener('change', async (e) => {
    if (webcam.checked) {
      video.srcObject = await getWebcamStream();
    } else {
      video.srcObject = null;
    }
  });
};

export const createWebcamTexture = (gl) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};