import * as THREE from 'three';
import { audio } from './audio.js';

export class Bot {
  constructor(scene, world, team, isLeader = false) {
    this.scene = scene;
    this.world = world;
    this.team = team; // 'vanguard' (attacker) or 'jackal' (defender)
    this.isLeader = isLeader;

    this.position = new THREE.Vector3(
      team === 'vanguard' ? (Math.random() - 0.5) * 10 : (Math.random() - 0.5) * 40,
      0,
      team === 'vanguard' ? 45 + (Math.random() - 0.5) * 5 : -40 + (Math.random() - 0.5) * 10
    );
    this.velocity = new THREE.Vector3();
    this.rotation = 0;

    this.hp = 100;
    this.alive = true;
    this.speed = 4.5;

    // AI state
    this.state = team === 'vanguard' ? 'advance' : 'hold';
    this.targetNodeIndex = 0;
    this.reactionTimer = 0;
    this.shootCooldown = 0;
    this.hasBomb = isLeader && team === 'vanguard';
    this.isPlanting = false;
    this.plantProgress = 0;

    // Visual mesh
    const geom = new THREE.BoxGeometry(0.8, 1.7, 0.8);
    const mat = new THREE.MeshLambertMaterial({ color: team === 'vanguard' ? 0x22aa44 : 0xcc3333 });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.copy(this.position).add(new THREE.Vector3(0, 0.85, 0));
    this.scene.add(this.mesh);
  }

  update(dt, player, enemies, onShoot) {
    if (!this.alive) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    // AI logic & movement
    let targetPos = null;

    if (this.team === 'vanguard') {
      // Attackers advance to Site A or B
      const site = this.world.siteA;
      if (this.position.distanceTo(site) < 5) {
        if (this.hasBomb && !this.isPlanting) {
          this.isPlanting = true;
          this.plantProgress = 0;
        }
      }
      if (this.isPlanting) {
        this.plantProgress += dt;
        if (this.plantProgress >= 3.0) {
          this.isPlanting = false;
          return 'planted'; // bomb planted
        }
        return;
      }
      targetPos = site;
    } else {
      // Defenders hold sites or patrol
      targetPos = this.world.siteA;
    }

    if (targetPos) {
      const dir = new THREE.Vector3().subVectors(targetPos, this.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 2) {
        dir.normalize();
        this.velocity.copy(dir).multiplyScalar(this.speed);
        this.position.addScaledVector(this.velocity, dt);
        this.rotation = Math.atan2(dir.x, dir.z);
      }
    }

    this.mesh.position.copy(this.position).add(new THREE.Vector3(0, 0.85, 0));
    this.mesh.rotation.y = this.rotation;

    // Combat reaction against enemies
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const distToEnemy = this.position.distanceTo(enemy.position);
      if (distToEnemy < 25) {
        // Line of sight check
        this.shootCooldown -= dt;
        if (this.shootCooldown <= 0) {
          this.shootCooldown = 0.5 + Math.random() * 0.5;
          audio.playShot('rifle');
          if (Math.random() < 0.4) {
            enemy.takeDamage(25);
            if (onShoot) onShoot(this, enemy);
          }
        }
        break;
      }
    }
    return null;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.mesh.visible = false;
    }
  }

  reset(pos) {
    this.position.copy(pos);
    this.hp = 100;
    this.alive = true;
    this.mesh.visible = true;
    this.isPlanting = false;
    this.plantProgress = 0;
  }
}
