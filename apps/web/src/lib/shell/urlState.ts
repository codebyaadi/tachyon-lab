/**
 * Shareable state in the URL hash: JSON → deflate-raw (native CompressionStream)
 * → base64url. A version number travels with the params so old links can be migrated.
 */

export type UrlState = { v: number; p: unknown };

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
	const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
	return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
	const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
	const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encodeState(state: UrlState): Promise<string> {
	const json = new TextEncoder().encode(JSON.stringify(state));
	return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** Returns null for an empty or corrupt hash instead of throwing. */
export async function decodeState(hash: string): Promise<UrlState | null> {
	const text = hash.replace(/^#/, '');
	if (!text) return null;
	try {
		const json = await pipe(fromBase64Url(text), new DecompressionStream('deflate-raw'));
		const state = JSON.parse(new TextDecoder().decode(json));
		return typeof state?.v === 'number' ? state : null;
	} catch {
		return null;
	}
}
