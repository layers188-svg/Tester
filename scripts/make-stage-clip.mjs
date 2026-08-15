import { chromium } from "@playwright/test";
import fs from "fs";

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const page = await browser.newPage();
await page.goto("about:blank");

const base64 = await page.evaluate(async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 400000,
  });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();

  const start = performance.now();
  await new Promise((resolve) => {
    function frame() {
      const t = (performance.now() - start) / 1000;
      // A slow field of warm light crossing a near-black ground.
      // Abstract: no footage, no faces, no readable text.
      ctx.fillStyle = "#050504";
      ctx.fillRect(0, 0, 720, 1280);
      const cx = 360 + Math.sin(t * 0.35) * 150;
      const cy = 640 + Math.cos(t * 0.22) * 260;
      const r = 260 + Math.sin(t * 0.6) * 90;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const warmth = 0.1 + 0.06 * Math.sin(t * 0.9);
      g.addColorStop(0, `rgba(185,161,108,${warmth})`);
      g.addColorStop(0.55, `rgba(149,100,51,${warmth * 0.35})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 720, 1280);
      // A single slow horizontal rule of light, drifting.
      ctx.fillStyle = `rgba(233,224,208,${0.03 + 0.02 * Math.sin(t * 1.4)})`;
      ctx.fillRect(0, (t * 55) % 1280, 720, 1);
      if (t < 10) requestAnimationFrame(frame);
      else resolve();
    }
    frame();
  });

  rec.stop();
  const blob = await new Promise((res) => {
    rec.onstop = () => res(new Blob(chunks, { type: "video/webm" }));
  });
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
});

fs.writeFileSync("public/dev/stage-no-trailer.webm", Buffer.from(base64, "base64"));
console.log("wrote", fs.statSync("public/dev/stage-no-trailer.webm").size, "bytes");
await browser.close();
