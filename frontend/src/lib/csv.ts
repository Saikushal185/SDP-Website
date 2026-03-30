function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function formatColumnError(missing: string[]): string {
  const details: string[] = [
    "CSV is missing required model features and cannot be used for prediction.",
  ];
  if (missing.length > 0) {
    details.push(`Missing: ${missing.join(", ")}.`);
  }
  details.push(
    "Extra dataset columns are allowed, but all required voice feature columns must be present."
  );
  return details.join(" ");
}

export function parseCsvFeatureRow(
  csvText: string,
  expectedFeatures: string[]
): {
  features: Record<string, number>;
  rowCount: number;
  ignoredColumns: string[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = splitCsvLine(lines[0]).map((header) =>
    header.replace(/^\uFEFF/, "")
  );
  const missing = expectedFeatures.filter((feature) => !headers.includes(feature));
  const ignoredColumns = headers.filter(
    (header) => !expectedFeatures.includes(header)
  );

  if (missing.length > 0) {
    throw new Error(formatColumnError(missing));
  }

  const firstRow = splitCsvLine(lines[1]);
  if (firstRow.length !== headers.length) {
    throw new Error("The first CSV data row does not match the header column count.");
  }

  const valuesByHeader = new Map<string, string>();
  headers.forEach((header, index) => valuesByHeader.set(header, firstRow[index]));

  const features: Record<string, number> = {};
  for (const feature of expectedFeatures) {
    const rawValue = valuesByHeader.get(feature) ?? "";
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed)) {
      throw new Error(
        `CSV value for \`${feature}\` must be numeric. Received: ${rawValue || "blank"}.`
      );
    }
    features[feature] = parsed;
  }

  return { features, rowCount: lines.length - 1, ignoredColumns };
}
