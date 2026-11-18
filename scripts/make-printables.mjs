// Makes the Kids' World printables (public/printables/*.pdf): A4 colouring and activity
// sheets drawn as simple vector line art, so each file is only a few KB, prints well in
// black and white, and works offline once saved.
//
// Usage: node scripts/make-printables.mjs
// Run it again after changing a sheet below, and commit the PDFs. No dependencies: this
// writes plain PDF 1.4 with the built-in Helvetica fonts (ASCII text only).
//
// To replace a sheet with an illustrator's design, put their PDF (300 KB or less) in
// public/printables/ with the same file name and stop running this script for it.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/printables';
const W = 595; // A4 in points
const H = 842;
const MASCOT = process.env.MASCOT_NAME ?? 'Pholo'; // keep in step with src/config/strings.ts

/* ---------- A tiny PDF writer ---------- */
function pdf({ title, content }) {
  const objects = [];
  const add = (body) => objects.push(body) && objects.length;
  const catalog = add(''); // filled below
  const pages = add('');
  const fontR = add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );
  const fontB = add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  );
  const stream = add(
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  );
  const page = add(
    `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${stream} 0 R ` +
      `/Resources << /Font << /F1 ${fontR} 0 R /F2 ${fontB} 0 R >> >> >>`,
  );
  objects[catalog - 1] =
    `<< /Type /Catalog /Pages ${pages} 0 R /Lang (en-ZA) /ViewerPreferences << /DisplayDocTitle true >> >>`;
  objects[pages - 1] = `<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`;
  const info = add(
    `<< /Title (${esc(title)}) /Author (Pholoso Afrika Foundation) /Creator (pholoso.africa) >>`,
  );

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

function esc(s) {
  return s
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/([\\()])/g, '\\$1');
}

/* ---------- Drawing helpers (y measured from the top, like a page) ---------- */
const n = (v) => (Math.round(v * 100) / 100).toString();
const Y = (y) => H - y;
const K = 0.5523;

