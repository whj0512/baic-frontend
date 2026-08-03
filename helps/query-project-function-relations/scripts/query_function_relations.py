#!/usr/bin/env python3
"""Read one Scenario 10 function relation result and emit a stable protocol."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


PROTOCOL_VERSION = "1.0"
PANEL_ID = "function-relations"
MAX_RESULT_BYTES = 8 * 1024 * 1024
INVALID_FILE_NAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

EXIT_SUCCESS = 0
EXIT_INPUT_OR_PATH = 2
EXIT_READ_OR_JSON = 3
EXIT_SCHEMA = 4

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
        description="Read one Scenario 10 function relation JSON result.",
    )
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--function-name", required=True)
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
            "panel": PANEL_ID,
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


def require_string(value: Any, field: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str) or (not allow_empty and not value.strip()):
        qualifier = "字符串" if allow_empty else "非空字符串"
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            f"结果字段 {field} 必须是{qualifier}",
            EXIT_SCHEMA,
        )
    return value


def optional_string(value: Any, field: str) -> str | None:
    if value is None:
        return None
    return require_string(value, field, allow_empty=True)


def require_non_negative_integer(value: Any, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            f"结果字段 {field} 必须是非负整数",
            EXIT_SCHEMA,
        )
    return value


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


def parse_count_map(value: Any, field: str) -> dict[str, int]:
    if not isinstance(value, dict):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            f"结果字段 {field} 必须是对象",
            EXIT_SCHEMA,
        )

    result: dict[str, int] = {}
    for key, item in value.items():
        clean_key = require_string(key, f"{field} 的统计键")
        result[clean_key] = require_non_negative_integer(item, f"{field}.{clean_key}")
    return result


def parse_query(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            "结果字段 query 必须是对象",
            EXIT_SCHEMA,
        )
    return {
        "keyword": require_string(value.get("keyword"), "query.keyword"),
        "repository": require_string(value.get("repository"), "query.repository"),
    }


def parse_relations(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            "结果字段 relations 必须是对象数组",
            EXIT_SCHEMA,
        )

    relations: list[dict[str, Any]] = []
    for index, relation in enumerate(value):
        prefix = f"relations[{index}]"
        require_string(relation.get("relationType"), f"{prefix}.relationType")
        require_string(relation.get("relationSource"), f"{prefix}.relationSource")
        require_string(relation.get("relationTarget"), f"{prefix}.relationTarget")
        require_string(relation.get("subtype"), f"{prefix}.subtype", allow_empty=True)
        require_string(relation.get("confidence"), f"{prefix}.confidence")
        require_string(
            relation.get("inferenceRule"),
            f"{prefix}.inferenceRule",
            allow_empty=True,
        )
        if not isinstance(relation.get("isInferred"), bool):
            raise QueryError(
                "INVALID_RESULT_SCHEMA",
                f"结果字段 {prefix}.isInferred 必须是布尔值",
                EXIT_SCHEMA,
            )
        evidence = relation.get("evidence")
        if not isinstance(evidence, list):
            raise QueryError(
                "INVALID_RESULT_SCHEMA",
                f"结果字段 {prefix}.evidence 必须是数组",
                EXIT_SCHEMA,
            )
        relations.append(sanitize_value(relation))
    return relations


def parse_summary(
    value: Any,
    relations: list[dict[str, Any]],
) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            "结果字段 summary 必须是对象",
            EXIT_SCHEMA,
        )

    total_relations = require_non_negative_integer(
        value.get("total_relations"),
        "summary.total_relations",
    )
    inferred = require_non_negative_integer(value.get("inferred"), "summary.inferred")
    declared = require_non_negative_integer(value.get("declared"), "summary.declared")
    by_type = parse_count_map(value.get("by_type"), "summary.by_type")

    actual_by_type: dict[str, int] = {}
    actual_inferred = 0
    for relation in relations:
        relation_type = relation["relationType"]
        actual_by_type[relation_type] = actual_by_type.get(relation_type, 0) + 1
        actual_inferred += int(relation["isInferred"])
    actual_declared = len(relations) - actual_inferred

    if (
        total_relations != len(relations)
        or inferred != actual_inferred
        or declared != actual_declared
        or by_type != actual_by_type
    ):
        raise QueryError(
            "INVALID_RESULT_SUMMARY",
            "结果字段 summary 与 relations 实际内容不一致",
            EXIT_SCHEMA,
        )

    return {
        "total_relations": total_relations,
        "by_type": by_type,
        "inferred": inferred,
        "declared": declared,
    }


def parse_result(data: Any, project_name: str) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise QueryError(
            "INVALID_RESULT_SCHEMA",
            "结果 JSON 根节点必须是对象",
            EXIT_SCHEMA,
        )

    relations = parse_relations(data.get("relations"))
    return {
        "schema_version": require_string(data.get("schema_version"), "schema_version"),
        "generated_at": optional_string(data.get("generated_at"), "generated_at"),
        "generated_by": optional_string(data.get("generated_by"), "generated_by"),
        "project_name": project_name,
        "query": parse_query(data.get("query")),
        "summary": parse_summary(data.get("summary"), relations),
        "relations": relations,
    }


def validate_function_name(value: str) -> str:
    function_name = value.strip()
    if (
        not function_name
        or function_name in {".", ".."}
        or function_name.endswith((".", " "))
        or INVALID_FILE_NAME_CHARS.search(function_name)
    ):
        raise QueryError(
            "INVALID_FUNCTION_NAME",
            "功能名不能用于安全的结果文件名",
            EXIT_INPUT_OR_PATH,
        )
    return function_name


def resolve_source_file(
    project_root_value: str,
    function_name_value: str,
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

    function_name = validate_function_name(function_name_value)
    source_name = f"{function_name}-relation.json"
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
        function_name = validate_function_name(args.function_name)
        source_name = f"{function_name}-relation.json"
        source_path, source_name, project_name = resolve_source_file(
            args.project_root,
            function_name,
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
            "查询场景 10 功能关系结果时发生未预期错误",
            source_name,
        )
        exit_code = EXIT_SCHEMA

    sys.stdout.write(output + "\n")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
