// How Congress writes its own numbers: the introduced print says "121st", the enrolled print spells it out.

const ONES = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth"];
const TEENS = ["Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const TENS_TH = ["", "", "Twentieth", "Thirtieth", "Fortieth", "Fiftieth", "Sixtieth", "Seventieth", "Eightieth", "Ninetieth"];

/** 121 as an enrolled bill writes it: "One Hundred Twenty-first". */
export function congressOrdinalWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds > 0 ? `One Hundred${rest === 0 ? "th" : ""}` : "";
  if (rest === 0) return head;
  const tens = Math.floor(rest / 10);
  const ones = rest % 10;
  const tail = rest < 10 ? ONES[rest]! : rest < 20 ? TEENS[rest - 10]! : ones === 0 ? TENS_TH[tens]! : `${TENS[tens]}-${ONES[ones]!.toLowerCase()}`;
  return head ? `${head} ${tail}` : tail;
}

/** 121 as an introduced print writes it: "121st". */
export function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

const SMALL = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS_WORD = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SMALL_TH = ["zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth"];
const TENS_ORD = ["", "", "twentieth", "thirtieth", "fortieth", "fiftieth", "sixtieth", "seventieth", "eightieth", "ninetieth"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function underHundred(n: number, ordinal: boolean): string {
  if (n < 20) return (ordinal ? SMALL_TH : SMALL)[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return (ordinal ? TENS_ORD : TENS_WORD)[tens]!;
  return `${TENS_WORD[tens]}-${(ordinal ? SMALL_TH : SMALL)[ones]}`;
}

/** A whole number below ten thousand in words, cardinal or ordinal: 2029 "two thousand twenty-nine", 253 "two hundred fifty-third". */
export function numberWords(n: number, ordinal = false): string {
  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  const parts = [thousands > 0 ? `${SMALL[thousands]} thousand` : "", hundreds > 0 ? `${SMALL[hundreds]} hundred` : "", rest > 0 ? underHundred(rest, ordinal) : ""].filter(Boolean);
  const words = parts.join(" ");
  return ordinal && rest === 0 ? `${words}th` : words;
}

/**
 * A proclamation's witness date: "twentieth day of January, in the year of our
 * Lord two thousand twenty-nine, and of the Independence of the United States
 * of America the two hundred fifty-third". Proclamations count Independence
 * by the calendar year, 1776 as the first.
 */
export function witnessDate(date: { readonly year: number; readonly month: number; readonly day: number }): string {
  return `${numberWords(date.day, true)} day of ${MONTHS[date.month - 1]}, in the year of our Lord ${numberWords(date.year)}, and of the Independence of the United States of America the ${numberWords(date.year - 1776, true)}`;
}
