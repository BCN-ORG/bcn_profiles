"use client";

import { useEffect, useRef, useState } from "react";
import { Redo2, RotateCcw, Undo2 } from "lucide-react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import {
  BCN_CARD_BACK_URL,
  createArtifactSceneLights,
  createBcnIdentityArtifact,
  loadCoverTexture,
  type BcnIdentityArtifactRuntime,
} from "./create-bcn-identity-artifact";

type Props = {
  initials: string;
  avatarUrl?: string | null;
  label: string;
  rotateLeftLabel: string;
  rotateRightLabel: string;
  resetLabel: string;
  fallbackLabel: string;
  hint?: string;
};

const DEFAULT_ROTATION = { x: -0.06, y: -0.18, z: 0 };

function ArtifactFallback({
  initials,
  label,
}: {
  initials: string;
  label: string;
}) {
  return (
    <div className="flex aspect-square min-h-72 items-center justify-center rounded-[calc(var(--radius)+2px)] border border-border/80 bg-muted/40">
      <div className="flex size-32 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-3xl font-semibold tracking-tight text-primary shadow-card">
        {initials}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default function ProfileArtifact3D({
  initials,
  avatarUrl,
  label,
  rotateLeftLabel,
  rotateRightLabel,
  resetLabel,
  fallbackLabel,
  hint,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<BcnIdentityArtifactRuntime | null>(null);
  const renderRef = useRef<() => void>(() => undefined);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setFailed(true);
      return;
    }

    let cancelled = false;
    let tearDown = () => undefined;

    void (async () => {
      let avatarTexture: THREE.Texture | null = null;
      let backTexture: THREE.Texture | null = null;
      try {
        backTexture = await loadCoverTexture(BCN_CARD_BACK_URL);
      } catch {
        backTexture = null;
      }
      if (avatarUrl) {
        try {
          avatarTexture = await loadCoverTexture(avatarUrl);
        } catch {
          avatarTexture = null;
        }
      }
      if (cancelled) {
        avatarTexture?.dispose();
        backTexture?.dispose();
        return;
      }

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
        });
      } catch {
        avatarTexture?.dispose();
        backTexture?.dispose();
        setFailed(true);
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(0, 0, 4.6);

      try {
        createArtifactSceneLights(scene);

        const artifact = createBcnIdentityArtifact({
          initials,
          avatarTexture,
          backTexture,
        });
        artifact.root.rotation.set(
          DEFAULT_ROTATION.x,
          DEFAULT_ROTATION.y,
          DEFAULT_ROTATION.z,
        );
        runtimeRef.current = artifact;
        scene.add(artifact.root);

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;

        let frame = 0;
        let last = performance.now();
        let elapsed = 0;
        let dragging = false;

        const paint = () => renderer.render(scene, camera);
        renderRef.current = paint;

        const loop = (now: number) => {
          frame = requestAnimationFrame(loop);
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (!dragging) {
            elapsed += dt;
            artifact.tick(dt, elapsed);
          }
          paint();
        };
        frame = requestAnimationFrame(loop);

        const resize = () => {
          const { width, height } = container.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          paint();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        const onContextLost = (event: Event) => {
          event.preventDefault();
          setFailed(true);
        };
        canvas.addEventListener("webglcontextlost", onContextLost);

        const onPointerDown = () => {
          dragging = true;
        };
        const onPointerUp = () => {
          dragging = false;
        };
        canvas.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointerup", onPointerUp);

        tearDown = () => {
          cancelAnimationFrame(frame);
          canvas.removeEventListener("webglcontextlost", onContextLost);
          canvas.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("pointerup", onPointerUp);
          resizeObserver.disconnect();
          artifact.dispose();
          renderer.dispose();
          runtimeRef.current = null;
          renderRef.current = () => undefined;
        };

        if (cancelled) tearDown();
      } catch (error) {
        console.error("[ProfileArtifact3D]", error);
        avatarTexture?.dispose();
        backTexture?.dispose();
        renderer.dispose();
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      tearDown();
    };
  }, [avatarUrl, initials]);

  function rotate(x: number, y: number) {
    const root = runtimeRef.current?.root;
    if (!root) return;
    root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + x, -0.65, 0.35);
    root.rotation.y += y;
    renderRef.current();
  }

  if (failed) {
    return <ArtifactFallback initials={initials} label={fallbackLabel} />;
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="aspect-square min-h-72 overflow-hidden rounded-[calc(var(--radius)+2px)] border border-border/70 bg-[radial-gradient(circle_at_50%_42%,oklch(0.22_0.02_160_/_0.35),transparent_62%),var(--muted)]/40 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)] dark:bg-[radial-gradient(circle_at_50%_42%,oklch(0.45_0.08_160_/_0.18),transparent_62%),oklch(0_0_0_/_0.25)]"
      >
        <canvas
          ref={canvasRef}
          className="size-full touch-none cursor-grab active:cursor-grabbing"
          role="img"
          aria-label={label}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            rotate(
              (event.clientY - drag.y) * 0.006,
              (event.clientX - drag.x) * 0.008,
            );
            drag.x = event.clientX;
            drag.y = event.clientY;
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) {
              dragRef.current = null;
            }
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={rotateLeftLabel}
          title={rotateLeftLabel}
          onClick={() => rotate(0, -0.28)}
        >
          <Undo2 aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={resetLabel}
          title={resetLabel}
          onClick={() => {
            runtimeRef.current?.root.rotation.set(
              DEFAULT_ROTATION.x,
              DEFAULT_ROTATION.y,
              DEFAULT_ROTATION.z,
            );
            renderRef.current();
          }}
        >
          <RotateCcw aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={rotateRightLabel}
          title={rotateRightLabel}
          onClick={() => rotate(0, 0.28)}
        >
          <Redo2 aria-hidden />
        </Button>
      </div>
      {hint ? (
        <p className="text-center text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
