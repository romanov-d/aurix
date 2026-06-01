import { useEffect, useRef } from 'react';
import {
  Camera, Mesh, Plane, Program,
  Renderer, Texture, Transform,
} from 'ogl';

/* ─── helpers ────────────────────────────────────────────── */
function lerp(a, b, t) { return a + (b - a) * t; }
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ─── canvas → OGL texture for review card ───────────────── */
function createReviewTexture(gl, review) {
  const W = 520, H = 520;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // background with rounded corners
  ctx.fillStyle = '#161616';
  const r = 24;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(W - r, 0);
  ctx.quadraticCurveTo(W, 0, W, r);
  ctx.lineTo(W, H - r); ctx.quadraticCurveTo(W, H, W - r, H);
  ctx.lineTo(r, H); ctx.quadraticCurveTo(0, H, 0, H - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath(); ctx.fill();

  // stars
  ctx.fillStyle = '#c19a6b';
  ctx.font = 'bold 30px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText('★★★★★', 36, 40);

  // review text — word wrap
  ctx.fillStyle = '#d0d0d0';
  ctx.font = '22px Arial';
  ctx.textBaseline = 'top';
  const words = review.text.split(' ');
  const maxW = W - 72;
  let line = '', y = 108;
  for (const w of words) {
    const test = line + (line ? ' ' : '') + w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, 36, y); y += 36; line = w;
    } else { line = test; }
    if (y > 320) { ctx.fillText(line + '…', 36, y); line = null; break; }
  }
  if (line) ctx.fillText(line, 36, y);

  // divider
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(36, H - 110); ctx.lineTo(W - 36, H - 110); ctx.stroke();

  // avatar circle
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath(); ctx.arc(66, H - 60, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c19a6b';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(review.name[0], 66, H - 60);

  // name + when
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textBaseline = 'middle';
  ctx.fillText(review.name, 112, H - 74);
  ctx.fillStyle = '#777';
  ctx.font = '18px Arial';
  ctx.fillText(review.when, 112, H - 44);

  const tex = new Texture(gl, { generateMipmaps: false });
  tex.image = cv;

  // overlay the real avatar photo once it loads (initial stays as fallback)
  if (review.avatar) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(66, H - 60, 30, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 36, H - 90, 60, 60);
      ctx.restore();
      tex.image = cv;
      tex.needsUpdate = true;
    };
    img.src = review.avatar;
  }

  return { texture: tex, width: W, height: H };
}

/* ─── Media class ─────────────────────────────────────────── */
class Media {
  constructor({ gl, geometry, renderer, scene, screen, viewport, review, index, length, bend }) {
    this.gl = gl;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.viewport = viewport;
    this.index = index;
    this.length = length;
    this.bend = bend;
    this.extra = 0;
    this.padding = 2;
    this.speed = 0;
    this.isBefore = false;
    this.isAfter = false;

    const { texture } = createReviewTexture(gl, review);
    this.program = new Program(gl, {
      depthTest: false, depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position; attribute vec2 uv;
        uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
        uniform float uTime; uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x*4.+uTime)*1.5 + cos(p.y*2.+uTime)*1.5) * (0.1 + uSpeed*0.3);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.);
        }`,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        uniform vec2 uPlaneSizes; uniform vec2 uImageSizes;
        varying vec2 vUv;
        float rbox(vec2 p,vec2 b,float r){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }
        void main() {
          vec2 rat = vec2(
            min((uPlaneSizes.x/uPlaneSizes.y)/(uImageSizes.x/uImageSizes.y),1.),
            min((uPlaneSizes.y/uPlaneSizes.x)/(uImageSizes.y/uImageSizes.x),1.)
          );
          vec2 uv = vec2(vUv.x*rat.x+(1.-rat.x)*.5, vUv.y*rat.y+(1.-rat.y)*.5);
          vec4 c = texture2D(tMap,uv);
          float d = rbox(vUv-.5, vec2(.5-.05), .05);
          float a = 1.-smoothstep(-.002,.002,d);
          gl_FragColor = vec4(c.rgb, c.a*a);
        }`,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [520, 520] },
        uSpeed: { value: 0 },
        uTime: { value: Math.random() * 100 },
      },
      transparent: true,
    });

    this.plane = new Mesh(gl, { geometry, program: this.program });
    this.plane.setParent(scene);
    this.onResize({ screen, viewport });
  }

  update(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;
    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend !== 0) {
      const R = (H * H + Math.abs(this.bend) ** 2) / (2 * Math.abs(this.bend));
      const ex = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - ex * ex);
      this.plane.position.y = this.bend > 0 ? -arc : arc;
      this.plane.rotation.z = (this.bend > 0 ? -1 : 1) * Math.sign(x) * Math.asin(ex / R);
    } else {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const po = this.plane.scale.x / 2;
    const vo = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + po < -vo;
    this.isAfter  = this.plane.position.x - po > vo;
    if (direction === 'right' && this.isBefore) { this.extra -= this.widthTotal; }
    if (direction === 'left'  && this.isAfter)  { this.extra += this.widthTotal; }
  }

  onResize({ screen, viewport } = {}) {
    if (screen)   this.screen   = screen;
    if (viewport) this.viewport = viewport;
    // Cards are square to match the 520×520 review texture — prevents the text
    // from being cropped at narrow desktop widths (was: independent w/h → portrait crop)
    this.plane.scale.y = this.viewport.height * 0.72;
    this.plane.scale.x = this.plane.scale.y;
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding   = this.viewport.width * 0.04;
    this.width      = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x          = this.width * this.index;
  }
}

