import type { ModuleLogger } from '@companion-surface/base'

const SwipeUrl = 'http://127.0.0.1:47113/tile/swipe'
const MinDistance = 40
const MaxMs = 400

interface Touch {
	controlId: string
	x: number
	y: number
	at: number
	released?: boolean
	swipe?: Promise<boolean>
}

/** Pins a center touch to the tile it started on and reports one swipe per touch; the daemon answers 404 for tiles without swipes */
export class TileSwipe {
	readonly #logger: ModuleLogger
	readonly #touches = new Map<number, Touch>()

	constructor(logger: ModuleLogger) {
		this.#logger = logger
	}

	start(touchId: number, controlId: string, x: number, y: number): void {
		this.#touches.set(touchId, { controlId, x, y, at: Date.now() })
	}

	/** Resolves true once the daemon took the swipe: the caller releases the tile, the daemon skips its tap */
	move(touchId: number, x: number, y: number): Promise<boolean> | undefined {
		const t = this.#touches.get(touchId)
		if (!t || t.swipe || Date.now() - t.at > MaxMs) return undefined
		const dx = x - t.x
		const dy = y - t.y
		if (Math.max(Math.abs(dx), Math.abs(dy)) < MinDistance) return undefined
		const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'd' : 'u'
		t.swipe = fetch(`${SwipeUrl}?id=${t.controlId}&dir=${dir}`, { method: 'POST' }).then(
			(r) => r.status !== 404,
			(e) => {
				this.#logger.warn(`Tile swipe failed: ${e}`)
				return false
			},
		)
		return t.swipe
	}

	/** Waits for a pending swipe so the daemon sees it before the tap */
	end(touchId: number, release: (controlId: string) => void): void {
		const t = this.#touches.get(touchId)
		if (!t) return
		this.#touches.delete(touchId)
		if (t.swipe) void t.swipe.then(() => this.release(t, release))
		else this.release(t, release)
	}

	release(t: Touch, release: (controlId: string) => void): void {
		if (t.released) return
		t.released = true
		release(t.controlId)
	}

	get(touchId: number): Touch | undefined {
		return this.#touches.get(touchId)
	}
}
