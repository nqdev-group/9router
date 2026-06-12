/**
 * Mask string by keeping half and replacing half with stars
 * @param {string} str 
 * @returns {string}
 */
export function maskString(str) {
  if (!str || typeof str !== 'string') return str;
  if (str.length <= 1) return '*'.repeat(str.length);
  
  const maskLen = Math.ceil(str.length / 2);
  const keepLen = str.length - maskLen;
  
  return str.substring(0, keepLen) + '*'.repeat(maskLen);
}
