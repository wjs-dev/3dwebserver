import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODE = "PROD"; //DEV or PROD

let man_model_normal = 'maleClassic.glb';
let man_model_colored = 'maleColor.glb';
let female_model_normal = 'femaleClassic.glb';
let female_model_colored = 'femaleColor.glb';

let defaultGender = "male";
let defaultModelMode = "normal";

let selectedBodyParts = [];
/**
 * Global variables for Three.js components
 */
let scene, camera, renderer, controls, raycaster, mouse;

/**
 * Variables
 */

document.getElementById("model-mode-button").addEventListener("click", toggleModelMode);


document.getElementById("gender-button").addEventListener("click", toggleGender);



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
    const loaderContainer = document.getElementById('loader-container');
    const loaderBar = document.getElementById('loader-bar');

    loaderContainer.style.display = 'flex';
    loaderBar.style.width = `${progress}%`;
    
    // Hide loader when loading is complete
    if (progress === 100) {
        setTimeout(() => {
            loaderContainer.style.display = 'none';
        }, 1000); // Small delay to show completion
    }
}

//Utilities
function toggleGender() {
    let genderButton =document.getElementById("gender-button");

    if(defaultGender == "male") {
        unloadModel();

        defaultModelMode === "normal" ? loadModel(female_model_normal) : loadModel(female_model_colored);
        defaultGender = "female";
        genderButton.innerHTML = "👨🏼";
    } else {
        unloadModel();
        defaultModelMode === "normal" ? loadModel(man_model_normal) : loadModel(man_model_colored);

        defaultGender = "male";
        genderButton.innerHTML = "👩🏼";
    }

}

function toggleModelMode() {
 
    unloadModel(); // Unload first since it's common for both cases
    

    let model;
    if (defaultModelMode === "normal") {
        if (defaultGender === "male") {
            model = man_model_colored;
        } else {
            model = female_model_colored;
        }

        defaultModelMode = "colored";
    } else {
        if (defaultGender === "male") {
            model = man_model_normal;
        } else {
            model = female_model_normal;
        }

        defaultModelMode = "normal";
    }

    defaultModelMode === "normal" ? document.getElementById("model-mode-button").innerHTML = "🎨" : document.getElementById("model-mode-button").innerHTML = "🖐🏼";

    loadModel(model);
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

        //console.error("FlutterChannel is not available");
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
 * Load the 3D model
 */
function loadModel(_modelPath = man_model_normal) {

    
    let modelPath = `https://wjs-dev.github.io/3dwebserver/assets/${_modelPath}`;

    const loader = new GLTFLoader();
    loader.load(
        modelPath,
        function (gltf) {
            gltf.scene.name = "3dmodel";
            scene.add(gltf.scene);
            processLoadedModel(gltf.scene);
            updateLoadingProgress(100);

            // Optional: Name all meshes for better identification
            gltf.scene.traverse((object) => {
                if (object.isMesh) {
                    
                    if(object.name.includes("_")) {
                        object.name = object.name.split("_")[0];
                    }

                    
                }
            });
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


function unloadModel() {
    // scene.remove(scene.children[0]);
    scene.remove(scene.getObjectByName("3dmodel"));
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
    setTimeout(() => {
        requestAnimationFrame(animate);
    }, 1000 / 15)
    
    
    controls.update();
    renderer.render(scene, camera);
}

// Initialize the application
init();
animate(); 