#!/usr/bin/env python3
"""Read one Scenario 9 ontology QA result and emit a stable JSON protocol."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


PROTOCOL_VERSION = "1.0"
MAX_RESULT_BYTES = 8 * 1024 * 1024
INVALID_FILE_NAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

EXIT_SUCCESS = 0
EXIT_INPUT_OR_PATH = 2
EXIT_READ_OR_JSON = 3
EXIT_SCHEMA = 4

ARRAY_FIELDS = (
    "inferred_dependencies",
    "inferred_conflicts",
    "state_machine_issues",
    "scenario_issues",
)
SENSITIVE_PATH_FIELDS = {
    "absolute_path",
    "project",
    "project_root",
    "source_path",
}


def configure_stdout() -> None:
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if reconfigure is not None:
        reconfigure(encoding="utf-8", errors="strict", newline="")


class QueryError(Exception):
    def __init__(self, code: str, message: str, exit_code: int) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.exit_code = exit_code


class ProtocolArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise QueryError("INVALID_INPUT", f"参数无效: {message}", EXIT_INPUT_OR_PATH)


def build_parser() -> argparse.ArgumentParser:
    parser = ProtocolArgumentParser(
        description="Read one Scenario 9 ontology QA JSON result.",
    )
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--repository-name", required=True)
    return parser


def render_envelope(
    *,
    status: str,
    source_file: str | None,
    data: dict[str, Any] | None,
    warnings: list[dict[str, str]],
    error: dict[str, str] | None,
) -> str:
    return json.dumps(
        {
            "protocol_version": PROTOCOL_VERSION,
            "status": status,
            "source_file": source_file,
            "data": data,
            "warnings": warnings,
            "error": error,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def render_error(
    code: str,
    message: str,
    source_file: str | None,
) -> str:
    return render_envelope(
        status="error",
        source_file=source_file,
        data=None,
        warnings=[],
        error={"code": code, "message": message},
    )


def require_non_negative_integer(value: Any, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            f"结果字段 {field} 必须是非负整数",
            EXIT_SCHEMA,
        )
    return value


def parse_count_map(value: Any, field: str) -> dict[str, int]:
    if not isinstance(value, dict):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            f"结果字段 {field} 必须是对象",
            EXIT_SCHEMA,
        )

    result: dict[str, int] = {}
    for key, item in value.items():
        if not isinstance(key, str) or not key:
            raise QueryError(
                "INVALID_RESULT_SCHEMA",
                f"结果字段 {field} 包含无效统计键",
                EXIT_SCHEMA,
            )
        result[key] = require_non_negative_integer(item, f"{field}.{key}")
    return result


def parse_summary(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            "结果字段 summary 必须是对象",
            EXIT_SCHEMA,
        )

    return {
        "total_inferred": require_non_negative_integer(
            value.get("total_inferred"),
            "summary.total_inferred",
        ),
        "dependencies": require_non_negative_integer(
            value.get("dependencies"),
            "summary.dependencies",
        ),
        "conflicts": require_non_negative_integer(
            value.get("conflicts"),
            "summary.conflicts",
        ),
        "state_machine_issues": parse_count_map(
            value.get("state_machine_issues"),
            "summary.state_machine_issues",
        ),
        "scenario_issues": parse_count_map(
            value.get("scenario_issues"),
            "summary.scenario_issues",
        ),
    }


def parse_record_array(value: Any, field: str) -> list[dict[str, Any]]:
    if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            f"结果字段 {field} 必须是对象数组",
            EXIT_SCHEMA,
        )
    return [sanitize_value(item) for item in value]


def sanitize_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: sanitize_value(item)
            for key, item in value.items()
            if key not in SENSITIVE_PATH_FIELDS
        }
    if isinstance(value, list):
        return [sanitize_value(item) for item in value]
    return value


def parse_optional_string(value: Any, field: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            f"结果字段 {field} 必须是字符串或 null",
            EXIT_SCHEMA,
        )
    return value


def parse_result(data: Any, project_name: str) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            "结果 JSON 根节点必须是对象",
            EXIT_SCHEMA,
        )

    schema_version = data.get("schema_version")
    if not isinstance(schema_version, str) or not schema_version.strip():
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            "结果字段 schema_version 必须是非空字符串",
            EXIT_SCHEMA,
        )

    root_cause_analysis = data.get("root_cause_analysis")
    if not isinstance(root_cause_analysis, dict):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            "结果字段 root_cause_analysis 必须是对象",
            EXIT_SCHEMA,
        )

    result: dict[str, Any] = {
        "schema_version": schema_version.strip(),
        "generated_at": parse_optional_string(data.get("generated_at"), "generated_at"),
        "generated_by": parse_optional_string(data.get("generated_by"), "generated_by"),
        "project_name": project_name,
        "summary": parse_summary(data.get("summary")),
        "root_cause_analysis": sanitize_value(root_cause_analysis),
    }
    for field in ARRAY_FIELDS:
        result[field] = parse_record_array(data.get(field), field)
    return result


def validate_repository_name(value: str) -> str:
    repository_name = value.strip()
    if (
        not repository_name
        or repository_name in {".", ".."}
        or repository_name.endswith((".", " "))
        or INVALID_FILE_NAME_CHARS.search(repository_name)
    ):
        raise QueryError(
            "INVALID_REPOSITORY_NAME",
            "仓库名称不能用于安全的结果文件名",
            EXIT_INPUT_OR_PATH,
        )
    return repository_name


def resolve_source_file(
    project_root_value: str,
    repository_name_value: str,
) -> tuple[Path, str, str]:
    project_root = Path(project_root_value)
    if not project_root.is_absolute():
        raise QueryError(
            "INVALID_PROJECT_ROOT",
            "project_root 必须是绝对路径",
            EXIT_INPUT_OR_PATH,
        )
    if not project_root.exists() or not project_root.is_dir():
        raise QueryError(
            "PROJECT_ROOT_NOT_FOUND",
            "指定的项目目录不存在或不是目录",
            EXIT_INPUT_OR_PATH,
        )

    repository_name = validate_repository_name(repository_name_value)
    source_name = f"{repository_name}-ontology-qa.json"
    resolved_root = project_root.resolve()
    source_path = resolved_root / source_name
    try:
        resolved_source = source_path.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise QueryError(
            "RESULT_NOT_FOUND",
            f"项目目录中不存在结果文件 {source_name}",
            EXIT_INPUT_OR_PATH,
        ) from exc

    try:
        common_path = Path(os.path.commonpath((resolved_root, resolved_source)))
    except ValueError as exc:
        raise QueryError(
            "RESULT_PATH_OUTSIDE_PROJECT",
            "结果文件路径不在项目目录内",
            EXIT_INPUT_OR_PATH,
        ) from exc
    if common_path != resolved_root or resolved_source.parent != resolved_root:
        raise QueryError(
            "RESULT_PATH_OUTSIDE_PROJECT",
            "结果文件路径不在项目目录内",
            EXIT_INPUT_OR_PATH,
        )
    if not resolved_source.is_file():
        raise QueryError(
            "RESULT_READ_FAILED",
            f"结果路径 {source_name} 不是普通文件",
            EXIT_READ_OR_JSON,
        )
    if resolved_source.stat().st_size > MAX_RESULT_BYTES:
        raise QueryError(
            "RESULT_TOO_LARGE",
            f"结果文件 {source_name} 超过 8 MiB 限制",
            EXIT_READ_OR_JSON,
        )
    return resolved_source, source_name, resolved_root.name


def read_json(path: Path, source_name: str) -> Any:
    try:
        raw = path.read_bytes().decode("utf-8-sig")
    except (OSError, UnicodeError) as exc:
        raise QueryError(
            "RESULT_READ_FAILED",
            f"无法读取结果文件 {source_name}",
            EXIT_READ_OR_JSON,
        ) from exc
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise QueryError(
            "INVALID_RESULT_JSON",
            f"结果文件 {source_name} 不是合法 JSON",
            EXIT_READ_OR_JSON,
        ) from exc


def main(argv: list[str] | None = None) -> int:
    configure_stdout()
    source_name: str | None = None
    try:
        args = build_parser().parse_args(argv)
        repository_name = validate_repository_name(args.repository_name)
        source_name = f"{repository_name}-ontology-qa.json"
        source_path, source_name, project_name = resolve_source_file(
            args.project_root,
            repository_name,
        )
        data = parse_result(read_json(source_path, source_name), project_name)
        output = render_envelope(
            status="success",
            source_file=source_name,
            data=data,
            warnings=[],
            error=None,
        )
        exit_code = EXIT_SUCCESS
    except QueryError as exc:
        output = render_error(exc.code, exc.message, source_name)
        exit_code = exc.exit_code
    except Exception:
        output = render_error(
            "UNEXPECTED_ERROR",
            "查询场景 9 推理结果时发生未预期错误",
            source_name,
        )
        exit_code = EXIT_SCHEMA

    sys.stdout.write(output + "\n")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
