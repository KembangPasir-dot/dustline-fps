import * as THREE from 'three';
import { audio } from './audio.js';

export const WEAPONS = {
  pistol: { name: 'P9 SIDEARM', damage: 30, fireRate: 4, magSize: 12, reserve: 36, reloadTime: 1.5, type: 'pistol', price: 0, owned: true },
  rifle: { name: 'MARAUDER RIFLE', damage: 35, fireRate: 10, magSize: 30, reserve: 90, reloadTime: 2.2, type: 'rifle', price: 2700, owned: false },
  smg: { name: 'HORNET SMG', damage: 24, fireRate: 14, magSize: 25, reserve: 100, reloadTime: 1.8, type: 'smg', price: 1500, owned: false },
  sniper: { name: 'LONGSHOT SNIPER', damage: 105, fireRate: 1.2, magSize: 5, reserve: 15, reloadTime: 3.0, type: 'sniper', price: 4750, owned: false },
  grenade: { name: 'IMPACT GRENADE', damage: 90, fireRate: 0.5, magSize: 1, reserve: 0, reloadTime: 0, type: 'grenade', price: 300, owned: false }
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
    this.muzzleFlashTimer = 0;

    // Viewmodel weapon mesh representation (low-poly gun model)
    this.meshGroup = new THREE.Group();
    
    // Receiver / Body
    const receiverGeom = new THREE.BoxGeometry(0.08, 0.1, 0.35);
    const receiverMat = new THREE.MeshLambertMaterial({ color: 0x33383d });
    this.receiverMesh = new THREE.Mesh(receiverGeom, receiverMat);
    this.receiverMesh.position.set(0.18, -0.22, -0.35);
    this.meshGroup.add(this.receiverMesh);

    // Barrel
    const barrelGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8);
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    this.barrelMesh = new THREE.Mesh(barrelGeom, barrelMat);
    this.barrelMesh.rotation.x = Math.PI / 2;
    this.barrelMesh.position.set(0.18, -0.2, -0.52);
    this.meshGroup.add(this.barrelMesh);

    // Grip / Handle
    const gripGeom = new THREE.BoxGeometry(0.06, 0.15, 0.08);
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    this.gripMesh = new THREE.Mesh(gripGeom, gripMat);
    this.gripMesh.rotation.x = -0.2;
    this.gripMesh.position.set(0.18, -0.32, -0.28);
    this.meshGroup.add(this.gripMesh);

    // Magazine
    const magGeom = new THREE.BoxGeometry(0.05, 0.14, 0.07);
    const magMat = new THREE.MeshLambertMaterial({ color: 0x444b52 });
    this.magMesh = new THREE.Mesh(magGeom, magMat);
    this.magMesh.position.set(0.18, -0.34, -0.38);
    this.meshGroup.add(this.magMesh);

    // Muzzle Flash
    const flashGeom = new THREE.BoxGeometry(0.08, 0.08, 0.12);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    this.muzzleFlash = new THREE.Mesh(flashGeom, flashMat);
    this.muzzleFlash.position.set(0.18, -0.2, -0.68);
    this.muzzleFlash.visible = false;
    this.meshGroup.add(this.muzzleFlash);

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
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlash.visible = false;
      }
    }

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
    this.recoilPitch *= Math.max(0, 1 - dt * 12);
    this.camera.rotation.x += this.recoilPitch * dt;
    // Recoil visual kick on viewmodel
    this.meshGroup.position.z = -0.35 + this.recoilPitch * 0.2;
    this.meshGroup.position.y = -0.22 + this.recoilPitch * 0.1;

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
        this.recoilPitch = this.weapon.type === 'sniper' ? 0.35 : this.weapon.type === 'rifle' ? 0.12 : 0.08;
        this.muzzleFlash.visible = true;
        this.muzzleFlashTimer = 0.06;
        audio.playShot(this.weapon.type);

        if (this.weapon.type === 'grenade') {
          // Grenade throw logic
        } else {
          // Raycast hitscan
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

          let bestHit = null;
          let bestDist = 500;

          for (const target of targets) {
            if (!target.alive) continue;
            const targetBox = new THREE.Box3(
              new THREE.Vector3(target.position.x - 0.5, target.position.y, target.position.z - 0.5),
              new THREE.Vector3(target.position.x + 0.5, target.position.y + 1.8, target.position.z + 0.5)
            );
            const intersectPoint = new THREE.Vector3();
            if (raycaster.ray.intersectBox(targetBox, intersectPoint)) {
              const dist = this.camera.position.distanceTo(intersectPoint);
              if (dist < bestDist) {
                bestDist = dist;
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
