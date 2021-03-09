import config from '../config';
import { TRI468 as triangulation } from './blazeface/coords';

export const options = {
  color: 'rgba(173, 216, 230, 0.3)', // 'lightblue' with light alpha channel
  labelColor: 'rgba(173, 216, 230, 1)', // 'lightblue' with dark alpha channel
  shadowColor: 'black',
  font: 'small-caps 16px "Segoe UI"',
  lineHeight: 20,
  lineWidth: 6,
  pointSize: 2,
  roundRect: 28,
  drawPoints: false,
  drawLabels: true,
  drawBoxes: true,
  drawPolygons: true,
  fillPolygons: false,
  useDepth: true,
  useCurves: false,
  bufferedOutput: false,
};

function point(ctx, x, y) {
  ctx.fillStyle = options.color;
  ctx.beginPath();
  ctx.arc(x, y, options.pointSize, 0, 2 * Math.PI);
  ctx.fill();
}

function rect(ctx, x, y, width, height) {
  ctx.beginPath();
  if (options.useCurves) {
    const cx = (x + x + width) / 2;
    const cy = (y + y + height) / 2;
    ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, 2 * Math.PI);
  } else {
    ctx.lineWidth = options.lineWidth;
    ctx.moveTo(x + options.roundRect, y);
    ctx.lineTo(x + width - options.roundRect, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + options.roundRect);
    ctx.lineTo(x + width, y + height - options.roundRect);
    ctx.quadraticCurveTo(x + width, y + height, x + width - options.roundRect, y + height);
    ctx.lineTo(x + options.roundRect, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - options.roundRect);
    ctx.lineTo(x, y + options.roundRect);
    ctx.quadraticCurveTo(x, y, x + options.roundRect, y);
    ctx.closePath();
  }
  ctx.stroke();
}

function lines(ctx, points: number[] = []) {
  if (points === undefined || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const pt of points) ctx.lineTo(pt[0], parseInt(pt[1]));
  ctx.stroke();
  if (options.fillPolygons) {
    ctx.closePath();
    ctx.fill();
  }
}

function curves(ctx, points: number[] = []) {
  if (points === undefined || points.length === 0) return;
  if (!options.useCurves || points.length <= 2) {
    lines(ctx, points);
    return;
  }
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length - 2; i++) {
    const xc = (points[i][0] + points[i + 1][0]) / 2;
    const yc = (points[i][1] + points[i + 1][1]) / 2;
    ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
  }
  ctx.quadraticCurveTo(points[points.length - 2][0], points[points.length - 2][1], points[points.length - 1][0], points[points.length - 1][1]);
  ctx.stroke();
  if (options.fillPolygons) {
    ctx.closePath();
    ctx.fill();
  }
}

export async function gesture(inCanvas, result) {
  if (!result || !inCanvas) return;
  if (!(inCanvas instanceof HTMLCanvasElement)) return;
  const ctx = inCanvas.getContext('2d');
  if (!ctx) return;
  ctx.font = options.font;
  ctx.fillStyle = options.color;
  let i = 1;
  for (let j = 0; j < result.length; j++) {
    let where:any[] = [];
    let what:any[] = [];
    [where, what] = Object.entries(result[j]);
    if ((what.length > 1) && (what[1].length > 0)) {
      const person = where[1] > 0 ? `#${where[1]}` : '';
      const label = `${where[0]} ${person}: ${what[1]}`;
      if (options.shadowColor && options.shadowColor !== '') {
        ctx.fillStyle = options.shadowColor;
        ctx.fillText(label, 8, 2 + (i * options.lineHeight));
      }
      ctx.fillStyle = options.labelColor;
      ctx.fillText(label, 6, 0 + (i * options.lineHeight));
      i += 1;
    }
  }
}

