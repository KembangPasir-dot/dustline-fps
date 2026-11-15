import * as THREE from 'three';
import { PALETTE } from './palette.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // { min: THREE.Vector3, max: THREE.Vector3 }
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

  buildMap() {
    // Ground (Dustline Yard arena: 100x100)
    const groundGeom = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshLambertMaterial({ color: PALETTE.ground });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Sky dome / ambient lighting handled in main.

    // Perimeter Walls (Compound bounds)
    const wallHeight = 8;
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

    // Site A: Warehouse (North-East)
    this.addBox(35, 0, -35, 30, 6, 25, PALETTE.wall);
    // Warehouse interior cutout / cover crates inside A
    this.addBox(30, 0, -30, 6, 3, 6, PALETTE.crate);
    this.addBox(40, 0, -40, 6, 3, 6, PALETTE.crate);

    // Site B: Silos (South-West)
    this.addBox(-35, 0, 35, 25, 7, 25, PALETTE.metal);
    // Silo cover crates
    this.addBox(-30, 0, 30, 5, 4, 5, PALETTE.crate);
    this.addBox(-40, 0, 40, 5, 4, 5, PALETTE.crate);

    // Mid Lane obstacles & cover crates
    this.addBox(0, 0, 0, 8, 4, 16, PALETTE.rust); // Mid container
    this.addBox(-15, 0, -10, 6, 3, 6, PALETTE.crate);
    this.addBox(15, 0, 10, 6, 3, 6, PALETTE.crate);
    this.addBox(-15, 0, 15, 8, 3, 4, PALETTE.crate);
    this.addBox(15, 0, -15, 8, 3, 4, PALETTE.crate);

    // Bomb site markers (visual pads)
    const ringGeom = new THREE.RingGeometry(4, 5, 32);
    ringGeom.rotateX(-Math.PI / 2);
    
    const padA = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: PALETTE.siteA, side: THREE.DoubleSide }));
    padA.position.set(this.siteA.x, 0.05, this.siteA.z);
    this.scene.add(padA);

    const padB = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: PALETTE.siteB, side: THREE.DoubleSide }));
    padB.position.set(this.siteB.x, 0.05, this.siteB.z);
    this.scene.add(padB);
  }

  buildNavGraph() {
    // Waypoints for bot navigation (nodes across map)
    this.navNodes = [
      { id: 0, pos: new THREE.Vector3(0, 0, 40), neighbors: [1, 2] }, // T spawn
      { id: 1, pos: new THREE.Vector3(-20, 0, 20), neighbors: [0, 3, 5] },
      { id: 2, pos: new THREE.Vector3(20, 0, 20), neighbors: [0, 4, 6] },
      { id: 3, pos: new THREE.Vector3(-35, 0, 10), neighbors: [1, 7] }, // Towards B
      { id: 4, pos: new THREE.Vector3(35, 0, -10), neighbors: [2, 8] }, // Towards A
      { id: 5, pos: new THREE.Vector3(-10, 0, 0), neighbors: [1, 2, 7] }, // Mid
      { id: 6, pos: new THREE.Vector3(10, 0, 0), neighbors: [1, 2, 8] }, // Mid
      { id: 7, pos: new THREE.Vector3(-35, 0, 35), neighbors: [3, 5] }, // Site B
      { id: 8, pos: new THREE.Vector3(35, 0, -35), neighbors: [4, 6] }  // Site A
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
    // Simple raycast against colliders
    let closestDist = maxDist;
    let hit = null;

    for (const c of this.colliders) {
      // Ray-box intersection
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
