import json
import subprocess
import sys
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_ROOT / "scripts" / "emit_ontology_instance_panel.py"


class EmitOntologyInstancePanelTests(unittest.TestCase):
    def test_emits_exact_utf8_protocol_without_writes(self):
        before = sorted(
            path.relative_to(SKILL_ROOT).as_posix()
            for path in SKILL_ROOT.rglob("*")
            if path.is_file()
        )

        completed = subprocess.run(
            [sys.executable, str(SCRIPT)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )

        after = sorted(
            path.relative_to(SKILL_ROOT).as_posix()
            for path in SKILL_ROOT.rglob("*")
            if path.is_file()
        )
        self.assertEqual(0, completed.returncode)
        self.assertEqual("", completed.stderr)
        self.assertTrue(completed.stdout.startswith("{"))
        self.assertTrue(completed.stdout.endswith("}\n"))
        self.assertNotIn("```", completed.stdout)
        self.assertEqual(before, after)
        self.assertEqual(
            {
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
            },
            json.loads(completed.stdout),
        )


if __name__ == "__main__":
    unittest.main()
