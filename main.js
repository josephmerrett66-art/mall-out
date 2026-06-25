const canvas = document.querySelector("#game");
const engine = new BABYLON.Engine(canvas, true, { antialias: true });
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.035, 0.037, 0.041, 1);
scene.collisionsEnabled = true;
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogColor = new BABYLON.Color3(0.055, 0.054, 0.052);
scene.fogDensity = 0.0042;
scene.imageProcessingConfiguration.contrast = 1.05;
scene.imageProcessingConfiguration.exposure = 1.26;

const glow = new BABYLON.GlowLayer("mallGlow", scene, {
  blurKernelSize: 28,
});
glow.intensity = 0.3;

const ui = {
  start: document.querySelector("#start"),
  startButton: document.querySelector("#startButton"),
  prompt: document.querySelector("#prompt"),
  notice: document.querySelector("#notice"),
  warmth: document.querySelector("#warmth"),
  hunger: document.querySelector("#hunger"),
  battery: document.querySelector("#battery"),
  wood: document.querySelector("#wood"),
  scrap: document.querySelector("#scrap"),
  food: document.querySelector("#food"),
};

const state = {
  wood: 0,
  scrap: 0,
  food: 1,
  warmth: 100,
  hunger: 100,
  battery: 100,
  buildMode: "barricade",
  focused: null,
  time: 0,
};

const materials = {};
function material(name, color, roughness = 0.82, metallic = 0) {
  const mat = new BABYLON.PBRMaterial(name, scene);
  mat.albedoColor = color;
  mat.roughness = roughness;
  mat.metallic = metallic;
  materials[name] = mat;
  return mat;
}

function makeTexture(name, size, painter) {
  const texture = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene);
  const ctx = texture.getContext();
  painter(ctx, size);
  texture.update();
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  return texture;
}

