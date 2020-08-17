const SpinningMesh = ({ position, args, color, speed }) => {
  const mesh = useRef(null);
  useFrame(() => (mesh.current.rotation.x = mesh.current.rotation.y += 0.01));
  return (
    <mesh castShadow position={position} ref={mesh}>
      <boxBufferGeometry attach="geometry" args={args} />
      <MeshWobbleMaterial
        attach="material"
        color={color}
        speed={speed}
        factor={0.6}
      />
    </mesh>
  );
};

const Index = () => {
  return (
    <>
      <Canvas
        shadowMap
        colorManagement
        camera={{ position: [-5, 2, 10], fov: 60 }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight
          castShadow
          position={[0, 10, 0]}
          intensity={1.5}
          shadowMapWidth={1024}
          shadowMapHeight={1024}
          shadowCameraFar={50}
          shadowCameraLeft={-10}
          shadowCameraRight={10}
          shadowCameraTop={10}
          shadowCameraBottom={-10}
        />
        <pointLight position={[-10, 0, -10]} intensity={0.5} />
        <pointLight position={[0, -10, 0]} intensity={1.5} />

        <group>
          <mesh
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -3, 0]}
          >
            <planeBufferGeometry attach="geometry" args={[100, 100]} />
            <shadowMaterial attach="material" opacity={0.3} />
          </mesh>
        </group>

        <SpinningMesh
          position={[0, 1, 0]}
          args={[3, 2, 1]}
          color="lightblue"
          speed={2}
        />
        <SpinningMesh position={[-2, 1, -5]} color="pink" speed={6} />
        <SpinningMesh position={[5, 1, -2]} color="pink" speed={6} />
        <OrbitControls />
      </Canvas>
    </>
  );
};

const Home = () => {
  let mount = useRef(null);
  useEffect(() => {
    const vShader = `
        varying vec2 v_uv;
  
        void main() {
          v_uv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  
        }
        `;
    const fShader = `
        varying vec2 v_uv;
        uniform vec2 u_mouse;
        uniform vec2 u_resolution;
        uniform vec3 u_color;
        uniform float u_time;
  
        void main() {
          vec2 v = u_mouse / u_resolution;
          vec2 uv = gl_FragCoord.xy / u_resolution;
          gl_FragColor = vec4(1.0, 0.5, sin(u_time * 10.0) + 0.5, 1.0).rgba;
        }
        `;

    // const vShader = "\n#ifdef GL_ES\nprecision mediump float;\n#endif\n\nattribute vec2 a_position;\nattribute vec2 a_texcoord;\n\nvarying vec2 v_texcoord;\n\nvoid main() {\n    gl_Position = vec4(a_position, 0.0, 1.0);\n    v_texcoord = a_texcoord;\n}\n";
    // const fShader = "\n#ifdef GL_ES\nprecision mediump float;\n#endif\n\nvarying vec2 v_texcoord;\n\nvoid main(){\n    gl_FragColor = vec4(0.0);\n}\n";

    const uniforms = {
      u_mouse: {
        value: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      },
      u_resolution: { value: { x: window.innerWidth, y: window.innerHeight } },
      u_time: { value: 0.0 },
      u_color: { value: new THREE.Color(0xff0000) },
    };

    // scene
    const scene = new THREE.Scene();

    // set clock
    const clock = new THREE.Clock();

    // camera
    let aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(15, aspect, 1, 1000);
    camera.position.z = 10;

    // renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    var geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: vShader,
      fragmentShader: fShader,
      uniforms,
    });
    var cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    var animate = function () {
      // rotate the cube
      cube.rotation.y += 0.01;
      cube.rotation.x += 0.01;
      // update time uniform
      uniforms.u_time.value = clock.getElapsedTime();
      // animation loop
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();
  });

  return <div ref={(e) => (mount = e)} />;
};

const Example1 = () => {
  let mount = useRef(null);

  useEffect(() => {
    function init() {
      const scene = new THREE.Scene();

      let enableFog = false;

      if (enableFog) {
        scene.fog = new THREE.FogExp2(0xffffff, 0.2);
      }

      let plane = getPlane(20);
      let spotLight = getSpotLight(1);
      let sphere = getSphere(0.05);
      let boxGrid = getBoxGrid(10, 1.5);

      plane.name = "plane-1";

      plane.rotation.x = Math.PI / 2;
      spotLight.position.y = 4;

      scene.add(plane);
      spotLight.add(sphere);
      scene.add(spotLight);
      scene.add(boxGrid);

      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        1000
      );

      camera.position.x = 1;
      camera.position.y = 2;
      camera.position.z = 5;

      camera.lookAt(new THREE.Vector3(0, 0, 0));

      const renderer = new THREE.WebGLRenderer();
      renderer.shadowMap.enabled = true;
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor("rgb(120,120,120)");
      mount.appendChild(renderer.domElement);

      let controls = new Orbit(camera, renderer.domElement);

      update(renderer, scene, camera, controls);
      return scene;
    }

    function getBox(w, h, d) {
      let geometry = new THREE.BoxGeometry(w, h, d);
      let material = new THREE.MeshPhongMaterial({
        color: "rgb(120,120,120)",
      });

      let mesh = new THREE.Mesh(geometry, material);

      mesh.castShadow = true;

      return mesh;
    }

    function getBoxGrid(amount, separationMultiplier) {
      let group = new THREE.Group();

      for (let i = 0; i < amount; i++) {
        var obj = getBox(1, 1, 1);
        obj.position.x = i * separationMultiplier;
        obj.position.y = obj.geometry.parameters.height / 2;
        group.add(obj);

        for (let j = 0; j < amount; j++) {
          var obj = getBox(1, 1, 1);
          obj.position.x = i * separationMultiplier;
          obj.position.y = obj.geometry.parameters.height / 2;
          obj.position.z = j * separationMultiplier;
          group.add(obj);
        }
      }

      group.position.x = -(separationMultiplier * (amount - 1)) / 2;
      group.position.z = -(separationMultiplier * (amount - 1)) / 2;

      return group;
    }

    function getPlane(size) {
      let geometry = new THREE.PlaneGeometry(size, size);
      let material = new THREE.MeshPhongMaterial({
        color: "rgb(120,120,120)",
        side: THREE.DoubleSide,
      });

      let mesh = new THREE.Mesh(geometry, material);

      mesh.receiveShadow = true;

      return mesh;
    }

    function getSphere(size) {
      let geometry = new THREE.SphereGeometry(size, 24, 24);
      let material = new THREE.MeshBasicMaterial({
        color: "rgb(255,255,255)",
      });

      let mesh = new THREE.Mesh(geometry, material);

      return mesh;
    }

    function getPointLight(intensity) {
      let light = new THREE.PointLight(0xffffff, intensity);
      light.castShadow = true;

      return light;
    }

    function getSpotLight(intensity) {
      let light = new THREE.SpotLight(0xffffff, intensity);
      light.castShadow = true;

      light.shadow.bias = 0.001;
      light.shadow.mapSize.width = 2048;

      return light;
    }

    function update(renderer, scene, camera, controls) {
      renderer.render(scene, camera);
      var plane = scene.getObjectByName("plane-1");

      controls.update();

      requestAnimationFrame(function () {
        update(renderer, scene, camera, controls);
      });
    }

    let scene = init();
  });

  return <div ref={(e) => (mount = e)} />;
};
