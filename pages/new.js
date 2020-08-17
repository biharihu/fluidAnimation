import React, { useRef, useEffect } from "react";

import * as THREE from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBJLoader2 } from "three/examples/jsm/loaders/OBJLoader2";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { MtlObjBridge } from "three/examples/jsm/loaders/obj2/bridge/MtlObjBridge";

import { OrbitControls as Orbit } from "three/examples/jsm/controls/OrbitControls";

import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

const ThreeWater = () => {
  let mount = useRef(null);

  useEffect(() => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, 1, 1, 1000);
    camera.position.set(0, 0, 20);
    var renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    let box;
    var canvas = renderer.domElement;
    mount.appendChild(canvas);

    let directionalLight = new THREE.DirectionalLight(0xffffff, 100);
    directionalLight.position.set(0, 1, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    let light = new THREE.PointLight(0xc4c4c4, 10);
    light.position.set(0, 300, 500);
    scene.add(light);
    let light2 = new THREE.PointLight(0xc4c4c4, 10);
    light2.position.set(500, 100, 0);
    scene.add(light2);
    let light3 = new THREE.PointLight(0xc4c4c4, 10);
    light3.position.set(0, 100, -500);
    scene.add(light3);
    let light4 = new THREE.PointLight(0xc4c4c4, 10);
    light4.position.set(-500, 300, 500);
    scene.add(light4);

    let loader = new GLTFLoader();
    loader.load("car/scene.gltf", function (gltf) {
      box = gltf.scene.children[0];
      box.scale.set(2, 2, 2);
      scene.add(gltf.scene);
    });

    // const objLoader = new OBJLoader2();
    // const mtlLoader = new MTLLoader();

    // mtlLoader.load(
    //   "PM_Idea_obj/PM_Baked_Idea_4-21-20_05.mtl",
    //   (mtlParseResult) => {
    //     const materials = MtlObjBridge.addMaterialsFromMtlLoader(
    //       mtlParseResult
    //     );
    //     objLoader.addMaterials(materials);
    //     objLoader.load("PM_Idea_obj/PM_Baked_Idea_4-21-20_05.obj", (root) => {
    //       scene.add(root);
    //     });
    //   }
    // );
    // // mtlLoader.load('PM_Idea_obj/PM_Baked_Idea_4-21-20_05.mtl', (mtlParseResult) => {
    // //   const materials =  MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult);
    // //   objLoader.addMaterials(materials);
    // // objLoader.load("PM_Idea_obj/PM_Baked_Idea_4-21-20_05.obj", (root) => {
    // //   scene.add(root);
    // // });

    // var box = new THREE.Mesh(
    //   new THREE.BoxBufferGeometry(),
    //   new THREE.MeshNormalMaterial()
    // );
    // box.geometry.translate(0, 0, 0.5);
    // box.scale.set(0, 0, 0);
    // scene.add(box);

    var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -10);
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var pointOfIntersection = new THREE.Vector3();

    // Load the background texture
    var texture = THREE.ImageUtils.loadTexture("1.png");
    var backgroundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2, 0),
      new THREE.MeshBasicMaterial({
        map: texture,
      })
    );

    backgroundMesh.material.depthTest = false;
    backgroundMesh.material.depthWrite = false;

    // Create your background scene
    var backgroundScene = new THREE.Scene();
    var backgroundCamera = new THREE.Camera();
    backgroundScene.add(backgroundCamera);
    backgroundScene.add(backgroundMesh);

    function onMouseMove(event) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(plane, pointOfIntersection);
      box.lookAt(pointOfIntersection);
    }

    renderer.setAnimationLoop(() => {
      if (resize(renderer)) {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
      }
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(backgroundScene, backgroundCamera);
      renderer.render(scene, camera);
    });

    function resize(renderer) {
      const canvas = renderer.domElement;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        renderer.setSize(width, height, false);
      }
      return needResize;
    }

    canvas.addEventListener("mousemove", onMouseMove, false);

    // var color = 0x000000;

    // // Create your main scene
    // var scene = new THREE.Scene();

    // // Create your main camera
    // var camera = new THREE.PerspectiveCamera(60, 1, 1, 1000);

    // // Create lights
    // var light = new THREE.PointLight(0xeeeeee);
    // light.position.set(20, 0, 20);
    // scene.add(light);

    // var lightAmb = new THREE.AmbientLight(0x777777);
    // scene.add(lightAmb);

    // // Create your renderer
    // var renderer = new THREE.WebGLRenderer();
    // renderer.setSize(window.innerWidth, window.innerHeight);
    // let canvas = renderer.domElement;
    // mount.appendChild(canvas);

    // // Create a cube
    // var geometry = new THREE.BoxGeometry(1, 1, 1);
    // var material = new THREE.MeshLambertMaterial({
    //   color: 0xff00ff,
    //   ambient: 0x121212,
    //   emissive: 0x121212,
    // });

    // var cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    // var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -10);
    // var raycaster = new THREE.Raycaster();
    // var mouse = new THREE.Vector2();
    // var pointOfIntersection = new THREE.Vector3();
    // canvas.addEventListener("mousemove", onMouseMove, false);

    // // Set up the main camera
    // camera.position.set(0, 0, 20);
    // scene.add(plane);

    // // Load the background texture
    // var texture = THREE.ImageUtils.loadTexture("1.png");
    // var backgroundMesh = new THREE.Mesh(
    //   new THREE.PlaneGeometry(2, 2, 0),
    //   new THREE.MeshBasicMaterial({
    //     map: texture,
    //   })
    // );

    // backgroundMesh.material.depthTest = false;
    // backgroundMesh.material.depthWrite = false;

    // // Create your background scene
    // var backgroundScene = new THREE.Scene();
    // var backgroundCamera = new THREE.Camera();
    // backgroundScene.add(backgroundCamera);
    // backgroundScene.add(backgroundMesh);

    // // Rendering function
    // var render = function () {
    //   requestAnimationFrame(render);

    //   // Update the color to set
    //   if (color < 0xdddddd) color += 0x0000ff;

    //   camera.aspect = canvas.clientWidth / canvas.clientHeight;
    //   camera.updateProjectionMatrix();

    //   // Update the cube color
    //   cube.material.color.setHex(color);

    //   // Update the cube rotations
    //   //   cube.rotation.x += 0.05;
    //   //   cube.rotation.y += 0.02;

    //   renderer.autoClear = false;
    //   renderer.clear();
    //   renderer.render(backgroundScene, backgroundCamera);
    //   renderer.render(scene, camera);
    // };

    // render();

    // function onMouseMove(event) {
    //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    //   raycaster.setFromCamera(mouse, backgroundCamera);
    //   raycaster.ray.intersectPlane(plane, pointOfIntersection);
    //   cube.lookAt(pointOfIntersection);
    // }
  });

  return (
    <>
      <div ref={(e) => (mount = e)} />
    </>
  );
};

export default ThreeWater;
