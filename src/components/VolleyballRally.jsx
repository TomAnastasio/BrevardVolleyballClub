import { useEffect, useRef } from "react";

// Tunable parameters for the endless rally animation.
const MIN_FLIGHT_SECONDS = 0.85;
const MAX_FLIGHT_SECONDS = 1.65;
const MIN_ARC_PX = 46;
const MAX_ARC_PX = 88;
const LANE_HALF_WIDTH_PX = 26; // how far a player shuffles from their home spot to reach the ball
const FIGURE_HEIGHT_PX = 23;
const NET_HEIGHT_PX = 22;
const NET_SKEW_PX = 13; // horizontal spread between the two net posts (the angled camera view)
const GROUND_MARGIN_PX = 16; // gap between the ground line and the bottom of the canvas

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawPlayer(ctx, { x, groundY, squash, hop }) {
  const bodyW = 9;
  const bodyH = 15;
  const headW = 7;
  const headH = 7;

  const squashedW = bodyW * (1 + squash * 0.35);
  const squashedH = bodyH * (1 - squash * 0.35);

  const bodyBottom = groundY - hop;
  const bodyTop = bodyBottom - squashedH;
  ctx.fillRect(Math.round(x - squashedW / 2), Math.round(bodyTop), Math.round(squashedW), Math.round(squashedH));

  const headTop = bodyTop - headH;
  ctx.fillRect(Math.round(x - headW / 2), Math.round(headTop), headW, headH);
}

export default function VolleyballRally({ className = "" }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return undefined;
    const ctx = canvas.getContext("2d");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);

    const laneCenter = (side) => (side === "left" ? width * 0.28 : width * 0.72);

    const positions = { left: laneCenter("left"), right: laneCenter("right") };
    const rally = {
      hitterSide: "left",
      receiverStartX: positions.right,
      targetX: positions.right,
      duration: randomBetween(MIN_FLIGHT_SECONDS, MAX_FLIGHT_SECONDS),
      arc: randomBetween(MIN_ARC_PX, MAX_ARC_PX),
      elapsed: 0,
    };

    const startNextFlight = () => {
      const receiverSide = rally.hitterSide === "left" ? "right" : "left";
      rally.receiverStartX = positions[receiverSide];
      rally.targetX = laneCenter(receiverSide) + randomBetween(-LANE_HALF_WIDTH_PX, LANE_HALF_WIDTH_PX);
      rally.duration = randomBetween(MIN_FLIGHT_SECONDS, MAX_FLIGHT_SECONDS);
      rally.arc = randomBetween(MIN_ARC_PX, MAX_ARC_PX);
      rally.elapsed = 0;
    };

    const render = (t, nowSeconds) => {
      const groundY = height - GROUND_MARGIN_PX;
      ctx.clearRect(0, 0, width, height);

      const netCenterX = width / 2;
      const leftPostX = netCenterX - NET_SKEW_PX;
      const rightPostX = netCenterX + NET_SKEW_PX;
      const leftTopY = groundY - NET_HEIGHT_PX;
      const rightTopY = groundY - NET_HEIGHT_PX - 10;
      const rightBottomY = groundY - 4;

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(0, groundY + 0.5);
      ctx.lineTo(width, groundY + 0.5);
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(leftPostX, leftTopY);
      ctx.lineTo(rightPostX, rightTopY);
      ctx.lineTo(rightPostX, rightBottomY);
      ctx.lineTo(leftPostX, groundY);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      const meshRows = 4;
      for (let row = 1; row < meshRows; row++) {
        const rowT = row / meshRows;
        ctx.beginPath();
        ctx.moveTo(leftPostX, lerp(leftTopY, groundY, rowT));
        ctx.lineTo(rightPostX, lerp(rightTopY, rightBottomY, rowT));
        ctx.stroke();
      }
      const meshCols = 5;
      for (let col = 1; col < meshCols; col++) {
        const colT = col / meshCols;
        ctx.beginPath();
        ctx.moveTo(lerp(leftPostX, rightPostX, colT), lerp(leftTopY, rightTopY, colT));
        ctx.lineTo(lerp(leftPostX, rightPostX, colT), lerp(groundY, rightBottomY, colT));
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftPostX, leftTopY);
      ctx.lineTo(rightPostX, rightTopY);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(leftPostX - 1, leftTopY, 2, groundY - leftTopY);
      ctx.fillRect(rightPostX - 1, rightTopY, 2, rightBottomY - rightTopY);

      const receiverSide = rally.hitterSide === "left" ? "right" : "left";
      const hitterX = positions[rally.hitterSide];
      // The ball itself moves at a constant clip (true parabola, no ease) so it snaps off
      // the hitter and into the receiver instead of drifting in and out slowly.
      const ballX = lerp(hitterX, rally.targetX, t);
      const ballHitY = groundY - FIGURE_HEIGHT_PX * 0.6;
      const ballY = ballHitY - 4 * rally.arc * t * (1 - t);

      // The receiver's footwork eases out (quick reaction, gentle settle) rather than
      // tracking the ball's linear pace 1:1.
      const receiverX = lerp(rally.receiverStartX, rally.targetX, easeOutCubic(t));
      positions[receiverSide] = receiverX;

      // Bounce/squash cue right at contact (t≈0 = just hit, t≈1 = about to hit).
      const contactProximity = Math.min(t, 1 - t);
      const contactSquash = contactProximity < 0.08 ? 1 - contactProximity / 0.08 : 0;
      const hitterSquash = t < 0.08 ? contactSquash : 0;
      const receiverSquash = t > 0.92 ? contactSquash : 0;

      ctx.fillStyle = "rgba(255,255,255,0.88)";
      const drawSide = (side) => {
        const isMoving = side === receiverSide;
        const x = isMoving ? receiverX : hitterX;
        const squash = isMoving ? receiverSquash : hitterSquash;
        const idleAmplitude = isMoving ? 1.6 : 0.6;
        const hop = Math.abs(Math.sin(nowSeconds * 5 + (side === "left" ? 0 : Math.PI))) * idleAmplitude;
        drawPlayer(ctx, { x, groundY, squash, hop });
      };
      drawSide("left");
      drawSide("right");

      const shadowScale = 1 - Math.min(0.6, (ballHitY - ballY) / (rally.arc * 2));
      ctx.fillStyle = `rgba(255,255,255,${0.18 * shadowScale})`;
      ctx.beginPath();
      ctx.ellipse(ballX, groundY, 4 * shadowScale, 1.5 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      const ballSquash = contactSquash;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.ellipse(ballX, ballY, 3 * (1 + ballSquash * 0.6), 3 * (1 - ballSquash * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
    };

    let raf = null;
    let lastTime = null;

    if (reducedMotion) {
      render(0.5, 0);
      return () => observer.disconnect();
    }

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        lastTime = now;
        return;
      }
      if (lastTime == null) lastTime = now;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      rally.elapsed += dt;
      const t = rally.duration > 0 ? rally.elapsed / rally.duration : 1;
      if (t >= 1) {
        render(1, now / 1000);
        positions[rally.hitterSide === "left" ? "right" : "left"] = rally.targetX;
        rally.hitterSide = rally.hitterSide === "left" ? "right" : "left";
        startNextFlight();
        return;
      }
      render(t, now / 1000);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={className} style={{ paddingBottom: "var(--safe-bottom)" }}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
    </div>
  );
}
