attribute vec3 vertex;
attribute vec2 textureCoords;
uniform mat4 ModelViewMatrix, ProjectionMatrix;
varying vec2 vTextureCoords;

void main() {
    vec4 vertPos4 = ModelViewMatrix * vec4(vertex, 1.0);
    vec3 vertPos = vec3(vertPos4) / vertPos4.w;
    gl_Position = ProjectionMatrix*vertPos4;
    vTextureCoords = textureCoords;
}