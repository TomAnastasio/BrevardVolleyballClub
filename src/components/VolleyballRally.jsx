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
const TOM_AVATAR_URL = "/Tom.jpg"; // always worn by the right-side figure once anyone is signed in
const BALL_RADIUS_PX = 3;

// Tunable parameters for the rare "spiked rally" sequence: a slow high set, a jump, a hard
// spike straight at the other player, an off-the-body bounce, a dribble, and a knockdown.
// Gated to at most once per SPECIAL_COOLDOWN_SECONDS, and even then only rolled with
// SPECIAL_TRIGGER_CHANCE odds, so most cooldown windows pass without one firing.
const SPECIAL_COOLDOWN_SECONDS = 30;
const SPECIAL_TRIGGER_CHANCE = 0.25;
const SET_DURATION_SECONDS = 2.0;
const SET_ARC_PX = 150;
const JUMP_DURATION_SECONDS = 0.4;
const JUMP_HEIGHT_PX = 18;
const SPIKE_DURATION_SECONDS = 0.28;
const SPIKE_ARC_PX = 12;
const IMPACT_DURATION_SECONDS = 0.22;
const IMPACT_ARC_PX = 14;
const IMPACT_DRIFT_PX = 10;
const DRIBBLE_BOUNCES = [
  { duration: 0.26, arc: 8 },
  { duration: 0.2, arc: 3.5 },
  { duration: 0.14, arc: 1.2 },
];
const KNOCKDOWN_FALL_SECONDS = 0.3; // how fast the hit player collapses once the ball connects
const KNOCKDOWN_IDLE_MIN_SECONDS = 2;
const KNOCKDOWN_IDLE_MAX_SECONDS = 2.8;
const RECOVER_DURATION_SECONDS = 0.45;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawPlayer(ctx, { x, groundY, squash, hop, avatarImg, lie = 0, fallDir = 1 }) {
  const bodyW = 9;
  const bodyH = 15;
  const headW = 7;
  const headH = 7;

  const squashedW = bodyW * (1 + squash * 0.35);
  const squashedH = bodyH * (1 - squash * 0.35);

  const standingBodyBottom = groundY - hop;
  const standingBodyTop = standingBodyBottom - squashedH;

  const lyingWidth = bodyH * 1.2;
  const lyingHeight = bodyW * 1.1;
  const lyingBodyBottom = groundY;
  const lyingBodyTop = lyingBodyBottom - lyingHeight;
  const lyingBodyCenterX = x + (fallDir * lyingWidth) / 2;

  const bodyW2 = lerp(squashedW, lyingWidth, lie);
  const bodyH2 = lerp(squashedH, lyingHeight, lie);
  const bodyCenterX = lerp(x, lyingBodyCenterX, lie);
  const bodyBottom2 = lerp(standingBodyBottom, lyingBodyBottom, lie);
  const bodyTop2 = bodyBottom2 - bodyH2;

  ctx.fillRect(Math.round(bodyCenterX - bodyW2 / 2), Math.round(bodyTop2), Math.round(bodyW2), Math.round(bodyH2));

  let standingHeadCenterX;
  let standingHeadCenterY;
  let lyingHeadCenterX;
  let lyingHeadCenterY;
  let headRadius = null;

  if (avatarImg) {
    headRadius = bodyH;
    standingHeadCenterX = x;
    standingHeadCenterY = standingBodyTop - headRadius;
    lyingHeadCenterX = lyingBodyCenterX + fallDir * (lyingWidth / 2 + headRadius);
    lyingHeadCenterY = lyingBodyTop + lyingHeight / 2;
  } else {
    standingHeadCenterX = x;
    standingHeadCenterY = standingBodyTop - headH / 2;
    lyingHeadCenterX = lyingBodyCenterX + fallDir * (lyingWidth / 2 + headW / 2);
    lyingHeadCenterY = lyingBodyTop + lyingHeight / 2;
  }

  const headCenterX = lerp(standingHeadCenterX, lyingHeadCenterX, lie);
  const headCenterY = lerp(standingHeadCenterY, lyingHeadCenterY, lie);

  if (avatarImg) {
    const diameter = bodyH * 2;
    const radius = diameter / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, headCenterX - radius, headCenterY - radius, diameter, diameter);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillRect(Math.round(headCenterX - headW / 2), Math.round(headCenterY - headH / 2), headW, headH);
  }
}

