/**
 * Checks if localStorage is available and working.
 * Returns false in private browsing mode or when storage quota is exceeded.
 */
export function checkLocalStorage(): boolean {
  try {
    const testKey = '__localStorage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    return true
  } catch (error) {
    console.error('localStorage is not available:', error)
    return false
  }
}
