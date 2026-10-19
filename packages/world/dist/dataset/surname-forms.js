/** Iceland, whose second name is built on the father's and agrees with the child's sex. */
const ICELAND = "ISL";
// --- Surnames that agree with the person carrying them ---------------------
/**
 * A man's surname as a woman of the same family carries it.
 *
 * The banks hold the masculine form only, so without this every woman in
 * Moscow was an Ivanov and every woman in Warsaw a Kowalski. Each rule is the
 * standard morphology of its language, applied to the ending; a surname whose
 * ending the language does not inflect (Shevchenko, Nowak, Georgiou) comes
 * back unchanged, which is also what the language does.
 */
const RUSSIFIED = (surname) => {
    if (/(ov|ev|in|yn)$/.test(surname))
        return `${surname}a`;
    if (/sk(iy|ii|y)$/.test(surname))
        return surname.replace(/sk(iy|ii|y)$/, "skaya");
    return surname;
};
const SOUTH_SLAVIC = (surname) => {
    if (/(ov|ev)$/.test(surname))
        return `${surname}a`;
    if (/sk[iy]$/.test(surname))
        return surname.replace(/sk[iy]$/, "ska");
    return surname;
};
const POLISH = (surname) => (/(sk|ck|dzk)i$/.test(surname) ? `${surname.slice(0, -1)}a` : surname);
/** Czech and Slovak: -ý becomes -á, a vowel ending gives way to -ová, the fleeting e of -ek and -ec drops. */
const CZECH_SLOVAK_KEEPS_E = new Set(["Kadlec", "Švec"]);
/** The soft consonant a fleeting ě leaves behind: Vaněk, Vaňková. */
const CZECH_SOFT = { n: "ň", d: "ď", t: "ť" };
const CZECH_SLOVAK = (surname) => {
    if (surname.endsWith("ý"))
        return `${surname.slice(0, -1)}á`;
    if (surname.endsWith("í"))
        return surname;
    if (/[ao]$/.test(surname))
        return `${surname.slice(0, -1)}ová`;
    if (/[ndt]ěk$/.test(surname))
        return `${surname.slice(0, -3)}${CZECH_SOFT[surname.at(-3)]}ková`;
    if (surname.endsWith("ek"))
        return `${surname.slice(0, -2)}ková`;
    if (surname.endsWith("ec") && !CZECH_SLOVAK_KEEPS_E.has(surname))
        return `${surname.slice(0, -2)}cová`;
    if (surname.endsWith("el"))
        return `${surname.slice(0, -2)}lová`;
    return `${surname}ová`;
};
/** Lithuanian: the married form, -ienė, which is what most women in public life carry. */
const LITHUANIAN = (surname) => {
    if (surname.endsWith("ius"))
        return `${surname.slice(0, -3)}ienė`;
    if (/(as|is|ys|us)$/.test(surname))
        return `${surname.slice(0, -2)}ienė`;
    if (/[aė]$/.test(surname))
        return `${surname.slice(0, -1)}ienė`;
    return surname;
};
const LATVIAN = (surname) => {
    if (/(ov|ev|in)$/.test(surname))
        return `${surname}a`;
    if (surname.endsWith("ons"))
        return `${surname.slice(0, -1)}e`;
    if (surname.endsWith("is"))
        return `${surname.slice(0, -2)}e`;
    if (/[sš]$/.test(surname))
        return `${surname.slice(0, -1)}a`;
    return surname;
};
/** Greek: the genitive of the father's surname, -ou, -i, -a; Cypriot -ides becomes -idou. */
const GREEK = (surname) => {
    if (surname.endsWith("ides"))
        return `${surname.slice(0, -4)}idou`;
    if (surname.endsWith("os"))
        return `${surname.slice(0, -2)}ou`;
    if (/(is|as)$/.test(surname))
        return surname.slice(0, -1);
    return surname;
};
/** Ukrainian: -enko, -uk and -ets never inflect; -skyi becomes -ska, -yi -a, and -ov and -yn take -a. */
const UKRAINIAN = (surname) => {
    if (/(?:enko|uk|ko|ets|yk|ar|ak|ub|ur|oz)$/.test(surname))
        return surname;
    if (surname.endsWith("skyi"))
        return `${surname.slice(0, -4)}ska`;
    if (surname.endsWith("yi"))
        return `${surname.slice(0, -2)}a`;
    if (/(?:ov|ev|in|yn)$/.test(surname))
        return `${surname}a`;
    return surname;
};
/** Turkmen writes the Russian -ov as -ow, and a woman's as -owa. */
const TURKMEN = (surname) => (/(?:ow|ew)$/.test(surname) ? `${surname}a` : RUSSIFIED(surname));
const FEMININE_SURNAME = {
    "slavic-east": RUSSIFIED,
    russian: RUSSIFIED,
    ukrainian: UKRAINIAN,
    kazakh: RUSSIFIED,
    uzbek: RUSSIFIED,
    kyrgyz: RUSSIFIED,
    tajik: RUSSIFIED,
    turkmen: TURKMEN,
    azerbaijani: RUSSIFIED,
    bulgarian: SOUTH_SLAVIC,
    macedonian: SOUTH_SLAVIC,
    polish: POLISH,
    "czech-slovak": CZECH_SLOVAK,
    lithuanian: LITHUANIAN,
    latvian: LATVIAN,
    greek: GREEK,
};
/** Whether a culture writes a woman's surname differently from a man's. */
export function hasGenderedSurnames(nation, culture) {
    return nation === ICELAND || FEMININE_SURNAME[culture] !== undefined;
}
/**
 * The surname a person carries, from the form the bank holds: a feminine
 * inflection for a woman where the language has one, and in Iceland the
 * patronymic built on the father's name.
 */
export function surnameFor(nation, culture, drawn, gender) {
    if (nation === ICELAND)
        return `${drawn}${gender === "feminine" ? "dóttir" : "son"}`;
    if (gender !== "feminine")
        return drawn;
    return FEMININE_SURNAME[culture]?.(drawn) ?? drawn;
}
