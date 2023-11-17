#version 300 es
#define MAX_LIGHTS 20
precision highp float;

in vec3 oNormal;
in vec3 oFragPosition;

out vec4 fragColor;

//material
uniform vec3 diffuseVal;
uniform vec3 ambientVal;
uniform vec3 specularVal;
uniform float nVal;

//camera
uniform vec3 oCameraPosition;



//lights
uniform int numLights;
uniform struct Light{
    vec3 position;
    vec3 colour;
    float strength;
    float linear;
    float quadratic;

} pointLights[MAX_LIGHTS];


void main() {
    vec3 normal = normalize(oNormal);

    vec3 reflectedLight;

    for(int i = 0; i < numLights; i++) {

        //diffuse
        vec3 L = normalize(pointLights[i].position - oFragPosition); //light direction
        float diff = max(dot(normal, L), 0.0);

        //TODO: remove diffuseVal when implementing textures
        reflectedLight += diff * pointLights[i].colour * pointLights[i].strength * diffuseVal;

        //Specular
        vec3 R = normalize(oCameraPosition - oFragPosition);
        vec3 H = normalize(L + R);
        float NH = dot(normal,H);
        NH = pow(NH, nVal);
        //                 ks         * ls                          * NH
        reflectedLight += specularVal * vec3(1.0,1.0,1.0) * NH;
    }

    vec3 ambient = vec3(0.3, 0.3, 0.3)*ambientVal;

    fragColor = vec4(ambient + reflectedLight, 1.0);
}