import './style.css'
import './utils/m4.js';
import { fragmentShaderSource, vertexShaderSource } from './shader.js';
import { TrackballRotator } from './utils/trackball-rotator.js';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

const MAX_ZOOM = 5;
export const settings = {
  zoom: 3,
}

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length/3;
  }

  this.Draw = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
  }
}


// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  this.Use = function() {
    gl.useProgram(this.prog);
  }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI/8, 1, 8, 12);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
  let translateToPointZero = m4.translation(0,0,-10);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView );
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

  /* Multiply the projection matrix times the modelview matrix to give the
     combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1 );

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [0,1,0,1] );

  surface.Draw();
}

function circularWaves(vertexList, zoom = 1){
   let m = 6;
   let b = 6;
   let a = 4;
   let n = 0.5;
   let phi = 0;
    for (let r = 0; r <= b; r += 0.05) {
      for (let u = 0; u < 2 * Math.PI; u += 0.1) {
        let x = r * Math.cos(u);
        let y = r * Math.sin(u);
        let w = m * Math.PI / b;
        let z = a * Math.pow(Math.E, -n * r) * Math.sin(w * r + phi);
        vertexList.push(x/zoom, y/zoom, z/zoom);
      }
    }
}


function CreateSurfaceData()
{
  let vertexList = [];
  circularWaves(vertexList, settings.zoom);
  return vertexList;
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
  shProgram.iColor                     = gl.getUniformLocation(prog, "color");

  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());

  gl.enable(gl.DEPTH_TEST);
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
  let vsh = gl.createShader( gl.VERTEX_SHADER );
  gl.shaderSource(vsh,vShader);
  gl.compileShader(vsh);
  if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader( gl.FRAGMENT_SHADER );
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog,vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if ( ! gl ) {
      throw "Browser does not support WebGL";
    }
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 1);

  
  handleInput('zoom',(value)=>{
    settings.zoom = MAX_ZOOM - value + 1;
    initGL();
    draw();
  })
  draw();
}


function handleInput(key,onChange){
  const input  = document.getElementById(key)
  const inputText = document.getElementById(`${key}-text`)
  
  input.addEventListener('input', (event) => {
    const value = event.target.value; 
    inputText.innerText = value;
    onChange(value)
  })
}

document.addEventListener('DOMContentLoaded', init);

