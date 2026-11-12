/** Where the daemon's keep-awake tile sits in the Companion grid (тайл ряд 1, колонка 4) */
export const SleepTile = { row: 0, column: 5 }

const White = [0xff, 0xff, 0xff]
const IconShare = 0.56
const Samples = 4

/** Bootstrap moon-fill as two circles in its 16-unit box: the disc minus the cut */
function inMoon(u: number, v: number): boolean {
	const disc = (u - 8.34) ** 2 + (v - 7.71) ** 2 <= 8.3 ** 2
	const cut = (u - 12.52) ** 2 + (v - 4.6) ** 2 <= 7.3 ** 2
	return disc && !cut
}

/** White crescent centered on a black RGB tile, the daemon's sleep moon drawn without an SVG renderer */
export function moonTile(size: number): Uint8Array {
	const out = new Uint8Array(size * size * 3)
	const icon = size * IconShare
	const origin = (size - icon) / 2
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let hits = 0
			for (let sy = 0; sy < Samples; sy++) {
				for (let sx = 0; sx < Samples; sx++) {
					const u = ((x + (sx + 0.5) / Samples - origin) / icon) * 16
					const v = ((y + (sy + 0.5) / Samples - origin) / icon) * 16
					if (inMoon(u, v)) hits++
				}
			}
			const cover = hits / (Samples * Samples)
			const i = (y * size + x) * 3
			for (let c = 0; c < 3; c++) out[i + c] = Math.round(White[c] * cover)
		}
	}
	return out
}
