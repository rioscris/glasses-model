// Variables globales
let scene, camera, renderer, model;
let videoElement = document.getElementById('video');
let canvasElement = document.getElementById('output');
let ctx = canvasElement.getContext('2d');

// Inicializa Three.js
function initThree() {
  console.log('Iniciando Three.js...');
  console.log('Versión de Three.js:', THREE.REVISION);
  console.log('GLTFLoader disponible:', typeof THREE.GLTFLoader);
  
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Luz
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 1, 2);
  scene.add(light);

  // Cargar modelo de anteojos
  console.log('Iniciando carga del modelo...');
  const loader = new THREE.GLTFLoader();
  loader.load(
    "glasses.glb",
    function(gltf) {
      console.log('Modelo cargado exitosamente:', gltf);
      model = gltf.scene;
      model.scale.set(0.1, 0.1, 0.1); // Ajustar tamaño
      scene.add(model);
      console.log('Modelo añadido a la escena');
    },
    function(xhr) {
      // Función de progreso
      console.log('Progreso de carga: ' + (xhr.loaded / xhr.total * 100) + '%');
    },
    function(error) {
      // Función de error
      console.error('Error cargando el modelo:', error);
    }
  );
}

// Render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
initThree();
animate();

// Configurar MediaPipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

faceMesh.onResults(onResults);

// Usar cámara frontal
const cameraMediapipe = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({image: videoElement});
  },
  width: 640,
  height: 480,
  facingMode: "user"
});
cameraMediapipe.start();

// Cuando MediaPipe devuelve resultados
function onResults(results) {
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (!results.multiFaceLandmarks || !model) return;

  const landmarks = results.multiFaceLandmarks[0];

  // Landmark: nariz puente (168) y ojos (33, 263)
  const nose = landmarks[168];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  // Calcular posición
  const x = (nose.x - 0.5) * 2;
  const y = -(nose.y - 0.5) * 2;
  const z = -1.5;

  // Ajustar posición y rotación
  model.position.set(x, y, z);

  // Calcular escala usando distancia interpupilar
  const dx = leftEye.x - rightEye.x;
  const dy = leftEye.y - rightEye.y;
  const eyeDist = Math.sqrt(dx*dx + dy*dy);
  model.scale.set(eyeDist * 5, eyeDist * 5, eyeDist * 5);
}
