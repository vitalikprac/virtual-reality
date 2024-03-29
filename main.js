import './style.css';
import './utils/m4.js';
import fragmentShaderSource from './fragmentShader.glsl';
import vertexShaderSource from './vertexShader.glsl';
import { TrackballRotator } from './utils/trackball-rotator.js';
import { getValueById, renderControls } from './controls.js';
import { createWebcamTexture, getWebcamEnabled, handleWebcam } from './webcam.js';
import { handleDeviceOrientation, latestEvent } from './deviceOrientation.js';
import { handleFilterChange, loadAudio } from "./audio.js";

const deg2rad = (deg) => deg * Math.PI / 180;

let gl;                         // The webgl context.
let surface;                    // A surface model
let background;
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let texture, webcamTexture;
let video;
let audio;
let panner;
let sphere;
let deviceOrientation;
let step = 0;
let sphereCoordinates = [0, 0, 0]

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices, textureList) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureList), gl.STREAM_DRAW);

    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);

    this.count = vertices.length / 3;
  };
  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
  
  this.DrawSphere = function () {
    this.Draw();
    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
  }
}

// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  this.iAttribVertex = -1;
  this.iTextureCoords = -1;
  this.iTextureUnit = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function draw() {
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const eyeSeparation = getValueById('eyeSeparation');
  const fov = getValueById('fov');
  const nearClippingDistance = getValueById('nearClippingDistance');
  const convergenceDistance = getValueById('convergenceDistance');

  const far = 2000;
  let left, right, top, bottom;
  top = nearClippingDistance * Math.tan(fov / 2.0);
  bottom = -top;

  const a = Math.tan(fov / 2.0) * convergenceDistance;
  const b = a - eyeSeparation / 2;
  const c = a + eyeSeparation / 2;

  left = -b * nearClippingDistance / convergenceDistance;
  right = c * nearClippingDistance / convergenceDistance;

  const projectionLeft = m4.orthographic(left, right, bottom, top, nearClippingDistance, far);

  left = -c * nearClippingDistance / convergenceDistance;
  right = b * nearClippingDistance / convergenceDistance;

  const projectionRight = m4.orthographic(left, right, bottom, top, nearClippingDistance, far);
  
  let modelView;
  if (deviceOrientation.checked && latestEvent.alpha && latestEvent.beta && latestEvent.gamma) {
    const alphaRadians = latestEvent.alpha * (Math.PI / 180);
    moveCircleSphere(alphaRadians + Math.PI / 2);
  } else {
    step += 0.02;
    moveCircleSphere(step);
  }
  modelView = spaceball.getViewMatrix();
  
  const rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);
  const translateToLeft = m4.translation(-0.01, 0, -20);
  const translateToRight = m4.translation(0.01, 0, -20);

  if (getWebcamEnabled()) {
    const projection = m4.orthographic(0, 1, 0, 1, -1, 1);
    const noRotation = m4.multiply(rotateToPointZero,
      [1, 0, 0, 0, 0,
        1, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 1]);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, noRotation);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
    gl.bindTexture(gl.TEXTURE_2D, webcamTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      video,
    );
    background.Draw();
  }
  
  panner?.setPosition(...sphereCoordinates);
  gl.bindTexture(gl.TEXTURE_2D, null);
  const projection = m4.perspective(deg2rad(90), 1, 0.1, 100);
  const translationSphere = m4.translation(...sphereCoordinates);
  const modelViewMatrix = m4.multiply(translationSphere, modelView);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
  sphere.DrawSphere();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  const matrixLeft = m4.multiply(translateToLeft, modelView);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matrixLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(true, false, false, false);
  surface.Draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  const matrixRight = m4.multiply(translateToRight, modelView);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matrixRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(false, true, true, false);
  surface.Draw();

  gl.colorMask(true, true, true, true);
}

let zm = 1;

function CalcX(r, u) {
  return r * Math.cos(u) / zm;
}

function CalcY(r, u) {
  return r * Math.sin(u) / zm;
}

function CalcZ(r, u, b, m, a, n, phi) {
  let w = m * Math.PI / b;
  return a * Math.pow(Math.E, -n * r) * Math.sin(w * r + phi) / zm;
}


