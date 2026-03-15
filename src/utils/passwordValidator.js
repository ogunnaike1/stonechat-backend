/**
 * passwordValidator.js
 * Works in Node.js (require) AND as a browser module (import/copy-paste).
 *
 * Rules:
 *  1. Min 8 characters
 *  2. Max 128 characters
 *  3. At least 1 uppercase letter
 *  4. At least 1 lowercase letter
 *  5. At least 1 digit
 *  6. At least 1 special character  (!@#$%^&*...)
 *  7. No whitespace allowed
 */

const PASSWORD_RULES = [
  {
    id: "minLength",
    label: "At least 8 characters",
    test: (pw) => pw.length >= 8,
  },
  {
    id: "maxLength",
    label: "No more than 128 characters",
    test: (pw) => pw.length <= 128,
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter (A–Z)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter (a–z)",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: "digit",
    label: "At least one number (0–9)",
    test: (pw) => /[0-9]/.test(pw),
  },
  {
    id: "special",
    label: "At least one special character (!@#$%^&*…)",
    test: (pw) => /[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(pw),
  },
  {
    id: "noSpaces",
    label: "No spaces allowed",
    test: (pw) => !/\s/.test(pw),
  },
];

/**
 * Returns an array of failed rule objects.
 * Empty array = password is valid.
 *
 * @param {string} password
 * @returns {{ id: string, label: string }[]}
 */
function getPasswordErrors(password) {
  if (typeof password !== "string") return PASSWORD_RULES.map(({ id, label }) => ({ id, label }));
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map(({ id, label }) => ({ id, label }));
}

/**
 * Returns true if password passes all rules.
 * @param {string} password
 * @returns {boolean}
 */
function isPasswordValid(password) {
  return getPasswordErrors(password).length === 0;
}

/**
 * Returns a score 0–4 for use in a strength meter.
 *   0 = very weak / empty
 *   1 = weak
 *   2 = fair
 *   3 = strong
 *   4 = very strong (all rules pass)
 *
 * @param {string} password
 * @returns {0|1|2|3|4}
 */
function getPasswordStrength(password) {
  if (!password) return 0;
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return 0;
  if (passed <= 3) return 1;
  if (passed <= 4) return 2;
  if (passed <= 6) return 3;
  return 4;
}

const STRENGTH_LABELS = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
const STRENGTH_COLORS = ["#ff4d6a", "#ff7c3a", "#f5c400", "#00d9f5", "#00f5a0"];

module.exports = {
  PASSWORD_RULES,
  getPasswordErrors,
  isPasswordValid,
  getPasswordStrength,
  STRENGTH_LABELS,
  STRENGTH_COLORS,
};
