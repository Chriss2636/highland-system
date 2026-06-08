// Display format: 1,000,000
export const formatCurrency = (amount: number | string) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const formatTZS = (amount: number | string) => `TZS ${formatCurrency(amount)}`;

// Input Masking logic: 1000 -> 1,000
export const maskTZS = (val: string) => {
  const nums = val.replace(/\D/g, ""); // Remove non-digits
  return nums.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Clean for Database: 1,000 -> 1000
export const cleanTZS = (val: string | number) => {
  if (typeof val === 'number') return val;
  // This removes commas and any other non-numeric characters except decimals
  const cleaned = val.replace(/,/g, "");
  return parseFloat(cleaned) || 0;
};

export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  if (num === 0) return 'Zero';

  const parts = [];
  let scaleIndex = 0;

  while (num > 0) {
    const remainder = num % 1000;
    if (remainder !== 0) {
      parts.unshift(convertHundreds(remainder, ones, teens, tens) + (scaleIndex > 0 ? ' ' + scales[scaleIndex] : ''));
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }

  return parts.join(' ').trim();
};

export const formatNidaInput = (value: string) => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 20);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, Math.min(8, digits.length)));
  if (digits.length > 8) parts.push(digits.slice(8, Math.min(13, digits.length)));
  if (digits.length > 13) parts.push(digits.slice(13, Math.min(18, digits.length)));
  if (digits.length > 18) parts.push(digits.slice(18, digits.length));
  return parts.join('-');
};

const convertHundreds = (num: number, ones: string[], teens: string[], tens: string[]): string => {
  let result = '';

  const hundreds = Math.floor(num / 100);
  if (hundreds > 0) {
    result += ones[hundreds] + ' Hundred';
  }

  const remainder = num % 100;
  if (remainder >= 20) {
    if (result) result += ' ';
    result += tens[Math.floor(remainder / 10)];
    const onesDigit = remainder % 10;
    if (onesDigit > 0) {
      result += ' ' + ones[onesDigit];
    }
  } else if (remainder >= 10) {
    if (result) result += ' ';
    result += teens[remainder - 10];
  } else if (remainder > 0) {
    if (result) result += ' ';
    result += ones[remainder];
  }

  return result;
};

export { usePermissions } from '../hooks/permissions';