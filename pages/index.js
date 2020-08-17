import React, { useRef, useEffect } from "react";

import * as THREE from "three";

import { Canvas, useFrame } from "react-three-fiber";

import { softShadows, MeshWobbleMaterial, OrbitControls } from "drei";
import { OrbitControls as Orbit } from "three/examples/jsm/controls/OrbitControls";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

// softShadows();

const ThreeWater = () => {
  let mount = useRef(null);

  useEffect(() => {
    const { GUI } = require("three/examples/jsm/libs/dat.gui.module.js");
    let heightmapFragmentShader = `
      #include <common>

      uniform vec2 mousePos;
      uniform float mouseSize;
      uniform float viscosityConstant;
      uniform float heightCompensation;

      void main()	{

        vec2 cellSize = 1.0 / resolution.xy;

        vec2 uv = gl_FragCoord.xy * cellSize;

        // heightmapValue.x == height from previous frame
        // heightmapValue.y == height from penultimate frame
        // heightmapValue.z, heightmapValue.w not used
        vec4 heightmapValue = texture2D( heightmap, uv );

        // Get neighbours
        vec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );
        vec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );
        vec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );
        vec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );

        // https://web.archive.org/web/20080618181901/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm

        float newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - heightmapValue.y ) * viscosityConstant;

        // Mouse influence
        float mousePhase = clamp( length( ( uv - vec2( 0.5 ) ) * BOUNDS - vec2( mousePos.x, - mousePos.y ) ) * PI / mouseSize, 0.0, PI );
        newHeight += ( cos( mousePhase ) + 1.0 ) * 0.8;

        heightmapValue.y = heightmapValue.x;
        heightmapValue.x = newHeight;

        gl_FragColor = heightmapValue;

      }
    `;

    let smoothFragmentShader = `
        uniform sampler2D smoothTexture;

        void main()	{

          vec2 cellSize = 1.0 / resolution.xy;

          vec2 uv = gl_FragCoord.xy * cellSize;

          // Computes the mean of texel and 4 neighbours
          vec4 textureValue = texture2D( smoothTexture, uv );
          textureValue += texture2D( smoothTexture, uv + vec2( 0.0, cellSize.y ) );
          textureValue += texture2D( smoothTexture, uv + vec2( 0.0, - cellSize.y ) );
          textureValue += texture2D( smoothTexture, uv + vec2( cellSize.x, 0.0 ) );
          textureValue += texture2D( smoothTexture, uv + vec2( - cellSize.x, 0.0 ) );

          textureValue /= 8.0;

          gl_FragColor = textureValue;

        }
    `;

    let readWaterLevelFragmentShader = `
          uniform vec2 point1;

          uniform sampler2D levelTexture;

          // Integer to float conversion from https://stackoverflow.com/questions/17981163/webgl-read-pixels-from-floating-point-render-target

          float shift_right( float v, float amt ) {

            v = floor( v ) + 0.5;
            return floor( v / exp2( amt ) );

          }

          float shift_left( float v, float amt ) {

            return floor( v * exp2( amt ) + 0.5 );

          }

          float mask_last( float v, float bits ) {

            return mod( v, shift_left( 1.0, bits ) );

          }

          float extract_bits( float num, float from, float to ) {

            from = floor( from + 0.5 ); to = floor( to + 0.5 );
            return mask_last( shift_right( num, from ), to - from );

          }

          vec4 encode_float( float val ) {
            if ( val == 0.0 ) return vec4( 0, 0, 0, 0 );
            float sign = val > 0.0 ? 0.0 : 1.0;
            val = abs( val );
            float exponent = floor( log2( val ) );
            float biased_exponent = exponent + 127.0;
            float fraction = ( ( val / exp2( exponent ) ) - 1.0 ) * 8388608.0;
            float t = biased_exponent / 2.0;
            float last_bit_of_biased_exponent = fract( t ) * 2.0;
            float remaining_bits_of_biased_exponent = floor( t );
            float byte4 = extract_bits( fraction, 0.0, 8.0 ) / 255.0;
            float byte3 = extract_bits( fraction, 8.0, 16.0 ) / 255.0;
            float byte2 = ( last_bit_of_biased_exponent * 128.0 + extract_bits( fraction, 16.0, 23.0 ) ) / 255.0;
            float byte1 = ( sign * 128.0 + remaining_bits_of_biased_exponent ) / 255.0;
            return vec4( byte4, byte3, byte2, byte1 );
          }

          void main()	{

            vec2 cellSize = 1.0 / resolution.xy;

            float waterLevel = texture2D( levelTexture, point1 ).x;

            vec2 normal = vec2(
              ( texture2D( levelTexture, point1 + vec2( - cellSize.x, 0 ) ).x - texture2D( levelTexture, point1 + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
              ( texture2D( levelTexture, point1 + vec2( 0, - cellSize.y ) ).x - texture2D( levelTexture, point1 + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS );

            if ( gl_FragCoord.x < 1.5 ) {

              gl_FragColor = encode_float( waterLevel );

            } else if ( gl_FragCoord.x < 2.5 ) {

              gl_FragColor = encode_float( normal.x );

            } else if ( gl_FragCoord.x < 3.5 ) {

              gl_FragColor = encode_float( normal.y );

            } else {

              gl_FragColor = encode_float( 0.0 );

            }

          }
      `;

    let waterVertexShader = `
          uniform sampler2D heightmap;

          #define PHONG

          varying vec3 vViewPosition;

          #ifndef FLAT_SHADED

            varying vec3 vNormal;

          #endif

          #include <common>
          #include <uv_pars_vertex>
          #include <uv2_pars_vertex>
          #include <displacementmap_pars_vertex>
          #include <envmap_pars_vertex>
          #include <color_pars_vertex>
          #include <morphtarget_pars_vertex>
          #include <skinning_pars_vertex>
          #include <shadowmap_pars_vertex>
          #include <logdepthbuf_pars_vertex>
          #include <clipping_planes_pars_vertex>

          void main() {

            vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );

            #include <uv_vertex>
            #include <uv2_vertex>
            #include <color_vertex>

            // # include <beginnormal_vertex>
            // Compute normal from heightmap
            vec3 objectNormal = vec3(
              ( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
              ( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
              1.0 );
            //<beginnormal_vertex>

            #include <morphnormal_vertex>
            #include <skinbase_vertex>
            #include <skinnormal_vertex>
            #include <defaultnormal_vertex>

          #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED

            vNormal = normalize( transformedNormal );

          #endif

            //# include <begin_vertex>
            float heightValue = texture2D( heightmap, uv ).x;
            vec3 transformed = vec3( position.x, position.y, heightValue );
            //<begin_vertex>

            #include <morphtarget_vertex>
            #include <skinning_vertex>
            #include <displacementmap_vertex>
            #include <project_vertex>
            #include <logdepthbuf_vertex>
            #include <clipping_planes_vertex>

            vViewPosition = - mvPosition.xyz;

            #include <worldpos_vertex>
            #include <envmap_vertex>
            #include <shadowmap_vertex>

          }
      `;
    // Texture width for simulation
    var WIDTH = 800;

    // Water size in system units
    var BOUNDS = 1024;
    var BOUNDS_HALF = BOUNDS * 0.5;

    var container, stats;
    var camera, scene, renderer;
    var mouseMoved = false;
    var mouseCoords = new THREE.Vector2();
    var raycaster = new THREE.Raycaster();

    var waterMesh;
    var meshRay;
    var gpuCompute;
    var heightmapVariable;
    var waterUniforms;
    var smoothShader;
    var readWaterLevelShader;
    var readWaterLevelRenderTarget;
    var readWaterLevelImage;
    var waterNormal = new THREE.Vector3();

    var NUM_SPHERES = 5;
    var spheres = [];
    var spheresEnabled = true;
    var mouse = {
      x: 0,
      y: 0,
    };
    var light;
    // var gui = new GUI();

    var simplex = new SimplexNoise();

    init();
    animate();

    function init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        1000
      );
      camera.position.set(100, 500, 0);
      camera.rotation.x = 300;

      var sun = new THREE.DirectionalLight(0xffffff, 0.2);
      sun.position.set(0, 20000, 0);
      scene.add(sun);

      light = new THREE.PointLight(0xffffff, 3, 800);
      // light.position.set(50, 50, 50);
      scene.add(light);

      var ambi = new THREE.AmbientLight(0xffffff, 5); // soft white light
      scene.add(ambi);

      // Define the lights for the scene
      // light = new THREE.PointLight(0xffffff, 0.2);
      // light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
      // light.position.set(0, 0, 200);
      // scene.add(light);
      // var lightAmb = new THREE.AmbientLight(0xffffff, 1);
      // scene.add(lightAmb);

      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor("0x000000");
      mount.appendChild(renderer.domElement);

      // var controls = new Orbit(camera, renderer.domElement);
      // controls.minDistance = 100;
      // controls.maxDistance = 1000;

      document.addEventListener("mousemove", onDocumentMouseMove, false);
      document.addEventListener("touchstart", onDocumentTouchStart, false);
      document.addEventListener("touchmove", onDocumentTouchMove, false);

      window.addEventListener("resize", onWindowResize, false);

      var valuesChanger = function () {
        heightmapVariable.material.uniforms["mouseSize"].value = 20;
        heightmapVariable.material.uniforms["viscosityConstant"].value = 0.99;
      };

      initWater();

      valuesChanger();
    }

    function initWater() {
      var materialColor = 0x000000;

      var geometry = new THREE.PlaneBufferGeometry(
        BOUNDS,
        BOUNDS,
        WIDTH - 1,
        WIDTH - 1
      );

      var texture = new THREE.TextureLoader().load("/4.png");

      // material: make a THREE.ShaderMaterial clone of THREE.MeshPhongMaterial, with customized vertex shader
      var material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.ShaderLib["phong"].uniforms,
          {
            heightmap: { value: null },
          },
        ]),
        vertexShader: waterVertexShader,
        fragmentShader: THREE.ShaderChunk["meshphong_frag"],
      });

      material.lights = true;

      // Material attributes from THREE.MeshPhongMaterial
      material.color = new THREE.Color(materialColor);
      material.specular = new THREE.Color(0x111111);
      material.shininess = 100;

      // Sets the uniforms with the material values
      material.uniforms["diffuse"].value = material.color;
      material.uniforms["specular"].value = material.specular;
      material.uniforms["shininess"].value = Math.max(material.shininess, 1e-4);
      material.uniforms["opacity"].value = material.opacity;

      // Defines
      material.defines.WIDTH = WIDTH.toFixed(1);
      material.defines.BOUNDS = BOUNDS.toFixed(1);

      waterUniforms = material.uniforms;

      waterMesh = new THREE.Mesh(geometry, material);
      waterMesh.rotation.x = -Math.PI / 2;

      waterMesh.matrixAutoUpdate = true;
      waterMesh.updateMatrix();

      scene.add(waterMesh);

      // THREE.Mesh just for mouse raycasting
      var geometryRay = new THREE.PlaneBufferGeometry(BOUNDS, BOUNDS, 1, 1);
      meshRay = new THREE.Mesh(
        geometryRay,
        new THREE.MeshBasicMaterial({
          // color: 0xffffff,
          visible: false,
          map: texture,
        })
      );
      meshRay.rotation.x = -Math.PI / 2;

      meshRay.matrixAutoUpdate = true;
      meshRay.updateMatrix();
      scene.add(meshRay);

      // Creates the gpu computation class and sets it up

      gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

      var heightmap0 = gpuCompute.createTexture();

      fillTexture(heightmap0);

      heightmapVariable = gpuCompute.addVariable(
        "heightmap",
        heightmapFragmentShader,
        heightmap0
      );

      gpuCompute.setVariableDependencies(heightmapVariable, [
        heightmapVariable,
      ]);

      heightmapVariable.material.uniforms["mousePos"] = {
        value: new THREE.Vector2(10000, 10000),
      };
      heightmapVariable.material.uniforms["mouseSize"] = { value: 19.0 };
      heightmapVariable.material.uniforms["viscosityConstant"] = {
        value: 0.91,
      };
      heightmapVariable.material.uniforms["heightCompensation"] = {
        value: 0,
      };
      heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed(1);

      var error = gpuCompute.init();
      if (error !== null) {
        console.error(error);
      }

      // Create compute shader to smooth the water surface and velocity
      smoothShader = gpuCompute.createShaderMaterial(smoothFragmentShader, {
        smoothTexture: { value: true },
      });

      // Create compute shader to read water level
      readWaterLevelShader = gpuCompute.createShaderMaterial(
        readWaterLevelFragmentShader,
        {
          point1: { value: new THREE.Vector2() },
          levelTexture: { value: null },
        }
      );
      readWaterLevelShader.defines.WIDTH = WIDTH.toFixed(1);
      readWaterLevelShader.defines.BOUNDS = BOUNDS.toFixed(1);

      // Create a 4x1 pixel image and a render target (Uint8, 4 channels, 1 byte per channel) to read water height and orientation
      readWaterLevelImage = new Uint8Array(4 * 1 * 4);

      readWaterLevelRenderTarget = new THREE.WebGLRenderTarget(4, 1, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        stencilBuffer: false,
        depthBuffer: false,
      });
    }

    function fillTexture(texture) {
      var waterMaxHeight = 10;

      function noise(x, y) {
        var multR = waterMaxHeight;
        var mult = 0.025;
        var r = 0;
        for (var i = 0; i < 15; i++) {
          r += multR * simplex.noise(x * mult, y * mult);
          multR *= 0.53 + 0.025 * i;
          mult *= 1.25;
        }
        return r;
      }

      var pixels = texture.image.data;

      var p = 0;
      for (var j = 0; j < WIDTH; j++) {
        for (var i = 0; i < WIDTH; i++) {
          var x = (i * 128) / WIDTH;
          var y = (j * 128) / WIDTH;

          pixels[p + 0] = noise(x, y);
          pixels[p + 1] = pixels[p + 0];
          pixels[p + 2] = 0;
          pixels[p + 3] = 1;

          p += 4;
        }
      }
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function setMouseCoords(x, y) {
      mouseCoords.set(
        (x / renderer.domElement.clientWidth) * 2 - 1,
        -(y / renderer.domElement.clientHeight) * 2 + 1
      );
      mouseMoved = true;
    }

    function onDocumentMouseMove(event) {
      setMouseCoords(event.clientX, event.clientY);
    }

    function onDocumentTouchStart(event) {
      if (event.touches.length === 1) {
        event.preventDefault();

        setMouseCoords(event.touches[0].pageX, event.touches[0].pageY);
      }
    }

    function onDocumentTouchMove(event) {
      if (event.touches.length === 1) {
        event.preventDefault();

        setMouseCoords(event.touches[0].pageX, event.touches[0].pageY);
      }
    }

    function animate() {
      requestAnimationFrame(animate);

      render();
      // stats.update();
    }

    function render() {
      // Set uniforms: mouse interaction
      var uniforms = heightmapVariable.material.uniforms;
      if (mouseMoved) {
        raycaster.setFromCamera(mouseCoords, camera);

        var intersects = raycaster.intersectObject(meshRay);

        if (intersects.length > 0) {
          var point = intersects[0].point;
          uniforms["mousePos"].value.set(point.x, point.z);
        } else {
          uniforms["mousePos"].value.set(10000, 10000);
        }

        mouseMoved = false;
      } else {
        uniforms["mousePos"].value.set(10000, 10000);
      }

      // Do the gpu computation
      gpuCompute.compute();

      // Get compute output in custom uniform
      waterUniforms["heightmap"].value = gpuCompute.getCurrentRenderTarget(
        heightmapVariable
      ).texture;

      // Render
      renderer.render(scene, camera);
    }
  });

  return (
    <>
      <div ref={(e) => (mount = e)} />
    </>
  );
};

export default ThreeWater;
