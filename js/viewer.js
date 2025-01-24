import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODE = "PROD"; //DEV or PROD

/**
 * Global variables for Three.js components
 */
let scene, camera, renderer, controls, raycaster, mouse;

/**
 * Variables
 */

let selectedBodyParts = [];

if(MODE == "DEV") {
    document.getElementById("info").style.display = "block";
} else {
    document.getElementById("info").style.display = "none";
}


/**
 * Update the loading progress bar
 * @param {number} progress - Progress percentage (0-100)
 */
function updateLoadingProgress(progress) {
    const loaderBar = document.getElementById('loader-bar');
    loaderBar.style.width = `${progress}%`;
    
    // Hide loader when loading is complete
    if (progress === 100) {
        setTimeout(() => {
            const loaderContainer = document.getElementById('loader-container');
            loaderContainer.style.display = 'none';
        }, 1000); // Small delay to show completion
    }
}





/**
 * Initialize the Three.js scene and all necessary components
 */
function init() {
    // Create scene
    scene = new THREE.Scene();

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;

    // Create renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Setup lights
    setupLighting();

    // Setup controls
    setupControls();

    // Setup raycaster for object interaction
    setupRaycaster();

    // Load 3D model
    loadModel();

    // Add event listeners
    setupEventListeners();
}

/**
 * Set up scene lighting
 */
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

    const backgroundColor = new THREE.Color(0xffffff);
    renderer.setClearColor(backgroundColor);
    //
}

/**
 * Set up OrbitControls
 */
function setupControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
}

/**
 * Set up raycaster for object interaction
 */
function setupRaycaster() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
}

/*
* Flutter message sender
*/
function sendDataToFlutter(data) {
    if (window.FlutterChannel) {

        if(MODE == "DEV") {
            document.getElementById("info").style.backgroundColor = "green";
            document.getElementById("info").innerHTML = "Connected"
        }

        // Send the data as a string (Flutter only accepts strings via JavaScriptChannel)
        window.FlutterChannel.postMessage(JSON.stringify(data));
    } else {

        if(MODE == "DEV") {
            document.getElementById("info").style.backgroundColor = "red";
            document.getElementById("info").innerHTML = "Not connected"
        }

        console.error("FlutterChannel is not available");
    }
}

/**
 * Handle mouse click events and object interaction
 * @param {MouseEvent} event - The mouse click event
 */
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        // Get the first intersected object
        const object = intersects[0].object;
        console.log('Clicked object:', object.name);

        if (object.material) {
            // Clone the material if it hasn't been cloned already
            if (!object.userData.isCloned) {
                object.material = object.material.clone();
                object.userData.isCloned = true;
            }

            // Toggle color between original and highlight
            if (!object.userData.originalColor) {
                object.userData.originalColor = object.material.color.clone();
            }

            if (object.userData.isHighlighted) {
                //Already highlighted
                object.material.color.copy(object.userData.originalColor); // Restore original color
                object.userData.isHighlighted = false;
                selectedBodyParts = selectedBodyParts.filter(part => part !== object.name);
                sendDataToFlutter(selectedBodyParts)

                console.log(selectedBodyParts)
            } else {
                //Highlight
                object.material.color.setHex(0xff0000); // Red highlight
                object.userData.isHighlighted = true;
                selectedBodyParts.push(object.name)
                sendDataToFlutter(selectedBodyParts)

                console.log(selectedBodyParts)
            }
        }
    }
}


/**
 * Handle interaction with clicked objects
 * @param {THREE.Object3D} object - The clicked 3D object
 */
function handleObjectInteraction(object) {
    if (object.material) {
        // Store original color if not already stored
        if (!object.userData.originalColor) {
            object.userData.originalColor = object.material.color.clone();
        }

        // Toggle between original color and highlighted color
        if (object.userData.isHighlighted) {
            object.material.color.copy(object.userData.originalColor);
            object.userData.isHighlighted = false;
        } else {
            object.material.color.setHex(0xff0000); // Red highlight
            object.userData.isHighlighted = true;
        }
    }
}

/**
 * Load the 3D model
 */
function loadModel() {
    let modelPath = "./assets/manbody-v3.glb";

    if(MODE == "PROD") {
        modelPath = "https://wjs-dev.github.io/3dwebserver/assets/manbody-v3.glb";
    }

    const loader = new GLTFLoader();
    loader.load(
        modelPath,
        function (gltf) {
            scene.add(gltf.scene);
            processLoadedModel(gltf.scene);
            updateLoadingProgress(100);
        },
        function (xhr) {
            //console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            updateLoadingProgress(xhr.loaded / xhr.total * 100);
        },
        function (error) {
            console.error('An error occurred loading the model:', error);
        }
    );
}

/**
 * Process the loaded 3D model
 * @param {THREE.Object3D} model - The loaded 3D model
 */
function processLoadedModel(model) {
    // Name all meshes for better identification
    model.traverse((object) => {
        if (object.isMesh) {
            //console.log('Mesh name:', object.name);
            if (!object.name) {
                object.name = 'Mesh_' + Math.random().toString(36).substr(2, 9);
            }
        }
    });

    // Center the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -center.z;
}

/**
 * Handle window resize events
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    window.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize, false);
}

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Initialize the application
init();
animate(); 