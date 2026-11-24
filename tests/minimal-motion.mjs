import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const engine=await readFile('src/components/SpatialMotionEngine.tsx','utf8');
const css=await readFile('src/styles/minimal-motion.css','utf8');
const entry=await readFile('src/main.tsx','utf8');
assert.match(engine,/return 'calm';/);assert.match(engine,/ss_spatial_motion_mode_v13_minimal/);assert.match(engine,/mode !== 'ultra'/);assert.match(css,/data-spatial-motion='calm'/);assert.match(css,/will-change: auto/);assert.ok(!css.includes('pipAlarmPulse'));assert.ok(entry.includes("import './styles/minimal-motion.css'"));
console.log('PASS: minimal motion defaults to calm, disables decorative animations and keeps alarm cues');