/* ─── App class ───────────────────────────────────────────── */
class App {
  constructor(container, { reviews, bend, scrollSpeed, scrollEase }) {
    this.container  = container;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.isDown = false;
    this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);

    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    const cv = this.gl.canvas;
    cv.style.width  = '100%';
    cv.style.height = '100%';
    cv.style.display = 'block';
    container.appendChild(cv);

    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;

    this.scene = new Transform();
    this.onResize();

    const geom = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 });
    const items = [...reviews, ...reviews];
    this.medias = items.map((r, i) => new Media({
      gl: this.gl, geometry: geom, renderer: this.renderer,
      scene: this.scene, screen: this.screen, viewport: this.viewport,
      review: r, index: i, length: items.length, bend,
    }));

    this.update = this.update.bind(this);
    this.raf = requestAnimationFrame(this.update);
    this.addListeners();
  }

  onResize() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const h   = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: h * this.camera.aspect, height: h };
    this.medias?.forEach(m => m.onResize({ screen: this.screen, viewport: this.viewport }));
  }

  onCheck() {
    const w = this.medias?.[0]?.width;
    if (!w) return;
    const idx  = Math.round(Math.abs(this.scroll.target) / w);
    const snap = w * idx;
    this.scroll.target = this.scroll.target < 0 ? -snap : snap;
  }

  onWheel(e) {
    const d = e.deltaY || e.wheelDelta || e.detail;
    this.scroll.target += (d > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.07;
    this.onCheckDebounce();
  }

  onDown(e) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = 'touches' in e ? e.touches[0].clientX : e.clientX;
  }

  onMove(e) {
    if (!this.isDown) return;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    this.scroll.target = this.scroll.position + (this.start - x) * this.scrollSpeed * 0.008;
  }

  onUp() { this.isDown = false; this.onCheck(); }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const dir = this.scroll.current > this.scroll.last ? 'right' : 'left';
    this.medias?.forEach(m => m.update(this.scroll, dir));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(this.update);
  }

  addListeners() {
    this._resize = this.onResize.bind(this);
    this._wheel  = this.onWheel.bind(this);
    this._down   = this.onDown.bind(this);
    this._move   = this.onMove.bind(this);
    this._up     = this.onUp.bind(this);
    window.addEventListener('resize', this._resize);
    window.addEventListener('wheel', this._wheel);
    this.container.addEventListener('mousedown', this._down);
    window.addEventListener('mousemove', this._move);
    window.addEventListener('mouseup', this._up);
    this.container.addEventListener('touchstart', this._down, { passive: true });
    window.addEventListener('touchmove', this._move, { passive: true });
    window.addEventListener('touchend', this._up);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('wheel', this._wheel);
    this.container.removeEventListener('mousedown', this._down);
    window.removeEventListener('mousemove', this._move);
    window.removeEventListener('mouseup', this._up);
    this.container.removeEventListener('touchstart', this._down);
    window.removeEventListener('touchmove', this._move);
    window.removeEventListener('touchend', this._up);
    this.gl.canvas.parentNode?.removeChild(this.gl.canvas);
  }
}

/* ─── React component ─────────────────────────────────────── */
export default function CircularGallery({
  reviews,
  bend = 3,
  scrollSpeed = 2,
  scrollEase = 0.05,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const app = new App(ref.current, { reviews, bend, scrollSpeed, scrollEase });
    return () => app.destroy();
  }, []);

  return (
    <div
      ref={ref}
      style={{ width: '100%', height: '100%', cursor: 'grab', overflow: 'hidden' }}
    />
  );
}
