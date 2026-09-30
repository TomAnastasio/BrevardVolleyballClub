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

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawPlayer(ctx, { x, groundY, facing, swing, wobble }) {
  const legW = 3;
  const legGap = 2;
  const legH = 7;
  const bodyW = 8;
  const bodyH = 9;
  const headW = 7;
  const headH = 7;
  const armW = 3;
  const armH = 8;

  ctx.fillRect(Math.round(x - legGap - legW + wobble), groundY - legH, legW, legH);
  ctx.fillRect(Math.round(x + legGap - wobble), groundY - legH, legW, legH);

  const bodyTop = groundY - legH - bodyH;
  ctx.fillRect(Math.round(x - bodyW / 2), bodyTop, bodyW, bodyH);

  const headTop = bodyTop - headH;
  ctx.fillRect(Math.round(x - headW / 2), headTop, headW, headH);

  const armTop = bodyTop + 1;
  const backArmX = x - facing * (bodyW / 2 + armW);
  ctx.fillRect(Math.round(backArmX), armTop, armW, armH);

  const forwardRestX = x + facing * (bodyW / 2);
  const forwardSwingX = x + facing * (bodyW / 2 + armW + 5);
  const forwardX = lerp(forwardRestX, forwardSwingX, swing);
  const forwardTop = armTop - swing * 9;
  ctx.fillRect(Math.round(forwardX), Math.round(forwardTop), armW, armH);
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
      const receiverX = lerp(rally.receiverStartX, rally.targetX, t);
      positions[receiverSide] = receiverX;

      const ballHitY = groundY - FIGURE_HEIGHT_PX * 0.6;
      const ballX = lerp(hitterX, rally.targetX, t);
      const ballY = ballHitY - 4 * rally.arc * t * (1 - t);

      const hitterSwing = t < 0.18 ? 1 - t / 0.18 : 0;
      const receiverSwing = t > 0.8 ? (t - 0.8) / 0.2 : 0;

      ctx.fillStyle = "rgba(255,255,255,0.88)";
      const drawSide = (side) => {
        const isLeft = side === "left";
        const x = side === rally.hitterSide ? hitterX : receiverX;
        const swing = side === rally.hitterSide ? hitterSwing : receiverSwing;
        const isMoving = side === receiverSide;
        const wobbleAmplitude = isMoving ? 1.4 : 0.4;
        const wobble = Math.sin(nowSeconds * 6 + (isLeft ? 0 : Math.PI)) * wobbleAmplitude;
        drawPlayer(ctx, { x, groundY, facing: isLeft ? 1 : -1, swing, wobble });
      };
      drawSide("left");
      drawSide("right");

      const shadowScale = 1 - Math.min(0.6, (ballHitY - ballY) / (rally.arc * 2));
      ctx.fillStyle = `rgba(255,255,255,${0.18 * shadowScale})`;
      ctx.beginPath();
      ctx.ellipse(ballX, groundY, 4 * shadowScale, 1.5 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(ballX, ballY, 3, 0, Math.PI * 2);
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
      let t = rally.duration > 0 ? rally.elapsed / rally.duration : 1;
      if (t >= 1) {
        t = 1;
        render(easeInOutQuad(t), now / 1000);
        positions[rally.hitterSide === "left" ? "right" : "left"] = rally.targetX;
        rally.hitterSide = rally.hitterSide === "left" ? "right" : "left";
        startNextFlight();
        return;
      }
      render(easeInOutQuad(t), now / 1000);
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