class Page {
  ops = ['1 J 1 j 0 0 0 RG 0 0 0 rg'];
  lw(w) {
    this.ops.push(`${n(w)} w`);
    return this;
  }
  dash(on) {
    this.ops.push(on ? '[6 5] 0 d' : '[] 0 d');
    return this;
  }
  grey(g) {
    this.ops.push(`${g} G ${g} g`);
    return this;
  }
  line(x1, y1, x2, y2) {
    this.ops.push(`${n(x1)} ${n(Y(y1))} m ${n(x2)} ${n(Y(y2))} l S`);
    return this;
  }
  ellipse(cx, cy, rx, ry, op = 'S') {
    const [x, y] = [cx, Y(cy)];
    this.ops.push(
      `${n(x + rx)} ${n(y)} m ` +
        `${n(x + rx)} ${n(y + ry * K)} ${n(x + rx * K)} ${n(y + ry)} ${n(x)} ${n(y + ry)} c ` +
        `${n(x - rx * K)} ${n(y + ry)} ${n(x - rx)} ${n(y + ry * K)} ${n(x - rx)} ${n(y)} c ` +
        `${n(x - rx)} ${n(y - ry * K)} ${n(x - rx * K)} ${n(y - ry)} ${n(x)} ${n(y - ry)} c ` +
        `${n(x + rx * K)} ${n(y - ry)} ${n(x + rx)} ${n(y - ry * K)} ${n(x + rx)} ${n(y)} c ${op}`,
    );
    return this;
  }
  circle(cx, cy, r, op = 'S') {
    return this.ellipse(cx, cy, r, r, op);
  }
  /** A quadratic curve from (x1,y1) through control (cx,cy) to (x2,y2). */
  curve(x1, y1, cx, cy, x2, y2) {
    const c1 = [x1 + (2 / 3) * (cx - x1), y1 + (2 / 3) * (cy - y1)];
    const c2 = [x2 + (2 / 3) * (cx - x2), y2 + (2 / 3) * (cy - y2)];
    this.ops.push(
      `${n(x1)} ${n(Y(y1))} m ${n(c1[0])} ${n(Y(c1[1]))} ${n(c2[0])} ${n(Y(c2[1]))} ${n(x2)} ${n(Y(y2))} c S`,
    );
    return this;
  }
  /** A polygon with rounded corners of radius r. */
  roundPoly(points, r, op = 'S') {
    const len = points.length;
    const parts = [];
    for (let i = 0; i < len; i++) {
      const [px, py] = points[(i - 1 + len) % len];
      const [x, y] = points[i];
      const [nx, ny] = points[(i + 1) % len];
      const toward = (ax, ay, bx, by) => {
        const d = Math.hypot(bx - ax, by - ay);
        return [ax + ((bx - ax) / d) * r, ay + ((by - ay) / d) * r];
      };
      const a = toward(x, y, px, py);
      const b = toward(x, y, nx, ny);
      parts.push({ a, c: [x, y], b });
    }
    let d = `${n(parts[0].a[0])} ${n(Y(parts[0].a[1]))} m `;
    parts.forEach((p, i) => {
      if (i > 0) d += `${n(p.a[0])} ${n(Y(p.a[1]))} l `;
      const c1 = [p.a[0] + (2 / 3) * (p.c[0] - p.a[0]), p.a[1] + (2 / 3) * (p.c[1] - p.a[1])];
      const c2 = [p.b[0] + (2 / 3) * (p.c[0] - p.b[0]), p.b[1] + (2 / 3) * (p.c[1] - p.b[1])];
      d += `${n(c1[0])} ${n(Y(c1[1]))} ${n(c2[0])} ${n(Y(c2[1]))} ${n(p.b[0])} ${n(Y(p.b[1]))} c `;
    });
    this.ops.push(`${d}h ${op}`);
    return this;
  }
  rect(x, y, w, h, r = 14) {
    return this.roundPoly(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      r,
    );
  }
  star(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.48 : r;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return this.roundPoly(pts, 2);
  }
  /** Text. align: 'left' | 'center'. Width is estimated (Helvetica averages ~0.52 em). */
  text(str, x, y, size, { bold = false, align = 'left' } = {}) {
    const est = str.length * size * (bold ? 0.56 : 0.5);
    const tx = align === 'center' ? x - est / 2 : x;
    this.ops.push(
      `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${n(tx)} ${n(Y(y))} Td (${esc(str)}) Tj ET`,
    );
    return this;
  }
  footer() {
    return this.grey(0.35)
      .text("Pholoso Afrika Foundation  -  pholoso.africa  -  Kids' World", W / 2, H - 28, 10, {
        align: 'center',
      })
      .grey(0);
  }
  toString() {
    return this.ops.join('\n');
  }
}

/** The mascot as an outline, centred on (cx, top) and scaled. pose: 'hello' | 'calm'. */
function mascot(p, cx, top, s, pose = 'hello') {
  const X = (x) => cx + (x - 110) * s;
  const Yy = (y) => top + (y - 20) * s;
  p.lw(5 * s);
  // arms first (hands drawn over them)
  const arm = (x1, y1, x2, y2) => {
    p.line(X(x1), Yy(y1), X(x2), Yy(y2));
    p.circle(X(x2 + (x2 - x1) * 0.12), Yy(y2 + (y2 - y1) * 0.12), 9 * s);
  };
  if (pose === 'hello') {
    arm(58, 156, 12, 166);
    arm(162, 150, 194, 108);
  } else {
    arm(58, 158, 14, 178);
    arm(162, 158, 206, 178);
  }
  p.grey(1)
    .roundPoly(
      [
        [X(110), Yy(26)],
        [X(203), Yy(192)],
        [X(17), Yy(192)],
      ],
      26 * s,
      'B',
    )
    .grey(0);
  p.roundPoly(
    [
      [X(110), Yy(26)],
      [X(203), Yy(192)],
      [X(17), Yy(192)],
    ],
    26 * s,
  );
  // legs and feet
  p.line(X(92), Yy(192), X(92), Yy(204)).line(X(128), Yy(192), X(128), Yy(204));
  p.ellipse(X(86), Yy(208), 12 * s, 6 * s).ellipse(X(134), Yy(208), 12 * s, 6 * s);
  // face
  if (pose === 'hello') {
    p.ellipse(X(94), Yy(124), 7 * s, 9 * s, 'f').ellipse(X(126), Yy(124), 7 * s, 9 * s, 'f');
    p.curve(X(95), Yy(140), X(110), Yy(162), X(125), Yy(140)).line(X(95), Yy(140), X(125), Yy(140));
  } else {
    p.curve(X(86), Yy(122), X(94), Yy(130), X(102), Yy(122));
    p.curve(X(118), Yy(122), X(126), Yy(130), X(134), Yy(122));
    p.curve(X(99), Yy(143), X(110), Yy(152), X(121), Yy(143));
  }
  p.lw(3 * s)
    .circle(X(80), Yy(144), 8 * s)
    .circle(X(140), Yy(144), 8 * s);
}

