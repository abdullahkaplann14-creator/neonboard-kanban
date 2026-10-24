import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importBoard } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(here, '..', '..', 'data', 'board.json');
const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const summary = importBoard(raw.board ?? raw);
console.log(`[seed] Pano sıfırlandı: ${summary.columns} kolon, ${summary.cards} kart.`);