export async function face(inCanvas, result) {
  if (!result || !inCanvas) return;
  if (!(inCanvas instanceof HTMLCanvasElement)) return;
  const ctx = inCanvas.getContext('2d');
  if (!ctx) return;
  for (const f of result) {
    ctx.font = options.font;
    ctx.strokeStyle = options.color;
    ctx.fillStyle = options.color;
    if (options.drawBoxes) {
      rect(ctx, f.box[0], f.box[1], f.box[2], f.box[3]);
    }
    // silly hack since fillText does not suport new line
    const labels:string[] = [];
    labels.push(`face confidence: ${Math.trunc(100 * f.confidence)}%`);
    if (f.genderConfidence) labels.push(`${f.gender || ''} ${Math.trunc(100 * f.genderConfidence)}% confident`);
    // if (f.genderConfidence) labels.push(f.gender);
    if (f.age) labels.push(`age: ${f.age || ''}`);
    if (f.iris) labels.push(`iris distance: ${f.iris}`);
    if (f.emotion && f.emotion.length > 0) {
      const emotion = f.emotion.map((a) => `${Math.trunc(100 * a.score)}% ${a.emotion}`);
      labels.push(emotion.join(' '));
    }
    if (f.angle && f.angle.roll) labels.push(`roll: ${Math.trunc(100 * f.angle.roll) / 100} yaw:${Math.trunc(100 * f.angle.yaw) / 100} pitch:${Math.trunc(100 * f.angle.pitch) / 100}`);
    if (labels.length === 0) labels.push('face');
    ctx.fillStyle = options.color;
    for (let i = labels.length - 1; i >= 0; i--) {
      const x = Math.max(f.box[0], 0);
      const y = i * options.lineHeight + f.box[1];
      if (options.shadowColor && options.shadowColor !== '') {
        ctx.fillStyle = options.shadowColor;
        ctx.fillText(labels[i], x + 5, y + 16);
      }
      ctx.fillStyle = options.labelColor;
      ctx.fillText(labels[i], x + 4, y + 15);
    }
    ctx.lineWidth = 1;
    if (f.mesh) {
      if (options.drawPoints) {
        for (const pt of f.mesh) {
          ctx.fillStyle = options.useDepth ? `rgba(${127.5 + (2 * pt[2])}, ${127.5 - (2 * pt[2])}, 255, 0.5)` : options.color;
          point(ctx, pt[0], pt[1]);
        }
      }
      if (options.drawPolygons) {
        for (let i = 0; i < triangulation.length / 3; i++) {
          const points = [
            triangulation[i * 3 + 0],
            triangulation[i * 3 + 1],
            triangulation[i * 3 + 2],
          ].map((index) => f.mesh[index]);
          ctx.strokeStyle = options.useDepth ? `rgba(${127.5 + (2 * points[0][2])}, ${127.5 - (2 * points[0][2])}, 255, 0.3)` : options.color;
          ctx.fillStyle = options.useDepth ? `rgba(${127.5 + (2 * points[0][2])}, ${127.5 - (2 * points[0][2])}, 255, 0.3)` : options.color;
          ctx.lineWidth = 1;
          lines(ctx, points);
        }
        // iris: array[center, left, top, right, bottom]
        if (f.annotations && f.annotations.leftEyeIris) {
          ctx.strokeStyle = options.useDepth ? 'rgba(255, 200, 255, 0.3)' : options.color;
          ctx.beginPath();
          const sizeX = Math.abs(f.annotations.leftEyeIris[3][0] - f.annotations.leftEyeIris[1][0]) / 2;
          const sizeY = Math.abs(f.annotations.leftEyeIris[4][1] - f.annotations.leftEyeIris[2][1]) / 2;
          ctx.ellipse(f.annotations.leftEyeIris[0][0], f.annotations.leftEyeIris[0][1], sizeX, sizeY, 0, 0, 2 * Math.PI);
          ctx.stroke();
          if (options.fillPolygons) {
            ctx.fillStyle = options.useDepth ? 'rgba(255, 255, 200, 0.3)' : options.color;
            ctx.fill();
          }
        }
        if (f.annotations && f.annotations.rightEyeIris) {
          ctx.strokeStyle = options.useDepth ? 'rgba(255, 200, 255, 0.3)' : options.color;
          ctx.beginPath();
          const sizeX = Math.abs(f.annotations.rightEyeIris[3][0] - f.annotations.rightEyeIris[1][0]) / 2;
          const sizeY = Math.abs(f.annotations.rightEyeIris[4][1] - f.annotations.rightEyeIris[2][1]) / 2;
          ctx.ellipse(f.annotations.rightEyeIris[0][0], f.annotations.rightEyeIris[0][1], sizeX, sizeY, 0, 0, 2 * Math.PI);
          ctx.stroke();
          if (options.fillPolygons) {
            ctx.fillStyle = options.useDepth ? 'rgba(255, 255, 200, 0.3)' : options.color;
            ctx.fill();
          }
        }
      }
    }
  }
}

