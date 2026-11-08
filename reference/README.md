# Reference data

Python notebooks that produce "golden" results with trusted libraries (NumPy, SciPy), saved as JSON in `golden/`. The Rust tests load these files and compare against them, so the solver is checked against an independent implementation, not only against formulas you derived yourself.

Set up once:

```bash
python -m venv .venv
```

```bash
.venv/Scripts/pip install numpy scipy jupyterlab
```

(On Linux/WSL the second command is `.venv/bin/pip install numpy scipy jupyterlab`.)

First notebook to write, in Phase 3: the harmonic-oscillator eigenvalues from `scipy.linalg.eigh_tridiagonal`, for comparison with your own eigensolver.
