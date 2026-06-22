import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "E:\\baic-frontend\\测试用例.md";
const outputPath = "E:\\baic-frontend\\baic-requirements-management\\测试用例.xlsx";

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  const body = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const withoutEnd = body.endsWith("|") ? body.slice(0, -1) : body;
  return withoutEnd.split("|").map((cell) => cell.trim().replace(/`([^`]+)`/g, "$1"));
}

function isSeparatorRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function columnLetter(index) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

const markdown = await fs.readFile(sourcePath, "utf8");
const lines = markdown.split(/\r?\n/);
const tableRows = [];
const notes = [];
let inTable = false;

for (const line of lines) {
  if (line.trim().startsWith("|")) {
    const cells = splitMarkdownRow(line);
    if (isSeparatorRow(cells)) {
      inTable = true;
      continue;
    }
    tableRows.push(cells);
    inTable = true;
    continue;
  }

  if (inTable && line.trim()) {
    notes.push(line.trim().replace(/\*\*/g, ""));
  }
}

if (tableRows.length < 2) {
  throw new Error("No Markdown table found in source file.");
}

const header = tableRows[0];
const rows = tableRows.slice(1).map((row) => {
  const normalized = [...row];
  while (normalized.length < header.length) normalized.push("");
  return normalized.slice(0, header.length);
});

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("功能测试用例");
sheet.showGridLines = false;

const allRows = [header, ...rows];
const endCol = columnLetter(header.length - 1);
const tableRange = `A1:${endCol}${allRows.length}`;

sheet.getRange(tableRange).values = allRows;
sheet.getRange("A1:F1").format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
};
sheet.getRange(tableRange).format = {
  borders: { preset: "all", style: "thin", color: "#D9E2F3" },
  wrapText: true,
  verticalAlignment: "Top",
};

sheet.getRange("A:A").format.columnWidthPx = 76;
sheet.getRange("B:B").format.columnWidthPx = 120;
sheet.getRange("C:C").format.columnWidthPx = 210;
sheet.getRange("D:D").format.columnWidthPx = 360;
sheet.getRange("E:E").format.columnWidthPx = 360;
sheet.getRange("F:F").format.columnWidthPx = 90;
sheet.getRange(`A2:${endCol}${allRows.length}`).format.rowHeightPx = 42;
sheet.freezePanes.freezeRows(1);

const table = sheet.tables.add(tableRange, true, "FunctionalTestCases");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

const priorityCol = sheet.getRange(`F2:F${allRows.length}`);
priorityCol.conditionalFormats.add("containsText", {
  text: "P0",
  format: { fill: "#FCE4D6", font: { bold: true, color: "#9C0006" } },
});
priorityCol.conditionalFormats.add("containsText", {
  text: "P1",
  format: { fill: "#FFF2CC", font: { bold: true, color: "#7F6000" } },
});
priorityCol.conditionalFormats.add("containsText", {
  text: "P2",
  format: { fill: "#E2F0D9", font: { bold: true, color: "#375623" } },
});

if (notes.length > 0) {
  const noteStart = allRows.length + 3;
  sheet.getRange(`A${noteStart}:F${noteStart}`).merge();
  sheet.getRange(`A${noteStart}`).values = [["说明"]];
  sheet.getRange(`A${noteStart}`).format = {
    fill: "#F2F2F2",
    font: { bold: true, color: "#333333" },
  };
  sheet.getRange(`A${noteStart + 1}:F${noteStart + 1}`).merge();
  sheet.getRange(`A${noteStart + 1}`).values = [[notes.join("\n")]];
  sheet.getRange(`A${noteStart + 1}`).format = {
    wrapText: true,
    verticalAlignment: "Top",
    borders: { preset: "outside", style: "thin", color: "#D9D9D9" },
  };
  sheet.getRange(`A${noteStart + 1}`).format.rowHeightPx = 60;
}

const inspect = await workbook.inspect({
  kind: "table",
  range: `功能测试用例!A1:F${Math.min(allRows.length, 8)}`,
  include: "values",
  tableMaxRows: 8,
  tableMaxCols: 6,
  maxChars: 3000,
});
console.log(inspect.ndjson);

await workbook.render({
  sheetName: "功能测试用例",
  range: `A1:F${Math.min(allRows.length + 5, 25)}`,
  scale: 1,
  format: "png",
});

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
