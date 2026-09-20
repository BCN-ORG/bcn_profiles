import * as THREE from "three";

/**
 * BCN Identity Artifact — one hero medal. Emerald / zinc only.
 */

export type BcnIdentityArtifactOptions = {
  initials: string;
  avatarTexture?: THREE.Texture | null;
  /** BCN brand back face — same for every profile. */
  backTexture?: THREE.Texture | null;
  scale?: number;
};

export const BCN_CARD_BACK_URL = "/brand/bcn-card-back.webp";

export function loadCoverTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        const img = texture.image as { width?: number; height?: number };
        const w = img.width ?? 1;
        const h = img.height ?? 1;
        const aspect = w / h;
        if (aspect > 1) {
          texture.repeat.set(1 / aspect, 1);
          texture.offset.set((1 - 1 / aspect) / 2, 0);
        } else if (aspect < 1) {
          texture.repeat.set(1, aspect);
          texture.offset.set(0, (1 - aspect) / 2);
        }
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

export const loadAvatarTexture = loadCoverTexture;

export type BcnIdentityArtifactRuntime = {
  root: THREE.Group;
  pivots: { root: THREE.Group; core: THREE.Group };
  dispose: () => void;
  tick: (dt: number, elapsed: number) => void;
};

function makeInitialsTexture(initials: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const bg = ctx.createRadialGradient(256, 256, 24, 256, 256, 256);
    bg.addColorStop(0, "#1f4a3c");
    bg.addColorStop(0.6, "#10241c");
    bg.addColorStop(1, "#0a1410");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8fff4";
    ctx.font = "700 176px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(60, 184, 135, 0.5)";
    ctx.shadowBlur = 22;
    ctx.fillText(initials.slice(0, 2).toUpperCase() || "BC", 256, 272);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBcnIdentityArtifact(
  options: BcnIdentityArtifactOptions,
): BcnIdentityArtifactRuntime {
  const scale = options.scale ?? 1;
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  const root = new THREE.Group();
  root.name = "BcnIdentityArtifact";
  root.scale.setScalar(scale);

  const zinc = track(
    new THREE.MeshStandardMaterial({
      color: 0x1a2220,
      metalness: 0.9,
      roughness: 0.32,
    }),
  );
  const emerald = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x2f9f72,
      metalness: 0.45,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      emissive: new THREE.Color(0x0a2e22),
      emissiveIntensity: 0.4,
    }),
  );
  const bezelMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x7fe0b8,
      metalness: 0.7,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: new THREE.Color(0x1a6b4a),
      emissiveIntensity: 0.65,
    }),
  );
  const orbitMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x3cb887,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  );
  const softRingMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x3cb887,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  // pedestal
  const pedestal = new THREE.Group();
  root.add(pedestal);

  const base = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.05, 1.22, 0.14, 64)),
    zinc,
  );
  base.position.y = -1.48;
  pedestal.add(base);

  const glass = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.95, 64)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x0c1411,
        metalness: 0.85,
        roughness: 0.2,
      }),
    ),
  );
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = -1.4;
  pedestal.add(glass);

  const floorGlow = new THREE.Mesh(
    track(new THREE.RingGeometry(0.4, 1.05, 64)),
    softRingMat,
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = -1.395;
  pedestal.add(floorGlow);

  const orbit = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.95, 0.016, 12, 96)),
    orbitMat,
  );
  orbit.rotation.x = Math.PI / 2;
  orbit.position.y = -1.39;
  pedestal.add(orbit);

  // medal
  const corePivot = new THREE.Group();
  corePivot.position.y = 0.08;
  root.add(corePivot);

  const faceMap =
    options.avatarTexture ?? track(makeInitialsTexture(options.initials));
  if (options.avatarTexture) track(options.avatarTexture);
  if (options.backTexture) track(options.backTexture);

  const medal = new THREE.Group();
  corePivot.add(medal);

  const rim = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.08, 1.08, 0.14, 64)),
    emerald,
  );
  rim.rotation.x = Math.PI / 2;
  medal.add(rim);

  const bezel = new THREE.Mesh(
    track(new THREE.TorusGeometry(1.08, 0.042, 16, 80)),
    bezelMat,
  );
  medal.add(bezel);

  const face = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.98, 64)),
    track(
      new THREE.MeshBasicMaterial({
        map: faceMap,
        transparent: !options.avatarTexture,
        depthWrite: Boolean(options.avatarTexture),
      }),
    ),
  );
  face.position.z = 0.075;
  medal.add(face);

  const back = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.98, 64)),
    track(
      new THREE.MeshBasicMaterial({
        map: options.backTexture ?? undefined,
        color: options.backTexture ? 0xffffff : 0x1a2220,
      }),
    ),
  );
  back.position.z = -0.075;
  back.rotation.y = Math.PI;
  medal.add(back);

  const halo = new THREE.Mesh(
    track(new THREE.TorusGeometry(1.32, 0.01, 8, 96)),
    softRingMat,
  );
  medal.add(halo);

  return {
    root,
    pivots: { root, core: corePivot },
    dispose: () => disposables.forEach((d) => d.dispose()),
    tick: (_dt, elapsed) => {
      corePivot.position.y = 0.08 + Math.sin(elapsed * 1.05) * 0.045;
      corePivot.rotation.z = Math.sin(elapsed * 0.5) * 0.035;
      corePivot.rotation.x = Math.sin(elapsed * 0.35) * 0.025;
      orbit.rotation.z = elapsed * 0.4;
      halo.rotation.z = -elapsed * 0.18;
      const pulse = 0.8 + Math.sin(elapsed * 1.7) * 0.2;
      orbitMat.opacity = 0.45 + pulse * 0.35;
      bezelMat.emissiveIntensity = 0.45 + pulse * 0.35;
      floorGlow.scale.setScalar(0.96 + pulse * 0.05);
    },
  };
}

export function createArtifactSceneLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xf2fffa, 0x0a1210, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(2.6, 4.8, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8e6c8, 0.55);
  fill.position.set(-3.5, 1.2, -2);
  scene.add(fill);
  const rim = new THREE.PointLight(0x3cb887, 14, 11, 2);
  rim.position.set(0, 0.5, 3);
  scene.add(rim);
}
