/**
 * Formats a date string (YYYY-MM-DD or ISO) into a clean, human-readable date.
 * Example: "2024-04-15" -> "15 Apr 2024"
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";

  try {
    // If format is YYYY-MM-DD, parse parts directly to avoid UTC timezone offset shifts
    const parts = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (parts) {
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      const day = parseInt(parts[3], 10);

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      return `${day} ${months[month] || ""} ${year}`.trim();
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
