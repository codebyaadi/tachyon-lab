// Build crates/physics-wasm → apps/web/src/lib/wasm/pkg
//   cargo build (wasm32, SIMD on via .cargo/config.toml) → wasm-bindgen → wasm-opt
// Usage: node scripts/build-wasm.mjs [--dev]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const profile = dev ? 'debug' : 'release';
const outDir = join(root, 'apps/web/src/lib/wasm/pkg');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });

// 1. The CLI version must equal the crate version or the generated glue breaks.
const cargoToml = readFileSync(join(root, 'crates/physics-wasm/Cargo.toml'), 'utf8');
const want = cargoToml.match(/wasm-bindgen = "=([\d.]+)"/)?.[1];
const have = execFileSync('wasm-bindgen', ['--version'], { encoding: 'utf8' }).trim().split(' ')[1];
if (want !== have) {
	console.error(
		`wasm-bindgen CLI ${have} ≠ crate ${want}. Run: cargo install wasm-bindgen-cli --version ${want} --locked`
	);
	process.exit(1);
}

// 2. Compile.
run('cargo', ['build', '-p', 'physics-wasm', '--target', 'wasm32-unknown-unknown', ...(dev ? [] : ['--release'])]);
const wasm = join(root, `target/wasm32-unknown-unknown/${profile}/physics_wasm.wasm`);

// 3. Generate ES-module glue + TypeScript types.
run('wasm-bindgen', [wasm, '--out-dir', outDir, '--target', 'web', '--typescript']);

// 4. Optimize (release only). wasm-opt ships in the `binaryen` npm package.
const out = join(outDir, 'physics_wasm_bg.wasm');
if (!dev) {
	const require = createRequire(import.meta.url);
	const wasmOpt = join(dirname(require.resolve('binaryen/package.json')), 'bin', 'wasm-opt');
	if (existsSync(wasmOpt)) {
		run('node', [
			wasmOpt,
			'-O3',
			'--enable-simd',
			'--enable-bulk-memory',
			'--enable-nontrapping-float-to-int',
			'--enable-sign-ext',
			'--enable-mutable-globals',
			'--enable-reference-types',
			'--enable-multivalue',
			out,
			'-o',
			out
		]);
	} else {
		console.warn('binaryen not found; skipping wasm-opt');
	}
}
console.log(`wasm ready: ${(statSync(out).size / 1024).toFixed(1)} KB (${profile})`);