function addSharedSurfaceTextures() {
  const marbleTexture = makeTexture("sharedMarbleTexture", 512, (ctx, size) => {
    ctx.fillStyle = "#bdb6a8";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i++) {
      const v = 165 + Math.floor(Math.random() * 58);
      ctx.fillStyle = `rgba(${v},${v - 5},${v - 18},${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    ctx.strokeStyle = "rgba(82,70,60,0.34)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      const p = i * (size / 4);
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      const y = Math.random() * size;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + Math.random() * 70 - 35, size * 0.7, y + Math.random() * 70 - 35, size, y + Math.random() * 60 - 30);
      ctx.stroke();
    }
  });
  materials.marble.albedoTexture = marbleTexture;
  materials.marble.roughness = 0.28;

  const ceilingTexture = makeTexture("sharedCeilingTexture", 256, (ctx, size) => {
    ctx.fillStyle = "#333532";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(10,10,10,0.55)";
    ctx.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      const p = i * (size / 4);
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,232,170,0.2)";
    ctx.fillRect(size * 0.15, size * 0.46, size * 0.7, size * 0.08);
  });
  materials.ceiling.albedoTexture = ceilingTexture;

  const wallTexture = makeTexture("sharedWallTexture", 256, (ctx, size) => {
    ctx.fillStyle = "#d1cdbf";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(0, 0, size, size * 0.22);
    ctx.strokeStyle = "rgba(90,82,70,0.28)";
    ctx.lineWidth = 2;
    for (let y = size * 0.25; y < size; y += size * 0.25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  });
  materials.whiteWall.albedoTexture = wallTexture;

  const woodTexture = makeTexture("sharedWoodTexture", 256, (ctx, size) => {
    ctx.fillStyle = "#6b4728";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 8) {
      const v = 72 + Math.floor(Math.random() * 42);
      ctx.strokeStyle = `rgba(${v + 40},${v + 12},${v - 12},0.34)`;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * 4);
      ctx.bezierCurveTo(size * 0.3, y + Math.random() * 14 - 7, size * 0.7, y + Math.random() * 14 - 7, size, y + Math.random() * 4);
      ctx.stroke();
    }
  });
  materials.wood.albedoTexture = woodTexture;
  materials.wood.roughness = 0.52;

  const brushedMetal = makeTexture("sharedBrushedMetalTexture", 256, (ctx, size) => {
    ctx.fillStyle = "#8b8d8b";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 3) {
      const a = 0.06 + Math.random() * 0.1;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + Math.random() * 2);
      ctx.stroke();
    }
  });
  materials.scrap.albedoTexture = brushedMetal;
  materials.chrome.albedoTexture = brushedMetal;

  const shopBackTexture = makeTexture("sharedShopBackTexture", 256, (ctx, size) => {
    ctx.fillStyle = "#171819";
    ctx.fillRect(0, 0, size, size);
    for (let y = 18; y < size; y += 34) {
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.fillRect(0, y, size, 2);
    }
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 4, 1);
    }
  });
  materials.shopDark.albedoTexture = shopBackTexture;

  const fabricTexture = makeTexture("sharedFabricTexture", 256, (ctx, size) => {
    ctx.fillStyle = "#355d7c";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < size; i += 9) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  });
  materials.seat.albedoTexture = fabricTexture;
}

material("floor", new BABYLON.Color3(0.5, 0.48, 0.43), 0.5);
material("marble", new BABYLON.Color3(0.77, 0.74, 0.66), 0.31);
material("tileAlt", new BABYLON.Color3(0.68, 0.66, 0.6), 0.39);
material("grout", new BABYLON.Color3(0.32, 0.3, 0.27), 0.76);
material("floorTrim", new BABYLON.Color3(0.28, 0.22, 0.18), 0.48);
material("ceiling", new BABYLON.Color3(0.2, 0.205, 0.2), 0.74);
material("wall", new BABYLON.Color3(0.58, 0.54, 0.48));
material("whiteWall", new BABYLON.Color3(0.82, 0.8, 0.74), 0.58);
material("shopDark", new BABYLON.Color3(0.085, 0.085, 0.083), 0.7);
material("shopGlass", new BABYLON.Color3(0.42, 0.64, 0.68), 0.035, 0.05);
materials.shopGlass.alpha = 0.27;
material("railGlass", new BABYLON.Color3(0.62, 0.82, 0.84), 0.025, 0.02);
materials.railGlass.alpha = 0.32;
material("chrome", new BABYLON.Color3(0.78, 0.76, 0.68), 0.16, 0.85);
material("skylight", new BABYLON.Color3(0.72, 0.9, 1), 0.08);
materials.skylight.alpha = 0.24;
material("upperWalkway", new BABYLON.Color3(0.78, 0.76, 0.7));
material("plant", new BABYLON.Color3(0.12, 0.42, 0.21), 0.68);
material("planter", new BABYLON.Color3(0.16, 0.14, 0.12), 0.62);
material("wood", new BABYLON.Color3(0.48, 0.31, 0.17), 0.58);
material("scrap", new BABYLON.Color3(0.56, 0.57, 0.55), 0.31, 0.32);
material("food", new BABYLON.Color3(0.82, 0.32, 0.22));
material("light", new BABYLON.Color3(1, 0.82, 0.45));
material("neon", new BABYLON.Color3(0.25, 0.56, 0.96), 0.2);
materials.neon.emissiveColor = new BABYLON.Color3(0.06, 0.15, 0.34);
material("redNeon", new BABYLON.Color3(0.9, 0.18, 0.16), 0.24);
materials.redNeon.emissiveColor = new BABYLON.Color3(0.32, 0.04, 0.03);
material("displayGold", new BABYLON.Color3(1, 0.72, 0.32), 0.18);
materials.displayGold.emissiveColor = new BABYLON.Color3(0.28, 0.16, 0.04);
material("displayCyan", new BABYLON.Color3(0.33, 0.78, 0.9), 0.16);
materials.displayCyan.emissiveColor = new BABYLON.Color3(0.04, 0.18, 0.24);
material("displayPink", new BABYLON.Color3(0.9, 0.28, 0.55), 0.2);
materials.displayPink.emissiveColor = new BABYLON.Color3(0.25, 0.04, 0.12);
material("awningRed", new BABYLON.Color3(0.55, 0.08, 0.08), 0.48);
material("awningBlue", new BABYLON.Color3(0.08, 0.19, 0.42), 0.5);
material("awningGreen", new BABYLON.Color3(0.08, 0.34, 0.22), 0.5);
material("floorSheen", new BABYLON.Color3(0.95, 0.92, 0.82), 0.2);
materials.floorSheen.alpha = 0.18;
material("seat", new BABYLON.Color3(0.18, 0.36, 0.56));
material("table", new BABYLON.Color3(0.62, 0.57, 0.48));
material("blackTrim", new BABYLON.Color3(0.025, 0.026, 0.027), 0.46);
material("shutter", new BABYLON.Color3(0.42, 0.43, 0.42), 0.5, 0.12);
material("posterBlue", new BABYLON.Color3(0.12, 0.34, 0.66), 0.4);
material("posterRed", new BABYLON.Color3(0.74, 0.12, 0.12), 0.4);
material("posterCream", new BABYLON.Color3(0.88, 0.82, 0.65), 0.52);
material("mannequin", new BABYLON.Color3(0.78, 0.72, 0.62), 0.64);
material("directory", new BABYLON.Color3(0.12, 0.16, 0.19), 0.35);
material("silhouette", new BABYLON.Color3(0.025, 0.023, 0.021), 0.72);
material("warmWallLight", new BABYLON.Color3(1, 0.78, 0.42), 0.22);
materials.warmWallLight.emissiveColor = new BABYLON.Color3(0.25, 0.16, 0.04);
material("storeWarm", new BABYLON.Color3(0.86, 0.68, 0.45), 0.38);
materials.storeWarm.emissiveColor = new BABYLON.Color3(0.24, 0.14, 0.05);
material("storeCool", new BABYLON.Color3(0.45, 0.72, 0.86), 0.34);
materials.storeCool.emissiveColor = new BABYLON.Color3(0.06, 0.14, 0.18);
material("storeSoft", new BABYLON.Color3(0.78, 0.58, 0.72), 0.42);
materials.storeSoft.emissiveColor = new BABYLON.Color3(0.16, 0.07, 0.13);
material("shadowMat", new BABYLON.Color3(0.02, 0.018, 0.016), 0.9);
materials.shadowMat.alpha = 0.28;
material("sunPatch", new BABYLON.Color3(0.95, 0.9, 0.72), 0.62);
materials.sunPatch.alpha = 0.2;
materials.sunPatch.emissiveColor = new BABYLON.Color3(0.09, 0.07, 0.03);
material("water", new BABYLON.Color3(0.18, 0.42, 0.48), 0.05, 0.15);
materials.water.alpha = 0.55;
materials.water.emissiveColor = new BABYLON.Color3(0.02, 0.06, 0.07);
material("stoneEdge", new BABYLON.Color3(0.5, 0.47, 0.41), 0.36);
material("serviceDoor", new BABYLON.Color3(0.18, 0.2, 0.2), 0.55, 0.05);
material("warningYellow", new BABYLON.Color3(0.95, 0.72, 0.16), 0.5);
material("rubber", new BABYLON.Color3(0.035, 0.038, 0.04), 0.78);
material("screen", new BABYLON.Color3(0.06, 0.12, 0.16), 0.22);
materials.screen.emissiveColor = new BABYLON.Color3(0.02, 0.08, 0.12);
material("exitGreen", new BABYLON.Color3(0.1, 0.72, 0.42), 0.32);
materials.exitGreen.emissiveColor = new BABYLON.Color3(0.02, 0.22, 0.08);
material("cleaningBlue", new BABYLON.Color3(0.06, 0.24, 0.48), 0.52);
material("brass", new BABYLON.Color3(0.9, 0.62, 0.22), 0.24, 0.45);
material("barricade", new BABYLON.Color3(0.36, 0.23, 0.13));
material("camp", new BABYLON.Color3(1, 0.35, 0.12));

addSharedSurfaceTextures();

const camera = new BABYLON.UniversalCamera("player", new BABYLON.Vector3(0, 2.1, -4), scene);
camera.attachControl(canvas, true);
camera.minZ = 0.08;
camera.speed = 0.16;
camera.angularSensibility = 2600;
camera.applyGravity = true;
camera.checkCollisions = true;
camera.ellipsoid = new BABYLON.Vector3(0.6, 1.0, 0.6);
camera.keysUp.push(87);
camera.keysDown.push(83);
camera.keysLeft.push(65);
camera.keysRight.push(68);

scene.gravity = new BABYLON.Vector3(0, -0.04, 0);

const hemi = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0.2, 1, 0.1), scene);
hemi.intensity = 0.58;
hemi.diffuse = new BABYLON.Color3(0.55, 0.58, 0.62);
hemi.groundColor = new BABYLON.Color3(0.16, 0.14, 0.12);

const skylightWash = new BABYLON.DirectionalLight("skylightWash", new BABYLON.Vector3(-0.15, -1, 0.2), scene);
skylightWash.intensity = 0.42;
skylightWash.diffuse = new BABYLON.Color3(0.82, 0.92, 1);

const flashlight = new BABYLON.SpotLight(
  "flashlight",
  camera.position,
  camera.getForwardRay().direction,
  Math.PI / 4,
  4,
  scene,
);
flashlight.intensity = 1.8;
flashlight.diffuse = new BABYLON.Color3(1, 0.93, 0.72);
flashlight.parent = camera;

const mall = new Map();
const interactables = new Set();
const placed = [];
const tileSize = 22;
const renderRadius = 3;
const districtSize = 5;

function seeded(x, z) {
  let n = x * 374761393 + z * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function createBox(name, size, position, mat, collides = true) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, size, scene);
  mesh.position.copyFrom(position);
  mesh.material = mat;
  mesh.checkCollisions = collides;
  return mesh;
}

function createCylinder(name, options, position, mat, collides = true) {
  const mesh = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
  mesh.position.copyFrom(position);
  mesh.material = mat;
  mesh.checkCollisions = collides;
  return mesh;
}

function createSphere(name, options, position, mat, collides = false) {
  const mesh = BABYLON.MeshBuilder.CreateSphere(name, options, scene);
  mesh.position.copyFrom(position);
  mesh.material = mat;
  mesh.checkCollisions = collides;
  return mesh;
}

function addInteractable(mesh, type, label, rewards) {
  mesh.metadata = { type, label, rewards };
  interactables.add(mesh);
  return mesh;
}

function makeSign(text, position, rotation = 0) {
  const plane = BABYLON.MeshBuilder.CreatePlane("sign", { width: 5.6, height: 1.1 }, scene);
  plane.position.copyFrom(position);
  plane.rotation.y = rotation;
  const texture = new BABYLON.DynamicTexture("signTexture", { width: 512, height: 128 }, scene);
  const ctx = texture.getContext();
  ctx.fillStyle = "#202326";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, 512, 16);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, 108, 512, 20);
  ctx.strokeStyle = "#b99c58";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.font = "bold 38px Arial";
  ctx.fillStyle = "#f8e7b5";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 66);
  texture.update();
  const mat = new BABYLON.StandardMaterial("signMat", scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = new BABYLON.Color3(0.45, 0.33, 0.12);
  plane.material = mat;
  plane.metadata = { disposableMaterial: true };
  return plane;
}

function addPanelText(root, text, position, rotation = 0, width = 2.4, height = 0.9, bg = "#1d2428", fg = "#f3e6bf") {
  const plane = BABYLON.MeshBuilder.CreatePlane("panelText", { width, height }, scene);
  plane.position.copyFrom(position);
  plane.rotation.y = rotation;
  const texture = new BABYLON.DynamicTexture("panelTextTexture", { width: 512, height: 192 }, scene);
  const ctx = texture.getContext();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, 512, 18);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 176);
  const lines = String(text).split("\n");
  const fontSize = lines.length > 1 ? 38 : 42;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    const y = 96 + (index - (lines.length - 1) / 2) * (fontSize + 8);
    ctx.fillText(line, 256, y);
  });
  texture.update();
  const mat = new BABYLON.StandardMaterial("panelTextMat", scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = new BABYLON.Color3(0.2, 0.17, 0.08);
  plane.material = mat;
  plane.metadata = { disposableMaterial: true };
  root.push(plane);
  return plane;
}

function localPoint(x, z, rotation, dx, dz, y) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return new BABYLON.Vector3(x + dx * cos - dz * sin, y, z + dx * sin + dz * cos);
}

function addCeilingGrid(root, x, z, y = 5.0, width = tileSize, depth = tileSize) {
  for (let i = -1; i <= 1; i++) {
    root.push(createBox("ceilingRunner", { width, height: 0.045, depth: 0.055 }, new BABYLON.Vector3(x, y - 0.18, z + i * (depth / 5)), materials.blackTrim, false));
    root.push(createBox("ceilingRunner", { width: 0.055, height: 0.045, depth }, new BABYLON.Vector3(x + i * (width / 5), y - 0.17, z), materials.blackTrim, false));
  }
  root.push(createBox("fluorescentStrip", { width: 6.4, height: 0.04, depth: 0.28 }, new BABYLON.Vector3(x, y - 0.24, z), materials.light, false));
}

function addTileGrout(root, x, z) {
  for (let i = -1; i <= 1; i++) {
    root.push(createBox("groutLine", { width: tileSize, height: 0.018, depth: 0.045 }, new BABYLON.Vector3(x, 0.06, z + i * 4.4), materials.grout, false));
    root.push(createBox("groutLine", { width: 0.045, height: 0.019, depth: tileSize }, new BABYLON.Vector3(x + i * 4.4, 0.061, z), materials.grout, false));
  }
}

function addPlanter(root, x, z, scale = 1) {
  root.push(createBox("planterBox", { width: 2.25 * scale, height: 0.62 * scale, depth: 1.35 * scale }, new BABYLON.Vector3(x, 0.31 * scale, z), materials.planter, false));
  root.push(createBox("planterRim", { width: 2.42 * scale, height: 0.12 * scale, depth: 1.52 * scale }, new BABYLON.Vector3(x, 0.65 * scale, z), materials.blackTrim, false));
  root.push(createBox("planterSoil", { width: 2.0 * scale, height: 0.04 * scale, depth: 1.12 * scale }, new BABYLON.Vector3(x, 0.72 * scale, z), materials.shadowMat, false));
  for (let i = 0; i < 7; i++) {
    const leaf = createBox("plantLeaf", { width: (0.16 + (i % 3) * 0.035) * scale, height: 0.055 * scale, depth: (0.85 + (i % 2) * 0.35) * scale }, new BABYLON.Vector3(x + (i - 3) * 0.18 * scale, 0.98 * scale, z + Math.sin(i) * 0.12 * scale), materials.plant, false);
    leaf.rotation.y = (i - 3) * 0.5;
    leaf.rotation.x = 0.45 + (i % 2) * 0.18;
    root.push(leaf);
  }
}

function addTrashBin(root, x, z) {
  root.push(createCylinder("trashBin", { diameterTop: 0.58, diameterBottom: 0.66, height: 1.02, tessellation: 18 }, new BABYLON.Vector3(x, 0.52, z), materials.blackTrim, false));
  root.push(createCylinder("trashRim", { diameter: 0.72, height: 0.08, tessellation: 18 }, new BABYLON.Vector3(x, 1.08, z), materials.chrome, false));
  root.push(createBox("trashSlot", { width: 0.44, height: 0.12, depth: 0.04 }, new BABYLON.Vector3(x, 0.84, z - 0.32), materials.rubber, false));
  root.push(createCylinder("trashBase", { diameter: 0.74, height: 0.06, tessellation: 18 }, new BABYLON.Vector3(x, 0.04, z), materials.rubber, false));
}

function addBench(root, x, z, rotation = 0) {
  const pieces = [];
  for (let i = -1; i <= 1; i++) {
    pieces.push(createBox("benchSeatSlat", { width: 3.25, height: 0.09, depth: 0.18 }, localPoint(x, z, rotation, 0, i * 0.27, 0.66), materials.wood, false));
    pieces.push(createBox("benchBackSlat", { width: 3.25, height: 0.12, depth: 0.12 }, localPoint(x, z, rotation, 0, -0.48, 0.96 + i * 0.23), materials.wood, false));
  }
  const legA = createBox("benchLeg", { width: 0.16, height: 0.55, depth: 0.16 }, localPoint(x, z, rotation, -1.25, 0.05, 0.3), materials.blackTrim, false);
  const legB = createBox("benchLeg", { width: 0.16, height: 0.55, depth: 0.16 }, localPoint(x, z, rotation, 1.25, 0.05, 0.3), materials.blackTrim, false);
  const rail = createBox("benchUnderRail", { width: 2.75, height: 0.08, depth: 0.08 }, localPoint(x, z, rotation, 0, 0.05, 0.42), materials.blackTrim, false);
  for (const mesh of [...pieces, legA, legB, rail]) mesh.rotation.y = rotation;
  root.push(...pieces, legA, legB, rail);
}

function addDirectory(root, x, z, rotation = 0) {
  const post = createBox("directoryPost", { width: 0.18, height: 1.2, depth: 0.18 }, new BABYLON.Vector3(x, 0.6, z), materials.chrome, false);
  const board = createBox("directoryBoard", { width: 1.85, height: 2.35, depth: 0.16 }, new BABYLON.Vector3(x, 1.85, z), materials.directory, false);
  const cap = createBox("directoryCap", { width: 2.0, height: 0.12, depth: 0.26 }, new BABYLON.Vector3(x, 3.06, z), materials.chrome, false);
  const foot = createCylinder("directoryFoot", { diameter: 0.72, height: 0.08, tessellation: 14 }, new BABYLON.Vector3(x, 0.05, z), materials.chrome, false);
  post.rotation.y = rotation;
  board.rotation.y = rotation;
  cap.rotation.y = rotation;
  root.push(post, board, cap, foot);
  addPanelText(root, "YOU ARE\nHERE", new BABYLON.Vector3(x, 1.94, z - 0.095), rotation, 1.55, 1.65, "#182126", "#9dd9ff");
}

function addHangingWayfinder(root, x, z, rotation = 0, text = "FOOD COURT") {
  root.push(createCylinder("signCord", { diameter: 0.035, height: 1.2, tessellation: 6 }, new BABYLON.Vector3(x - 1.25, 4.15, z), materials.blackTrim, false));
  root.push(createCylinder("signCord", { diameter: 0.035, height: 1.2, tessellation: 6 }, new BABYLON.Vector3(x + 1.25, 4.15, z), materials.blackTrim, false));
  const board = createBox("wayfinderBoard", { width: 3.4, height: 0.85, depth: 0.12 }, new BABYLON.Vector3(x, 3.45, z), materials.directory, false);
  board.rotation.y = rotation;
  root.push(board);
  addPanelText(root, text, new BABYLON.Vector3(x, 3.46, z - 0.07), rotation, 3, 0.62, "#101820", "#f2e6c8");
}

function addAdBanner(root, x, z, rotation = 0, text = "MID SEASON") {
  root.push(createCylinder("bannerCord", { diameter: 0.035, height: 1.8, tessellation: 6 }, new BABYLON.Vector3(x, 5.7, z), materials.blackTrim, false));
  const banner = createBox("adBanner", { width: 2.4, height: 3.1, depth: 0.08 }, new BABYLON.Vector3(x, 4.05, z), materials.posterRed, false);
  banner.rotation.y = rotation;
  root.push(banner);
  addPanelText(root, text, new BABYLON.Vector3(x, 4.05, z - 0.055), rotation, 2.1, 1.2, "#a51e1e", "#fff5d8");
}

function addAdvertisingColumn(root, x, z) {
  root.push(createCylinder("adColumn", { diameter: 1.15, height: 2.6, tessellation: 18 }, new BABYLON.Vector3(x, 1.3, z), materials.directory, false));
  root.push(createCylinder("adColumnCap", { diameter: 1.25, height: 0.12, tessellation: 18 }, new BABYLON.Vector3(x, 2.65, z), materials.chrome, false));
  root.push(createCylinder("adColumnBase", { diameter: 1.25, height: 0.12, tessellation: 18 }, new BABYLON.Vector3(x, 0.08, z), materials.chrome, false));
  addPanelText(root, "SALE", new BABYLON.Vector3(x, 1.55, z - 0.58), 0, 0.85, 1.25, "#b51e22", "#fff0cc");
}

function addServiceDoor(root, x, z, rotation = 0) {
  const door = createBox("serviceDoor", { width: 1.45, height: 2.35, depth: 0.12 }, new BABYLON.Vector3(x, 1.25, z), materials.serviceDoor, false);
  const frame = createBox("serviceDoorFrame", { width: 1.68, height: 2.58, depth: 0.08 }, new BABYLON.Vector3(x, 1.32, z + 0.02), materials.blackTrim, false);
  const kick = createBox("serviceDoorKick", { width: 1.15, height: 0.24, depth: 0.13 }, new BABYLON.Vector3(x, 0.35, z - 0.04), materials.chrome, false);
  const handle = createBox("serviceDoorHandle", { width: 0.12, height: 0.1, depth: 0.34 }, localPoint(x, z, rotation, 0.48, -0.09, 1.25), materials.chrome, false);
  const vent = createBox("serviceDoorVent", { width: 0.72, height: 0.18, depth: 0.13 }, localPoint(x, z, rotation, 0, -0.09, 0.82), materials.blackTrim, false);
  for (const mesh of [door, frame, kick, handle, vent]) mesh.rotation.y = rotation;
  root.push(frame, door, kick, handle, vent);
  addPanelText(root, "STAFF", new BABYLON.Vector3(x, 1.95, z - 0.08), rotation, 0.9, 0.32, "#111", "#f0d06a");
}

function addPartialShutter(root, x, z, direction) {
  const shutter = createBox("partialShutter", { width: 0.08, height: 1.8, depth: 4.8 }, new BABYLON.Vector3(x, 2.1, z), materials.shutter, false);
  const bottom = createBox("shutterHandle", { width: 0.09, height: 0.08, depth: 4.4 }, new BABYLON.Vector3(x - direction * 0.02, 1.18, z), materials.blackTrim, false);
  root.push(shutter, bottom);
  for (let i = -3; i <= 3; i++) {
    root.push(createBox("shutterSlat", { width: 0.085, height: 0.035, depth: 4.72 }, new BABYLON.Vector3(x - direction * 0.04, 1.38 + i * 0.21, z), materials.blackTrim, false));
  }
}

function addCautionStand(root, x, z, rotation = 0) {
  const front = createBox("cautionStand", { width: 0.55, height: 0.82, depth: 0.055 }, new BABYLON.Vector3(x, 0.55, z), materials.warningYellow, false);
  const back = createBox("cautionStandBack", { width: 0.55, height: 0.82, depth: 0.055 }, localPoint(x, z, rotation, 0, 0.22, 0.55), materials.warningYellow, false);
  const hinge = createCylinder("cautionHinge", { diameter: 0.06, height: 0.55, tessellation: 8 }, localPoint(x, z, rotation, 0, 0.1, 0.98), materials.blackTrim, false);
  front.rotation.y = rotation;
  front.rotation.x = -0.12;
  back.rotation.y = rotation;
  back.rotation.x = 0.12;
  hinge.rotation.z = Math.PI / 2;
  hinge.rotation.y = rotation;
  root.push(front, back, hinge);
}

function addSecurityCamera(root, x, z, rotation = 0, y = 4.35) {
  const mount = createBox("cameraMount", { width: 0.24, height: 0.14, depth: 0.2 }, new BABYLON.Vector3(x, y, z), materials.blackTrim, false);
  const arm = createCylinder("cameraArm", { diameter: 0.055, height: 0.38, tessellation: 8 }, localPoint(x, z, rotation, 0, -0.18, y - 0.02), materials.chrome, false);
  const body = createCylinder("securityCamera", { diameterTop: 0.25, diameterBottom: 0.34, height: 0.52, tessellation: 14 }, localPoint(x, z, rotation, 0, -0.42, y - 0.08), materials.whiteWall, false);
  const lens = createCylinder("cameraLens", { diameter: 0.15, height: 0.065, tessellation: 14 }, localPoint(x, z, rotation, 0, -0.72, y - 0.08), materials.screen, false);
  for (const mesh of [mount, body, lens]) {
    mesh.rotation.y = rotation;
    mesh.rotation.x = Math.PI / 2;
  }
  mount.rotation.x = 0;
  arm.rotation.x = Math.PI / 2;
  arm.rotation.y = rotation;
  root.push(mount, arm, body, lens);
}

function addFireExitSign(root, x, z, rotation = 0, text = "EXIT") {
  const box = createBox("exitSign", { width: 1.3, height: 0.38, depth: 0.08 }, new BABYLON.Vector3(x, 3.18, z), materials.exitGreen, false);
  box.rotation.y = rotation;
  root.push(box);
  addPanelText(root, text, localPoint(x, z, rotation, 0, -0.055, 3.18), rotation, 1.04, 0.22, "#075b31", "#eaffd5");
}

function addVendingMachine(root, x, z, rotation = 0, mat = materials.posterRed) {
  const body = createBox("vendingMachine", { width: 1.05, height: 2.1, depth: 0.72 }, new BABYLON.Vector3(x, 1.08, z), mat, false);
  const glass = createBox("vendingGlass", { width: 0.7, height: 1.18, depth: 0.04 }, localPoint(x, z, rotation, -0.11, -0.38, 1.32), materials.shopGlass, false);
  const slot = createBox("vendingSlot", { width: 0.25, height: 0.75, depth: 0.05 }, localPoint(x, z, rotation, 0.36, -0.39, 1.24), materials.screen, false);
  const toe = createBox("vendingToeKick", { width: 1.08, height: 0.16, depth: 0.08 }, localPoint(x, z, rotation, 0, -0.4, 0.18), materials.blackTrim, false);
  const header = createBox("vendingHeader", { width: 0.9, height: 0.18, depth: 0.045 }, localPoint(x, z, rotation, 0, -0.39, 1.95), materials.light, false);
  for (const mesh of [body, glass, slot, toe, header]) mesh.rotation.y = rotation;
  root.push(body, glass, slot, toe, header);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const product = createBox("vendingProduct", { width: 0.15, height: 0.18, depth: 0.035 }, localPoint(x, z, rotation, -0.36 + col * 0.22, -0.42, 1.72 - row * 0.32), row === 0 ? materials.displayGold : row === 1 ? materials.displayCyan : materials.food, false);
      product.rotation.y = rotation;
      root.push(product);
    }
  }
}

function addATM(root, x, z, rotation = 0) {
  const body = createBox("atm", { width: 1.18, height: 1.85, depth: 0.78 }, new BABYLON.Vector3(x, 0.95, z), materials.directory, false);
  const screen = createBox("atmScreen", { width: 0.62, height: 0.36, depth: 0.04 }, localPoint(x, z, rotation, 0, -0.42, 1.35), materials.screen, false);
  const keypad = createBox("atmKeypad", { width: 0.5, height: 0.08, depth: 0.28 }, localPoint(x, z, rotation, 0, -0.5, 0.92), materials.chrome, false);
  const card = createBox("atmCardSlot", { width: 0.42, height: 0.06, depth: 0.04 }, localPoint(x, z, rotation, 0, -0.43, 1.02), materials.brass, false);
  const receipt = createBox("atmReceiptSlot", { width: 0.34, height: 0.035, depth: 0.04 }, localPoint(x, z, rotation, -0.26, -0.43, 1.08), materials.chrome, false);
  const plinth = createBox("atmPlinth", { width: 1.28, height: 0.12, depth: 0.86 }, localPoint(x, z, rotation, 0, 0, 0.1), materials.rubber, false);
  for (const mesh of [body, screen, keypad, card, receipt, plinth]) mesh.rotation.y = rotation;
  root.push(body, screen, keypad, card, receipt, plinth);
  for (let i = 0; i < 6; i++) {
    const key = createBox("atmButton", { width: 0.055, height: 0.025, depth: 0.035 }, localPoint(x, z, rotation, -0.18 + (i % 3) * 0.18, -0.54, 0.99 - Math.floor(i / 3) * 0.09), materials.blackTrim, false);
    key.rotation.y = rotation;
    root.push(key);
  }
}

function addMaintenanceCart(root, x, z, rotation = 0) {
  const base = createBox("maintenanceCart", { width: 1.25, height: 0.32, depth: 0.8 }, new BABYLON.Vector3(x, 0.38, z), materials.cleaningBlue, false);
  const bucket = createCylinder("mopBucket", { diameter: 0.46, height: 0.34, tessellation: 12 }, localPoint(x, z, rotation, -0.28, 0, 0.76), materials.warningYellow, false);
  const bucketRim = createCylinder("mopBucketRim", { diameter: 0.52, height: 0.055, tessellation: 12 }, localPoint(x, z, rotation, -0.28, 0, 0.96), materials.blackTrim, false);
  const handle = createCylinder("cartHandle", { diameter: 0.05, height: 1.2, tessellation: 8 }, localPoint(x, z, rotation, 0.64, 0, 0.92), materials.chrome, false);
  const mop = createCylinder("mopHandle", { diameter: 0.035, height: 1.75, tessellation: 8 }, localPoint(x, z, rotation, -0.55, 0.2, 1.05), materials.wood, false);
  for (const mesh of [base, bucket, bucketRim, handle, mop]) mesh.rotation.y = rotation;
  handle.rotation.z = 0.35;
  mop.rotation.z = -0.42;
  root.push(base, bucket, bucketRim, handle, mop);
  for (const wx of [-0.48, 0.48]) {
    for (const wz of [-0.28, 0.28]) {
      const wheel = createCylinder("cartWheel", { diameter: 0.16, height: 0.08, tessellation: 10 }, localPoint(x, z, rotation, wx, wz, 0.18), materials.rubber, false);
      wheel.rotation.z = Math.PI / 2;
      wheel.rotation.y = rotation;
      root.push(wheel);
    }
  }
}

function addElevatorBank(root, x, z, rotation = 0) {
  const wall = createBox("elevatorWall", { width: 4.8, height: 3.8, depth: 0.22 }, new BABYLON.Vector3(x, 2.0, z), materials.whiteWall, false);
  const left = createBox("elevatorDoor", { width: 1.05, height: 2.55, depth: 0.08 }, localPoint(x, z, rotation, -0.62, -0.14, 1.45), materials.scrap, false);
  const right = createBox("elevatorDoor", { width: 1.05, height: 2.55, depth: 0.08 }, localPoint(x, z, rotation, 0.62, -0.14, 1.45), materials.scrap, false);
  const seam = createBox("elevatorSeam", { width: 0.06, height: 2.55, depth: 0.09 }, localPoint(x, z, rotation, 0, -0.19, 1.45), materials.blackTrim, false);
  const call = createBox("elevatorCallPanel", { width: 0.18, height: 0.72, depth: 0.08 }, localPoint(x, z, rotation, 1.62, -0.2, 1.36), materials.screen, false);
  const header = createBox("elevatorHeader", { width: 2.6, height: 0.18, depth: 0.09 }, localPoint(x, z, rotation, 0, -0.18, 2.9), materials.brass, false);
  const floorIndicator = createBox("elevatorIndicator", { width: 0.55, height: 0.18, depth: 0.08 }, localPoint(x, z, rotation, 0, -0.2, 2.62), materials.screen, false);
  const jambL = createBox("elevatorJamb", { width: 0.12, height: 2.8, depth: 0.1 }, localPoint(x, z, rotation, -1.25, -0.18, 1.55), materials.chrome, false);
  const jambR = createBox("elevatorJamb", { width: 0.12, height: 2.8, depth: 0.1 }, localPoint(x, z, rotation, 1.25, -0.18, 1.55), materials.chrome, false);
  for (const mesh of [wall, left, right, seam, call, header, floorIndicator, jambL, jambR]) mesh.rotation.y = rotation;
  root.push(wall, left, right, seam, call, header, floorIndicator, jambL, jambR);
  addPanelText(root, "LIFTS", localPoint(x, z, rotation, 0, -0.22, 3.18), rotation, 1.4, 0.34, "#1a1d1e", "#f1d98d");
}

function addCeilingBulkhead(root, x, z, rotation = 0, width = 9.5) {
  const beam = createBox("ceilingBulkhead", { width, height: 0.58, depth: 0.42 }, new BABYLON.Vector3(x, 4.62, z), materials.whiteWall, false);
  const blackLine = createBox("bulkheadReveal", { width, height: 0.07, depth: 0.46 }, new BABYLON.Vector3(x, 4.27, z), materials.blackTrim, false);
  const light = createBox("bulkheadLight", { width: width * 0.68, height: 0.045, depth: 0.18 }, new BABYLON.Vector3(x, 4.26, z - 0.24), materials.light, false);
  for (const mesh of [beam, blackLine, light]) mesh.rotation.y = rotation;
  root.push(beam, blackLine, light);
}

function addDownlightRow(root, x, z, rotation = 0, y = 4.82, count = 5) {
  for (let i = 0; i < count; i++) {
    const dx = (i - (count - 1) / 2) * 1.8;
    const light = createCylinder("recessedDownlight", { diameter: 0.34, height: 0.035, tessellation: 14 }, localPoint(x, z, rotation, dx, 0, y), materials.light, false);
    light.rotation.y = rotation;
    root.push(light);
  }
}

function addFloorDirectionArrow(root, x, z, rotation = 0) {
  const shaft = createBox("floorArrowShaft", { width: 0.28, height: 0.016, depth: 2.15 }, new BABYLON.Vector3(x, 0.12, z), materials.floorTrim, false);
  const headA = createBox("floorArrowHead", { width: 0.25, height: 0.017, depth: 1.2 }, localPoint(x, z, rotation, -0.28, -1.08, 0.125), materials.floorTrim, false);
  const headB = createBox("floorArrowHead", { width: 0.25, height: 0.017, depth: 1.2 }, localPoint(x, z, rotation, 0.28, -1.08, 0.126), materials.floorTrim, false);
  shaft.rotation.y = rotation;
  headA.rotation.y = rotation + 0.55;
  headB.rotation.y = rotation - 0.55;
  root.push(shaft, headA, headB);
}

function addStoreFixtureCluster(root, x, z, rotation = 0, colorMat = materials.posterCream) {
  for (let i = -1; i <= 1; i++) {
    const rack = createBox("clothingRack", { width: 0.9, height: 0.1, depth: 1.35 }, localPoint(x, z, rotation, i * 0.82, 0, 1.12), materials.chrome, false);
    const rail = createCylinder("rackRail", { diameter: 0.06, height: 1.15, tessellation: 8 }, localPoint(x, z, rotation, i * 0.82, 0, 1.62), materials.chrome, false);
    const cloth = createBox("hangingClothes", { width: 0.7, height: 0.82, depth: 0.09 }, localPoint(x, z, rotation, i * 0.82, -0.18, 1.14), colorMat, false);
    rack.rotation.y = rotation;
    rail.rotation.z = Math.PI / 2;
    rail.rotation.y = rotation;
    cloth.rotation.y = rotation;
    root.push(rack, rail, cloth);
  }
}

function addTrayReturn(root, x, z, rotation = 0) {
  const body = createBox("trayReturn", { width: 1.55, height: 1.28, depth: 0.62 }, new BABYLON.Vector3(x, 0.72, z), materials.blackTrim, false);
  const slot = createBox("trayReturnSlot", { width: 1.12, height: 0.2, depth: 0.06 }, localPoint(x, z, rotation, 0, -0.34, 1.08), materials.chrome, false);
  const trays = createBox("trayStack", { width: 1.0, height: 0.12, depth: 0.46 }, localPoint(x, z, rotation, 0, -0.08, 1.46), materials.posterCream, false);
  for (const mesh of [body, slot, trays]) mesh.rotation.y = rotation;
  root.push(body, slot, trays);
}

function addCondimentStation(root, x, z, rotation = 0) {
  const counter = createBox("condimentStation", { width: 2.3, height: 0.9, depth: 0.72 }, new BABYLON.Vector3(x, 0.48, z), materials.table, false);
  const napkins = createBox("napkinHolder", { width: 0.42, height: 0.28, depth: 0.32 }, localPoint(x, z, rotation, -0.55, -0.05, 1.02), materials.chrome, false);
  const pumpA = createCylinder("condimentPump", { diameter: 0.18, height: 0.36, tessellation: 10 }, localPoint(x, z, rotation, 0.22, -0.05, 1.08), materials.posterRed, false);
  const pumpB = createCylinder("condimentPump", { diameter: 0.18, height: 0.36, tessellation: 10 }, localPoint(x, z, rotation, 0.55, -0.05, 1.08), materials.warningYellow, false);
  for (const mesh of [counter, napkins, pumpA, pumpB]) mesh.rotation.y = rotation;
  root.push(counter, napkins, pumpA, pumpB);
}

function addUpperShopGlow(root, x, z, rotation = 0, text = "OPEN") {
  const mat = Math.abs(Math.sin(x + z)) > 0.5 ? materials.storeCool : materials.storeWarm;
  const panel = createBox("upperShopGlow", { width: 3.6, height: 1.05, depth: 0.1 }, new BABYLON.Vector3(x, 6.15, z), mat, false);
  panel.rotation.y = rotation;
  root.push(panel);
  addPanelText(root, text, new BABYLON.Vector3(x, 6.16, z - 0.07), rotation, 2.6, 0.5, "#14191d", "#ffe8b0");
}

function addAnchorStorePortal(root, x, z, rotation = 0, text = "DEPARTMENT STORE") {
  const frame = createBox("anchorPortal", { width: 5.8, height: 3.8, depth: 0.28 }, new BABYLON.Vector3(x, 2.1, z), materials.blackTrim, false);
  const glowPanel = createBox("anchorGlow", { width: 4.9, height: 2.7, depth: 0.08 }, new BABYLON.Vector3(x, 1.85, z - 0.12), materials.storeWarm, false);
  frame.rotation.y = rotation;
  glowPanel.rotation.y = rotation;
  root.push(frame, glowPanel);
  addPanelText(root, text, new BABYLON.Vector3(x, 3.55, z - 0.16), rotation, 4.9, 0.7, "#1b1d1f", "#f5dfaa");
}

function addFoodCourtBulkhead(root, x, z, text = "FRESH FOOD") {
  root.push(createBox("foodCourtBulkhead", { width: 9.2, height: 0.55, depth: 0.5 }, new BABYLON.Vector3(x, 3.15, z), materials.blackTrim, false));
  root.push(createBox("foodCourtBulkheadLip", { width: 9.4, height: 0.08, depth: 0.58 }, new BABYLON.Vector3(x, 2.83, z), materials.chrome, false));
  root.push(createBox("foodCourtLightbox", { width: 7.8, height: 0.34, depth: 0.1 }, new BABYLON.Vector3(x, 3.16, z - 0.28), materials.displayGold, false));
  addPanelText(root, text, new BABYLON.Vector3(x, 3.18, z - 0.34), 0, 5.8, 0.42, "#2a1a0a", "#fff1bc");
}

function addWallLightBand(root, x, z, side = 1) {
  const band = createBox("wallLightBand", { width: 0.08, height: 0.12, depth: 7.4 }, new BABYLON.Vector3(x + side * 10.66, 3.95, z), materials.warmWallLight, false);
  root.push(band);
}

function addUndersideLight(root, x, z, y = 3.55, horizontal = true) {
  const strip = createBox(
    "undersideLight",
    horizontal ? { width: tileSize * 0.78, height: 0.045, depth: 0.22 } : { width: 0.22, height: 0.045, depth: tileSize * 0.78 },
    new BABYLON.Vector3(x, y, z),
    materials.warmWallLight,
    false,
  );
  root.push(strip);
}

function addFloorSheen(root, x, z, width, depth, rotation = 0) {
  const sheen = createBox("floorSheen", { width, height: 0.011, depth }, new BABYLON.Vector3(x, 0.105, z), materials.floorSheen, false);
  sheen.rotation.y = rotation;
  root.push(sheen);
}

function addFloorShadow(root, x, z, width, depth, rotation = 0) {
  const shadow = createBox("floorShadow", { width, height: 0.012, depth }, new BABYLON.Vector3(x, 0.075, z), materials.shadowMat, false);
  shadow.rotation.y = rotation;
  root.push(shadow);
}

function addSunPatch(root, x, z, width, depth, rotation = 0) {
  const patch = createBox("sunPatch", { width, height: 0.014, depth }, new BABYLON.Vector3(x, 0.085, z), materials.sunPatch, false);
  patch.rotation.y = rotation;
  root.push(patch);
}

function addReflectingPool(root, x, z, rotation = 0) {
  const base = createBox("poolBase", { width: 8.4, height: 0.16, depth: 3.6 }, new BABYLON.Vector3(x, 0.08, z), materials.stoneEdge, false);
  const water = createBox("poolWater", { width: 7.4, height: 0.035, depth: 2.65 }, new BABYLON.Vector3(x, 0.2, z), materials.water, false);
  const edgeA = createBox("poolEdge", { width: 8.5, height: 0.22, depth: 0.18 }, new BABYLON.Vector3(x, 0.25, z - 1.86), materials.stoneEdge, false);
  const edgeB = createBox("poolEdge", { width: 8.5, height: 0.22, depth: 0.18 }, new BABYLON.Vector3(x, 0.25, z + 1.86), materials.stoneEdge, false);
  const edgeC = createBox("poolEdge", { width: 0.18, height: 0.22, depth: 3.5 }, new BABYLON.Vector3(x - 4.25, 0.25, z), materials.stoneEdge, false);
  const edgeD = createBox("poolEdge", { width: 0.18, height: 0.22, depth: 3.5 }, new BABYLON.Vector3(x + 4.25, 0.25, z), materials.stoneEdge, false);
  for (const mesh of [base, water, edgeA, edgeB, edgeC, edgeD]) mesh.rotation.y = rotation;
  root.push(base, water, edgeA, edgeB, edgeC, edgeD);
  for (let i = -1; i <= 1; i++) {
    const glint = createBox("poolLightGlint", { width: 1.1, height: 0.012, depth: 0.08 }, localPoint(x, z, rotation, i * 1.8, -0.2 + i * 0.12, 0.235), materials.floorSheen, false);
    glint.rotation.y = rotation + 0.18;
    root.push(glint);
  }
  addPlanter(root, x - 3.2, z, 0.72);
  addPlanter(root, x + 3.2, z, 0.72);
}

function addSoftSeatingIsland(root, x, z, rotation = 0) {
  const rug = createCylinder("seatingRug", { diameter: 4.3, height: 0.025, tessellation: 32 }, new BABYLON.Vector3(x, 0.09, z), materials.shadowMat, false);
  const seatA = createBox("softSeat", { width: 1.8, height: 0.55, depth: 0.9 }, new BABYLON.Vector3(x - 0.8, 0.36, z), materials.seat, false);
  const seatB = createBox("softSeat", { width: 1.8, height: 0.55, depth: 0.9 }, new BABYLON.Vector3(x + 0.8, 0.36, z + 1.0), materials.awningGreen, false);
  const cushionA = createBox("softSeatCushion", { width: 1.7, height: 0.08, depth: 0.82 }, new BABYLON.Vector3(x - 0.8, 0.68, z), materials.posterCream, false);
  const cushionB = createBox("softSeatCushion", { width: 1.7, height: 0.08, depth: 0.82 }, new BABYLON.Vector3(x + 0.8, 0.68, z + 1.0), materials.posterCream, false);
  for (const mesh of [rug, seatA, seatB, cushionA, cushionB]) mesh.rotation.y = rotation;
  root.push(rug, seatA, seatB, cushionA, cushionB);
  addPlanter(root, x + 1.7, z - 1.2, 0.62);
}

function addStoreLightWall(root, x, z, direction, rand) {
  const mat = rand > 0.66 ? materials.storeSoft : rand > 0.33 ? materials.storeCool : materials.storeWarm;
  const wall = createBox("storeLightWall", { width: 0.09, height: 2.1, depth: 5.2 }, new BABYLON.Vector3(x, 2.0, z), mat, false);
  wall.rotation.y = 0;
  root.push(wall);
  const glowBar = createBox("storeGlowBar", { width: 0.1, height: 0.18, depth: 5.4 }, new BABYLON.Vector3(x - direction * 0.02, 3.08, z), materials.light, false);
  root.push(glowBar);
}

function addShopAwning(root, x, z, direction, rand) {
  const mat = rand > 0.66 ? materials.awningGreen : rand > 0.33 ? materials.awningBlue : materials.awningRed;
  const awning = createBox("shopAwning", { width: 1.05, height: 0.22, depth: 6.7 }, new BABYLON.Vector3(x - direction * 0.48, 3.28, z), mat, false);
  awning.rotation.z = direction * 0.1;
  root.push(awning);
  root.push(createBox("awningLip", { width: 0.16, height: 0.18, depth: 6.8 }, new BABYLON.Vector3(x - direction * 0.95, 3.05, z), materials.blackTrim, false));
}

function addUpperStorefrontRun(root, x, z, horizontal = true) {
  const labels = ["STYLE CO", "ARCADE", "HOME LAB"];
  for (let i = -1; i <= 1; i++) {
    const px = horizontal ? x + i * 5.5 : x;
    const pz = horizontal ? z : z + i * 5.5;
    const backing = createBox("upperStoreBacking", horizontal ? { width: 4.1, height: 1.25, depth: 0.14 } : { width: 0.14, height: 1.25, depth: 4.1 }, new BABYLON.Vector3(px, 6.12, pz), materials.shopDark, false);
    root.push(backing);
    const panel = createBox("upperStorefrontGlass", horizontal ? { width: 3.4, height: 0.92, depth: 0.08 } : { width: 0.08, height: 0.92, depth: 3.4 }, new BABYLON.Vector3(px, 6.1, pz), materials.shopGlass, false);
    root.push(panel);
    const lightMat = i === -1 ? materials.storeCool : i === 0 ? materials.storeWarm : materials.storeSoft;
    const glow = createBox("upperInteriorGlow", horizontal ? { width: 2.8, height: 0.48, depth: 0.06 } : { width: 0.06, height: 0.48, depth: 2.8 }, new BABYLON.Vector3(px, 5.96, pz), lightMat, false);
    root.push(glow);
    for (let m = -1; m <= 1; m++) {
      const mullion = createBox(
        "upperMullion",
        horizontal ? { width: 0.07, height: 0.95, depth: 0.09 } : { width: 0.09, height: 0.95, depth: 0.07 },
        new BABYLON.Vector3(horizontal ? px + m * 1.08 : px, 6.08, horizontal ? pz : pz + m * 1.08),
        materials.blackTrim,
        false,
      );
      root.push(mullion);
    }
    if (i !== 0) {
      const upperFigure = createCylinder(
        "upperSilhouette",
        { diameterTop: 0.18, diameterBottom: 0.24, height: 0.74, tessellation: 7 },
        new BABYLON.Vector3(horizontal ? px + i * 0.7 : px, 5.7, horizontal ? pz : pz + i * 0.7),
        materials.silhouette,
        false,
      );
      root.push(upperFigure);
    }
    const signMat = i === -1 ? materials.displayCyan : i === 0 ? materials.displayGold : materials.displayPink;
    const sign = createBox("upperStoreSign", horizontal ? { width: 2.3, height: 0.2, depth: 0.09 } : { width: 0.09, height: 0.2, depth: 2.3 }, new BABYLON.Vector3(px, 6.9, pz), signMat, false);
    root.push(sign);
    if (horizontal) {
      addPanelText(root, labels[i + 1], new BABYLON.Vector3(px, 6.63, pz - 0.09), 0, 2.45, 0.32, "#16191d", i === -1 ? "#baf3ff" : i === 0 ? "#ffe4a0" : "#ffd0e4");
    }
    const sill = createBox("upperStoreSill", horizontal ? { width: 4.25, height: 0.14, depth: 0.16 } : { width: 0.16, height: 0.14, depth: 4.25 }, new BABYLON.Vector3(px, 5.42, pz), materials.blackTrim, false);
    root.push(sill);
  }
}

function addScatteredMallClutter(root, x, z, rand, count = 4) {
  for (let i = 0; i < count; i++) {
    const a = rand * 18.3 + i * 2.17;
    const px = x + Math.cos(a) * (2.2 + ((i + 1) % 3) * 1.6);
    const pz = z + Math.sin(a * 1.3) * (2.2 + (i % 2) * 2.2);
    const mat = i % 3 === 0 ? materials.posterCream : i % 3 === 1 ? materials.scrap : materials.posterRed;
    const litter = createBox("smallClutter", { width: 0.38 + (i % 2) * 0.22, height: 0.035, depth: 0.22 + (i % 3) * 0.08 }, new BABYLON.Vector3(px, 0.13, pz), mat, false);
    litter.rotation.y = a;
    root.push(litter);
  }
}

function addStorefrontReflections(root, x, z, direction, rand) {
  for (let i = -1; i <= 1; i++) {
    const streak = createBox("glassReflection", { width: 0.025, height: 1.85, depth: 0.5 }, new BABYLON.Vector3(x - direction * 0.22, 1.82, z + i * 1.65 + rand * 0.25), materials.floorSheen, false);
    streak.rotation.z = 0.08 * direction;
    root.push(streak);
  }
}

function addEscalatorLanding(root, x, z, angle = 0) {
  const landing = createBox("escalatorLanding", { width: 4.8, height: 0.16, depth: 2.4 }, new BABYLON.Vector3(x, 0.18, z), materials.scrap, false);
  const comb = createBox("escalatorComb", { width: 4.9, height: 0.06, depth: 0.32 }, new BABYLON.Vector3(x, 0.31, z - 1.05), materials.chrome, false);
  const plateLineA = createBox("landingPlateLine", { width: 4.4, height: 0.018, depth: 0.035 }, new BABYLON.Vector3(x, 0.285, z - 0.3), materials.blackTrim, false);
  const plateLineB = createBox("landingPlateLine", { width: 4.4, height: 0.018, depth: 0.035 }, new BABYLON.Vector3(x, 0.286, z + 0.35), materials.blackTrim, false);
  landing.rotation.y = angle;
  comb.rotation.y = angle;
  plateLineA.rotation.y = angle;
  plateLineB.rotation.y = angle;
  root.push(landing, comb, plateLineA, plateLineB);
}

function addMannequin(root, x, z, rotation = 0) {
  const body = createCylinder("mannequinBody", { diameterTop: 0.38, diameterBottom: 0.58, height: 1.18, tessellation: 14 }, new BABYLON.Vector3(x, 1.05, z), materials.mannequin, false);
  const waist = createCylinder("mannequinWaist", { diameterTop: 0.46, diameterBottom: 0.34, height: 0.36, tessellation: 14 }, new BABYLON.Vector3(x, 0.52, z), materials.mannequin, false);
  const head = createSphere("mannequinHead", { diameter: 0.34, segments: 14 }, new BABYLON.Vector3(x, 1.86, z), materials.mannequin, false);
  const neck = createCylinder("mannequinNeck", { diameter: 0.16, height: 0.16, tessellation: 10 }, new BABYLON.Vector3(x, 1.62, z), materials.mannequin, false);
  const stand = createCylinder("mannequinStand", { diameter: 0.7, height: 0.055, tessellation: 16 }, new BABYLON.Vector3(x, 0.06, z), materials.chrome, false);
  for (const mesh of [body, waist, head, neck, stand]) mesh.rotation.y = rotation;
  root.push(body, waist, head, neck, stand);
}

function addProductShelf(root, x, z, rotation = 0, colorMat = materials.posterBlue) {
  const shelf = createBox("productShelf", { width: 2.2, height: 1.6, depth: 0.42 }, new BABYLON.Vector3(x, 0.95, z), materials.blackTrim, false);
  shelf.rotation.y = rotation;
  root.push(shelf);
  for (let row = 0; row < 3; row++) {
    const lip = createBox("shelfLip", { width: 2.0, height: 0.045, depth: 0.48 }, localPoint(x, z, rotation, 0, -0.01, 0.35 + row * 0.36), materials.chrome, false);
    lip.rotation.y = rotation;
    root.push(lip);
    for (let col = -1; col <= 1; col++) {
      const box = createBox("productBox", { width: 0.24 + (col === 0 ? 0.06 : 0), height: 0.22, depth: 0.16 }, localPoint(x, z, rotation, col * 0.34, -0.24, 0.48 + row * 0.38), row === 1 ? materials.posterCream : colorMat, false);
      box.rotation.y = rotation;
      root.push(box);
    }
  }
}

function addRailPosts(root, x, z, horizontal = true, y = 4.3) {
  for (let i = -3; i <= 3; i++) {
    const px = horizontal ? x + i * 2.7 : x;
    const pz = horizontal ? z : z + i * 2.7;
    root.push(createCylinder("railPost", { diameter: 0.075, height: 1.02, tessellation: 10 }, new BABYLON.Vector3(px, y, pz), materials.chrome, false));
  }
}

function addShopperSilhouette(root, x, z, rotation = 0) {
  const body = createCylinder("shopperBody", { diameterTop: 0.34, diameterBottom: 0.46, height: 1.18, tessellation: 8 }, new BABYLON.Vector3(x, 0.95, z), materials.silhouette, false);
  const head = createSphere("shopperHead", { diameter: 0.32, segments: 8 }, new BABYLON.Vector3(x, 1.75, z), materials.silhouette, false);
  const bag = createBox("shoppingBag", { width: 0.32, height: 0.44, depth: 0.18 }, new BABYLON.Vector3(x + 0.35, 0.78, z), materials.posterCream, false);
  const legA = createBox("shopperLeg", { width: 0.12, height: 0.55, depth: 0.12 }, new BABYLON.Vector3(x - 0.12, 0.32, z), materials.silhouette, false);
  const legB = createBox("shopperLeg", { width: 0.12, height: 0.55, depth: 0.12 }, new BABYLON.Vector3(x + 0.12, 0.32, z + 0.05), materials.silhouette, false);
  for (const mesh of [body, head, bag, legA, legB]) mesh.rotation.y = rotation;
  root.push(body, head, bag, legA, legB);
}

function finalizeTile(root) {
  for (const item of root) {
    if (item instanceof BABYLON.Mesh) {
      item.freezeWorldMatrix();
    }
  }
}

function districtInfo(tileX, tileZ) {
  const bx = Math.floor((tileX + 2) / districtSize);
  const bz = Math.floor((tileZ + 2) / districtSize);
  const localX = tileX - bx * districtSize;
  const localZ = tileZ - bz * districtSize;
  const roll = seeded(bx, bz);
  const type = bx === 0 && bz === 0 ? "atrium" : roll > 0.72 ? "foodCourt" : roll > 0.42 ? "atrium" : "concourse";
  return { bx, bz, localX, localZ, roll, type };
}

function addFloorPattern(root, x, z, district) {
  root.push(createBox("floor", { width: tileSize, height: 0.35, depth: tileSize }, new BABYLON.Vector3(x, -0.18, z), materials.marble));
  if ((Math.round(x / tileSize) + Math.round(z / tileSize)) % 2 === 0) {
    root.push(createBox("floorTone", { width: tileSize * 0.48, height: 0.02, depth: tileSize * 0.48 }, new BABYLON.Vector3(x - 4.5, 0.025, z + 4.5), materials.tileAlt, false));
  }
  const stripeA = createBox("floorTrim", { width: tileSize, height: 0.03, depth: 0.32 }, new BABYLON.Vector3(x, 0.02, z), materials.floorTrim, false);
  const stripeB = createBox("floorTrim", { width: 0.32, height: 0.03, depth: tileSize }, new BABYLON.Vector3(x, 0.03, z), materials.floorTrim, false);
  if (district.type === "foodCourt") {
    stripeA.rotation.y = Math.PI / 7;
    stripeB.rotation.y = -Math.PI / 9;
  }
  root.push(stripeA, stripeB);
  addTileGrout(root, x, z);
  if (Math.abs(x / tileSize) % 2 < 0.5) addFloorSheen(root, x - 2.4, z + 2.8, 6.8, 1.8, -0.16);
  if (district.type !== "concourse") addFloorShadow(root, x + 3.6, z - 3.2, 7.2, 2.8, -0.25);
}

function addCeiling(root, x, z, high = false) {
  const y = high ? 12.4 : 5.1;
  const mat = high ? materials.skylight : materials.ceiling;
  root.push(createBox("ceiling", { width: tileSize, height: 0.26, depth: tileSize }, new BABYLON.Vector3(x, y, z), mat, false));
  addCeilingGrid(root, x, z, y, tileSize, tileSize);
}

function addChromeColumn(root, x, z, y = 3.5, height = 7) {
  root.push(createCylinder("chromeColumn", { diameter: 0.72, height, tessellation: 28 }, new BABYLON.Vector3(x, y, z), materials.chrome));
  for (let i = -1; i <= 1; i++) {
    root.push(createCylinder("columnReflectionBand", { diameter: 0.735, height: 0.045, tessellation: 28 }, new BABYLON.Vector3(x, y + i * (height / 4), z), materials.brass, false));
  }
}

function addRail(root, x, z, horizontal = true, y = 4.3) {
  const size = horizontal
    ? { width: tileSize * 0.86, height: 0.9, depth: 0.12 }
    : { width: 0.12, height: 0.9, depth: tileSize * 0.86 };
  root.push(createBox("glassRail", size, new BABYLON.Vector3(x, y, z), materials.railGlass, false));
  root.push(createBox("railTopCap", horizontal ? { width: tileSize * 0.88, height: 0.08, depth: 0.16 } : { width: 0.16, height: 0.08, depth: tileSize * 0.88 }, new BABYLON.Vector3(x, y + 0.48, z), materials.chrome, false));
  root.push(createBox("railBottomTrack", horizontal ? { width: tileSize * 0.88, height: 0.06, depth: 0.14 } : { width: 0.14, height: 0.06, depth: tileSize * 0.88 }, new BABYLON.Vector3(x, y - 0.48, z), materials.blackTrim, false));
  addRailPosts(root, x, z, horizontal, y);
}

function addPalm(root, x, z, scale = 1) {
  const trunk = createCylinder("palmTrunk", { diameterTop: 0.28 * scale, diameterBottom: 0.44 * scale, height: 3.8 * scale, tessellation: 14 }, new BABYLON.Vector3(x, 1.9 * scale, z), materials.wood, false);
  const leaves = [];
  for (let i = 0; i < 7; i++) {
    root.push(createCylinder("palmRing", { diameter: 0.42 * scale, height: 0.035 * scale, tessellation: 10 }, new BABYLON.Vector3(x, 0.48 * scale + i * 0.45 * scale, z), materials.floorTrim, false));
  }
  for (let i = 0; i < 9; i++) {
    const leaf = createBox("palmFrond", { width: 0.22 * scale, height: 0.08 * scale, depth: (2.0 + (i % 3) * 0.28) * scale }, new BABYLON.Vector3(x, 3.72 * scale, z), materials.plant, false);
    leaf.rotation.y = (Math.PI * 2 * i) / 9;
    leaf.rotation.x = Math.PI / 8 + (i % 2) * 0.12;
    leaves.push(leaf);
  }
  root.push(trunk, ...leaves);
  addInteractable(trunk, "loot", "Break decorative palm", { wood: 2 });
}

function addHangingLight(root, x, z, color = new BABYLON.Color3(0.75, 0.92, 1)) {
  const cord = createCylinder("cord", { diameter: 0.04, height: 3 }, new BABYLON.Vector3(x, 9.6, z), materials.scrap, false);
  const orb = createSphere("hangingLight", { diameter: 1.1, segments: 16 }, new BABYLON.Vector3(x, 7.9, z), materials.light, false);
  const light = new BABYLON.PointLight("hangingGlow", new BABYLON.Vector3(x, 7.9, z), scene);
  light.diffuse = color;
  light.intensity = 0.75;
  light.range = 13;
  root.push(cord, orb, light);
}

function addEscalator(root, x, z, angle = 0) {
  const base = createBox("escalator", { width: 1.8, height: 0.3, depth: 8.5 }, new BABYLON.Vector3(x, 2.35, z), materials.scrap, false);
  const glassL = createBox("escalatorGlass", { width: 0.09, height: 0.72, depth: 8.5 }, new BABYLON.Vector3(x - 1, 2.75, z), materials.railGlass, false);
  const glassR = createBox("escalatorGlass", { width: 0.09, height: 0.72, depth: 8.5 }, new BABYLON.Vector3(x + 1, 2.75, z), materials.railGlass, false);
  const handL = createBox("escalatorHandrail", { width: 0.16, height: 0.08, depth: 8.55 }, new BABYLON.Vector3(x - 1.04, 3.15, z), materials.rubber, false);
  const handR = createBox("escalatorHandrail", { width: 0.16, height: 0.08, depth: 8.55 }, new BABYLON.Vector3(x + 1.04, 3.15, z), materials.rubber, false);
  const steps = [];
  for (let i = -4; i <= 4; i++) {
    steps.push(createBox("escalatorStep", { width: 1.45, height: 0.04, depth: 0.56 }, new BABYLON.Vector3(x, 2.57 + i * 0.055, z + i * 0.83), materials.blackTrim, false));
    steps.push(createBox("stepRib", { width: 1.35, height: 0.018, depth: 0.035 }, new BABYLON.Vector3(x, 2.61 + i * 0.055, z + i * 0.83 - 0.16), materials.chrome, false));
  }
  for (const mesh of [base, glassL, glassR, handL, handR]) {
    mesh.rotation.y = angle;
    mesh.rotation.x = -0.22;
  }
  for (const step of steps) {
    step.rotation.y = angle;
    step.rotation.x = -0.22;
  }
  root.push(base, glassL, glassR, ...steps);
}

function addTableSet(root, x, z, rotation = 0) {
  const table = createCylinder("foodTable", { diameter: 1.1, height: 0.12, tessellation: 22 }, new BABYLON.Vector3(x, 0.75, z), materials.table, false);
  const tableEdge = createCylinder("foodTableEdge", { diameter: 1.16, height: 0.045, tessellation: 22 }, new BABYLON.Vector3(x, 0.82, z), materials.chrome, false);
  const stem = createCylinder("tableStem", { diameter: 0.16, height: 0.7, tessellation: 10 }, new BABYLON.Vector3(x, 0.38, z), materials.chrome, false);
  const foot = createCylinder("tableFoot", { diameter: 0.72, height: 0.06, tessellation: 14 }, new BABYLON.Vector3(x, 0.05, z), materials.chrome, false);
  root.push(table, tableEdge, stem, foot);
  for (let i = 0; i < 4; i++) {
    const a = rotation + (Math.PI * i) / 2;
    const chair = createBox("foodChair", { width: 0.58, height: 0.16, depth: 0.55 }, new BABYLON.Vector3(x + Math.cos(a) * 1.15, 0.45, z + Math.sin(a) * 1.15), materials.seat, false);
    const chairBack = createBox("foodChairBack", { width: 0.55, height: 0.62, depth: 0.12 }, new BABYLON.Vector3(x + Math.cos(a) * 1.34, 0.72, z + Math.sin(a) * 1.34), materials.seat, false);
    const chairLeg = createCylinder("foodChairPedestal", { diameter: 0.1, height: 0.42, tessellation: 8 }, new BABYLON.Vector3(x + Math.cos(a) * 1.15, 0.22, z + Math.sin(a) * 1.15), materials.chrome, false);
    chair.rotation.y = -a;
    chairBack.rotation.y = -a;
    root.push(chair, chairBack, chairLeg);
  }
}

function buildShop(tileX, tileZ, side, rand, root) {
  const x = tileX * tileSize;
  const z = tileZ * tileSize;
  const isLeft = side === -1;
  const direction = isLeft ? -1 : 1;
  const frontX = x + direction * 4.08;
  const backX = x + direction * 10.2;
  const centerX = x + direction * 7.2;
  const frontRotation = isLeft ? Math.PI / 2 : -Math.PI / 2;
  const backWall = createBox("shopBackWall", { width: 0.4, height: 4.5, depth: 9.5 }, new BABYLON.Vector3(backX, 2.25, z), materials.shopDark);
  const shopFloor = createBox("shopFloor", { width: 6.0, height: 0.12, depth: 9.5 }, new BABYLON.Vector3(centerX, 0.08, z), materials.floor);
  const soffit = createBox("shopSoffit", { width: 6.2, height: 0.45, depth: 9.8 }, new BABYLON.Vector3(centerX, 4.25, z), materials.blackTrim, false);
  const sideA = createBox("shopSideWall", { width: 6.0, height: 4.2, depth: 0.24 }, new BABYLON.Vector3(centerX, 2.1, z - 4.85), materials.shopDark);
  const sideB = createBox("shopSideWall", { width: 6.0, height: 4.2, depth: 0.24 }, new BABYLON.Vector3(centerX, 2.1, z + 4.85), materials.shopDark);
  root.push(backWall, shopFloor, soffit, sideA, sideB);
  addStoreLightWall(root, backX - direction * 0.23, z, direction, rand);
  root.push(createBox("shopCeilingLight", { width: 4.8, height: 0.05, depth: 0.22 }, new BABYLON.Vector3(centerX, 3.86, z - 2.6), materials.light, false));
  root.push(createBox("shopCeilingLight", { width: 4.8, height: 0.05, depth: 0.22 }, new BABYLON.Vector3(centerX, 3.86, z + 2.6), materials.light, false));
  const glass = createBox(
    "shopGlass",
    { width: 0.12, height: 2.65, depth: 6.2 },
    new BABYLON.Vector3(frontX, 1.72, z),
    materials.shopGlass,
    false,
  );
  root.push(glass);
  root.push(createBox("shopThreshold", { width: 0.35, height: 0.09, depth: 6.5 }, new BABYLON.Vector3(frontX - direction * 0.1, 0.12, z), materials.chrome, false));
  root.push(createBox("shopMullion", { width: 0.12, height: 2.8, depth: 0.12 }, new BABYLON.Vector3(frontX - direction * 0.03, 1.75, z - 3.1), materials.blackTrim, false));
  root.push(createBox("shopMullion", { width: 0.12, height: 2.8, depth: 0.12 }, new BABYLON.Vector3(frontX - direction * 0.03, 1.75, z), materials.blackTrim, false));
  root.push(createBox("shopMullion", { width: 0.12, height: 2.8, depth: 0.12 }, new BABYLON.Vector3(frontX - direction * 0.03, 1.75, z + 3.1), materials.blackTrim, false));
  root.push(createBox("shopHeader", { width: 0.16, height: 0.22, depth: 6.7 }, new BABYLON.Vector3(frontX, 3.12, z), materials.blackTrim, false));
  root.push(createBox("shopKickplate", { width: 0.14, height: 0.32, depth: 6.7 }, new BABYLON.Vector3(frontX, 0.34, z), materials.blackTrim, false));
  root.push(createBox("shopDoorGap", { width: 0.04, height: 2.55, depth: 0.08 }, new BABYLON.Vector3(frontX - direction * 0.16, 1.7, z + 0.86), materials.blackTrim, false));
  root.push(createBox("shopDoorHandle", { width: 0.06, height: 0.68, depth: 0.08 }, new BABYLON.Vector3(frontX - direction * 0.22, 1.42, z + 1.14), materials.chrome, false));
  addShopAwning(root, frontX, z, direction, rand);
  const displayMat = rand > 0.66 ? materials.displayPink : rand > 0.33 ? materials.displayCyan : materials.displayGold;
  root.push(createBox("displayGlow", { width: 0.07, height: 1.65, depth: 1.25 }, new BABYLON.Vector3(frontX - direction * 0.28, 1.55, z - 1.8), displayMat, false));
  root.push(createBox("displayGlow", { width: 0.07, height: 1.65, depth: 1.25 }, new BABYLON.Vector3(frontX - direction * 0.28, 1.55, z + 1.8), rand > 0.5 ? materials.displayGold : materials.displayCyan, false));
  const sign = makeSign(
    ["MEGA MART", "SOFT PRETZELS", "PHONE BARN", "SLEEP DEPOT", "MALLBOOKS", "TOY VAULT", "LUMEN", "SPORT CITY"][Math.floor(rand * 8)],
    new BABYLON.Vector3(frontX - direction * 0.04, 3.46, z),
    frontRotation,
  );
  root.push(sign);
  addFloorShadow(root, frontX - direction * 0.8, z, 0.8, 6.2, Math.PI / 2);
  addFloorSheen(root, frontX - direction * 1.25, z, 1.1, 5.8, Math.PI / 2);
  addStorefrontReflections(root, frontX, z, direction, rand);
  if (rand > 0.74) {
    for (let i = -3; i <= 3; i++) {
      root.push(createBox("securityShutterLine", { width: 0.05, height: 2.75, depth: 0.035 }, new BABYLON.Vector3(frontX - direction * 0.11, 1.68, z + i * 0.85), materials.shutter, false));
    }
    for (let y = 0; y < 7; y++) {
      root.push(createBox("securityShutterCrossLine", { width: 0.052, height: 0.035, depth: 5.8 }, new BABYLON.Vector3(frontX - direction * 0.13, 0.62 + y * 0.34, z), materials.blackTrim, false));
    }
  } else {
    addMannequin(root, centerX - direction * 1.7, z - 1.6, frontRotation);
    addProductShelf(root, centerX - direction * 1.9, z + 1.8, 0, rand > 0.5 ? materials.posterBlue : materials.posterRed);
    if (rand > 0.18) addStoreFixtureCluster(root, centerX - direction * 1.3, z - 0.1, frontRotation, rand > 0.5 ? materials.posterCream : materials.posterBlue);
    if (rand > 0.62) addPartialShutter(root, frontX - direction * 0.12, z - 0.6, direction);
  }
  const posterMat = rand > 0.65 ? materials.posterRed : rand > 0.35 ? materials.posterBlue : materials.posterCream;
  root.push(createBox("salePoster", { width: 0.08, height: 1.25, depth: 0.9 }, new BABYLON.Vector3(frontX - direction * 0.16, 1.45, z + 3.85), posterMat, false));
  addPanelText(root, rand > 0.5 ? "SALE" : "OPEN", new BABYLON.Vector3(frontX - direction * 0.18, 2.28, z - 3.7), frontRotation, 1.05, 0.55, rand > 0.5 ? "#8d1818" : "#10273a", "#fff0c0");
  const lootRoll = seeded(tileX + side * 13, tileZ - 7);
  if (lootRoll > 0.42) {
    const mat = lootRoll > 0.75 ? materials.food : lootRoll > 0.58 ? materials.scrap : materials.wood;
    const type = lootRoll > 0.75 ? "food" : lootRoll > 0.58 ? "scrap" : "wood";
    const loot = createBox(
      "loot",
      { width: 0.8, height: 0.8, depth: 0.8 },
      new BABYLON.Vector3(isLeft ? x - 3.3 : x + 3.3, 0.55, z + (lootRoll - 0.5) * 9),
      mat,
      false,
    );
    addInteractable(loot, "loot", `Scavenge ${type}`, { [type]: type === "food" ? 1 : 2 });
    root.push(loot);
  }
}

function buildConcourse(root, tileX, tileZ, rand) {
  const x = tileX * tileSize;
  const z = tileZ * tileSize;
  root.push(createBox("wallL", { width: 0.5, height: 5.2, depth: tileSize }, new BABYLON.Vector3(x - 11, 2.55, z), materials.whiteWall));
  root.push(createBox("wallR", { width: 0.5, height: 5.2, depth: tileSize }, new BABYLON.Vector3(x + 11, 2.55, z), materials.whiteWall));
  root.push(createBox("wallBaseL", { width: 0.18, height: 0.24, depth: tileSize }, new BABYLON.Vector3(x - 10.72, 0.32, z), materials.blackTrim, false));
  root.push(createBox("wallBaseR", { width: 0.18, height: 0.24, depth: tileSize }, new BABYLON.Vector3(x + 10.72, 0.32, z), materials.blackTrim, false));
  addWallLightBand(root, x, z - 2.5, -1);
  addWallLightBand(root, x, z + 2.5, 1);
  if (rand > 0.28) addCeilingBulkhead(root, x, z - 7.8, 0, 13);
  addDownlightRow(root, x, z - 3.8, 0, 4.86, 6);
  addDownlightRow(root, x, z + 3.8, 0, 4.86, 6);
  if (rand > 0.54) addFloorDirectionArrow(root, x - 0.9, z + 1.8, rand > 0.5 ? 0 : Math.PI);
  for (let i = -1; i <= 1; i++) {
    root.push(createBox("wallPanelL", { width: 0.08, height: 1.25, depth: 2.2 }, new BABYLON.Vector3(x - 10.69, 2.6, z + i * 6.2), i === 0 ? materials.posterCream : materials.posterBlue, false));
    root.push(createBox("wallPanelR", { width: 0.08, height: 1.25, depth: 2.2 }, new BABYLON.Vector3(x + 10.69, 2.6, z + i * 6.2), i === 0 ? materials.posterRed : materials.posterCream, false));
  }
  buildShop(tileX, tileZ, -1, rand, root);
  buildShop(tileX, tileZ, 1, 1 - rand, root);
  if (rand > 0.58) {
    const kiosk = createBox("kiosk", { width: 4, height: 1.4, depth: 3 }, new BABYLON.Vector3(x, 0.7, z + (rand - 0.5) * 8), materials.wall);
    root.push(createBox("kioskGlass", { width: 4.2, height: 0.75, depth: 0.08 }, new BABYLON.Vector3(x, 1.45, z + (rand - 0.5) * 8 - 1.55), materials.shopGlass, false));
    root.push(createBox("kioskSign", { width: 3.5, height: 0.18, depth: 0.2 }, new BABYLON.Vector3(x, 1.95, z + (rand - 0.5) * 8), rand > 0.8 ? materials.redNeon : materials.neon, false));
    const scrap = createBox("scrap", { width: 1, height: 0.7, depth: 1 }, new BABYLON.Vector3(x + 1.1, 1.2, z - 0.3), materials.scrap, false);
    addInteractable(scrap, "loot", "Scavenge kiosk", { scrap: 2, food: rand > 0.76 ? 1 : 0 });
    root.push(kiosk, scrap);
  }
  if (rand > 0.28) addBench(root, x + (rand > 0.5 ? 2.6 : -2.6), z - 5.8, rand > 0.5 ? 0.08 : Math.PI);
  if (rand > 0.18) addPlanter(root, x + 3.8, z + 5.4, 0.85);
  if (rand > 0.62) addTrashBin(root, x - 4.3, z + 4.8);
  if (rand > 0.83) addDirectory(root, x, z - 6.5, 0);
  if (rand > 0.76) addHangingWayfinder(root, x, z, 0, rand > 0.88 ? "CAR PARK" : "FOOD COURT");
  if (rand > 0.86) addAnchorStorePortal(root, x, z + 9.8, 0, rand > 0.93 ? "CINEMA" : "BIG WING");
  if (rand > 0.64) addAdvertisingColumn(root, x - 5.6, z - 2.5);
  if (rand > 0.72) addServiceDoor(root, x + 10.66, z - 6.2, -Math.PI / 2);
  if (rand > 0.74) addVendingMachine(root, x - 10.35, z + 6.1, Math.PI / 2, rand > 0.86 ? materials.posterBlue : materials.posterRed);
  if (rand > 0.69) addATM(root, x + 10.28, z + 5.4, -Math.PI / 2);
  if (rand > 0.38) addSecurityCamera(root, x + (rand > 0.5 ? 9.9 : -9.9), z - 7.4, rand > 0.5 ? -Math.PI / 2 : Math.PI / 2, 4.25);
  if (rand > 0.44) addFireExitSign(root, x - 10.66, z - 6.6, Math.PI / 2, rand > 0.7 ? "FIRE EXIT" : "EXIT");
  if (rand > 0.88) addMaintenanceCart(root, x - 2.4, z + 6.5, rand * Math.PI);
  if (rand > 0.81) addCautionStand(root, x + 1.8, z - 2.6, rand * Math.PI);
  if (rand > 0.7) addShopperSilhouette(root, x - 2.8, z + 2.6, rand * Math.PI * 2);
  if (rand > 0.2) addScatteredMallClutter(root, x, z + 1.5, rand, rand > 0.75 ? 5 : 3);
  if (rand > 0.52) addFloorShadow(root, x, z + 4.5, 5.5, 1.4, 0.12);
}

function buildAtrium(root, tileX, tileZ, district, rand) {
  const x = tileX * tileSize;
  const z = tileZ * tileSize;
  const edgeX = Math.abs(district.localX) === 2;
  const edgeZ = Math.abs(district.localZ) === 2;
  addCeiling(root, x, z, true);
  if (district.localX === 0 || district.localZ === 0) addSunPatch(root, x - 2.4, z + 1.6, 6.8, 3.2, -0.22);
  for (let i = -2; i <= 2; i++) {
    root.push(createBox("skylightRib", { width: 0.14, height: 0.18, depth: tileSize }, new BABYLON.Vector3(x + i * 4.4, 12.22, z), materials.chrome, false));
    root.push(createBox("skylightRib", { width: tileSize, height: 0.18, depth: 0.14 }, new BABYLON.Vector3(x, 12.21, z + i * 4.4), materials.chrome, false));
  }
  addDownlightRow(root, x, z - 7.15, 0, 7.04, 7);
  addDownlightRow(root, x, z + 7.15, 0, 7.04, 7);
  addRail(root, x, z - tileSize * 0.43, true, 4.25);
  addRail(root, x, z + tileSize * 0.43, true, 7.45);
  root.push(createBox("upperWalkway", { width: tileSize, height: 0.35, depth: 3.2 }, new BABYLON.Vector3(x, 3.72, z - 8.5), materials.upperWalkway, false));
  root.push(createBox("upperWalkwayLip", { width: tileSize, height: 0.22, depth: 0.18 }, new BABYLON.Vector3(x, 3.98, z - 6.84), materials.blackTrim, false));
  addUndersideLight(root, x, z - 6.95, 3.48, true);
  root.push(createBox("upperWalkway", { width: tileSize, height: 0.35, depth: 3.2 }, new BABYLON.Vector3(x, 6.95, z + 8.5), materials.upperWalkway, false));
  root.push(createBox("upperWalkwayLip", { width: tileSize, height: 0.22, depth: 0.18 }, new BABYLON.Vector3(x, 7.2, z + 6.84), materials.blackTrim, false));
  addUndersideLight(root, x, z + 6.95, 6.72, true);
  addUpperStorefrontRun(root, x, z - 9.9, true);
  if (edgeZ) addUpperStorefrontRun(root, x - 9.1, z, false);
  if (edgeZ && rand > 0.45) addAdBanner(root, x + 6.6, z - Math.sign(district.localZ) * 2.4, Math.PI / 2, rand > 0.62 ? "SALE 50" : "EAT DRINK");
  if (!edgeX && !edgeZ) {
    root.push(createBox("atriumVoidHint", { width: 7.6, height: 0.035, depth: 5.8 }, new BABYLON.Vector3(x, 0.082, z), materials.shadowMat, false));
    root.push(createCylinder("floorMedallion", { diameter: 5.2, height: 0.035, tessellation: 48 }, new BABYLON.Vector3(x, 0.1, z), materials.floorTrim, false));
    root.push(createCylinder("floorMedallionInset", { diameter: 3.6, height: 0.038, tessellation: 48 }, new BABYLON.Vector3(x, 0.12, z), materials.tileAlt, false));
    if (rand > 0.2) addReflectingPool(root, x - 5.8, z + 3.2, -0.18);
  }
  if (edgeX) {
    root.push(createBox("atriumShopWall", { width: 0.5, height: 8, depth: tileSize }, new BABYLON.Vector3(x + Math.sign(district.localX) * 10.8, 4, z), materials.whiteWall));
    buildShop(tileX, tileZ, -Math.sign(district.localX), rand, root);
    addPanelText(root, "LEVEL 2", new BABYLON.Vector3(x + Math.sign(district.localX) * 10.45, 6.55, z - 5.8), Math.sign(district.localX) > 0 ? -Math.PI / 2 : Math.PI / 2, 1.8, 0.55, "#16191d", "#e7d9ae");
    addUpperShopGlow(root, x + Math.sign(district.localX) * 10.45, z + 3.8, Math.sign(district.localX) > 0 ? -Math.PI / 2 : Math.PI / 2, rand > 0.5 ? "FASHION" : "DINING");
    if (rand > 0.52) addElevatorBank(root, x + Math.sign(district.localX) * 10.42, z - 2.4, Math.sign(district.localX) > 0 ? -Math.PI / 2 : Math.PI / 2);
    if (rand > 0.34) addSecurityCamera(root, x + Math.sign(district.localX) * 9.9, z + 8.0, Math.sign(district.localX) > 0 ? -Math.PI / 2 : Math.PI / 2, 7.4);
  }
  if (edgeZ) {
    addRail(root, x - tileSize * 0.38, z, false, 4.25);
    addRail(root, x + tileSize * 0.38, z, false, 7.45);
  }
  if (district.localX === 0 && district.localZ === 0) {
    addHangingLight(root, x, z, new BABYLON.Color3(0.72, 0.9, 1));
    addHangingWayfinder(root, x - 5.5, z - 5.8, Math.PI / 10, "LEVEL 3");
    addAdBanner(root, x + 5.2, z - 4.2, -0.18, "NOW OPEN");
    addEscalator(root, x - 7, z + 5, Math.PI / 5);
    addEscalator(root, x + 7, z - 5, -Math.PI / 5);
    addEscalatorLanding(root, x - 6.7, z + 8.6, Math.PI / 5);
    addEscalatorLanding(root, x + 6.7, z - 8.6, -Math.PI / 5);
    root.push(createSphere("wireGlobe", { diameter: 3.1, segments: 12 }, new BABYLON.Vector3(x, 5.85, z), materials.railGlass, false));
    const ringA = BABYLON.MeshBuilder.CreateTorus("globeRing", { diameter: 3.35, thickness: 0.03, tessellation: 48 }, scene);
    ringA.position = new BABYLON.Vector3(x, 5.85, z);
    ringA.material = materials.chrome;
    const ringB = ringA.clone("globeRingB");
    ringB.rotation.x = Math.PI / 2;
    const ringC = ringA.clone("globeRingC");
    ringC.rotation.z = Math.PI / 2;
    root.push(ringA, ringB, ringC);
    addDirectory(root, x + 7.2, z + 7.2, Math.PI / 5);
  }
  if (rand > 0.46) addPalm(root, x + 5.5, z - 5.5, 0.9);
  if (rand > 0.22) addBench(root, x - 5.8, z + 5.5, Math.PI / 4);
  if (rand > 0.66) addSoftSeatingIsland(root, x - 4.2, z - 4.8, -0.25);
  if (rand > 0.34) addPlanter(root, x + 6.4, z + 3.8, 0.9);
  if (rand > 0.52) addTrashBin(root, x - 7.5, z - 3.8);
  if (rand > 0.73) addVendingMachine(root, x + 8.0, z - 7.2, -Math.PI / 4, materials.posterRed);
  if (rand > 0.61) addFireExitSign(root, x - 8.8, z + 8.95, 0, "EXIT");
  if (rand > 0.58) addShopperSilhouette(root, x + 2.5, z + 7.1, -Math.PI / 6);
  if (rand > 0.18) addScatteredMallClutter(root, x + 1.1, z - 0.8, rand, 3);
  addChromeColumn(root, x - 8.8, z - 8.8, 4, 8);
  root.push(createCylinder("columnBase", { diameter: 1.25, height: 0.25, tessellation: 20 }, new BABYLON.Vector3(x - 8.8, 0.14, z - 8.8), materials.blackTrim, false));
  root.push(createCylinder("columnCap", { diameter: 1.1, height: 0.18, tessellation: 20 }, new BABYLON.Vector3(x - 8.8, 7.86, z - 8.8), materials.blackTrim, false));
  addChromeColumn(root, x + 8.8, z + 8.8, 4, 8);
  root.push(createCylinder("columnBase", { diameter: 1.25, height: 0.25, tessellation: 20 }, new BABYLON.Vector3(x + 8.8, 0.14, z + 8.8), materials.blackTrim, false));
  root.push(createCylinder("columnCap", { diameter: 1.1, height: 0.18, tessellation: 20 }, new BABYLON.Vector3(x + 8.8, 7.86, z + 8.8), materials.blackTrim, false));
}

function buildFoodCourt(root, tileX, tileZ, district, rand) {
  const x = tileX * tileSize;
  const z = tileZ * tileSize;
  addCeiling(root, x, z, true);
  addDownlightRow(root, x, z - 5.8, 0, 7.25, 5);
  addDownlightRow(root, x, z + 5.8, 0, 7.25, 5);
  if (Math.abs(district.localX) === 2 || Math.abs(district.localZ) === 2) {
    root.push(createBox("foodCounter", { width: 8, height: 2.6, depth: 2.2 }, new BABYLON.Vector3(x, 1.3, z + 8.7), materials.shopDark));
    addFoodCourtBulkhead(root, x, z + 7.5, rand > 0.5 ? "FRESH FOOD" : "COFFEE BAR");
    root.push(createBox("counterFace", { width: 8.2, height: 0.9, depth: 0.1 }, new BABYLON.Vector3(x, 0.95, z + 7.55), rand > 0.5 ? materials.posterRed : materials.neon, false));
    for (let i = -2; i <= 2; i++) {
      root.push(createBox("menuPanel", { width: 1.25, height: 0.62, depth: 0.08 }, new BABYLON.Vector3(x + i * 1.45, 2.38, z + 7.53), i % 2 === 0 ? materials.posterCream : materials.posterBlue, false));
      root.push(createBox("heatLamp", { width: 0.85, height: 0.08, depth: 0.08 }, new BABYLON.Vector3(x + i * 1.45, 1.75, z + 7.48), materials.light, false));
    }
    for (let i = -2; i <= 2; i++) {
      root.push(createCylinder("queuePost", { diameter: 0.08, height: 0.72, tessellation: 8 }, new BABYLON.Vector3(x + i * 1.25, 0.36, z + 5.8), materials.chrome, false));
    }
    root.push(createBox("queueBelt", { width: 5.2, height: 0.08, depth: 0.08 }, new BABYLON.Vector3(x, 0.68, z + 5.8), materials.blackTrim, false));
    if (rand > 0.18) addCondimentStation(root, x - 3.8, z + 5.1, -0.08);
    if (rand > 0.38) addTrayReturn(root, x + 4.4, z + 5.35, 0);
    const sign = makeSign(["NOODLE LOOP", "BURGER LIGHT", "CAFETERIA 24", "DONUT PLANET"][Math.floor(rand * 4)], new BABYLON.Vector3(x, 2.85, z + 7.55), 0);
    root.push(sign);
    const food = createBox("foodCrate", { width: 0.9, height: 0.7, depth: 0.9 }, new BABYLON.Vector3(x + 2.8, 0.45, z + 7.25), materials.food, false);
    addInteractable(food, "loot", "Scavenge food counter", { food: 2, scrap: 1 });
    root.push(food);
  } else {
    const ring = createCylinder("floorCircle", { diameter: 8.5, height: 0.04, tessellation: 48 }, new BABYLON.Vector3(x, 0.04, z), materials.floorTrim, false);
    root.push(ring);
    for (let i = 0; i < 3; i++) {
      const angle = rand * Math.PI * 2 + i * 2.1;
      addTableSet(root, x + Math.cos(angle) * 5.2, z + Math.sin(angle) * 5.2, angle);
    }
    if (rand > 0.35) addTrashBin(root, x - 6.2, z - 2.8);
    if (rand > 0.5) addPlanter(root, x + 6.6, z + 2.4, 0.75);
    if (rand > 0.24) addCondimentStation(root, x + 1.8, z - 5.8, Math.PI);
    if (rand > 0.48) addTrayReturn(root, x - 5.6, z + 4.8, Math.PI / 6);
    if (rand > 0.7) addVendingMachine(root, x + 7.4, z - 6.1, -Math.PI / 5, materials.posterBlue);
    if (rand > 0.56) addShopperSilhouette(root, x - 3.5, z + 3.2, Math.PI / 3);
    if (rand > 0.1) addScatteredMallClutter(root, x, z, rand, 6);
    if (district.localX === 0 && district.localZ === 0) {
      addPalm(root, x, z, 1.15);
      addHangingLight(root, x - 5, z + 5, new BABYLON.Color3(1, 0.88, 0.55));
      addDirectory(root, x + 6.5, z - 6.5, -Math.PI / 8);
    }
  }
  addRail(root, x, z - tileSize * 0.45, true, 4.1);
}

function generateTile(tileX, tileZ) {
  const key = `${tileX},${tileZ}`;
  if (mall.has(key)) return;
  const root = [];
  const x = tileX * tileSize;
  const z = tileZ * tileSize;
  const rand = seeded(tileX, tileZ);
  const district = districtInfo(tileX, tileZ);

  addFloorPattern(root, x, z, district);
  if (district.type === "atrium") buildAtrium(root, tileX, tileZ, district, rand);
  if (district.type === "foodCourt") buildFoodCourt(root, tileX, tileZ, district, rand);
  if (district.type === "concourse") {
    addCeiling(root, x, z, false);
    buildConcourse(root, tileX, tileZ, rand);
  }

  if (rand > 0.72) {
    const trunk = createCylinder("fakeTree", { diameter: 0.35, height: 2.4 }, new BABYLON.Vector3(x + 2.5, 1.2, z + 2.5), materials.wood);
    const leaves = createCylinder("plasticPlant", { diameterTop: 0.2, diameterBottom: 2.2, height: 2.4 }, new BABYLON.Vector3(x + 2.5, 2.8, z + 2.5), materials.plant, false);
    addInteractable(trunk, "loot", "Break fake tree", { wood: 3 });
    root.push(trunk, leaves);
  }

  if (rand > 0.68 || (district.localX === 0 && district.localZ === 0)) {
    const light = new BABYLON.PointLight("tubeLight", new BABYLON.Vector3(x, district.type === "concourse" ? 4.35 : 8.6, z), scene);
    light.diffuse = new BABYLON.Color3(1, 0.86, 0.58);
    light.intensity = 0.48 + rand * 0.28;
    light.range = district.type === "concourse" ? 13 : 24;
    root.push(light);
  }
  finalizeTile(root);
  mall.set(key, root);
}

function updateMall() {
  const tx = Math.round(camera.position.x / tileSize);
  const tz = Math.round(camera.position.z / tileSize);
  for (let x = tx - renderRadius; x <= tx + renderRadius; x++) {
    for (let z = tz - renderRadius; z <= tz + renderRadius; z++) {
      generateTile(x, z);
    }
  }
  for (const [key, meshes] of mall) {
    const [x, z] = key.split(",").map(Number);
    if (Math.abs(x - tx) > renderRadius + 1 || Math.abs(z - tz) > renderRadius + 1) {
      meshes.forEach((mesh) => {
        interactables.delete(mesh);
        if (mesh.metadata?.disposableMaterial && mesh.material) {
          mesh.material.diffuseTexture?.dispose();
          mesh.material.dispose();
        }
        mesh.dispose();
      });
      mall.delete(key);
    }
  }
}

function updateFocus() {
  const ray = camera.getForwardRay(3.2);
  const hit = scene.pickWithRay(ray, (mesh) => interactables.has(mesh));
  state.focused = hit?.pickedMesh ?? null;
  ui.prompt.textContent = state.focused
    ? `${state.focused.metadata.label}  [E]`
    : `Mode: ${state.buildMode === "barricade" ? "Barricade" : "Camp"}  [1/2]  Click to place`;
}

function flash(text) {
  ui.notice.textContent = text;
  ui.notice.classList.add("show");
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => ui.notice.classList.remove("show"), 1400);
}

function updateUi() {
  ui.wood.textContent = state.wood;
  ui.scrap.textContent = state.scrap;
  ui.food.textContent = state.food;
  ui.warmth.value = state.warmth;
  ui.hunger.value = state.hunger;
  ui.battery.value = state.battery;
}

function scavenge() {
  if (!state.focused) return;
  const rewards = state.focused.metadata.rewards;
  state.wood += rewards.wood || 0;
  state.scrap += rewards.scrap || 0;
  state.food += rewards.food || 0;
  flash(`Found ${Object.entries(rewards).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ")}`);
  interactables.delete(state.focused);
  state.focused.dispose();
  state.focused = null;
  updateUi();
}

function eat() {
  if (state.food < 1) {
    flash("No food left");
    return;
  }
  state.food -= 1;
  state.hunger = Math.min(100, state.hunger + 34);
  flash("Ate something from a vending machine. Probably fine.");
  updateUi();
}

function placeBuild() {
  const ray = camera.getForwardRay(5.5);
  const hit = scene.pickWithRay(ray, (mesh) => mesh.name === "floor");
  if (!hit?.pickedPoint) return;
  if (state.buildMode === "barricade") {
    if (state.wood < 4 || state.scrap < 1) {
      flash("Need 4 wood and 1 scrap");
      return;
    }
    state.wood -= 4;
    state.scrap -= 1;
    const wall = createBox("barricade", { width: 3.8, height: 2.2, depth: 0.45 }, hit.pickedPoint.add(new BABYLON.Vector3(0, 1.1, 0)), materials.barricade);
    wall.rotation.y = camera.rotation.y;
    placed.push(wall);
    flash("Barricade placed");
  } else {
    if (state.wood < 5 || state.scrap < 2) {
      flash("Need 5 wood and 2 scrap");
      return;
    }
    state.wood -= 5;
    state.scrap -= 2;
    const camp = createCylinder("camp", { diameter: 1.3, height: 0.45 }, hit.pickedPoint.add(new BABYLON.Vector3(0, 0.26, 0)), materials.camp, false);
    const light = new BABYLON.PointLight("campLight", camp.position.add(new BABYLON.Vector3(0, 1.2, 0)), scene);
    light.diffuse = new BABYLON.Color3(1, 0.42, 0.16);
    light.intensity = 1.4;
    light.range = 8;
    placed.push(camp, light);
    flash("Camp set up");
  }
  updateUi();
}

function isNearCamp() {
  return placed.some((item) => item.name === "camp" && BABYLON.Vector3.Distance(item.position, camera.position) < 7);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyE") scavenge();
  if (event.code === "KeyF") eat();
  if (event.code === "Digit1") {
    state.buildMode = "barricade";
    flash("Build mode: barricade");
  }
  if (event.code === "Digit2") {
    state.buildMode = "camp";
    flash("Build mode: camp");
  }
});

canvas.addEventListener("click", () => {
  if (document.pointerLockElement !== canvas) return;
  placeBuild();
});

ui.startButton.addEventListener("click", async () => {
  ui.start.classList.add("hidden");
  try {
    await canvas.requestPointerLock();
  } catch {
    flash("Click the view if mouse look is not active");
  }
});

engine.runRenderLoop(() => {
  const delta = engine.getDeltaTime() / 1000;
  state.time += delta;
  updateMall();
  updateFocus();
  flashlight.intensity = 0.7 + (state.battery / 100) * 1.7;
  if (Math.floor(state.time * 4) % 2 === 0) flashlight.intensity *= 0.82;
  state.battery = Math.max(0, state.battery - delta * 0.38);
  state.hunger = Math.max(0, state.hunger - delta * 0.42);
  state.warmth = Math.max(0, Math.min(100, state.warmth + (isNearCamp() ? delta * 6 : -delta * 0.62)));
  hemi.intensity = 0.46 + (state.battery / 100) * 0.18;
  if (state.hunger <= 0 || state.warmth <= 0) {
    camera.speed = 0.07;
    ui.prompt.textContent = "You are fading. Find food or warmth.";
  } else {
    camera.speed = 0.16;
  }
  updateUi();
  window.__mallStats = {
    activeTiles: mall.size,
    meshes: scene.meshes.length,
    lights: scene.lights.length,
    activeMeshes: scene.getActiveMeshes().length,
    totalVertices: scene.getTotalVertices(),
  };
  scene.render();
});

window.addEventListener("resize", () => engine.resize());
updateMall();
updateUi();