function face(p, cx, cy, r, kind) {
  p.lw(3).circle(cx, cy, r);
  const e = r * 0.3;
  const dot = (x, y) => p.circle(x, y, r * 0.07, 'f');
  const arcUp = (x1, x2, y, h) => p.curve(x1, y, (x1 + x2) / 2, y + h, x2, y);
  switch (kind) {
    case 'Happy':
      dot(cx - e, cy - e * 0.6);
      dot(cx + e, cy - e * 0.6);
      arcUp(cx - r * 0.42, cx + r * 0.42, cy + r * 0.2, r * 0.45);
      break;
    case 'Calm':
      arcUp(cx - e - 7, cx - e + 7, cy - e * 0.6, 6);
      arcUp(cx + e - 7, cx + e + 7, cy - e * 0.6, 6);
      arcUp(cx - r * 0.3, cx + r * 0.3, cy + r * 0.3, r * 0.22);
      break;
    case 'Excited':
      arcUp(cx - e - 7, cx - e + 7, cy - e * 0.5, -9);
      arcUp(cx + e - 7, cx + e + 7, cy - e * 0.5, -9);
      arcUp(cx - r * 0.45, cx + r * 0.45, cy + r * 0.15, r * 0.6);
      p.line(cx - r * 0.45, cy + r * 0.15, cx + r * 0.45, cy + r * 0.15);
      break;
    case 'Worried':
      dot(cx - e, cy - e * 0.3);
      dot(cx + e, cy - e * 0.3);
      p.line(cx - e - 9, cy - e - 2, cx - e + 6, cy - e - 9).line(
        cx + e + 9,
        cy - e - 2,
        cx + e - 6,
        cy - e - 9,
      );
      p.curve(cx - r * 0.35, cy + r * 0.4, cx - r * 0.17, cy + r * 0.25, cx, cy + r * 0.4);
      p.curve(cx, cy + r * 0.4, cx + r * 0.17, cy + r * 0.55, cx + r * 0.35, cy + r * 0.4);
      break;
    case 'Sad':
      dot(cx - e, cy - e * 0.5);
      dot(cx + e, cy - e * 0.5);
      arcUp(cx - r * 0.35, cx + r * 0.35, cy + r * 0.48, -r * 0.3);
      break;
    case 'Angry':
      dot(cx - e, cy - e * 0.1);
      dot(cx + e, cy - e * 0.1);
      p.line(cx - e - 10, cy - e - 8, cx - e + 7, cy - e).line(
        cx + e + 10,
        cy - e - 8,
        cx + e - 7,
        cy - e,
      );
      arcUp(cx - r * 0.35, cx + r * 0.35, cy + r * 0.5, -r * 0.22);
      break;
    case 'Tired':
      p.line(cx - e - 7, cy - e * 0.4, cx - e + 7, cy - e * 0.4).line(
        cx + e - 7,
        cy - e * 0.4,
        cx + e + 7,
        cy - e * 0.4,
      );
      p.ellipse(cx, cy + r * 0.38, r * 0.14, r * 0.18);
      p.text('z', cx + r * 0.75, cy - r * 0.75, 14, { bold: true }).text(
        'z',
        cx + r * 0.95,
        cy - r * 1.0,
        11,
        { bold: true },
      );
      break;
  }
}