let b = 6;
let m = 6;
let a = 4;
let n = 0.5;
let phi = 0;
const R_MAX = b;
const U_MAX = 2 * Math.PI;
const calculateRu = (u, r) => [
  u / U_MAX,
  r / R_MAX,
];

const calculateXYZ = (r, u, b, m, a, n, phi, vertexList, textureList) => {
  const x = CalcX(r, u);
  const y = CalcY(r, u);
  const z = CalcZ(r, u, b, m, a, n, phi);
  vertexList.push(x, y, z);
  textureList.push(...calculateRu(u, r));
};

function CreateSurfaceData() {
  const vertexList = [];
  const textureList = [];
  for (let r = 0; r <= R_MAX; r += 0.001) {
    for (let u = 0; u < U_MAX; u += 0.5) {
      calculateXYZ(r, u, b, m, a, n, phi, vertexList, textureList);
      calculateXYZ(r + 0.5, u + 0.5, b, m, a, n, phi, vertexList, textureList);
    }
  }
  return { vertexList, textureList };
}


function CreateSphereData(multiplier, iSegments, jSegments) {
  const vertexList = [];
  const textureList = [];

  for (let i = 0; i <= iSegments; i++) {
    const theta = i * Math.PI / iSegments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let j = 0; j <= jSegments; j++) {
      const phi = j * 2 * Math.PI / jSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const x = multiplier * cosPhi * sinTheta;
      const y = multiplier * cosTheta;
      const z = multiplier * sinPhi * sinTheta;

      vertexList.push(x, y, z)

      const u = 1 - (j / jSegments);
      const v = 1 - (i / iSegments);
      textureList.push(u, v);
    }
  }

  return { vertexList, textureList };
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, 'vertex');
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, 'ModelViewMatrix');
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, 'ProjectionMatrix');

  shProgram.iTextureCoords = gl.getAttribLocation(prog, 'textureCoords');
  shProgram.iTextureUnit = gl.getUniformLocation(prog, 'textureUnit');

  surface = new Model('Surface');
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  background = new Model('Background');
  background.BufferData([
      0.0, 0.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      0.0, 1.0, 1.0, 0.0,
      0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
    [
      1, 1, 0, 1,
      0, 0, 0, 0,
      1, 0, 1, 1],
  );
  
  const sphereData = CreateSphereData(0.5, 500, 500);
  sphere = new Model('Sphere');
  sphere.BufferData(sphereData.vertexList, sphereData.textureList);

  LoadTexture();
  gl.enable(gl.DEPTH_TEST);
}

function infiniteDraw() {
  draw();
  window.requestAnimationFrame(infiniteDraw);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in vertex shader:  ' + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in fragment shader:  ' + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Link error in program:  ' + gl.getProgramInfoLog(prog));
  }
  return prog;
}


const handleRequestButton = () => {
  const button = document.getElementById('request-orientation');
  button.addEventListener('click', () => {
    handleDeviceOrientation();
  });
};

const handleAudioButton = () => {
  const button = document.getElementById('audio');
  button.addEventListener('click', async (e) => {
    [audio, panner] = await loadAudio('audio.mp3').catch(console.error);
  })
}


function moveCircleSphere(angle, offsetX = 0, offsetZ = -5, radius = 4) {
  sphereCoordinates[0] = offsetX + Math.cos(angle) * radius;
  sphereCoordinates[2] = offsetZ + Math.sin(angle) * radius;
}

/**
 * initialization function that will be called when the page has loaded
 */
async function init() {
  renderControls('#controls');
  let canvas;
  try {
    canvas = document.getElementById('webglcanvas');
    gl = canvas.getContext('webgl');
    video = document.createElement('video');
    video.setAttribute('autoplay', 'true');
    deviceOrientation = document.getElementById('device-orientation');
    webcamTexture = createWebcamTexture(gl);
    handleWebcam(video);
    handleRequestButton();
    handleAudioButton();
    handleFilterChange();
    if (!gl) {
      throw 'Browser does not support WebGL';
    }
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not get a WebGL graphics context.</p>';
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not initialize the WebGL graphics context: ' + e + '</p>';
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  infiniteDraw();
}

async function LoadImage() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = 'texture.png';
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', function () {
      resolve(image);
    });
  });
}

const LoadTexture = async () => {
  const image = await LoadImage();
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
};


document.addEventListener('DOMContentLoaded', init);

