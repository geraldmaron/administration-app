// Each commodity's founding price anchors: `seed/price-anchors.tsv`, cell for
// cell. The kind column keeps a measurement apart from a forecast, because an
// opening level read off a forecast is a planning value and must say so.
// prettier-ignore
export const PRICE_ANCHORS = [
    { commodity: "crude", series: "Brent spot, annual average", period: "2025", value: 69, unit: "usd_per_barrel", kind: "historical", source: "EIA-STEO-2026-09", opened: "2026-09-24" },
    { commodity: "crude", series: "Brent spot, monthly average", period: "2026-08", value: 91, unit: "usd_per_barrel", kind: "historical", source: "EIA-STEO-2026-09", opened: "2026-09-24" },
    { commodity: "crude", series: "Brent spot, annual average", period: "2026", value: 91, unit: "usd_per_barrel", kind: "forecast", source: "EIA-STEO-2026-09", opened: "2026-09-24" },
    { commodity: "crude", series: "Brent spot, annual average", period: "2027", value: 74, unit: "usd_per_barrel", kind: "forecast", source: "EIA-STEO-2026-09", opened: "2026-09-24" },
    { commodity: "gasoline", series: "US regular retail, annual average", period: "2025", value: 3.10, unit: "usd_per_gallon", kind: "historical", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
    { commodity: "gasoline", series: "US regular retail, monthly", period: "2026-05", value: 4.48, unit: "usd_per_gallon", kind: "historical", source: "EIA-GASDIESEL", opened: "2026-09-24" },
    { commodity: "wheat", series: "US season-average farm price", period: "2024/25", value: 5.52, unit: "usd_per_bushel", kind: "historical", source: "USDA-WASDE-675", opened: "2026-09-24" },
    { commodity: "wheat", series: "US season-average farm price", period: "2025/26", value: 5.06, unit: "usd_per_bushel", kind: "estimate", source: "USDA-WASDE-675", opened: "2026-09-24" },
    { commodity: "wheat", series: "US season-average farm price", period: "2026/27", value: 6.40, unit: "usd_per_bushel", kind: "projection", source: "USDA-WASDE-675", opened: "2026-09-24" },
    { commodity: "corn", series: "US season-average farm price", period: "2024/25", value: 4.24, unit: "usd_per_bushel", kind: "historical", source: "USDA-WASDE-675", opened: "2026-09-24" },
    { commodity: "corn", series: "US season-average farm price", period: "2025/26", value: 4.15, unit: "usd_per_bushel", kind: "estimate", source: "USDA-WASDE-675", opened: "2026-09-24" },
    { commodity: "corn", series: "US season-average farm price", period: "2026/27", value: 4.80, unit: "usd_per_bushel", kind: "projection", source: "USDA-WASDE-675", opened: "2026-09-24" },
    { commodity: "soybeans", series: "US season-average farm price", period: "2024/25", value: 10.00, unit: "usd_per_bushel", kind: "historical", source: "USDA-WASDE-675", opened: "2026-09-24" },
    { commodity: "soybeans", series: "US season-average farm price", period: "2026/27", value: 12.00, unit: "usd_per_bushel", kind: "projection", source: "USDA-WASDE-675", opened: "2026-09-24" },
];