function useAvatarImage(url) {
  const imgRef = useRef(null);

  useEffect(() => {
    if (!url) {
      imgRef.current = null;
      return undefined;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) imgRef.current = img;
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return imgRef;
}

export default function VolleyballRally({ className = "", avatarUrl = null, isAuthenticated = false }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const avatarImageRef = useAvatarImage(avatarUrl);
  const tomAvatarImageRef = useAvatarImage(isAuthenticated ? TOM_AVATAR_URL : null);

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

    const getGroundY = () => height - GROUND_MARGIN_PX;
    const laneCenter = (side) => (side === "left" ? width * 0.28 : width * 0.72);
    // The canvas itself clips anything drawn above y=0, so no arc may lift the ball higher
    // than the contact height — leave a small buffer so it never grazes the top edge.
    const maxSafeArc = () => Math.max(18, getGroundY() - FIGURE_HEIGHT_PX * 0.6 - 6);

    const positions = { left: laneCenter("left"), right: laneCenter("right") };
    const rally = {
      hitterSide: "left",
      kind: "normal",
      receiverStartX: positions.right,
      targetX: positions.right,
      duration: randomBetween(MIN_FLIGHT_SECONDS, MAX_FLIGHT_SECONDS),
      arc: randomBetween(MIN_ARC_PX, MAX_ARC_PX),
      elapsed: 0,
    };

    // Drives the rare spiked-rally interruption: jump -> spike -> impact -> dribble -> idle -> recover.
    const special = {
      phase: null,
      phaseElapsed: 0,
      phaseDuration: 0,
      jumpSide: null,
      downSide: null,
      impactStartTime: null,
      restX: 0,
      dribbleIndex: 0,
      dribbleStartX: 0,
      ball: { startX: 0, startY: 0, endX: 0, arc: 0 },
    };
    let specialReadyAt = 6; // seconds of rAF-clock time before the very first special can trigger

    const startNextFlight = (kind = "normal") => {
      const receiverSide = rally.hitterSide === "left" ? "right" : "left";
      rally.kind = kind;
      if (kind === "spike") {
        // Straight, flat drive aimed right at the other player — no lane jitter, no dodge.
        rally.targetX = laneCenter(receiverSide);
        rally.receiverStartX = rally.targetX;
        rally.duration = SPIKE_DURATION_SECONDS;
        rally.arc = Math.min(SPIKE_ARC_PX, maxSafeArc());
      } else if (kind === "set") {
        rally.receiverStartX = positions[receiverSide];
        rally.targetX = laneCenter(receiverSide) + randomBetween(-LANE_HALF_WIDTH_PX, LANE_HALF_WIDTH_PX);
        rally.duration = SET_DURATION_SECONDS;
        rally.arc = Math.min(SET_ARC_PX, maxSafeArc());
      } else {
        rally.receiverStartX = positions[receiverSide];
        rally.targetX = laneCenter(receiverSide) + randomBetween(-LANE_HALF_WIDTH_PX, LANE_HALF_WIDTH_PX);
        rally.duration = randomBetween(MIN_FLIGHT_SECONDS, MAX_FLIGHT_SECONDS);
        rally.arc = Math.min(randomBetween(MIN_ARC_PX, MAX_ARC_PX), maxSafeArc());
      }
      rally.elapsed = 0;
    };

    const beginJump = (side) => {
      special.phase = "jump";
      special.phaseElapsed = 0;
      special.phaseDuration = JUMP_DURATION_SECONDS;
      special.jumpSide = side;
    };

    const beginImpact = (side, nowSeconds) => {
      const driftDir = side === "left" ? -1 : 1;
      special.phase = "impact";
      special.phaseElapsed = 0;
      special.phaseDuration = IMPACT_DURATION_SECONDS;
      special.downSide = side;
      special.impactStartTime = nowSeconds;
      special.ball.startX = rally.targetX;
      special.ball.startY = getGroundY() - FIGURE_HEIGHT_PX * 0.6;
      special.ball.endX = rally.targetX + driftDir * IMPACT_DRIFT_PX;
      special.ball.arc = Math.min(IMPACT_ARC_PX, maxSafeArc());
    };

    const beginDribbleBounce = () => {
      const bounce = DRIBBLE_BOUNCES[special.dribbleIndex];
      const driftDir = special.downSide === "left" ? -1 : 1;
      special.phase = "dribble";
      special.phaseElapsed = 0;
      special.phaseDuration = bounce.duration;
      special.ball.startX = special.dribbleStartX;
      special.ball.endX = special.dribbleStartX + (driftDir * (IMPACT_DRIFT_PX * 0.35)) / (special.dribbleIndex + 1);
      special.ball.arc = Math.min(bounce.arc, maxSafeArc());
    };

    const drawCourt = (groundY) => {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(0, groundY + 0.5);
      ctx.lineTo(width, groundY + 0.5);
      ctx.stroke();

      const netCenterX = width / 2;
      const leftPostX = netCenterX - NET_SKEW_PX;
      const rightPostX = netCenterX + NET_SKEW_PX;
      const leftTopY = groundY - NET_HEIGHT_PX;
      const rightTopY = groundY - NET_HEIGHT_PX - 10;
      const rightBottomY = groundY - 4;

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
    };

    const renderFlight = (t, nowSeconds) => {
      const groundY = getGroundY();
      ctx.clearRect(0, 0, width, height);
      drawCourt(groundY);

      const receiverSide = rally.hitterSide === "left" ? "right" : "left";
      const hitterX = positions[rally.hitterSide];
      // The ball itself moves at a constant clip (true parabola, no ease) so it snaps off
      // the hitter and into the receiver instead of drifting in and out slowly.
      const ballX = lerp(hitterX, rally.targetX, t);
      const ballHitY = groundY - FIGURE_HEIGHT_PX * 0.6;
      const ballY = ballHitY - 4 * rally.arc * t * (1 - t);

      // The receiver's footwork eases out (quick reaction, gentle settle) rather than
      // tracking the ball's linear pace 1:1. A spike arrives too fast to be played, so the
      // target just stands their ground and takes it.
      const receiverX =
        rally.kind === "spike" ? rally.targetX : lerp(rally.receiverStartX, rally.targetX, easeOutCubic(t));
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
        const avatarImg = side === "left" ? avatarImageRef.current : tomAvatarImageRef.current;
        drawPlayer(ctx, { x, groundY, squash, hop, avatarImg });
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

    const renderSpecial = (nowSeconds, t) => {
      const groundY = getGroundY();
      ctx.clearRect(0, 0, width, height);
      drawCourt(groundY);

      const jumpSide = special.phase === "jump" ? special.jumpSide : null;
      const spikerHop = jumpSide ? Math.sin(Math.PI * t) * JUMP_HEIGHT_PX : 0;

      let lie = 0;
      if (special.phase === "impact" || special.phase === "dribble" || special.phase === "idle") {
        const fallElapsed = Math.max(0, nowSeconds - special.impactStartTime);
        lie = Math.min(1, fallElapsed / KNOCKDOWN_FALL_SECONDS);
      } else if (special.phase === "recover") {
        lie = Math.max(0, 1 - t);
      }

      ctx.fillStyle = "rgba(255,255,255,0.88)";
      const drawSide = (side) => {
        const isJumper = side === jumpSide;
        const isDown = side === special.downSide;
        const hop = isJumper
          ? spikerHop
          : isDown
            ? 0
            : Math.abs(Math.sin(nowSeconds * 5 + (side === "left" ? 0 : Math.PI))) * 0.5;
        const avatarImg = side === "left" ? avatarImageRef.current : tomAvatarImageRef.current;
        drawPlayer(ctx, {
          x: positions[side],
          groundY,
          squash: 0,
          hop,
          avatarImg,
          lie: isDown ? lie : 0,
          fallDir: side === "left" ? -1 : 1,
        });
      };
      drawSide("left");
      drawSide("right");

      let ballX = null;
      let ballY = null;
      if (special.phase === "jump") {
        ballX = positions[jumpSide];
        ballY = groundY - FIGURE_HEIGHT_PX * 0.6 - spikerHop * 0.5;
      } else if (special.phase === "impact") {
        ballX = lerp(special.ball.startX, special.ball.endX, t);
        const straightY = lerp(special.ball.startY, groundY - BALL_RADIUS_PX, t);
        ballY = straightY - 4 * special.ball.arc * t * (1 - t);
      } else if (special.phase === "dribble") {
        ballX = lerp(special.ball.startX, special.ball.endX, t);
        ballY = groundY - BALL_RADIUS_PX - 4 * special.ball.arc * t * (1 - t);
      } else if (special.phase === "idle" || special.phase === "recover") {
        ballX = special.restX;
        ballY = groundY - BALL_RADIUS_PX;
      }

      if (ballX != null) {
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.ellipse(ballX, groundY, 4, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.ellipse(ballX, ballY, BALL_RADIUS_PX, BALL_RADIUS_PX, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = null;
    let lastTime = null;

    if (reducedMotion) {
      renderFlight(0.5, 0);
      return () => observer.disconnect();
    }

    const advanceSpecial = (dt, nowSeconds) => {
      special.phaseElapsed += dt;
      const t = special.phaseDuration > 0 ? Math.min(special.phaseElapsed / special.phaseDuration, 1) : 1;

      if (special.phase === "jump") {
        renderSpecial(nowSeconds, t);
        if (t >= 1) startNextFlight("spike");
        special.phase = t >= 1 ? null : special.phase;
        return;
      }

      if (special.phase === "impact") {
        renderSpecial(nowSeconds, t);
        if (t >= 1) {
          special.dribbleIndex = 0;
          special.dribbleStartX = special.ball.endX;
          beginDribbleBounce();
        }
        return;
      }

      if (special.phase === "dribble") {
        renderSpecial(nowSeconds, t);
        if (t >= 1) {
          special.dribbleIndex += 1;
          if (special.dribbleIndex < DRIBBLE_BOUNCES.length) {
            special.dribbleStartX = special.ball.endX;
            beginDribbleBounce();
          } else {
            special.restX = special.ball.endX;
            special.phase = "idle";
            special.phaseElapsed = 0;
            special.phaseDuration = randomBetween(KNOCKDOWN_IDLE_MIN_SECONDS, KNOCKDOWN_IDLE_MAX_SECONDS);
          }
        }
        return;
      }

      if (special.phase === "idle") {
        renderSpecial(nowSeconds, 1);
        if (t >= 1) {
          special.phase = "recover";
          special.phaseElapsed = 0;
          special.phaseDuration = RECOVER_DURATION_SECONDS;
        }
        return;
      }

      if (special.phase === "recover") {
        renderSpecial(nowSeconds, t);
        if (t >= 1) {
          // The knocked-down player gets back up, picks the ball up off the ground right
          // next to them, and throws it back across — which is just the next normal flight.
          const recoveredSide = special.downSide;
          special.phase = null;
          special.downSide = null;
          special.jumpSide = null;
          special.impactStartTime = null;
          positions[recoveredSide] = laneCenter(recoveredSide);
          rally.hitterSide = recoveredSide;
          startNextFlight("normal");
        }
        return;
      }
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        lastTime = now;
        return;
      }
      if (lastTime == null) lastTime = now;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const nowSeconds = now / 1000;

      if (special.phase) {
        advanceSpecial(dt, nowSeconds);
        return;
      }

      rally.elapsed += dt;
      const t = rally.duration > 0 ? rally.elapsed / rally.duration : 1;
      if (t >= 1) {
        renderFlight(1, nowSeconds);
        const landedSide = rally.hitterSide === "left" ? "right" : "left";
        positions[landedSide] = rally.targetX;
        rally.hitterSide = landedSide;

        if (rally.kind === "spike") {
          beginImpact(landedSide, nowSeconds);
          return;
        }
        if (rally.kind === "set") {
          beginJump(landedSide);
          return;
        }

        if (nowSeconds >= specialReadyAt && Math.random() < SPECIAL_TRIGGER_CHANCE) {
          specialReadyAt = nowSeconds + SPECIAL_COOLDOWN_SECONDS;
          startNextFlight("set");
        } else {
          startNextFlight("normal");
        }
        return;
      }
      renderFlight(t, nowSeconds);
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
