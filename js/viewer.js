/*
 * Possible flutter channel commands:
 * "cbp,1,true"
 *
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODE = "PROD"; //DEV or PROD

let man_model_normal = 'maleClassic.glb';
let man_model_colored = 'maleColor.glb';
let female_model_normal = 'femaleClassic.glb';
let female_model_colored = 'femaleColor.glb';

let defaultGender = "male";
let defaultModelMode = "colored";

let selectedBodyParts = [];

let _gltf = null;
/**
 * Global variables for Three.js components
 */
let scene, camera, renderer, controls, raycaster, mouse;

/**
 * Variables
 */

// document.getElementById("model-mode-button").addEventListener("click", toggleModelMode);
// document.getElementById("gender-button").addEventListener("click", toggleGender);

// document.getElementById("test-button").addEventListener("click", () => {toggleBodyPartColor("OR", true)});
// document.getElementById("test-button2").addEventListener("click", () => {toggleBodyPartColor("OR", false)});


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


    // On the Flutter side, you can send messages to the JavaScript
    // side using the WebViewController's evaluateJavascript method or similar APIs.

    // For example, in Flutter: send "GE,true" to the JavaScript side
    window.addEventListener("message", (event) => {
        // Ensure the message is coming from the Flutter channel
        if (event.data) {
            const message = event.data;
            let splitted = message.split(",")
            if(splitted.length == 3) {
                if(splitted[0] == "cbp") {
                    toggleBodyPartColor(splitted[1], splitted[2]);
                }
            }
        }
    });


    
   
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
        // console.log(object);

        const codeMap = {
            RZ: { name: 'RZ', id: 1 },
            PAR: { name: 'PAR', id: 2 },
            RO: { name: 'RO', id: 3 },
            GR: { name: 'GR', id: 4 },
            BE: { name: 'BE', id: 5 },
            LG: { name: 'LG', id: 6 },
            LBR: { name: 'LBR', id: 7 },
            DB: { name: 'DB', id: 8 },
            GE: { name: 'GE', id: 9 },
            OR: { name: 'OR', id: 10 },
            BL: { name: 'BL', id: 11 },
            PAL: { name: 'PAL', id: 12 },
            LBL: { name: 'LBL', id: 13 },
          };
          
        // Example usage:
        const searchCode = (code) => codeMap[code] || null;
        
        //searchCode(object.name).id; // 9 (GE)

    
        sendDataToFlutter(searchCode(object.name).id);

          

    }
}

function sendDataToFlutter(data) {

    // Send data to Flutter through the flutter channel
    console.log("Sending data to Flutter:", data);
    if(window.FlutterChannel) {
        window.FlutterChannel.postMessage(JSON.stringify(data));
    } else {
        console.warn("No flutter channel connected.");
    }
    
}

function getBodyPartFromId(id) {
    switch (id) {
        case 1: return 'RZ';
        case 2: return 'PAR';
        case 3: return 'RO';
        case 4: return 'GR';
        case 5: return 'BE';
        case 6: return 'LG';
        case 7: return 'LBR';
        case 8: return 'DB';
        case 9: return 'GE';
        case 10: return 'OR';
        case 11: return 'BL';
        case 12: return 'PAL';
        case 13: return 'LBL';
        default: return null;
    }
}

function toggleBodyPartColor(part, bool) {

    if(part.length == 1) {
        part = getBodyPartFromId(part);
    }
    
    scene.traverse((object) => {
       if(object.name == part) {
        //Clone and store original color to turn the color back if needed. 
        //Color it.
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

            if (bool) {
                object.material.color.setHex(0xff0000); // Red highlight
                object.userData.isHighlighted = true;
            } else {
                object.material.color.copy(object.userData.originalColor); // Restore original color
                object.userData.isHighlighted = false;
            }
        }
       }
    });


    }


/**
 * Load the 3D model
 */
function loadModel(_modelPath = man_model_colored) {

    
    let modelPath = `https://wjs-dev.github.io/3dwebserver/assets/${_modelPath}`;

    const loader = new GLTFLoader();
    loader.load(
        modelPath,
        function (gltf) {
            _gltf = gltf;
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