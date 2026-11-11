import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { StripId } from './util.js'

/** Clockwise turn of the device itself; the picture turns back so it reads upright */
export type Orientation = 0 | 90 | 180 | 270

const Cycle: Orientation[] = [0, 90, 180, 270]
const StateFile = join(homedir(), '.config', 'zored-stream', 'orientation')

export function loadOrientation(): Orientation {
	let text: string
	try {
		text = readFileSync(StateFile, 'utf8').trim()
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === 'ENOENT') return 90
		throw e
	}
	const value = Number(text)
	if (!Cycle.includes(value as Orientation)) throw new Error(`Bad orientation "${text}" in ${StateFile}`)
	return value as Orientation
}

/** Each step turns the picture 90° clockwise */
export function nextOrientation(o: Orientation): Orientation {
	const next = Cycle[(Cycle.indexOf(o) + Cycle.length - 1) % Cycle.length]
	mkdirSync(dirname(StateFile), { recursive: true })
	writeFileSync(StateFile, `${next}\n`)
	return next
}

/** Clockwise degrees a tile picture turns on the device */
export function tileTurn(o: Orientation): number {
	return (360 - o) % 360
}

/** Strips keep their text reading along the device: the strip that ends up upside down turns 180° */
export function stripFlipped(o: Orientation, strip: StripId): boolean {
	return o === 180 || (o === 90 && strip === 'left') || (o === 270 && strip === 'right')
}

/** Turn an RGB picture clockwise by 0/90/180/270 degrees; 90/270 swap width and height */
export function rotateRgb(src: Uint8Array, w: number, h: number, cw: number): Uint8Array {
	if (cw === 0) return src
	const dst = new Uint8Array(src.length)
	const dw = cw === 180 ? w : h
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const [dx, dy] = cw === 90 ? [h - 1 - y, x] : cw === 180 ? [w - 1 - x, h - 1 - y] : [y, w - 1 - x]
			const s = (y * w + x) * 3
			const d = (dy * dw + dx) * 3
			dst[d] = src[s]
			dst[d + 1] = src[s + 1]
			dst[d + 2] = src[s + 2]
		}
	}
	return dst
}

const Dirs = ['u', 'r', 'd', 'l'] as const
export type Dir = (typeof Dirs)[number]

/** A swipe seen in device coordinates, as the user sees it on the turned device */
export function userDir(o: Orientation, dir: Dir): Dir {
	return Dirs[(Dirs.indexOf(dir) + o / 90) % 4]
}
