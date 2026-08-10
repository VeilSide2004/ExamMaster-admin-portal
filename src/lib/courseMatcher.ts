/**
 * Helper to get all course IDs that belong to the same exam track (e.g. NEET, JEE, 10th).
 * This ensures that mock tests, questions, or DPPs created under equivalent courses
 * are accessible to students enrolled in that track.
 */
export function getEquivalentCourseIds(lockedCourseId: string, courses: any[]): string[] {
  if (!lockedCourseId) return [];

  const targetCourse = (courses || []).find(
    (c) => String(c._id) === String(lockedCourseId) || String(c.id) === String(lockedCourseId) || c.name === lockedCourseId
  );

  const matchedIds = new Set<string>();
  const initialIdStr = String(lockedCourseId);
  matchedIds.add(initialIdStr);

  if (targetCourse && targetCourse._id) {
    matchedIds.add(String(targetCourse._id));
  }

  const targetName = (targetCourse?.name || initialIdStr).toLowerCase().trim();

  (courses || []).forEach((c) => {
    const cName = (c.name || '').toLowerCase().trim();
    const cId = String(c._id || c.id);

    const isSchoolTarget = targetName.includes('class') || targetName.includes('school') || targetName.includes('board') || /^\d+(th|st|nd|rd)?$/.test(targetName);
    const isSchoolC = cName.includes('class') || cName.includes('school') || cName.includes('board') || /^\d+(th|st|nd|rd)?$/.test(cName);

    // Extract grade numbers if present (e.g. "class 10" -> "10", "10th" -> "10")
    const getGrade = (str: string) => {
      const match = str.match(/class\s*(\d+)/i) || str.match(/grade\s*(\d+)/i) || str.match(/(\d+)(th|st|nd|rd)/i) || str.match(/^(\d+)$/);
      return match ? match[1] : null;
    };

    const targetGrade = getGrade(targetName);
    const cGrade = getGrade(cName);

    if (
      cName === targetName ||
      (targetName.includes('neet') && cName.includes('neet')) ||
      (targetName.includes('jee') && cName.includes('jee')) ||
      (targetGrade && cGrade && targetGrade === cGrade) ||
      (isSchoolTarget && isSchoolC && !targetGrade && !cGrade)
    ) {
      matchedIds.add(cId);
    }
  });

  return Array.from(matchedIds);
}
