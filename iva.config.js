/**
 * Sevenda — Configurazione IVA (VAT) per paese e tipo fiscale
 *
 * Modello fiscale:
 *  - Italia: aliquota varia in base al tipo fiscale (PA = 0%, altri = 22%)
 *  - UE (MOSS): aliquota standard del paese di residenza del cliente
 *  - Extra-UE: 0% (operazione non imponibile)
 *
 * Aggiornamento aliquote: modificare i valori sotto e committare su git
 * (il commit message tiene traccia della data di efficacia — audit trail).
 *
 * Ultimo aggiornamento: 2026-06-09
 */

const SEVENDA_IVA = {

  /* ── Tipi fiscali Italia ─────────────────────────────────────
     PA esente (split payment / esenzione); tutti gli altri 22%.
     Nota: il regime forfettario (4-5%) NON è gestito qui — i clienti
     in regime agevolato lo gestiscono in fase di fatturazione. */
  italyTaxTypes: {
    pa:               { rate: 0.00, labelKey: 'iva.tax.pa',     labelEn: 'Public Administration' },
    ditta:            { rate: 0.22, labelKey: 'iva.tax.ditta',  labelEn: 'Sole Proprietorship' },
    azienda:          { rate: 0.22, labelKey: 'iva.tax.azienda',labelEn: 'Company (SRL/SpA)' },
    libProfessionista:{ rate: 0.22, labelKey: 'iva.tax.libpro', labelEn: 'Freelance' },
    startupPMI:       { rate: 0.22, labelKey: 'iva.tax.startup',labelEn: 'Startup / SME' },
  },

  /* ── Paesi UE (regime MOSS) — aliquota standard ──────────────
     Fonte: aliquote IVA standard UE vigenti. */
  euCountries: {
    IT: { name: 'Italia',       rate: 0.22, flag: '🇮🇹' },
    DE: { name: 'Deutschland',  rate: 0.19, flag: '🇩🇪' },
    FR: { name: 'France',       rate: 0.20, flag: '🇫🇷' },
    ES: { name: 'España',       rate: 0.21, flag: '🇪🇸' },
    PT: { name: 'Portugal',     rate: 0.23, flag: '🇵🇹' },
    NL: { name: 'Nederland',    rate: 0.21, flag: '🇳🇱' },
    BE: { name: 'België',       rate: 0.21, flag: '🇧🇪' },
    AT: { name: 'Österreich',   rate: 0.20, flag: '🇦🇹' },
    IE: { name: 'Ireland',      rate: 0.23, flag: '🇮🇪' },
    FI: { name: 'Suomi',        rate: 0.255,flag: '🇫🇮' },
    GR: { name: 'Ελλάδα',       rate: 0.24, flag: '🇬🇷' },
    PL: { name: 'Polska',       rate: 0.23, flag: '🇵🇱' },
    SE: { name: 'Sverige',      rate: 0.25, flag: '🇸🇪' },
    DK: { name: 'Danmark',      rate: 0.25, flag: '🇩🇰' },
    LU: { name: 'Luxembourg',   rate: 0.17, flag: '🇱🇺' },
  },

  /* ── Paesi Extra-UE (operazione non imponibile, 0%) ─────────── */
  thirdCountries: {
    GB: { name: 'United Kingdom', rate: 0.00, flag: '🇬🇧' },
    US: { name: 'United States',  rate: 0.00, flag: '🇺🇸' },
    CH: { name: 'Switzerland',    rate: 0.00, flag: '🇨🇭' },
    OTHER: { name: 'Other (non-EU)', rate: 0.00, flag: '🌍' },
  },

  /* Paese di default se l'utente non ha mai selezionato */
  defaultCountry: 'IT',
  defaultItalyTaxType: 'ditta',
};

/* ─── HELPER FUNCTIONS ───────────────────────────────────────── */

/**
 * Restituisce l'aliquota IVA effettiva per paese + tipo fiscale.
 * @param {string} countryCode - codice ISO2 (es. "IT", "DE")
 * @param {string} [italyTaxType] - tipo fiscale (solo se IT): pa|ditta|azienda|libProfessionista|startupPMI
 * @returns {number} aliquota decimale (es. 0.22)
 */
function getVatRate(countryCode, italyTaxType) {
  if (countryCode === 'IT') {
    const t = SEVENDA_IVA.italyTaxTypes[italyTaxType || SEVENDA_IVA.defaultItalyTaxType];
    return t ? t.rate : 0.22;
  }
  if (SEVENDA_IVA.euCountries[countryCode]) {
    return SEVENDA_IVA.euCountries[countryCode].rate;
  }
  if (SEVENDA_IVA.thirdCountries[countryCode]) {
    return SEVENDA_IVA.thirdCountries[countryCode].rate;
  }
  // fallback: aliquota Italia standard
  return 0.22;
}

/**
 * Calcola il breakdown prezzo netto / IVA / lordo.
 * @param {number} priceNet - prezzo netto
 * @param {number} vatRate - aliquota decimale
 * @returns {{net:number, vat:number, gross:number, rate:number}}
 */
function calcVat(priceNet, vatRate) {
  const net   = Math.round(priceNet * 100) / 100;
  const vat   = Math.round(priceNet * vatRate * 100) / 100;
  const gross = Math.round((net + vat) * 100) / 100;
  return { net, vat, gross, rate: vatRate };
}

/**
 * Formatta un numero come prezzo (2 decimali se necessario, altrimenti intero).
 * @param {number} amount
 * @returns {string}
 */
function fmtPrice(amount) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

/**
 * Etichetta leggibile della fonte IVA (per tooltip).
 * @param {string} countryCode
 * @param {string} [italyTaxType]
 * @returns {string}
 */
function getVatLabel(countryCode, italyTaxType) {
  const rate = getVatRate(countryCode, italyTaxType);
  const pct  = (rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1);
  if (countryCode === 'IT') {
    const t = SEVENDA_IVA.italyTaxTypes[italyTaxType || SEVENDA_IVA.defaultItalyTaxType];
    if (rate === 0) return `IVA Italia 0% — ${t ? t.labelEn : 'PA'} (esente)`;
    return `IVA Italia ${pct}% — ${t ? t.labelEn : ''}`;
  }
  if (SEVENDA_IVA.euCountries[countryCode]) {
    return `VAT ${SEVENDA_IVA.euCountries[countryCode].name} ${pct}% (EU MOSS)`;
  }
  if (SEVENDA_IVA.thirdCountries[countryCode]) {
    return `No VAT 0% — non-EU (reverse charge / out of scope)`;
  }
  return `VAT ${pct}%`;
}

/** Lista completa paesi per il dropdown (UE + extra-UE). */
function getAllCountries() {
  const out = [];
  Object.keys(SEVENDA_IVA.euCountries).forEach(code => {
    out.push({ code, ...SEVENDA_IVA.euCountries[code], group: 'EU' });
  });
  Object.keys(SEVENDA_IVA.thirdCountries).forEach(code => {
    out.push({ code, ...SEVENDA_IVA.thirdCountries[code], group: 'Other' });
  });
  return out;
}
