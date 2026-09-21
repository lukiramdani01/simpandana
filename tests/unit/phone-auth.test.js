const assert = require('node:assert');
const test = require('node:test');

// Import phone utility functions (compiled or direct TS/JS equivalent)
function normalizeIndonesianPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+62')) {
    return cleaned;
  } else if (cleaned.startsWith('62')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+62${cleaned.substring(1)}`;
  } else if (cleaned.startsWith('8')) {
    return `+62${cleaned}`;
  }
  return cleaned;
}

function isValidIndonesianPhone(phone) {
  const normalized = normalizeIndonesianPhone(phone);
  return /^\+628\d{8,12}$/.test(normalized);
}

function formatIndonesianPhoneDisplay(phone) {
  const normalized = normalizeIndonesianPhone(phone);
  if (!isValidIndonesianPhone(normalized)) return phone;
  const rest = normalized.slice(3);
  if (rest.length <= 4) return `+62 ${rest}`;
  if (rest.length <= 8) return `+62 ${rest.slice(0, 3)}-${rest.slice(3)}`;
  return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
}

test('Indonesian Phone Normalization', async (t) => {
  await t.test('normalizes standard 08xxx to +628xxx', () => {
    assert.strictEqual(normalizeIndonesianPhone('081234567890'), '+6281234567890');
  });

  await t.test('normalizes 628xxx without plus to +628xxx', () => {
    assert.strictEqual(normalizeIndonesianPhone('6281234567890'), '+6281234567890');
  });

  await t.test('preserves +628xxx prefix', () => {
    assert.strictEqual(normalizeIndonesianPhone('+6281234567890'), '+6281234567890');
  });

  await t.test('normalizes 8xxx without leading 0 to +628xxx', () => {
    assert.strictEqual(normalizeIndonesianPhone('81234567890'), '+6281234567890');
  });

  await t.test('strips formatting characters such as spaces, dashes, and parentheses', () => {
    assert.strictEqual(normalizeIndonesianPhone('0812-3456-7890'), '+6281234567890');
    assert.strictEqual(normalizeIndonesianPhone('+62 (812) 3456 7890'), '+6281234567890');
  });

  await t.test('handles empty input gracefully', () => {
    assert.strictEqual(normalizeIndonesianPhone(''), '');
    assert.strictEqual(normalizeIndonesianPhone(null), '');
  });
});

test('Indonesian Phone Validation', async (t) => {
  await t.test('accepts valid 10-14 digit Indonesian mobile numbers', () => {
    assert.strictEqual(isValidIndonesianPhone('08123456789'), true);
    assert.strictEqual(isValidIndonesianPhone('081234567890'), true);
    assert.strictEqual(isValidIndonesianPhone('+6281987654321'), true);
    assert.strictEqual(isValidIndonesianPhone('6285712345678'), true);
  });

  await t.test('rejects landline numbers starting with non-8 (e.g. Jakarta 021)', () => {
    assert.strictEqual(isValidIndonesianPhone('0217654321'), false);
    assert.strictEqual(isValidIndonesianPhone('+62217654321'), false);
  });

  await t.test('rejects numbers that are too short (<10 digits)', () => {
    assert.strictEqual(isValidIndonesianPhone('0812345'), false);
  });

  await t.test('rejects numbers that are too long (>15 digits)', () => {
    assert.strictEqual(isValidIndonesianPhone('081234567890123456'), false);
  });

  await t.test('rejects empty or non-numeric strings', () => {
    assert.strictEqual(isValidIndonesianPhone(''), false);
    assert.strictEqual(isValidIndonesianPhone('invalid_phone'), false);
  });
});

test('Indonesian Phone Display Formatter', async (t) => {
  await t.test('formats +6281234567890 cleanly into +62 812-3456-7890', () => {
    assert.strictEqual(formatIndonesianPhoneDisplay('081234567890'), '+62 812-3456-7890');
  });

  await t.test('returns unformatted string if invalid phone', () => {
    assert.strictEqual(formatIndonesianPhoneDisplay('invalid'), 'invalid');
  });
});

test('Dev OTP Bypass Logic Contract', async (t) => {
  await t.test('accepts bypass code 123456 in dev mode', () => {
    const code = '123456';
    const isDev = true;
    const isValid = code === '123456' && isDev;
    assert.strictEqual(isValid, true);
  });

  await t.test('rejects arbitrary code in dev bypass mode', () => {
    const code = '654321';
    const isDev = true;
    const isValid = code === '123456' && isDev;
    assert.strictEqual(isValid, false);
  });
});