/* ---------- The sheets ---------- */
const sheets = {
  'colour-in-pholo': () => {
    const p = new Page();
    p.text(`Colour in ${MASCOT}!`, W / 2, 78, 34, { bold: true, align: 'center' });
    p.text('Use any colours you like.', W / 2, 108, 16, { align: 'center' });
    mascot(p, W / 2, 150, 2.05, 'hello');
    p.lw(2.5);
    for (const [x, y, r] of [
      [80, 170, 26],
      [510, 200, 22],
      [70, 520, 18],
      [525, 560, 28],
      [120, 660, 16],
      [470, 690, 18],
    ])
      p.star(x, y, r);
    p.text('My name is', 70, 760, 18, { bold: true }).lw(1.5).line(180, 762, 525, 762);
    return { title: `Colour in ${MASCOT}`, content: p.footer().toString() };
  },
  'my-favourite-things': () => {
    const p = new Page();
    p.text('My favourite things', W / 2, 74, 32, { bold: true, align: 'center' });
    p.text('My name is', 60, 120, 16, { bold: true }).lw(1.5).line(160, 122, 535, 122);
    const labels = [
      'My favourite animal',
      'My favourite food',
      'My favourite colour',
      'My favourite game',
      'Something I love to do',
      'Something I am good at',
    ];
    const bw = 228;
    const bh = 200;
    labels.forEach((label, i) => {
      const x = 52 + (i % 2) * (bw + 35);
      const y = 150 + Math.floor(i / 2) * (bh + 22);
      p.lw(3)
        .rect(x, y, bw, bh, 18)
        .text(label, x + bw / 2, y + 28, 14, { bold: true, align: 'center' });
    });
    return { title: 'My favourite things', content: p.footer().toString() };
  },
  'feelings-faces': () => {
    const p = new Page();
    p.text('How do I feel today?', W / 2, 74, 32, { bold: true, align: 'center' });
    p.text('Colour the face that is most like you today.', W / 2, 104, 16, { align: 'center' });
    const names = ['Happy', 'Calm', 'Excited', 'Worried', 'Sad', 'Angry', 'Tired'];
    const r = 62;
    const rows = [names.slice(0, 3), names.slice(3, 6), names.slice(6)];
    rows.forEach((row, ri) => {
      row.forEach((name, i) => {
        const cx = W / 2 + (i - (row.length - 1) / 2) * 175;
        const cy = 210 + ri * 195;
        face(p, cx, cy, r, name);
        p.text(name, cx, cy + r + 30, 18, { bold: true, align: 'center' });
      });
    });
    return { title: 'Feelings faces', content: p.footer().toString() };
  },
  'calm-down-card': () => {
    const p = new Page();
    p.text('My calm-down card', W / 2, 60, 26, { bold: true, align: 'center' });
    p.text('Colour it in, cut along the dotted line, and keep it with you.', W / 2, 86, 13, {
      align: 'center',
    });
    const steps = [
      '1.  Stop and stand still.',
      '2.  Breathe in slowly. Count to 4.',
      '3.  Breathe out slowly. Count to 4.',
      '4.  Squeeze my hands tight, then let go.',
      '5.  Count 5 things I can see.',
      '6.  Tell a grown-up I trust how I feel.',
    ];
    [110, 460].forEach((top) => {
      p.lw(1.5)
        .dash(true)
        .rect(60, top, W - 120, 320, 22)
        .dash(false);
      p.text('When I have a big feeling, I can:', 90, top + 46, 17, { bold: true });
      steps.forEach((s, i) => p.text(s, 96, top + 86 + i * 34, 15));
      mascot(p, W - 140, top + 150, 0.62, 'calm');
    });
    return { title: 'My calm-down card', content: p.footer().toString() };
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(sheets)) {
  const { title, content } = make();
  const bytes = pdf({ title, content });
  writeFileSync(`${OUT}/${name}.pdf`, bytes);
  console.log(`${OUT}/${name}.pdf  ${(bytes.length / 1024).toFixed(1)} KB`);
}
