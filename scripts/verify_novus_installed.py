#!/usr/bin/env python3
"""Verify that FormPilot Vault has real Novus/Pendo install proof before prize claims."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
PROOF_FILE = ROOT / "submission" / "evidence" / "novus-dashboard.png"
MIN_PROOF_BYTES = 20_000


def main() -> int:
    failures: list[str] = []
    index_text = INDEX.read_text(encoding="utf-8").lower()

    if "pendo.initialize" not in index_text:
        failures.append("index.html does not contain pendo.initialize")
    if "pendo" not in index_text:
        failures.append("index.html does not contain a Pendo/Novus snippet marker")
    if not PROOF_FILE.exists():
        failures.append(f"missing dashboard proof: {PROOF_FILE}")
    elif PROOF_FILE.stat().st_size < MIN_PROOF_BYTES:
        failures.append(f"dashboard proof is too small: {PROOF_FILE.stat().st_size}")

    if failures:
        print("formpilot_novus_live_proof_missing")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("formpilot_novus_live_proof_ok")
    print(f"proof_file={PROOF_FILE}")
    print(f"proof_bytes={PROOF_FILE.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
