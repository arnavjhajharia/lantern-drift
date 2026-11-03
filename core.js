// Lantern Drift core rules + BFS solver. Works in browser (window.LD) and node (module.exports).
// Board: w x h grid. walls: Set of "x,y". pieces: [{c:color,x,y}]. shrines: [{c,x,y}].
// Move = (color, dir): every piece of that color slides in dir until it hits a wall, the edge,
// or another piece (pieces of the same color move together, leading piece resolves first).
(function (root) {
  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

  function parse(lv) {
    // lv.map: array of strings. '#' wall, '.' floor, a-c = piece of color 0-2, A-C = shrine of color 0-2,
    // 1-3 = piece of color 0-2 standing on its own shrine. Walls are implicit outside the map.
    const h = lv.map.length, w = lv.map[0].length;
    const walls = new Set(), pieces = [], shrines = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = lv.map[y][x];
      if (ch === '#') walls.add(x + ',' + y);
      else if (ch >= 'a' && ch <= 'c') pieces.push({ c: ch.charCodeAt(0) - 97, x, y });
      else if (ch >= 'A' && ch <= 'C') shrines.push({ c: ch.charCodeAt(0) - 65, x, y });
      else if (ch >= '1' && ch <= '3') { const c = +ch - 1; pieces.push({ c, x, y }); shrines.push({ c, x, y }); }
    }
    return { w, h, walls, pieces, shrines };
  }

  // returns {pieces: new array, moved: [{i, from:{x,y}, to:{x,y}}]}
  function step(b, pieces, color, dir) {
    const [dx, dy] = DIRS[dir];
    const occ = new Map();
    pieces.forEach((p, i) => occ.set(p.x + ',' + p.y, i));
    const idx = pieces.map((p, i) => i).filter(i => pieces[i].c === color);
    // leading piece first: sort by projection on dir, descending
    idx.sort((a, b2) => (pieces[b2].x * dx + pieces[b2].y * dy) - (pieces[a].x * dx + pieces[a].y * dy));
    const out = pieces.map(p => ({ c: p.c, x: p.x, y: p.y }));
    const moved = [];
    for (const i of idx) {
      const p = out[i];
      occ.delete(p.x + ',' + p.y);
      let x = p.x, y = p.y;
      for (;;) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) break;
        const k = nx + ',' + ny;
        if (b.walls.has(k) || occ.has(k)) break;
        x = nx; y = ny;
      }
      if (x !== p.x || y !== p.y) moved.push({ i, from: { x: p.x, y: p.y }, to: { x, y } });
      p.x = x; p.y = y;
      occ.set(x + ',' + y, i);
    }
    return { pieces: out, moved };
  }

  function solved(b, pieces) {
    const at = new Map();
    pieces.forEach(p => at.set(p.x + ',' + p.y, p.c));
    return b.shrines.every(s => at.get(s.x + ',' + s.y) === s.c);
  }

  // canonical key: pieces of same color are interchangeable
  function key(pieces) {
    const by = [[], [], []];
    pieces.forEach(p => by[p.c].push(p.y * 64 + p.x));
    return by.map(a => a.sort((m, n) => m - n).join('.')).join('|');
  }

  function colors(pieces) { return [...new Set(pieces.map(p => p.c))].sort(); }

  // BFS. returns {len, path:[[c,dir],...]} or null. maxStates caps work.
  function solve(b, start, maxStates = 200000) {
    const cols = colors(start);
    const seen = new Map([[key(start), null]]);
    let frontier = [start], depth = 0;
    if (solved(b, start)) return { len: 0, path: [] };
    const parent = new Map();
    while (frontier.length) {
      depth++;
      const next = [];
      for (const ps of frontier) {
        const pk = key(ps);
        for (const c of cols) for (const d of 'UDLR') {
          const r = step(b, ps, c, d);
          if (!r.moved.length) continue;
          const k = key(r.pieces);
          if (seen.has(k)) continue;
          seen.set(k, [pk, c, d]);
          if (solved(b, r.pieces)) {
            const path = [];
            let cur = k;
            while (seen.get(cur)) { const [pk2, c2, d2] = seen.get(cur); path.unshift([c2, d2]); cur = pk2; }
            return { len: depth, path, states: seen.size };
          }
          next.push(r.pieces);
          if (seen.size > maxStates) return null;
        }
      }
      frontier = next;
    }
    return { len: -1, states: seen.size }; // unsolvable
  }

  const api = { DIRS, parse, step, solved, solve, key };
  if (typeof module !== 'undefined') module.exports = api; else root.LD = api;
})(this);
