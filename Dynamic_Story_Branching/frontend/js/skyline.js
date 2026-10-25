/**
 * Story Engine Reading Activity Skyline — 2D Heatmap & 3D Isometric Skyline
 * Adapted from ContributionSkyline Canvas Engine for Story Engine Daily Activity & Logins
 */

(function (global) {
    'use strict';

    const DAY_MS = 86400000;

    const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOutCubic = (x) => {
        const t = clamp01(x);
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
    const smoothstep = (a, b, x) => {
        const t = clamp01((x - a) / (b - a));
        return t * t * (3 - 2 * t);
    };

    const toKey = (ms) => new Date(ms).toISOString().slice(0, 10);

    const dayMs = (v) => {
        if (typeof v === 'number') return Math.floor(v / DAY_MS) * DAY_MS;
        if (typeof v === 'string') {
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
            if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
            v = new Date(v);
        }
        return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
    };

    const rng = (seed) => {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    const generateContributions = (endMs, seed = 42, days = 371) => {
        const r = rng(seed);
        const bursts = [
            { at: 0.15, width: 0.05, gain: 1.4 },
            { at: 0.45, width: 0.08, gain: 1.2 },
            { at: 0.78, width: 0.06, gain: 1.6 },
            { at: 0.95, width: 0.04, gain: 1.8 }
        ];
        const out = [];
        let mood = 0.5;
        for (let i = 0; i < days; i++) {
            const ms = endMs - (days - 1 - i) * DAY_MS;
            const x = i / Math.max(1, days - 1);
            const dow = new Date(ms).getUTCDay();
            const weekend = dow === 0 || dow === 6;
            let heat = 0.2;
            for (const b of bursts) {
                heat += b.gain * Math.exp(-Math.pow(x - b.at, 2) / (2 * Math.pow(b.width, 2)));
            }
            mood = mood * 0.85 + r() * 0.15;
            heat *= 0.55 + mood * 0.9;
            const pActive = Math.min(0.92, (weekend ? 0.35 : 0.6) + heat * 0.35);
            let count = 0;
            if (r() < pActive) {
                count = 1 + Math.floor(-Math.log(1 - r()) * (1.5 + heat * 6) * (weekend ? 1.2 : 1));
            }
            if (r() < 0.02) count += 10 + Math.floor(r() * 15);
            out.push({ date: toKey(ms), count });
        }
        return out;
    };

    const levelOf = (count, busy) => {
        if (count <= 0) return 0;
        if (busy <= 0) return 4;
        return 1 + Math.min(3, Math.floor((count / busy) * 4));
    };

    const buildGrid = (data, endMs, weekStart = 0) => {
        const counts = new Map();
        for (const d of data) {
            if (!d || typeof d.date !== 'string') continue;
            const ms = dayMs(d.date);
            const c = Number(d.count);
            if (!Number.isFinite(ms) || !(c > 0) || !Number.isFinite(c)) continue;
            const k = toKey(ms);
            counts.set(k, (counts.get(k) || 0) + c);
        }
        let start = endMs - 364 * DAY_MS;
        start -= ((new Date(start).getUTCDay() - weekStart + 7) % 7) * DAY_MS;
        const cells = [];
        for (let ms = start, i = 0; ms <= endMs; ms += DAY_MS, i++) {
            const date = toKey(ms);
            cells.push({
                date,
                count: counts.get(date) || 0,
                level: 0,
                week: Math.floor(i / 7),
                day: i % 7
            });
        }
        const nz = cells.map((c) => c.count).filter((c) => c > 0).sort((a, b) => a - b);
        const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
        for (const c of cells) c.level = levelOf(c.count, busy);
        return {
            cells,
            weeks: cells.length ? cells[cells.length - 1].week + 1 : 0,
            max: nz.length ? nz[nz.length - 1] : 0
        };
    };

    const computeStats = (cells) => {
        let total = 0;
        let best = 0;
        let bestDate = null;
        let run = 0;
        let runStart = null;
        let longest = { days: 0, start: null, end: null };
        for (const c of cells) {
            total += c.count;
            if (c.count > best) {
                best = c.count;
                bestDate = c.date;
            }
            if (c.count > 0) {
                if (run === 0) runStart = c.date;
                run++;
                if (run > longest.days) longest = { days: run, start: runStart, end: c.date };
            } else {
                run = 0;
            }
        }
        let j = cells.length - 1;
        if (j >= 0 && cells[j].count === 0) j--;
        const endAt = j;
        while (j >= 0 && cells[j].count > 0) j--;
        const days = endAt - j;
        const current = days > 0 ? { days, start: cells[j + 1].date, end: cells[endAt].date } : { days: 0, start: null, end: null };
        return {
            total,
            first: cells.length ? cells[0].date : null,
            last: cells.length ? cells[cells.length - 1].date : null,
            busiest: { count: best, date: bestDate },
            longest,
            current
        };
    };

    const monthLabels = (cells, weeks, locale = 'en-US') => {
        const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
        const out = [];
        let prev = -1;
        for (let w = 0; w < weeks; w++) {
            const c = cells[w * 7];
            if (!c) break;
            const m = +c.date.slice(5, 7);
            if (m !== prev) out.push({ week: w, label: fmt.format(dayMs(c.date)) });
            prev = m;
        }
        if (out.length > 1 && out[1].week - out[0].week < 3) out.shift();
        return out;
    };

    const barHeight = (count, max, scale = 1) =>
        count > 0 && max > 0 ? 0.4 + Math.pow(count / max, 0.85) * 7.2 * scale : 0.2;

    const WAVE = 0.42;
    const riseAt = (t, week, weeks, day) => {
        const d = (weeks > 1 ? week / (weeks - 1) : 0) * 0.36 + (day / 6) * 0.06;
        return easeOutCubic((t - d) / (1 - WAVE));
    };

    const YAW_3D = Math.PI / 4;
    const ELEV_3D = (34 * Math.PI) / 180;
    const YAW_RANGE = [(8 * Math.PI) / 180, (82 * Math.PI) / 180];
    const ELEV_RANGE = [(18 * Math.PI) / 180, (62 * Math.PI) / 180];

    const camera = (e, dYaw = 0, dElev = 0) => {
        const yaw = Math.min(YAW_RANGE[1], Math.max(0, lerp(0, YAW_3D + dYaw, e)));
        const elev = lerp(Math.PI / 2, Math.min(ELEV_RANGE[1], Math.max(ELEV_RANGE[0], ELEV_3D + dElev)), e);
        return { cs: Math.cos(yaw), sn: Math.sin(yaw), se: Math.sin(elev), ce: Math.cos(elev) };
    };

    const project = (c, x, y, z) => [
        x * c.cs - y * c.sn,
        (x * c.sn + y * c.cs) * c.se - z * c.ce
    ];

    const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const luminance = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    const rgbString = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

    const PALETTES = {
        cyber: {
            light: ["#c7d2fe", "#818cf8", "#4f46e5", "#312e81"],
            dark: ["#1e1b4b", "#3730a3", "#6366f1", "#a5b4fc"]
        },
        github: {
            light: ["#c6e48b", "#7bc96f", "#239a3b", "#196127"],
            dark: ["#0e4429", "#006d32", "#26a641", "#39d353"]
        },
        ember: {
            light: ["#fde2c4", "#fbad6e", "#f06b3a", "#b3261e"],
            dark: ["#4a1a10", "#8f2f16", "#e0572a", "#ffa46b"]
        }
    };

    const quadPath = (ctx, p, o, r) => {
        if (r < 0.3) {
            ctx.moveTo(p[o], p[o + 1]);
            ctx.lineTo(p[o + 2], p[o + 3]);
            ctx.lineTo(p[o + 4], p[o + 5]);
            ctx.lineTo(p[o + 6], p[o + 7]);
            ctx.closePath();
            return;
        }
        ctx.moveTo((p[o + 6] + p[o]) / 2, (p[o + 7] + p[o + 1]) / 2);
        for (let k = 0; k < 4; k++) {
            const b = (k + 1) % 4;
            ctx.arcTo(p[o + k * 2], p[o + k * 2 + 1], p[o + b * 2], p[o + b * 2 + 1], r);
        }
        ctx.closePath();
    };

    const pointInQuad = (p, o, x, y) => {
        let sign = 0;
        for (let k = 0; k < 4; k++) {
            const ax = p[o + k * 2];
            const ay = p[o + k * 2 + 1];
            const bx = p[o + ((k + 1) % 4) * 2];
            const by = p[o + ((k + 1) % 4) * 2 + 1];
            const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
            if (Math.abs(cross) < 1e-9) continue;
            const s = cross > 0 ? 1 : -1;
            if (sign === 0) sign = s;
            else if (s !== sign) return false;
        }
        return sign !== 0;
    };

    /**
     * Render the Skyline Canvas component inside a target container
     */
    function renderSkyline(containerEl, options = {}) {
        if (!containerEl) return;

        const endDate = options.endDate ? dayMs(options.endDate) : dayMs(new Date());
        const data = options.data && options.data.length ? options.data : generateContributions(endDate, 77);
        const grid = buildGrid(data, endDate, 0);
        const stats = computeStats(grid.cells);
        const months = monthLabels(grid.cells, grid.weeks);

        let currentView = localStorage.getItem('skyline_preferred_view') || options.defaultView || '2d';
        let targetViewT = currentView === '3d' ? 1 : 0;
        let t = targetViewT;
        let duration = options.duration || 1200;
        let yaw = 0, elev = 0, yawGoal = 0, elevGoal = 0;
        let hovered = -1, pinned = -1, activeIdx = -1;
        let legendLevel = -1;
        let tipW = 0;
        let raf = null, last = 0;

        const todayKey = options.endDate || toKey(Date.now());
        const todayCell = grid.cells.find(c => c.date === todayKey) || (grid.cells.length ? grid.cells[grid.cells.length - 1] : null);
        const todayActions = todayCell ? todayCell.count : 0;

        containerEl.innerHTML = `
            <div class="skyline-wrapper" style="position: relative; width: 100%; border: 3px solid #000; background: #ffffff; border-radius: 16px; box-shadow: 6px 6px 0 #000; padding: 22px; font-family: inherit;">
                <div class="skyline-top-bar" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
                    <div>
                        <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #6366f1;">
                            ⚡ DAILY STORY READING & ACTIVITY SKYLINE
                        </div>
                        <h3 style="margin: 4px 0 0; font-size: 21px; font-weight: 900; color: #0f172a;">
                            <span id="skylineTotalCount" style="color: #4f46e5;">${stats.total}</span> Stor${stats.total === 1 ? 'y' : 'ies'} Read
                        </h3>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="display: inline-flex; border: 2.5px solid #000; border-radius: 10px; overflow: hidden; background: #f1f5f9; padding: 3px; box-shadow: 2px 2px 0 #000;">
                            <button type="button" id="btnView2D" class="skyline-view-btn" style="border: 0; padding: 6px 14px; font-size: 12px; font-weight: 900; cursor: pointer; border-radius: 6px; background: ${currentView === '2d' ? '#000' : 'transparent'}; color: ${currentView === '2d' ? '#fff' : '#475569'}; transition: all 0.15s ease;">
                                2D Grid
                            </button>
                            <button type="button" id="btnView3D" class="skyline-view-btn" style="border: 0; padding: 6px 14px; font-size: 12px; font-weight: 900; cursor: pointer; border-radius: 6px; background: ${currentView === '3d' ? '#000' : 'transparent'}; color: ${currentView === '3d' ? '#fff' : '#475569'}; transition: all 0.15s ease;">
                                3D Skyline
                            </button>
                        </div>
                    </div>
                </div>

                <div class="skyline-stage-wrap" style="position: relative; width: 100%; border: 2.5px solid #000; border-radius: 12px; background: #fafafa; overflow: hidden; box-shadow: 3px 3px 0 #000;">
                    <div id="skylineStage" style="position: relative; width: 100%; height: 210px; overflow: hidden;">
                        <canvas id="skylineCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; outline: none; cursor: grab;"></canvas>
                        
                        <!-- Tooltip -->
                        <div id="skylineTip" style="pointer-events: none; position: absolute; top: 12px; left: 12px; z-index: 30; opacity: 0; transition: opacity 0.15s ease; background: #000; color: #fff; border: 2px solid #4f46e5; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                            <span id="skylineTipText">No activity</span>
                        </div>
                    </div>

                    <!-- Metrics row -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; padding: 14px 18px; border-top: 2.5px solid #000; background: #fff;">
                        <div>
                            <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Stories Read Today</div>
                            <div style="font-size: 22px; font-weight: 900; color: #4f46e5;">${todayActions} <span style="font-size: 12px; color: #64748b; font-weight: 700;">today</span></div>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Stories Read</div>
                            <div style="font-size: 22px; font-weight: 900; color: #2563eb;">${stats.total} <span style="font-size: 12px; color: #64748b; font-weight: 700;">total</span></div>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Busiest Day</div>
                            <div style="font-size: 22px; font-weight: 900; color: #059669;">${stats.busiest.count} <span style="font-size: 12px; color: #64748b; font-weight: 700;">stor${stats.busiest.count === 1 ? 'y' : 'ies'}</span></div>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Active Streak</div>
                            <div style="font-size: 22px; font-weight: 900; color: #d97706;">${stats.current.days} <span style="font-size: 12px; color: #64748b; font-weight: 700;">day${stats.current.days === 1 ? '' : 's'} 🔥</span></div>
                        </div>
                    </div>

                    <!-- Footer with hint & legend -->
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 8px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc; font-size: 11px; font-weight: 700; color: #64748b;">
                        <span id="skylineHint">🖱️ Drag to orbit in 3D &bull; Hover day for stats &bull; Double-click resets</span>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span>Less</span>
                            <span style="display: inline-block; width: 11px; height: 11px; border-radius: 2px; background: #ebedf0; border: 1px solid #cbd5e1;"></span>
                            <span style="display: inline-block; width: 11px; height: 11px; border-radius: 2px; background: #c7d2fe; border: 1px solid #cbd5e1;"></span>
                            <span style="display: inline-block; width: 11px; height: 11px; border-radius: 2px; background: #818cf8; border: 1px solid #cbd5e1;"></span>
                            <span style="display: inline-block; width: 11px; height: 11px; border-radius: 2px; background: #4f46e5; border: 1px solid #cbd5e1;"></span>
                            <span style="display: inline-block; width: 11px; height: 11px; border-radius: 2px; background: #312e81; border: 1px solid #cbd5e1;"></span>
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const stage = document.getElementById('skylineStage');
        const canvas = document.getElementById('skylineCanvas');
        const tip = document.getElementById('skylineTip');
        const tipText = document.getElementById('skylineTipText');
        const btn2D = document.getElementById('btnView2D');
        const btn3D = document.getElementById('btnView3D');
        if (!stage || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Colors
        const palette = PALETTES.cyber.light;
        const colorSteps = [
            [235, 237, 240], // empty
            [199, 210, 254], // l1
            [129, 140, 248], // l2
            [79, 70, 229],   // l3
            [49, 46, 129]    // l4
        ];
        const fg = [15, 23, 42];
        const bg = [250, 250, 250];

        const n = grid.cells.length;
        const weeks = grid.weeks;
        const wk = new Float32Array(n);
        const dy = new Float32Array(n);
        const lv = new Uint8Array(n);
        const hgt = new Float32Array(n);
        const zs = new Float32Array(n);
        const hover = new Float32Array(n);
        const dim = new Float32Array(n);
        const polys = new Float32Array(n * 24);
        const faces = new Uint8Array(n);
        const order = Array.from({ length: n }, (_, i) => i);

        for (let i = 0; i < n; i++) {
            const c = grid.cells[i];
            wk[i] = c.week;
            dy[i] = c.day;
            lv[i] = c.level;
            hgt[i] = barHeight(c.count, grid.max, 1);
        }

        let W = 0, H2 = 180, H3 = 240, Hmax = 240, dpr = 1, gutter = 28;

        const extent = (cam, e, full) => {
            const w = lerp(0.78, 0.9, e);
            const off = (1 - w) / 2;
            let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
            const add = (x, y, z) => {
                const p = project(cam, x, y, z);
                if (p[0] < minx) minx = p[0];
                if (p[0] > maxx) maxx = p[0];
                if (p[1] < miny) miny = p[1];
                if (p[1] > maxy) maxy = p[1];
            };
            for (let i = 0; i < n; i++) {
                const x0 = wk[i] + off;
                const y0 = dy[i] + off;
                const z = full ? hgt[i] * e : zs[i];
                add(x0, y0, z);
                add(x0 + w, y0, z);
                add(x0, y0 + w, z);
                add(x0 + w, y0 + w, 0);
            }
            add(0, 7 + 1.5 * e, 0);
            add(weeks, 7 + 1.5 * e, 0);
            return { minx, maxx, miny, maxy };
        };

        const relayout = () => {
            const w = Math.round(stage.clientWidth);
            if (!w || !n) return;
            W = w;
            gutter = W < 520 ? 0 : 28;
            dpr = Math.min(2, window.devicePixelRatio || 1);
            const b2 = extent(camera(0), 0, true);
            H2 = 20 + 4 + ((b2.maxy - b2.miny) / (b2.maxx - b2.minx)) * (W - gutter - 4);
            const b3 = extent(camera(1), 1, true);
            const natural = ((b3.maxy - b3.miny) / (b3.maxx - b3.minx)) * (W - 40) + 40;
            H3 = Math.max(Math.min(natural, W * 0.65, 380), 210);
            Hmax = Math.ceil(Math.max(H2, H3));

            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(Hmax * dpr);
            canvas.style.width = W + 'px';
            canvas.style.height = Hmax + 'px';
            stage.style.height = Hmax + 'px';
            draw();
        };

        const draw = () => {
            if (!W || !n) return;
            const e = easeInOutCubic(t);
            const cam = camera(e, yaw, elev);
            const Hc = lerp(H2, H3, e);
            stage.style.height = Hc.toFixed(1) + 'px';

            for (let i = 0; i < n; i++) {
                zs[i] = riseAt(t, wk[i], weeks, dy[i]) * hgt[i];
            }

            const b = extent(cam, e, false);
            const pad = lerp(4, 18, e);
            const left = pad + gutter * (1 - e);
            const top = pad + 18 * (1 - e);
            const aw = W - left - pad;
            const ah = Hc - top - pad;
            const bw = Math.max(1e-6, b.maxx - b.minx);
            const bh = Math.max(1e-6, b.maxy - b.miny);
            const s = Math.min(aw / bw, ah / bh);
            const ox = left + (aw - bw * s) / 2 - b.minx * s;
            const oy = top + (ah - bh * s) / 2 - b.miny * s;
            const { cs, sn, se, ce } = cam;

            const px = (x, y) => ox + (x * cs - y * sn) * s;
            const py = (x, y, z) => oy + ((x * sn + y * cs) * se - z * ce) * s;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, Hmax);

            order.sort((a, c) => (wk[a] + 0.5) * sn + (dy[a] + 0.5) * cs - ((wk[c] + 0.5) * sn + (dy[c] + 0.5) * cs));

            const w = lerp(0.78, 0.9, e);
            const off = (1 - w) / 2;
            const radius = lerp(0.18, 0.04, e) * s;
            const outline = (1 - e) * 0.08;
            const lift = 0.7 * e;

            for (let k = 0; k < n; k++) {
                const i = order[k];
                const x0 = wk[i] + off;
                const y0 = dy[i] + off;
                const x1 = x0 + w;
                const y1 = y0 + w;
                const z = zs[i] + hover[i] * lift;
                const o = i * 24;

                // top
                polys[o] = px(x0, y0); polys[o + 1] = py(x0, y0, z);
                polys[o + 2] = px(x1, y0); polys[o + 3] = py(x1, y0, z);
                polys[o + 4] = px(x1, y1); polys[o + 5] = py(x1, y1, z);
                polys[o + 6] = px(x0, y1); polys[o + 7] = py(x0, y1, z);

                // +y face
                polys[o + 8] = px(x0, y1); polys[o + 9] = py(x0, y1, 0);
                polys[o + 10] = px(x1, y1); polys[o + 11] = py(x1, y1, 0);
                polys[o + 12] = polys[o + 4]; polys[o + 13] = polys[o + 5];
                polys[o + 14] = polys[o + 6]; polys[o + 15] = polys[o + 7];

                // +x face
                polys[o + 16] = px(x1, y0); polys[o + 17] = py(x1, y0, 0);
                polys[o + 18] = polys[o + 10]; polys[o + 19] = polys[o + 11];
                polys[o + 20] = polys[o + 4]; polys[o + 21] = polys[o + 5];
                polys[o + 22] = polys[o + 2]; polys[o + 23] = polys[o + 3];

                const tall = z * ce * s;
                let f = 0;
                if (tall > 0.35 && w * cs * s > 0.35) f |= 1;
                if (tall > 0.35 && w * sn * s > 0.35) f |= 2;
                faces[i] = f;

                const baseCol = colorSteps[lv[i]];
                let r = baseCol[0], g = baseCol[1], bl = baseCol[2];

                const hv = hover[i];
                if (hv > 0.002) {
                    r = lerp(r, 255, 0.25 * hv);
                    g = lerp(g, 255, 0.25 * hv);
                    bl = lerp(bl, 255, 0.25 * hv);
                }

                if (f & 1) {
                    ctx.beginPath();
                    quadPath(ctx, polys, o + 8, 0);
                    ctx.fillStyle = rgbString(r * 0.82, g * 0.82, bl * 0.82);
                    ctx.fill();
                }
                if (f & 2) {
                    ctx.beginPath();
                    quadPath(ctx, polys, o + 16, 0);
                    ctx.fillStyle = rgbString(r * 0.65, g * 0.65, bl * 0.65);
                    ctx.fill();
                }

                ctx.beginPath();
                quadPath(ctx, polys, o, radius);
                ctx.fillStyle = rgbString(r, g, bl);
                ctx.fill();

                if (outline > 0.004) {
                    ctx.strokeStyle = `rgba(0,0,0,${outline.toFixed(2)})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                if (hv > 0.02) {
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            // Month Labels
            ctx.font = '700 10px Inter, sans-serif';
            ctx.fillStyle = '#64748b';
            for (const m of months) {
                const x = px(m.week + off, -0.3);
                if (x > 10 && x < W - 30) {
                    ctx.fillText(m.label, x, py(m.week + off, -0.3, 0) - 4);
                }
            }

            // Update tooltip position if cell is active
            if (activeIdx >= 0 && activeIdx < n) {
                const i = activeIdx;
                const z = zs[i] + hover[i] * lift;
                const tx = px(wk[i] + 0.5, dy[i] + 0.5);
                const ty = Math.min(py(wk[i] + off, dy[i] + off, z), py(wk[i] + off + w, dy[i] + off, z));
                tip.style.transform = `translate(${Math.max(10, Math.min(W - 180, tx - 70))}px, ${Math.max(10, ty - 38)}px)`;
            }
        };

        const tick = (now) => {
            raf = null;
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            let moving = false;

            if (t !== targetViewT) {
                const step = (dt * 1000) / Math.max(1, duration);
                t = targetViewT > t ? Math.min(targetViewT, t + step) : Math.max(targetViewT, t - step);
                moving = true;
            }

            const ko = 1 - Math.exp(-dt * 12);
            yaw += (yawGoal - yaw) * ko;
            elev += (elevGoal - elev) * ko;
            if (Math.abs(yawGoal - yaw) > 1e-4 || Math.abs(elevGoal - elev) > 1e-4) moving = true;
            else { yaw = yawGoal; elev = elevGoal; }

            const kh = 1 - Math.exp(-dt * 16);
            for (let i = 0; i < n; i++) {
                const hg = i === activeIdx ? 1 : 0;
                const h = hover[i];
                if (h !== hg) {
                    hover[i] = Math.abs(hg - h) < 0.003 ? hg : h + (hg - h) * kh;
                    moving = true;
                }
            }

            draw();
            if (moving) raf = requestAnimationFrame(tick);
        };

        const kick = () => {
            if (raf) return;
            last = performance.now();
            raf = requestAnimationFrame(tick);
        };

        const setView = (v) => {
            currentView = v;
            try { localStorage.setItem('skyline_preferred_view', v); } catch (e) {}
            targetViewT = v === '3d' ? 1 : 0;
            if (btn2D && btn3D) {
                btn2D.style.background = v === '2d' ? '#000' : 'transparent';
                btn2D.style.color = v === '2d' ? '#fff' : '#475569';
                btn3D.style.background = v === '3d' ? '#000' : 'transparent';
                btn3D.style.color = v === '3d' ? '#fff' : '#475569';
            }
            if (v === '2d') {
                yawGoal = 0;
                elevGoal = 0;
            }
            kick();
        };

        if (btn2D) btn2D.onclick = () => setView('2d');
        if (btn3D) btn3D.onclick = () => setView('3d');

        // Drag to orbit in 3D
        let isDragging = false;
        let dragStart = { x: 0, y: 0, yaw: 0, elev: 0 };

        canvas.addEventListener('pointerdown', (e) => {
            if (currentView !== '3d') return;
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY, yaw: yawGoal, elev: elevGoal };
            canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('pointermove', (e) => {
            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                yawGoal = Math.min(YAW_RANGE[1] - YAW_3D, Math.max(YAW_RANGE[0] - YAW_3D, dragStart.yaw + dx * 0.006));
                elevGoal = Math.min(ELEV_RANGE[1] - ELEV_3D, Math.max(ELEV_RANGE[0] - ELEV_3D, dragStart.elev + dy * 0.004));
                kick();
            } else {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                let found = -1;
                for (let k = n - 1; k >= 0; k--) {
                    const i = order[k];
                    const o = i * 24;
                    if (pointInQuad(polys, o, x, y) ||
                        (faces[i] & 1 && pointInQuad(polys, o + 8, x, y)) ||
                        (faces[i] & 2 && pointInQuad(polys, o + 16, x, y))) {
                        found = i;
                        break;
                    }
                }
                if (found !== activeIdx) {
                    activeIdx = found;
                    if (activeIdx >= 0) {
                        const isToday = cell.date === (options.endDate || toKey(Date.now()));
                        if (cell.count > 0) {
                            tipText.innerHTML = `<strong>${cell.count} stor${cell.count === 1 ? 'y' : 'ies'} read</strong> on ${cell.date}${isToday ? ' (Today)' : ''}`;
                        } else {
                            tipText.innerHTML = `<span style="color: #cbd5e1;">⚪ 0 stories read on ${cell.date}</span>`;
                        }
                        tip.style.opacity = '1';
                    } else {
                        tip.style.opacity = '0';
                    }
                    kick();
                }
            }
        });

        window.addEventListener('pointerup', () => {
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = currentView === '3d' ? 'grab' : 'default';
            }
        });

        canvas.addEventListener('dblclick', () => {
            yawGoal = 0;
            elevGoal = 0;
            kick();
        });

        window.addEventListener('resize', relayout);
        setTimeout(relayout, 50);
    }

    global.SlushSkyline = {
        render: renderSkyline,
        generateContributions: generateContributions
    };

})(window);
