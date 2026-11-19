import type { ModuleLogger } from '@companion-surface/base'

const PhotoUrl = 'http://127.0.0.1:47130/photo'
const RetryMs = 2000

/** A tile in Companion grid coordinates */
export interface PhotoCell {
	row: number
	column: number
}

interface PhotoState {
	v: number
	id: string
	keep: PhotoCell[]
}

/** Long-polls the daemon for the chat photo spread over the tiles; '' = none */
export class PhotoFeed {
	readonly #logger: ModuleLogger
	readonly #onState: (id: string, keep: PhotoCell[]) => void
	readonly #abort = new AbortController()

	constructor(logger: ModuleLogger, onState: (id: string, keep: PhotoCell[]) => void) {
		this.#logger = logger
		this.#onState = onState
	}

	start(): void {
		void this.#loop()
	}

	stop(): void {
		this.#abort.abort()
	}

	async #loop(): Promise<void> {
		let v = 0
		let failing = false
		while (!this.#abort.signal.aborted) {
			try {
				const r = await fetch(`${PhotoUrl}?v=${v}`, { signal: this.#abort.signal })
				if (!r.ok) throw new Error(`http ${r.status}`)
				const st = (await r.json()) as PhotoState
				if (failing) this.#logger.info('Photo feed back')
				failing = false
				v = st.v
				this.#onState(st.id, st.keep)
			} catch (e) {
				if (this.#abort.signal.aborted) return
				if (!failing) this.#logger.warn(`Photo feed failed: ${e}`)
				failing = true
				v = 0
				this.#onState('', [])
				await new Promise((resolve) => setTimeout(resolve, RetryMs))
			}
		}
	}

	/** The photo as raw RGB, cropped to fill width × height */
	async image(id: string, width: number, height: number): Promise<Uint8Array> {
		const r = await fetch(`${PhotoUrl}/image?id=${encodeURIComponent(id)}&w=${width}&h=${height}`)
		if (!r.ok) throw new Error(`photo ${id}: http ${r.status}: ${await r.text()}`)
		const rgb = new Uint8Array(await r.arrayBuffer())
		if (rgb.length !== width * height * 3) throw new Error(`photo ${id}: ${rgb.length} bytes for ${width}×${height}`)
		return rgb
	}

	close(): void {
		fetch(`${PhotoUrl}/close`, { method: 'POST' })
			.then((r) => {
				if (!r.ok) this.#logger.warn(`Photo close: http ${r.status}`)
			})
			.catch((e) => this.#logger.warn(`Photo close failed: ${e}`))
	}
}
