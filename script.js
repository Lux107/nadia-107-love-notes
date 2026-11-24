
import * as THREE from 'three';

// 1. Basic scene
const scene = new THREE.Scene();

const container = document.getElementById('scene');

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
);

camera.position.z = 6;

// 2. Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

container.appendChild(renderer.domElement);

// 3. Lighting
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(3, 4, 5);
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff, 1.5));

// 4. Create paper texture
const canvas = document.createElement('canvas');
canvas.width = 1600;
canvas.height = 420;

const context = canvas.getContext('2d');

const texture = new THREE.CanvasTexture(canvas);
texture.colorSpace = THREE.SRGBColorSpace;

// Draw a message onto the paper
function drawMessage(message) {
    context.fillStyle = '#fff8f0';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#493b42';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold 65px Georgia';

    // Wrap longer messages
    const words = message.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
        const testLine = line + word + ' ';

        if (context.measureText(testLine).width > 1350) {
            lines.push(line);
            line = word + ' ';
        } else {
            line = testLine;
        }
    }

    lines.push(line);

    const lineHeight = 85;
    const startY = canvas.height / 2 -
        ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((text, index) => {
        context.fillText(
            text.trim(),
            canvas.width / 2,
            startY + index * lineHeight
        );
    });

    texture.needsUpdate = true;
}

// 5. Create the paper
const geometry = new THREE.BoxGeometry(3.5, 0.12, 0.9);

const paperSide = new THREE.MeshStandardMaterial({
    color: 0xfff8f0,
    roughness: 0.9
});

const paperFront = new THREE.MeshBasicMaterial({
    map: texture
});

const materials = [
    paperSide, // Right
    paperSide, // Left
    paperFront, // Top - message
    paperSide, // Bottom
    paperSide, // Front
    paperSide  // Back
];

const cube = new THREE.Mesh(geometry, materials);
scene.add(cube);

// 6. Load messages
let phrases = [];
let currentPhrase = -1;

async function loadPhrases() {
    try {
        const response = await fetch(
            `${import.meta.env.BASE_URL}phrases.json`
        );

        if (!response.ok) {
            throw new Error('Could not load phrases.json');
        }

        const data = await response.json();
        phrases = data.phrases;

        showRandomPhrase();

    } catch (error) {
        console.error(error);
        drawMessage('A little love for you ♡');
    }
}

// Choose a random message
function showRandomPhrase() {
    if (phrases.length === 0) return;

    let nextPhrase = currentPhrase;

    if (phrases.length > 1) {
        while (nextPhrase === currentPhrase) {
            nextPhrase = Math.floor(Math.random() * phrases.length);
        }
    } else {
        nextPhrase = 0;
    }

    currentPhrase = nextPhrase;
    drawMessage(phrases[currentPhrase].text);
}

loadPhrases();


// 7. Paper movement
let paperState = 'entering';

const clock = new THREE.Clock();

cube.position.x = -7;
cube.rotation.y = -0.4;

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = Date.now() * 0.001;

    if (paperState === 'entering') {
        cube.position.x += delta * 11;

        // Magical entrance rotation
        cube.rotation.y += delta * 2.5;

        cube.position.y = Math.sin(time * 3) * 0.085;

        if (cube.position.x >= 0) {
            cube.position.x = 0;
            cube.rotation.y = 0;
            paperState = 'floating';
        }
    }

    if (paperState === 'floating') {
        cube.position.y = Math.sin(time * 1.5) * 0.2;

        cube.rotation.x =
            Math.PI / 2 + Math.sin(time * 1.2) * 0.087;

        cube.rotation.z = Math.sin(time * 0.8) * 0.025;
    }

    if (paperState === 'leaving') {
        cube.position.x += delta * 7;

        // Rotate as it flies away
        cube.rotation.y += delta * 3;
        cube.rotation.z += delta * 1.5;

        if (cube.position.x > 8) {
            // Prepare the next paper
            showRandomPhrase();

            cube.position.x = -7;
            cube.position.y = 0;
            cube.rotation.set(Math.PI / 2, -0.4, 0);

            paperState = 'entering';
        }
    }

    renderer.render(scene, camera);
}

animate();

// 8. Click the paper
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event) => {
    if (paperState !== 'floating') return;

    const rect = renderer.domElement.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObject(cube);

    if (hits.length > 0) {
        paperState = 'leaving';
    }
});
