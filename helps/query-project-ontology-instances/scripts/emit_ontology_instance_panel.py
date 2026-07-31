#!/usr/bin/env python3
"""Emit the deterministic protocol marker for the ontology instance panel."""

from __future__ import annotations

import json
import sys


PAYLOAD = {
    "protocol_version": "1.0",
    "panel": "req-relationship",
    "status": "ready",
    "query": {
        "root": None,
        "depth": 1,
        "origin": "all",
        "node_limit": 200,
        "edge_limit": 500,
        "include_properties": False,
    },
    "error": None,
}


def configure_stdout() -> None:
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if reconfigure is not None:
        reconfigure(encoding="utf-8", errors="strict", newline="")


def main() -> None:
    configure_stdout()
    sys.stdout.write(
        json.dumps(PAYLOAD, ensure_ascii=False, separators=(",", ":")) + "\n"
    )


if __name__ == "__main__":
    main()
