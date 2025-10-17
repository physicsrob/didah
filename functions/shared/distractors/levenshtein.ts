/**
 * Levenshtein Distance Implementation
 *
 * Computes the edit distance between two strings (number of single-character edits needed
 * to transform one string into another). Implemented from scratch for morse pattern similarity.
 */

/**
 * Calculate the Levenshtein distance between two strings.
 *
 * Uses dynamic programming with a 2D matrix approach:
 * - Rows represent characters of string1
 * - Columns represent characters of string2
 * - Each cell [i,j] contains the minimum edits needed to transform
 *   the first i characters of string1 into the first j characters of string2
 *
 * Returns the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change string1 into string2.
 *
 * Lower scores indicate more similar strings.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array (len1+1) x (len2+1)
  // matrix[i][j] will hold the Levenshtein distance between
  // the first i characters of str1 and the first j characters of str2
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column (transforming from empty string to str1 prefixes)
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }

  // Initialize first row (transforming from empty string to str2 prefixes)
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      // If characters match, no edit needed - copy diagonal value
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // Characters don't match - take minimum of three operations:
        // 1. Substitution: matrix[i-1][j-1] + 1
        // 2. Deletion: matrix[i-1][j] + 1
        // 3. Insertion: matrix[i][j-1] + 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1], // Substitution
          matrix[i - 1][j],     // Deletion
          matrix[i][j - 1]      // Insertion
        ) + 1;
      }
    }
  }

  // Bottom-right cell contains the final edit distance
  return matrix[len1][len2];
}
