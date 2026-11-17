/**
 * Layout-Adaptive Table Row Extractor for Laboratory PDFs.
 *
 * Operates per RESULT_DETAIL page:
 * 1. Computes dynamic column X-boundaries from the page's column header row.
 * 2. Isolates the results region (below column headers, above interpretation / footers).
 * 3. Segments rows using value-cell anchors (with horizontal rule assistance when present).
 * 4. Separates method lines (e.g., Calculated, HPLC, Enzymatic) from test names.
 * 5. Maintains section heading context (e.g., RBC Parameters, Absolute Leukocyte Counts).
 * 6. Deduplicates rows repeated across page breaks.
 */

export interface ExtractedTableRow {
  pageNumber: number;
  name: string;
  method?: string;
  valueCell: string;
  unitCell: string;
  rangeCell: string;
  section?: string;
}

export interface PositionedToken {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ColumnBoundaries {
  nameXEnd: number;
  valueXEnd: number;
  unitXEnd: number;
}

const SECTION_KEYWORD_REGEX =
  /^(?:complete blood count|rbc parameters|wbc parameters|platelet parameters|differential leucocyte count|absolute leukocyte counts|liver function test|kidney function test|lipid profile|thyroid profile|physical examination|chemical examination|microscopic examination|urinalysis|urine routine|diabetic profile|cardiac profile|electrolyte profile|iron studies)\b/i;

const CUTOFF_KEYWORD_REGEX =
  /^(?:interpretation|comment|note\s*:|notes\b|references?\b|\*\*\* end of report|end of report|end of test report|booking centre|processing lab|page \d+ of)/i;

/**
 * Derives column X-boundaries dynamically from the header row of a page.
 */
export function deriveColumnBoundaries(
  headerTokens: PositionedToken[],
  pageWidth = 595
): ColumnBoundaries {
  let nameXEnd = pageWidth * 0.35;
  let valueXEnd = pageWidth * 0.52;
  let unitXEnd = pageWidth * 0.68;

  const sorted = [...headerTokens].sort((a, b) => a.x - b.x);

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i].str.toLowerCase();
    if (s.includes("value") || s.includes("result")) {
      nameXEnd = sorted[i].x - 5;
    } else if (s.includes("unit")) {
      valueXEnd = sorted[i].x - 5;
    } else if (
      s.includes("reference") ||
      s.includes("range") ||
      s.includes("interval") ||
      s.includes("normal") ||
      s.includes("bio")
    ) {
      unitXEnd = sorted[i].x - 5;
    }
  }

  // Safety clamps to ensure valid column intervals
  if (valueXEnd <= nameXEnd) valueXEnd = nameXEnd + 60;
  if (unitXEnd <= valueXEnd) unitXEnd = valueXEnd + 60;

  return { nameXEnd, valueXEnd, unitXEnd };
}

/**
 * Segments and extracts rows from a single page's positioned tokens.
 */
export function extractPageRows(
  tokens: PositionedToken[],
  pageNumber: number,
  initialSection = ""
): { rows: ExtractedTableRow[]; endingSection: string } {
  if (!tokens || tokens.length === 0) {
    return { rows: [], endingSection: initialSection };
  }

  // Group tokens into lines by descending Y, ascending X
  const sortedTokens = [...tokens].sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff <= 4) return a.x - b.x;
    return b.y - a.y;
  });

  const lineBuckets: PositionedToken[][] = [];
  let currentBucket: PositionedToken[] = [];
  let currentY: number | null = null;

  for (const item of sortedTokens) {
    if (currentY === null || Math.abs(item.y - currentY) <= 4) {
      currentBucket.push(item);
      currentY = item.y;
    } else {
      if (currentBucket.length > 0) {
        currentBucket.sort((a, b) => a.x - b.x);
        lineBuckets.push(currentBucket);
      }
      currentBucket = [item];
      currentY = item.y;
    }
  }
  if (currentBucket.length > 0) {
    currentBucket.sort((a, b) => a.x - b.x);
    lineBuckets.push(currentBucket);
  }

  // 1. Locate column header row
  let headerY: number | null = null;
  let headerBucket: PositionedToken[] | null = null;

  for (const bucket of lineBuckets) {
    const lineStr = bucket.map((b) => b.str).join(" ");
    const hasNameCol = /(?:test description|test name|investigation|parameter)/i.test(lineStr);
    const hasValCol = /(?:value|result)/i.test(lineStr);
    const hasRangeCol = /(?:reference|range|normal|interval)/i.test(lineStr);
    const hasUnitCol = /unit/i.test(lineStr);

    if (hasNameCol && hasValCol && (hasUnitCol || hasRangeCol)) {
      headerY = bucket[0].y;
      headerBucket = bucket;
      break;
    }
  }

  const columnBounds = headerBucket
    ? deriveColumnBoundaries(headerBucket)
    : { nameXEnd: 190, valueXEnd: 280, unitXEnd: 360 };

  // 2. Identify Results Region (below headerY, above first cutoff keyword)
  let cutoffY = 0;
  for (const bucket of lineBuckets) {
    if (headerY !== null && bucket[0].y >= headerY) continue;
    const lineStr = bucket.map((b) => b.str).join(" ");
    if (CUTOFF_KEYWORD_REGEX.test(lineStr.trim())) {
      cutoffY = bucket[0].y;
      break;
    }
  }

  // Filter line buckets strictly to results region
  const resultsTableBuckets = lineBuckets.filter((bucket) => {
    const y = bucket[0].y;
    if (headerY !== null && y >= headerY) return false;
    if (cutoffY > 0 && y <= cutoffY) return false;
    return true;
  });

  // 3. State Machine row extraction
  const pageRows: ExtractedTableRow[] = [];
  let currentSection = initialSection;
  let currentRow: ExtractedTableRow | null = null;

  for (const bucket of resultsTableBuckets) {
    const nameTokens: string[] = [];
    const valueTokens: string[] = [];
    const unitTokens: string[] = [];
    const rangeTokens: string[] = [];

    for (const item of bucket) {
      if (item.x < columnBounds.nameXEnd) {
        nameTokens.push(item.str);
      } else if (item.x < columnBounds.valueXEnd) {
        valueTokens.push(item.str);
      } else if (item.x < columnBounds.unitXEnd) {
        unitTokens.push(item.str);
      } else {
        rangeTokens.push(item.str);
      }
    }

    const nameCell = nameTokens.join(" ").trim();
    const valueCell = valueTokens.join(" ").trim();
    const unitCell = unitTokens.join(" ").trim();
    const rangeCell = rangeTokens.join(" ").trim();

    // Line is an anchor if valueCell is populated
    if (valueCell.length > 0) {
      if (currentRow) {
        pageRows.push(currentRow);
      }
      currentRow = {
        pageNumber,
        name: nameCell,
        method: undefined,
        valueCell,
        unitCell,
        rangeCell,
        section: currentSection || undefined,
      };
    } else if (nameCell.length > 0) {
      // No value on this line
      const isSectionHeading =
        SECTION_KEYWORD_REGEX.test(nameCell) ||
        nameCell.toLowerCase().includes("examination") ||
        nameCell.toLowerCase().includes("parameters");

      if (
        currentRow &&
        !currentRow.method &&
        unitCell.length === 0 &&
        rangeCell.length === 0 &&
        !isSectionHeading
      ) {
        // Subsequent name line = methodology (e.g. Calculated, Enzymatic, HPLC)
        currentRow.method = nameCell;
      } else {
        // Section heading line
        if (currentRow) {
          pageRows.push(currentRow);
          currentRow = null;
        }
        currentSection = nameCell;
      }
    } else {
      // Continuation line for unit or range (e.g. multi-tier ranges)
      if (currentRow) {
        if (unitCell.length > 0 && currentRow.unitCell !== unitCell) {
          currentRow.unitCell = `${currentRow.unitCell} ${unitCell}`.trim();
        }
        if (rangeCell.length > 0) {
          currentRow.rangeCell = `${currentRow.rangeCell} ${rangeCell}`.trim();
        }
      }
    }
  }

  if (currentRow) {
    pageRows.push(currentRow);
  }

  return { rows: pageRows, endingSection: currentSection };
}

