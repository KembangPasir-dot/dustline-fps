import * as THREE from 'three';

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;

    this.position = new THREE.Vector3(0, 0, 45); // T Spawn
    this.velocity = new THREE.Vector3();
    this.rotation = { pitch: 0, yaw: 0 };

    this.radius = 0.5;
    this.height = 1.7;
    this.eyeHeight = 1.5;

    this.hp = 100;
    this.maxHp = 100;
    this.armor = 0;
    this.money = 800;
    this.alive = true;

    this.speed = 6.0;
    this.walkSpeed = 3.0;
    this.crouchSpeed = 2.5;
    this.jumpForce = 7.0;
    this.gravity = 20.0;

    this.isGrounded = false;
    this.isCrouching = false;
    this.isWalking = false;

    this.camera.position.copy(this.position).add(new THREE.Vector3(0, this.eyeHeight, 0));
  }

  update(dt, input) {
    if (!this.alive) return;

    // Mouse look
    const sensitivity = 0.002;
    this.rotation.yaw -= input.mouse.dx * sensitivity;
    this.rotation.pitch -= input.mouse.dy * sensitivity;
    this.rotation.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.rotation.pitch));

    const euler = new THREE.Euler(this.rotation.pitch, this.rotation.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // Movement input
    let currentSpeed = this.speed;
    if (input.keys['ShiftLeft'] || input.keys['ShiftRight']) {
      currentSpeed = this.walkSpeed;
      this.isWalking = true;
    } else {
      this.isWalking = false;
    }

    if (input.keys['ControlLeft'] || input.keys['ControlRight']) {
      this.isCrouching = true;
      currentSpeed = this.crouchSpeed;
      this.height = 1.2;
      this.eyeHeight = 1.0;
    } else {
      this.isCrouching = false;
      this.height = 1.7;
      this.eyeHeight = 1.5;
    }

    const moveDir = new THREE.Vector3();
    if (input.keys['KeyW']) moveDir.z -= 1;
    if (input.keys['KeyS']) moveDir.z += 1;
    if (input.keys['KeyA']) moveDir.x -= 1;
    if (input.keys['KeyD']) moveDir.x += 1;
    moveDir.normalize();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.yaw);

    // Acceleration & Friction
    const targetVelX = moveDir.x * currentSpeed;
    const targetVelZ = moveDir.z * currentSpeed;

    this.velocity.x += (targetVelX - this.velocity.x) * (this.isGrounded ? 15.0 : 5.0) * dt;
    this.velocity.z += (targetVelZ - this.velocity.z) * (this.isGrounded ? 15.0 : 5.0) * dt;

    // Gravity & Jump
    if (this.isGrounded) {
      if (input.keys['Space']) {
        this.velocity.y = this.jumpForce;
        this.isGrounded = false;
      } else {
        this.velocity.y = 0;
      }
    } else {
      this.velocity.y -= this.gravity * dt;
    }

    // Apply movement with AABB collision
    const deltaPos = this.velocity.clone().multiplyScalar(dt);
    
    // X axis collision
    this.position.x += deltaPos.x;
    if (this.checkCollisionBox()) {
      this.position.x -= deltaPos.x;
      this.velocity.x = 0;
    }

    // Z axis collision
    this.position.z += deltaPos.z;
    if (this.checkCollisionBox()) {
      this.position.z -= deltaPos.z;
      this.velocity.z = 0;
    }

    // Y axis collision
    this.position.y += deltaPos.y;
    if (this.checkCollisionBox()) {
      if (this.velocity.y < 0) {
        this.isGrounded = true;
      }
      this.position.y -= deltaPos.y;
      this.velocity.y = 0;
    } else {
      this.isGrounded = false;
    }

    // Update camera position
    this.camera.position.copy(this.position).add(new THREE.Vector3(0, this.eyeHeight, 0));
  }

  checkCollisionBox() {
    const box = {
      min: new THREE.Vector3(this.position.x - this.radius, this.position.y, this.position.z - this.radius),
      max: new THREE.Vector3(this.position.x + this.radius, this.position.y + this.height, this.position.z + this.radius)
    };
    return this.world.checkCollision(box);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  reset(pos) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.hp = this.maxHp;
    this.alive = true;
  }
}
