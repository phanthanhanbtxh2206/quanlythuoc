/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(threeDigits: number, showZeroHundred: boolean): string {
  const hundred = Math.floor(threeDigits / 100);
  const ten = Math.floor((threeDigits % 100) / 10);
  const unit = threeDigits % 10;
  let result = '';

  if (hundred > 0 || showZeroHundred) {
    result += DIGITS[hundred] + ' trăm ';
  }

  if (ten > 1) {
    result += DIGITS[ten] + ' mươi ';
    if (unit === 1) {
      result += 'mốt ';
    } else if (unit === 4) {
      result += 'tư ';
    } else if (unit === 5) {
      result += 'lăm ';
    } else if (unit > 0) {
      result += DIGITS[unit] + ' ';
    }
  } else if (ten === 1) {
    result += 'mười ';
    if (unit === 1) {
      result += 'một ';
    } else if (unit === 4) {
      result += 'bốn ';
    } else if (unit === 5) {
      result += 'lăm ';
    } else if (unit > 0) {
      result += DIGITS[unit] + ' ';
    }
  } else if (ten === 0 && unit > 0) {
    if (hundred > 0 || showZeroHundred) {
      result += 'lẻ ';
    }
    result += DIGITS[unit] + ' ';
  }

  return result.trim();
}

/**
 * Chuyển đổi số tiền thành chữ tiếng Việt chuẩn kế toán
 * Ví dụ: 1250000 -> "Một triệu hai trăm năm mươi nghìn đồng chẵn"
 */
function convertPositiveInteger(num: number): string {
  if (num === 0) return 'không';
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups: number[] = [];
  let temp = num;

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showZeroHundred = i < groups.length - 1;
      const readGroup = readThreeDigits(groupVal, showZeroHundred);
      words += readGroup + ' ' + scales[i] + ' ';
    }
  }
  return words.trim();
}

/**
 * Chuyển đổi số tiền thành chữ tiếng Việt chuẩn kế toán
 * Hỗ trợ cả số nguyên và số có phần thập phân (không bị ép làm tròn mất số lẻ)
 */
export function numberToVietnameseWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Không đồng chẵn';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return 'Không đồng chẵn';
  }

  let words = '';
  if (integerPart > 0) {
    words = convertPositiveInteger(integerPart);
  } else {
    words = 'Không';
  }

  words = words.charAt(0).toUpperCase() + words.slice(1);

  if (decimalPart > 0) {
    const decWords = convertPositiveInteger(decimalPart).toLowerCase();
    words += ` đồng và ${decWords} xu`;
  } else {
    words += ' đồng chẵn';
  }

  return isNegative ? 'Âm ' + words.toLowerCase() : words;
}
