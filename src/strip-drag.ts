import type { ModuleLogger } from '@companion-surface/base'

const DragUrl = 'http://127.0.0.1:47113/volume/drag'
const SlideUrl = 'http://127.0.0.1:47117/ai/slide'
const EmojiUrl = 'http://127.0.0.1:47128/emoji'

export class StripDrag {
	readonly #logger: ModuleLogger
	readonly #lastY = new Map<number, number>()

	constructor(logger: ModuleLogger) {
		this.#logger = logger
	}

	move(touchId: number, y: number): void {
		const prevY = this.#lastY.get(touchId) ?? y
		this.#lastY.set(touchId, y)
		if (prevY === y) return
		fetch(`${DragUrl}?dy=${prevY - y}`, { method: 'POST' }).catch((e) => this.#logger.warn(`Strip drag failed: ${e}`))
	}

	slide(touchId: number, y: number): void {
		const prevY = this.#lastY.get(touchId)
		this.#lastY.set(touchId, y)
		if (prevY === y) return
		fetch(`${SlideUrl}?y=${y}`, { method: 'POST' }).catch((e) => this.#logger.warn(`Strip slide failed: ${e}`))
	}

	end(touchId: number): void {
		this.#lastY.delete(touchId)
	}

	/** Strip touch edges for the emoji picker; the daemon ignores them while the picker is closed */
	edge(edge: 'start' | 'end', side: 'l' | 'r', y: number): void {
		fetch(`${EmojiUrl}/${edge}?s=${side}&y=${y}`, { method: 'POST' }).catch((e) =>
			this.#logger.warn(`Emoji ${edge} failed: ${e}`),
		)
	}
}
