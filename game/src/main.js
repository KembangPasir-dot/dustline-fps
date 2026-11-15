import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { WeaponSystem, WEAPONS } from './weapon.js';
import { Bot } from './bots.js';
import { RoundManager } from './rounds.js';
import { HUD } from './hud.js';
import { InputManager } from './input.js';
import { audio } from './audio.js';
import { PALETTE } from './palette.js';

// Query params & screenshot hook support
const urlParams = new URLSearchParams(window.location.search);
const shotMode = urlParams.get('shot');
const seed = parseInt(urlParams.get('seed') || '1', 10);

// Seeded random for deterministic screenshots
let seedVal = seed;
Math.random = function() {
  seedVal = (seedVal * 9301 + 49297) % 233280;
  return seedVal / 233280;
};

// Setup Three.js scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.FogExp2(PALETTE.sky, 0.012);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xfffaed, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
dirLight.position.set(60, 120, 60);
dirLight.castShadow = true;
scene.add(dirLight);

// Systems
const world = new World(scene);
const player = new Player(camera, world);
const weaponSystem = new WeaponSystem(scene, camera, world);
const roundManager = new RoundManager();
const hud = new HUD();
const input = new InputManager(renderer.domElement);

// Bots (5 Vanguard attackers + 5 Jackal defenders)
const bots = [];
for (let i = 0; i < 4; i++) bots.push(new Bot(scene, world, 'vanguard', i === 0));
for (let i = 0; i < 5; i++) bots.push(new Bot(scene, world, 'jackal'));

// Event listeners
let buyMenuOpen = false;

input.on('keydown', (code) => {
  audio.init();
  if (code === 'KeyB') {
    if (roundManager.state === 'buy') {
      buyMenuOpen = !buyMenuOpen;
      hud.toggleBuyMenu(buyMenuOpen);
      if (buyMenuOpen && document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }
  if (code === 'KeyR') {
    weaponSystem.reload();
  }
  if (code === 'Digit1') weaponSystem.switchWeapon('pistol');
  if (code === 'Digit2') weaponSystem.switchWeapon('rifle');
  if (code === 'Digit3') weaponSystem.switchWeapon('smg');
  if (code === 'Digit4') weaponSystem.switchWeapon('sniper');
  if (code === 'Digit5') weaponSystem.switchWeapon('grenade');
});

// Buy menu UI clicks
document.querySelectorAll('.buy-item').forEach(item => {
  item.addEventListener('click', () => {
    const itemName = item.getAttribute('data-item');
    let weaponKey = itemName;
    if (itemName === 'armor') {
      if (player.money >= 650) {
        player.money -= 650;
        player.armor = 100;
        audio.playClick();
      }
      return;
    }
    const w = WEAPONS[weaponKey];
    if (w && player.money >= w.price) {
      player.money -= w.price;
      w.owned = true;
      weaponSystem.switchWeapon(weaponKey);
      audio.playClick();
    }
  });
});

// Start Screen button
document.getElementById('start-btn').addEventListener('click', () => {
  audio.init();
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  renderer.domElement.requestPointerLock();
  roundManager.state = 'live';
});

// Restart button
document.getElementById('restart-btn').addEventListener('click', () => {
  window.location.reload();
});

// Handle screenshot hook setup
if (shotMode) {
  window.__shotMode = true;
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';

  if (shotMode === 'start') {
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
    camera.position.set(0, 18, 45);
    camera.lookAt(0, 0, 0);
  } else if (shotMode === 'buy') {
    buyMenuOpen = true;
    hud.toggleBuyMenu(true);
    roundManager.state = 'buy';
    player.position.set(0, 0, 10);
    camera.position.copy(player.position).add(new THREE.Vector3(0, player.eyeHeight, 0));
  } else if (shotMode === 'play') {
    roundManager.state = 'live';
    player.position.set(0, 0, 10);
    camera.position.copy(player.position).add(new THREE.Vector3(0, player.eyeHeight, 0));
    camera.lookAt(0, 1.5, -10);
    // Position bots visibly in medium range
    if (bots.length >= 8) {
      bots[5].position.set(-2.5, 0, -6);
      bots[5].mesh.position.copy(bots[5].position).add(new THREE.Vector3(0, 0.85, 0));
      bots[6].position.set(2.0, 0, -8);
      bots[6].mesh.position.copy(bots[6].position).add(new THREE.Vector3(0, 0.85, 0));
      bots[7].position.set(0.5, 0, -5);
      bots[7].mesh.position.copy(bots[7].position).add(new THREE.Vector3(0, 0.85, 0));
    }
    weaponSystem.muzzleFlash.visible = true;
  } else if (shotMode === 'end') {
    roundManager.state = 'ended';
    roundManager.roundNum = 5;
    roundManager.vanguardWins = 5;
    roundManager.jackalWins = 3;
    roundManager.timer = 0;
    for (const b of bots) {
      if (b.team === 'jackal') {
        b.alive = false;
        b.mesh.visible = false;
      }
    }
    hud.showBanner('ROUND WON', 'Vanguard eliminated the Jackals');
  }

  renderer.render(scene, camera);
  setTimeout(() => {
    renderer.render(scene, camera);
    window.__shotReady = true;
  }, 150);
}

// Main Game Loop
let lastTime = performance.now();

function animate(currentTime) {
  requestAnimationFrame(animate);

  const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
  lastTime = currentTime;

  if (!window.__shotMode && roundManager.state !== 'buy' && !roundManager.matchOver) {
    player.update(dt, input);
    weaponSystem.update(dt, input, bots, (hit) => {
      hud.showHitmarker();
      if (!hit.target.alive) {
        player.money += 300;
        hud.addKill(`Vanguard killed Jackal (${hit.hitZone})`);
      }
    });

    // Update bots
    const enemies = [player, ...bots.filter(b => b.team !== bots[0].team)];
    for (const bot of bots) {
      const result = bot.update(dt, player, bots, (attacker, victim) => {
        if (victim === player) {
          player.takeDamage(25);
        }
      });
      if (result === 'planted') {
        roundManager.plantBomb('A');
      }
    }

    roundManager.update(dt, player, bots);
  }

  hud.update(player, weaponSystem, roundManager, bots);
  input.clearDelta();

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