/**
 * Deduplicates rows repeated across page breaks.
 * A row is a page-break duplicate if it matches the same name, same valueCell, and same unitCell.
 */
export function deduplicatePageBreakRows(rows: ExtractedTableRow[]): ExtractedTableRow[] {
  const deduped: ExtractedTableRow[] = [];

  for (const r of rows) {
    const isDup = deduped.some(
      (prev) =>
        prev.name.toLowerCase() === r.name.toLowerCase() &&
        prev.valueCell.toLowerCase() === r.valueCell.toLowerCase() &&
        prev.unitCell.toLowerCase() === r.unitCell.toLowerCase()
    );
    if (!isDup) {
      deduped.push(r);
    }
  }

  return deduped;
}

/**
 * Reconstructs positioned tokens from line strings for mock fixtures or line-based inputs.
 */
export function tokensFromLines(lines: string[]): PositionedToken[] {
  const tokens: PositionedToken[] = [];
  let currentY = 800;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentY -= 15;
      continue;
    }

    // Split by 2+ spaces or tabs
    const parts = line.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);

    if (parts.length === 1) {
      tokens.push({
        str: parts[0],
        x: 30,
        y: currentY,
        width: parts[0].length * 6,
        height: 10,
      });
    } else if (parts.length >= 4) {
      // 4-column: Name, Value, Unit, Range
      tokens.push({ str: parts[0], x: 30, y: currentY, width: parts[0].length * 6, height: 10 });
      tokens.push({ str: parts[1], x: 220, y: currentY, width: parts[1].length * 6, height: 10 });
      tokens.push({ str: parts[2], x: 310, y: currentY, width: parts[2].length * 6, height: 10 });
      tokens.push({ str: parts.slice(3).join(" "), x: 400, y: currentY, width: 80, height: 10 });
    } else if (parts.length === 3) {
      tokens.push({ str: parts[0], x: 30, y: currentY, width: parts[0].length * 6, height: 10 });
      tokens.push({ str: parts[1], x: 220, y: currentY, width: parts[1].length * 6, height: 10 });
      tokens.push({ str: parts[2], x: 380, y: currentY, width: parts[2].length * 6, height: 10 });
    } else if (parts.length === 2) {
      tokens.push({ str: parts[0], x: 30, y: currentY, width: parts[0].length * 6, height: 10 });
      tokens.push({ str: parts[1], x: 220, y: currentY, width: parts[1].length * 6, height: 10 });
    }

    currentY -= 14;
  }

  return tokens;
}

/**
 * Extracts all table rows from a list of pages with spatial tokens.
 */
export function extractAdaptiveTableRows(
  pages: { pageNumber: number; tokens?: PositionedToken[]; lines?: string[] }[]
): ExtractedTableRow[] {
  const allRows: ExtractedTableRow[] = [];
  let section = "";

  for (const p of pages) {
    const tokens =
      p.tokens && p.tokens.length > 0
        ? p.tokens
        : p.lines
        ? tokensFromLines(p.lines)
        : [];
    const res = extractPageRows(tokens, p.pageNumber, section);
    allRows.push(...res.rows);
    section = res.endingSection;
  }

  return deduplicatePageBreakRows(allRows);
}
