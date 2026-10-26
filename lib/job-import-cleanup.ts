/**
 * A CSV import writes a job and its location records through separate Data API
 * requests. If any later write fails, remove the unpublished job and its
 * ON DELETE CASCADE coverage rows rather than leaving a partial review item.
 *
 * This helper does not delete employer-owned regions, which may be shared.
 */
export async function persistImportedJobDetails<T>(
  jobId: string,
  persistDetails: () => Promise<T>,
  removeIncompleteJob: (jobId: string) => Promise<boolean>,
): Promise<T> {
  try {
    return await persistDetails();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not save job locations";
    let removed = false;
    try {
      removed = await removeIncompleteJob(jobId);
    } catch {
      // Never report successful cleanup if the database request threw.
    }
    if (!removed) {
      throw new Error(`${reason}. Incomplete pending job ${jobId} could not be confirmed removed; manual review required.`);
    }
    throw new Error(`${reason}. The incomplete pending job was removed.`);
  }
}
