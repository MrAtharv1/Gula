import { db, getActiveReports } from "./index";

/**
 * Checks if a report with the same test date and nearly identical values already exists in IndexedDB
 */
export async function checkForDuplicateReport(
  reportDate: string,
  newResults: { metricKey: string; value: number }[]
): Promise<{ isDuplicate: boolean; duplicateReportName?: string }> {
  if (!reportDate || !newResults || newResults.length === 0) {
    return { isDuplicate: false };
  }

  const activeReports = await getActiveReports();
  const sameDateReports = activeReports.filter((r) => r.reportDate === reportDate);

  if (sameDateReports.length === 0) {
    return { isDuplicate: false };
  }

  for (const existingReport of sameDateReports) {
    const existingResults = await db.results
      .where("reportId")
      .equals(existingReport.id!)
      .toArray();

    if (existingResults.length === 0) continue;

    let matchCount = 0;
    for (const newRes of newResults) {
      const match = existingResults.find(
        (er) =>
          er.metricKey === newRes.metricKey &&
          Math.abs(er.value - newRes.value) < 0.05
      );
      if (match) {
        matchCount++;
      }
    }

    // Overlap of 50% or more on the same test date indicates duplicate
    const overlapRatio = matchCount / Math.min(newResults.length, existingResults.length);
    if (overlapRatio >= 0.5) {
      return {
        isDuplicate: true,
        duplicateReportName: existingReport.fileName,
      };
    }
  }

  return { isDuplicate: false };
}
