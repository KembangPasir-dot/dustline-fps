import * as THREE from 'three';
import { PALETTE } from './palette.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.navNodes = [];
    this.siteA = new THREE.Vector3(35, 0, -35);
    this.siteB = new THREE.Vector3(-35, 0, 35);

    this.buildMap();
    this.buildNavGraph();
  }

  addBox(x, y, z, w, h, d, color) {
    const geom = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const min = new THREE.Vector3(x - w / 2, y, z - d / 2);
    const max = new THREE.Vector3(x + w / 2, y + h, z + d / 2);
    this.colliders.push({ min, max, mesh });
    return mesh;
  }

  addCylinder(x, y, z, radiusTop, radiusBottom, height, color) {
    const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y + height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const min = new THREE.Vector3(x - radiusBottom, y, z - radiusBottom);
    const max = new THREE.Vector3(x + radiusBottom, y + height, z + radiusBottom);
    this.colliders.push({ min, max, mesh });
    return mesh;
  }

  buildMap() {
    // Ground (Dustline Yard arena: 120x120)
    const groundGeom = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshLambertMaterial({ color: PALETTE.ground });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Perimeter Walls (Compound bounds)
    const wallHeight = 10;
    const wallThickness = 2;
    const size = 100;
    
    // North wall
    this.addBox(0, 0, -size / 2, size, wallHeight, wallThickness, PALETTE.wall);
    // South wall
    this.addBox(0, 0, size / 2, size, wallHeight, wallThickness, PALETTE.wall);
    // East wall
    this.addBox(size / 2, 0, 0, wallThickness, wallHeight, size, PALETTE.wall);
    // West wall
    this.addBox(-size / 2, 0, 0, wallThickness, wallHeight, size, PALETTE.wall);

    // Site A: Taller Warehouse & Roof Structure (North-East)
    this.addBox(35, 0, -35, 32, 9, 28, PALETTE.wall);
    // Warehouse roof trim / upper level
    this.addBox(35, 9, -35, 28, 3, 24, PALETTE.rust);
    // Warehouse interior cover crates & barriers
    this.addBox(28, 0, -28, 6, 3.5, 6, PALETTE.crate);
    this.addBox(42, 0, -42, 6, 3.5, 6, PALETTE.crate);
    this.addBox(35, 0, -26, 8, 3, 4, PALETTE.crate);

    // Site B: Silo Cylinders & Structures (South-West)
    this.addCylinder(-35, 0, 35, 4, 4.5, 14, PALETTE.metal);
    this.addCylinder(-25, 0, 30, 3, 3.5, 10, PALETTE.metal);
    this.addBox(-35, 0, 35, 26, 6, 26, PALETTE.wall);
    // Silo area cover crates & barrels
    this.addBox(-30, 0, 26, 5, 4, 5, PALETTE.crate);
    this.addBox(-42, 0, 42, 5, 4, 5, PALETTE.crate);
    this.addBox(-26, 0, 40, 4, 3, 8, PALETTE.crate);

    // Mid Lane obstacles, shipping containers & cover
    this.addBox(0, 0, 0, 10, 4.5, 18, PALETTE.rust); // Central Cargo Container
    this.addBox(0, 4.5, 0, 8, 2, 14, PALETTE.metal); // Upper container ridge
    this.addBox(-16, 0, -12, 7, 3.5, 7, PALETTE.crate);
    this.addBox(16, 0, 12, 7, 3.5, 7, PALETTE.crate);
    this.addBox(-18, 0, 16, 9, 3, 5, PALETTE.crate);
    this.addBox(18, 0, -16, 9, 3, 5, PALETTE.crate);
    this.addBox(0, 0, -22, 12, 3, 4, PALETTE.crate); // Mid North wall cover
    this.addBox(0, 0, 22, 12, 3, 4, PALETTE.crate);  // Mid South wall cover

    // Bomb site markers (visual glowing pads)
    const ringGeom = new THREE.RingGeometry(4.5, 5.5, 32);
    ringGeom.rotateX(-Math.PI / 2);
    
    const padA = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: PALETTE.siteA, side: THREE.DoubleSide }));
    padA.position.set(this.siteA.x, 0.08, this.siteA.z);
    this.scene.add(padA);

    const padB = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: PALETTE.siteB, side: THREE.DoubleSide }));
    padB.position.set(this.siteB.x, 0.08, this.siteB.z);
    this.scene.add(padB);
  }

  buildNavGraph() {
    this.navNodes = [
      { id: 0, pos: new THREE.Vector3(0, 0, 40), neighbors: [1, 2] },
      { id: 1, pos: new THREE.Vector3(-20, 0, 20), neighbors: [0, 3, 5] },
      { id: 2, pos: new THREE.Vector3(20, 0, 20), neighbors: [0, 4, 6] },
      { id: 3, pos: new THREE.Vector3(-35, 0, 10), neighbors: [1, 7] },
      { id: 4, pos: new THREE.Vector3(35, 0, -10), neighbors: [2, 8] },
      { id: 5, pos: new THREE.Vector3(-10, 0, 0), neighbors: [1, 2, 7] },
      { id: 6, pos: new THREE.Vector3(10, 0, 0), neighbors: [1, 2, 8] },
      { id: 7, pos: new THREE.Vector3(-35, 0, 35), neighbors: [3, 5] },
      { id: 8, pos: new THREE.Vector3(35, 0, -35), neighbors: [4, 6] }
    ];
  }

  checkCollision(box) {
    for (const c of this.colliders) {
      if (
        box.min.x <= c.max.x && box.max.x >= c.min.x &&
        box.min.y <= c.max.y && box.max.y >= c.min.y &&
        box.min.z <= c.max.z && box.max.z >= c.min.z
      ) {
        return true;
      }
    }
    return false;
  }

  raycast(origin, direction, maxDist = 1000) {
    let closestDist = maxDist;
    let hit = null;

    for (const c of this.colliders) {
      const box = new THREE.Box3(c.min, c.max);
      const ray = new THREE.Ray(origin, direction);
      const intersectPoint = new THREE.Vector3();
      if (ray.intersectBox(box, intersectPoint)) {
        const dist = origin.distanceTo(intersectPoint);
        if (dist < closestDist) {
          closestDist = dist;
          hit = { point: intersectPoint, distance: dist, object: c.mesh };
        }
      }
    }
    return hit;
  }
}
