import * as THREE from 'three';
import { audio } from './audio.js';

export const WEAPONS = {
  pistol: { name: 'GLOCK PISTOL', damage: 30, fireRate: 4, magSize: 12, reserve: 36, reloadTime: 1.5, type: 'pistol', price: 0, owned: true },
  rifle: { name: 'VPR-74 RIFLE', damage: 35, fireRate: 10, magSize: 30, reserve: 90, reloadTime: 2.2, type: 'rifle', price: 2700, owned: false },
  smg: { name: 'CX-9 SMG', damage: 24, fireRate: 14, magSize: 25, reserve: 100, reloadTime: 1.8, type: 'smg', price: 1500, owned: false },
  sniper: { name: 'HSR-50 SNIPER', damage: 105, fireRate: 1.2, magSize: 5, reserve: 15, reloadTime: 3.0, type: 'sniper', price: 4750, owned: false },
  grenade: { name: 'FRAG GRENADE', damage: 90, fireRate: 0.5, magSize: 1, reserve: 0, reloadTime: 0, type: 'grenade', price: 300, owned: false }
};

export class WeaponSystem {
  constructor(scene, camera, world) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;

    this.currentKey = 'pistol';
    this.weapon = WEAPONS[this.currentKey];
    this.mag = this.weapon.magSize;
    this.reserve = this.weapon.reserve;

    this.lastShotTime = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.recoilPitch = 0;

    // Viewmodel weapon mesh representation
    this.meshGroup = new THREE.Group();
    const geom = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const mat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    this.viewMesh = new THREE.Mesh(geom, mat);
    this.viewMesh.position.set(0.2, -0.2, -0.4);
    this.meshGroup.add(this.viewMesh);
    this.camera.add(this.meshGroup);
  }

  switchWeapon(key) {
    if (!WEAPONS[key] || !WEAPONS[key].owned) return;
    this.currentKey = key;
    this.weapon = WEAPONS[key];
    this.mag = this.weapon.magSize;
    this.reserve = this.weapon.reserve;
    this.reloading = false;
    audio.playClick();
  }

  reload() {
    if (this.reloading || this.mag === this.weapon.magSize || this.reserve <= 0 || this.weapon.type === 'grenade') return;
    this.reloading = true;
    this.reloadTimer = this.weapon.reloadTime;
    audio.playClick();
  }

  update(dt, input, targets, onHit) {
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        const needed = this.weapon.magSize - this.mag;
        const reloadAmount = Math.min(needed, this.reserve);
        this.mag += reloadAmount;
        this.reserve -= reloadAmount;
      }
      return;
    }

    // Weapon sway / recoil decay
    this.recoilPitch *= Math.max(0, 1 - dt * 10);
    this.camera.rotation.x += this.recoilPitch * dt;

    const now = performance.now() / 1000;
    const fireInterval = 1 / this.weapon.fireRate;

    const triggerPulled = this.weapon.type === 'pistol' || this.weapon.type === 'sniper' || this.weapon.type === 'grenade'
      ? input.mouse.buttons.left && !this._lastLeft
      : input.mouse.buttons.left;

    this._lastLeft = input.mouse.buttons.left;

    if (triggerPulled && now - this.lastShotTime >= fireInterval) {
      if (this.mag > 0) {
        this.mag--;
        this.lastShotTime = now;
        this.recoilPitch = this.weapon.type === 'sniper' ? 0.3 : 0.08;
        audio.playShot(this.weapon.type);

        if (this.weapon.type === 'grenade') {
          // Grenade throw logic
        } else {
          // Raycast hitscan
          const raycaster = new THREE.Raycaster();
          const center = new THREE.Vector2(0, 0);
          raycaster.setFromCamera(center, this.camera);

          // Check world hit
          const hit = this.world.raycast(raycaster.ray.origin, raycaster.ray.direction, 500);

          // Check targets (bots / player)
          let bestHit = null;
          let bestDist = hit ? hit.distance : 500;

          for (const target of targets) {
            if (!target.alive) continue;
            // Bounding sphere / box check for target
            const targetBox = new THREE.Box3(
              new THREE.Vector3(target.position.x - 0.4, target.position.y, target.position.z - 0.4),
              new THREE.Vector3(target.position.x + 0.4, target.position.y + 1.7, target.position.z + 0.4)
            );
            const intersectPoint = new THREE.Vector3();
            if (raycaster.ray.intersectBox(targetBox, intersectPoint)) {
              const dist = this.camera.position.distanceTo(intersectPoint);
              if (dist < bestDist) {
                bestDist = dist;
                // Hitbox detection: Head (top 0.3m), Torso (middle), Limbs (bottom)
                const relY = intersectPoint.y - target.position.y;
                let multiplier = 1.0;
                let hitZone = 'torso';
                if (relY >= 1.4) {
                  multiplier = 4.0;
                  hitZone = 'head';
                } else if (relY <= 0.6) {
                  multiplier = 0.75;
                  hitZone = 'limb';
                }
                bestHit = { target, damage: this.weapon.damage * multiplier, hitZone };
              }
            }
          }

          if (bestHit) {
            bestHit.target.takeDamage(bestHit.damage);
            audio.playHit();
            if (onHit) onHit(bestHit);
          }
        }
      } else {
        if (triggerPulled) audio.playClick();
      }
    }
  }
}
