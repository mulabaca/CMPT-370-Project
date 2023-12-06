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
uniform float alpha;

//camera
uniform vec3 oCameraPosition;

//texture
uniform int samplerExists;
uniform sampler2D uTexture;
in vec2 oUV;

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
        float dist = length(pointLights[i].position - oFragPosition);
        float attenuation = pointLights[i].strength / (1.0 + pointLights[i].linear * dist + pointLights[i].quadratic * (dist * dist));

        //diffuse
        vec3 L = normalize(pointLights[i].position - oFragPosition); //light direction
        float diff = max(dot(normal, L), 0.0);

        //TODO: remove diffuseVal when implementing textures
        //Removed pointLights strength temporarily. Had to crank up
        //light strength in construction yard to 500 to properly see the map.

        // texture doesn't show for me for whatever reason.
        // seems fragment shader isn't receiving any uniforms??
        vec3 textureColour = vec3(1, 1, 1);
        if (samplerExists == 1) {
            textureColour = texture(uTexture, oUV).rgb;
        }
        reflectedLight += diff * pointLights[i].colour * 1.5f * diffuseVal * attenuation * textureColour;

        //Specular
        vec3 R = normalize(oCameraPosition - oFragPosition);
        vec3 H = normalize(L + R);
        float NH = dot(normal,H);
        NH = pow(NH, nVal);
        //                 ks         * ls                          * NH
        reflectedLight += specularVal * vec3(1.0,1.0,1.0) * NH;
    }

    vec3 ambient = vec3(0.8, 0.8, 0.8) * ambientVal;

    // TODO: Set the last value to alpha. Doing it right now turns every object white.
    // TODO: Add texture to the ground mesh. Technically it's doing it right now, but nothing shows up.
    fragColor = vec4(ambient + reflectedLight, 1.0);
}