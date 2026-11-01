// The Gun (placeable auto-turret), drawn procedurally so it can aim: a steel
// plinth, a turning ring and a brass head that swivels toward its target,
// with a charging core, recoiling barrels, muzzle flash and hot barrel tips.
// One function serves the battlefield, the placement ghost, the buy button
// and the Armory portrait.
//
// g = {
//   aim      radians off vertical (+ = right), same convention as Spell
//   charge   0..1 — how close the next shot is (core glow)
//   recoil   [left, right] barrel kick 0..1 (1 = just fired)
//   tier     Armory level total: twin barrels from 8, gold trim from 20
//   hitFlash >0 → white flash
// }
export function drawGun(ctx, x, y, r, g = {}) {
  const aim = g.aim || 0, charge = g.charge || 0, tier = g.tier || 0;
  const twin = tier >= 8, gold = tier >= 20;
  const rec = g.recoil || [0, 0];
  const trim = gold ? '#ffd23d' : '#9aa6b8';
  ctx.save();
  ctx.translate(x, y);

  // shadow + octagonal plinth
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.95, r * 1.15, r * 0.32, 0, 0, 7); ctx.fill();
  const pg = ctx.createLinearGradient(0, -r, 0, r * 1.1);
  pg.addColorStop(0, '#6b7486'); pg.addColorStop(1, '#2a2f3c');
  ctx.fillStyle = pg; ctx.strokeStyle = '#151820'; ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + k * Math.PI / 4;
    ctx.lineTo(Math.cos(a) * r * 1.08, Math.sin(a) * r * 0.95 + r * 0.12);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = trim;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.7 + r * 0.12, r * 0.08, 0, 7); ctx.fill();
  }

  // turning ring (ticks rotate with the head)
  ctx.save();
  ctx.rotate(aim);
  ctx.fillStyle = '#3a4150';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, 7); ctx.fill();
  ctx.strokeStyle = trim; ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    ctx.moveTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
    ctx.lineTo(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74);
  }
  ctx.stroke();

  // barrels (drawn under the head, pointing up in the rotated frame)
  const offs = twin ? [-r * 0.24, r * 0.24] : [0];
  offs.forEach((ox, i) => {
    const kick = (twin ? rec[i] : Math.max(rec[0], rec[1])) * r * 0.28;
    const bw = r * (twin ? 0.24 : 0.32), top = -r * 1.6 + kick;
    const bg = ctx.createLinearGradient(ox - bw / 2, 0, ox + bw / 2, 0);
    bg.addColorStop(0, '#e6ecf4'); bg.addColorStop(0.5, '#8d98aa'); bg.addColorStop(1, '#4a5262');
    ctx.fillStyle = bg; ctx.strokeStyle = '#151820'; ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.beginPath(); ctx.roundRect(ox - bw / 2, top, bw, r * 1.2, bw * 0.3); ctx.fill(); ctx.stroke();
    // muzzle ring, glowing hot right after a shot
    const heat = twin ? rec[i] : Math.max(rec[0], rec[1]);
    ctx.fillStyle = heat > 0.05 ? `rgb(255,${Math.round(210 - 120 * heat)},${Math.round(120 - 100 * heat)})` : trim;
    ctx.beginPath(); ctx.roundRect(ox - bw * 0.65, top - r * 0.06, bw * 1.3, r * 0.2, 2); ctx.fill(); ctx.stroke();
    if (heat > 0.6) { // muzzle flash
      const f = (heat - 0.6) / 0.4, fy = top - r * 0.25;
      const fg = ctx.createRadialGradient(ox, fy, 0, ox, fy, r * 0.75 * f + 2);
      fg.addColorStop(0, 'rgba(255,255,230,1)'); fg.addColorStop(0.45, 'rgba(255,200,70,0.85)'); fg.addColorStop(1, 'rgba(255,120,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(ox, fy, r * 0.75 * f + 2, 0, 7); ctx.fill();
    }
  });

  // brass head
  const hg = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 0.7);
  hg.addColorStop(0, gold ? '#fff2b8' : '#ffe6a8'); hg.addColorStop(0.6, gold ? '#e8b030' : '#d4a050'); hg.addColorStop(1, '#7a5420');
  ctx.fillStyle = hg; ctx.strokeStyle = '#3a2810'; ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.3);
  ctx.lineTo(-r * 0.6, -r * 0.15);
  ctx.quadraticCurveTo(-r * 0.5, -r * 0.62, 0, -r * 0.66);
  ctx.quadraticCurveTo(r * 0.5, -r * 0.62, r * 0.6, -r * 0.15);
  ctx.lineTo(r * 0.55, r * 0.3);
  ctx.quadraticCurveTo(0, r * 0.55, -r * 0.55, r * 0.3);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // charging core
  const cr = r * 0.22;
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cr * (1.6 + charge));
  cg.addColorStop(0, `rgba(255,255,220,${0.6 + 0.4 * charge})`);
  cg.addColorStop(0.5, `rgba(255,190,60,${0.35 + 0.5 * charge})`);
  cg.addColorStop(1, 'rgba(255,140,0,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, cr * (1.6 + charge), 0, 7); ctx.fill();
  ctx.fillStyle = '#2a1a08';
  ctx.beginPath(); ctx.arc(0, 0, cr, 0, 7); ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
  ctx.restore();

  if (g.hitFlash > 0) {
    ctx.globalAlpha = Math.min(1, g.hitFlash * 5);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