const lastDrawnPose:any[] = [];
export async function body(inCanvas, result) {
  if (!result || !inCanvas) return;
  if (!(inCanvas instanceof HTMLCanvasElement)) return;
  const ctx = inCanvas.getContext('2d');
  if (!ctx) return;
  ctx.lineJoin = 'round';
  for (let i = 0; i < result.length; i++) {
    // result[i].keypoints = result[i].keypoints.filter((a) => a.score > 0.5);
    if (!lastDrawnPose[i] && options.bufferedOutput) lastDrawnPose[i] = { ...result[i] };
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    if (options.drawPoints) {
      for (let pt = 0; pt < result[i].keypoints.length; pt++) {
        ctx.fillStyle = options.useDepth && result[i].keypoints[pt].position.z ? `rgba(${127.5 + (2 * result[i].keypoints[pt].position.z)}, ${127.5 - (2 * result[i].keypoints[pt].position.z)}, 255, 0.5)` : options.color;
        if (options.bufferedOutput) {
          lastDrawnPose[i].keypoints[pt][0] = (lastDrawnPose[i].keypoints[pt][0] + result[i].keypoints[pt].position.x) / 2;
          lastDrawnPose[i].keypoints[pt][1] = (lastDrawnPose[i].keypoints[pt][1] + result[i].keypoints[pt].position.y) / 2;
          point(ctx, lastDrawnPose[i].keypoints[pt][0], lastDrawnPose[i].keypoints[pt][1]);
        } else {
          point(ctx, result[i].keypoints[pt].position.x, result[i].keypoints[pt].position.y);
        }
      }
    }
    if (options.drawLabels) {
      ctx.font = options.font;
      for (const pt of result[i].keypoints) {
        ctx.fillStyle = options.useDepth && pt.position.z ? `rgba(${127.5 + (2 * pt.position.z)}, ${127.5 - (2 * pt.position.z)}, 255, 0.5)` : options.color;
        ctx.fillText(`${pt.part}`, pt.position.x + 4, pt.position.y + 4);
      }
    }
    if (options.drawPolygons) {
      let part;
      const points: any[] = [];
      // torso
      points.length = 0;
      part = result[i].keypoints.find((a) => a.part === 'leftShoulder');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightShoulder');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightHip');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftHip');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftShoulder');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      if (points.length === 5) lines(ctx, points); // only draw if we have complete torso
      // leg left
      points.length = 0;
      part = result[i].keypoints.find((a) => a.part === 'leftHip');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftKnee');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftAnkle');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftHeel');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftFoot');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      curves(ctx, points);
      // leg right
      points.length = 0;
      part = result[i].keypoints.find((a) => a.part === 'rightHip');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightKnee');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightAnkle');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightHeel');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightFoot');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      curves(ctx, points);
      // arm left
      points.length = 0;
      part = result[i].keypoints.find((a) => a.part === 'leftShoulder');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftElbow');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftWrist');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'leftPalm');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      curves(ctx, points);
      // arm right
      points.length = 0;
      part = result[i].keypoints.find((a) => a.part === 'rightShoulder');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightElbow');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightWrist');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      part = result[i].keypoints.find((a) => a.part === 'rightPalm');
      if (part && part.score > config.body.scoreThreshold) points.push([part.position.x, part.position.y]);
      curves(ctx, points);
      // draw all
    }
  }
}

export async function hand(inCanvas, result) {
  if (!result || !inCanvas) return;
  if (!(inCanvas instanceof HTMLCanvasElement)) return;
  const ctx = inCanvas.getContext('2d');
  if (!ctx) return;
  ctx.lineJoin = 'round';
  ctx.font = options.font;
  for (const h of result) {
    if (options.drawBoxes) {
      ctx.strokeStyle = options.color;
      ctx.fillStyle = options.color;
      rect(ctx, h.box[0], h.box[1], h.box[2], h.box[3]);
      if (options.shadowColor && options.shadowColor !== '') {
        ctx.fillStyle = options.shadowColor;
        ctx.fillText('hand', h.box[0] + 3, 1 + h.box[1] + options.lineHeight, h.box[2]);
      }
      ctx.fillStyle = options.labelColor;
      ctx.fillText('hand', h.box[0] + 2, 0 + h.box[1] + options.lineHeight, h.box[2]);
      ctx.stroke();
    }
    if (options.drawPoints) {
      if (h.landmarks && h.landmarks.length > 0) {
        for (const pt of h.landmarks) {
          ctx.fillStyle = options.useDepth ? `rgba(${127.5 + (2 * pt[2])}, ${127.5 - (2 * pt[2])}, 255, 0.5)` : options.color;
          point(ctx, pt[0], pt[1]);
        }
      }
    }
    if (options.drawPolygons) {
      const addPart = (part) => {
        if (!part) return;
        for (let i = 0; i < part.length; i++) {
          ctx.lineWidth = options.lineWidth;
          ctx.beginPath();
          ctx.strokeStyle = options.useDepth ? `rgba(${127.5 + (2 * part[i][2])}, ${127.5 - (2 * part[i][2])}, 255, 0.5)` : options.color;
          ctx.moveTo(part[i > 0 ? i - 1 : 0][0], part[i > 0 ? i - 1 : 0][1]);
          ctx.lineTo(part[i][0], part[i][1]);
          ctx.stroke();
        }
      };
      addPart(h.annotations.indexFinger);
      addPart(h.annotations.middleFinger);
      addPart(h.annotations.ringFinger);
      addPart(h.annotations.pinky);
      addPart(h.annotations.thumb);
      // addPart(hand.annotations.palmBase);
    }
  }
}

export async function canvas(inCanvas, outCanvas) {
  if (!inCanvas || !outCanvas) return;
  if (!(inCanvas instanceof HTMLCanvasElement) || !(outCanvas instanceof HTMLCanvasElement)) return;
  const outCtx = inCanvas.getContext('2d');
  outCtx?.drawImage(inCanvas, 0, 0);
}

export async function all(inCanvas, result) {
  if (!result || !inCanvas) return;
  if (!(inCanvas instanceof HTMLCanvasElement)) return;
  face(inCanvas, result.face);
  body(inCanvas, result.body);
  hand(inCanvas, result.hand);
  gesture(inCanvas, result.gesture);
}
