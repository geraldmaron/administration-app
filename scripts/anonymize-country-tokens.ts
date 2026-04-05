/**
 * Anonymize Country Tokens — removes real person names and stale hardcoded amounts.
 *
 * Usage:
 *   npx tsx scripts/anonymize-country-tokens.ts --dry-run  # preview
 *   npx tsx scripts/anonymize-country-tokens.ts --write    # commit
 *
 * Changes:
 *   1. Clears hardcoded amount strings: gdp_description, aid_amount, disaster_cost,
 *      graft_amount, infrastructure_cost, military_budget_amount, sanctions_amount,
 *      trade_value — these are now computed dynamically by country-token-derivation.ts
 *   2. Replaces real person names with fictional names in:
 *        governing_party_leader, opposition_party_leader
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, DocumentReference } from 'firebase-admin/firestore';

const WRITE = process.argv.includes('--write');
const DRY_RUN = !WRITE;

if (DRY_RUN) console.log('[DRY RUN] No changes will be written.\n');

initializeApp();
const db = getFirestore();

// ── Fictional name generators by region/language ───────────────────────────

function firstName(lang: string): string {
  const names: Record<string, string[]> = {
    latin: ['Alejo', 'Bruno', 'Celia', 'Diego', 'Elena', 'Felipe', 'Gabriela', 'Hugo', 'Isabel', 'Javier', 'Lucía', 'Mateo', 'Nadia', 'Óscar', 'Paula', 'Rafael', 'Sofía', 'Tomás', 'Valentina', 'Zacarías'],
    slavic: ['Aleksei', 'Bogdan', 'Cyril', 'Daria', 'Evgeny', 'Fedor', 'Galina', 'Ivan', 'Katya', 'Leonid', 'Mila', 'Nikolai', 'Oksana', 'Pavel', 'Rada', 'Sergei', 'Tatiana', 'Viktor', 'Yana', 'Zoya'],
    germanic: ['Adelheid', 'Bertram', 'Claus', 'Dirk', 'Elke', 'Friedrich', 'Greta', 'Hans', 'Ingrid', 'Jürgen', 'Klaus', 'Liesel', 'Martin', 'Nora', 'Otto', 'Petra', 'Rolf', 'Sigrid', 'Ursula', 'Werner'],
    east_asian: ['Jin-ho', 'Min-soo', 'Seo-yeon', 'Ji-yeon', 'Hyun-woo', 'Soo-kyung', 'Dae-jung', 'Eun-ji', 'Kwang-ho', 'Yoon-ah', 'Kenji', 'Yuki', 'Hana', 'Ryo', 'Akiko', 'Takeshi', 'Mei-ling', 'Wei', 'Lin', 'Ming'],
    south_asian: ['Arjun', 'Priya', 'Ravi', 'Ananya', 'Vikram', 'Diya', 'Sanjay', 'Meera', 'Kiran', 'Nisha', 'Ashok', 'Lakshmi', 'Rahul', 'Sita', 'Vijay', 'Kavita', 'Nandan', 'Gauri', 'Aarav', 'Advait', 'Aisha', 'Amara', 'Arnav', 'Devi', 'Divya', 'Faizan', 'Harsha', 'Ishan'],
    arabic: ['Ahmed', 'Fatima', 'Khaled', 'Layla', 'Omar', 'Yasmin', 'Tariq', 'Nadia', 'Rashid', 'Samira', 'Faris', 'Hana', 'Ziad', 'Rima', 'Bakr', 'Salma'],
    romance: ['Marco', 'Giulia', 'Luca', 'Sofia', 'Francesco', 'Elena', 'Alessandro', 'Valentina', 'Paolo', 'Chiara', 'Carlos', 'María', 'Juan', 'Carmen', 'Luis', 'Isabella', 'Pedro', 'Lucía', 'Fernando', 'Elena'],
    nordic: ['Astrid', 'Björn', 'Dagny', 'Erik', 'Freya', 'Gunnar', 'Ingrid', 'Knut', 'Liv', 'Magnus', 'Nils', 'Ragnhild', 'Sven', 'Sigrid', 'Thor', 'Ulf'],
    greek: ['Alexios', 'Athena', 'Dimitri', 'Eleni', 'Giorgos', 'Irene', 'Kostas', 'Lydia', 'Nikos', 'Paraskevi', 'Stavros', 'Theodora', 'Vassilis', 'Xenia', 'Yiannis', 'Zoe'],
    turkic: ['Ahmet', 'Ayşe', 'Barış', 'Deniz', 'Emre', 'Fatma', 'Hakan', 'İpek', 'Mehmet', 'Nermin', 'Onur', 'Selin', 'Tuncay', 'Zeynep', 'Yusuf', 'Elif'],
    southeast_asian: ['Anh', 'Binh', 'Cuong', 'Duyen', 'Hanh', 'Khoa', 'Lan', 'Minh', 'Ngoc', 'Phuong', 'Quang', 'Thao', 'Viet', 'Xuan', 'Yen'],
    hebrew: ['David', 'Sarah', 'Moshe', 'Rivka', 'Yosef', 'Leah', 'Ariel', 'Noa', 'Ben', 'Hadas', 'Gal', 'Yael', 'Eitan', 'Dana', 'Shlomo', 'Tamar'],
    persian: ['Ali', 'Maryam', 'Reza', 'Fatemeh', 'Hassan', 'Zahra', 'Karim', 'Parisa', 'Naser', 'Soraya', 'Dariush', 'Mina', 'Behnam', 'Shirin', ' Cyrus', 'Roxana'],
    latin_american: ['Alejo', 'Beatriz', 'César', 'Daniela', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena', 'Ignacio', 'Julieta', 'Leandro', 'Margarita', 'Nicolás', 'Ólga', 'Patricio', 'Renata'],
    west_african: ['Abena', 'Kwame', 'Akua', 'Kofi', 'Ama', 'Yaw', 'Efua', 'Kwesi', 'Akosua', 'Nii', 'Yaa', 'Kojo', 'Adjoa', 'Kwabena', 'Esi'],
    east_african: ['Amara', 'Juma', 'Fatma', 'Hassan', 'Grace', 'David', 'Wanjiru', 'Mwangi', 'Lila', 'Omar', 'Zawadi', 'Baraka', 'Halima', 'Suleiman', 'Nia'],
    central_asian: ['Aizhan', 'Bekzat', 'Dana', 'Erlan', 'Gulnara', 'Islam', 'Karim', 'Lucia', 'Nurzhan', 'Olga', 'Rustam', 'Saltanat', 'Talgat', 'Ulpan', 'Zhanar'],
  };
  const pool = names[lang] ?? names['latin'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function surname(lang: string): string {
  const names: Record<string, string[]> = {
    latin: ['Alvarez', 'Benítez', 'Cortés', 'Díaz', 'Estrada', 'Flores', 'García', 'Hernández', 'Iglesias', 'Jiménez', 'López', 'Martínez', 'Navarro', 'Ortiz', 'Pérez', 'Quintero', 'Ramírez', 'Santos', 'Torres', 'Vargas', 'Zamora'],
    slavic: ['Antonov', 'Bogdanov', 'Chernov', 'Dimitriou', 'Fedorov', 'Golubev', 'Ivanov', 'Kozlov', 'Leonov', 'Mikhailov', 'Nikolayev', 'Orlov', 'Petrov', 'Rozanov', 'Sokolov', 'Volkov', 'Yakovlev', 'Zaitsev'],
    germanic: ['Bauer', 'Fischer', 'Graf', 'Hoffmann', 'Krause', 'Lehmann', 'Müller', 'Neumann', 'Richter', 'Schmidt', 'Schneider', 'Schulz', 'Weber', 'Werner', 'Wolf'],
    east_asian: ['Chen', 'Kim', 'Lee', 'Nguyen', 'Park', 'Pham', 'Tran', 'Trương', 'Vo', 'Yamamoto', 'Park', 'Tanaka', 'Watanabe', 'Zhang'],
    south_asian: ['Chatterjee', 'Gupta', 'Kapoor', 'Mehta', 'Nair', 'Patel', 'Rao', 'Reddy', 'Sharma', 'Singh', 'Subramanian', 'Verma'],
    arabic: ['Abbas', 'Ahmad', 'Al-Rashid', 'Bakri', 'Darwish', 'Habib', 'Ibrahim', 'Khalil', 'Mansour', 'Nasser', 'Qasim', 'Rashid', 'Saadi', 'Saleh', 'Yusuf'],
    romance: ['Albani', 'Bernardini', 'Bianchi', 'Colombo', 'Conti', 'Costa', 'Ferrari', 'Ferraro', 'Gallo', 'Greco', 'Lombardi', 'Marino', 'Martini', 'Moro', 'Rizzo', 'Romano', 'Rossi', 'Russo', 'Santoro', 'Silvestri', 'Vitale'],
    nordic: ['Andersen', 'Berg', 'Dahl', 'Eriksson', 'Hansen', 'Johansson', 'Larsen', 'Lindberg', 'Lindqvist', 'Magnusson', 'Nielsen', 'Nilsson', 'Olsen', 'Rasmussen', 'Svensson'],
    greek: ['Adamopoulos', 'Andreou', 'Dimitriadis', 'Georgiou', 'Ioannou', 'Kalogirou', 'Katsaros', 'Koustas', 'Mavroidis', 'Nikolaidis', 'Papadopoulos', 'Papazoglou', 'Siourounis', 'Stavropoulos', 'Trichias', 'Vasilopoulos'],
    turkic: ['Acar', 'Aydın', 'Demir', 'Erdoğan', 'Kaya', 'Koç', 'Özdemir', 'Öztürk', 'Sarı', 'Yılmaz', 'Yıldız', 'Yüksel', 'Zengin'],
    southeast_asian: ['Bùi', 'Đỗ', 'Hoàng', 'Huỳnh', 'Lê', 'Lưu', 'Ngô', 'Nguyễn', 'Phạm', 'Trần', 'Trương', 'Võ', 'Vũ'],
    hebrew: ['Cohen', 'Dan', 'Friedman', 'Goldberg', 'Levi', 'Levy', 'Mizrahi', 'Peretz', 'Shapira', 'Weiss', 'Yosef', 'Zion'],
    persian: ['Ahmadi', 'Bagheri', 'Farsi', 'Ghasemi', 'Hosseini', 'Karimi', 'Mohammadi', 'Moradi', 'Nouri', 'Rahimi', 'Rezaei', 'Shahriari', 'Zadeh'],
    latin_american: ['Alarcón', 'Barrera', 'Córdoba', 'Delgado', 'Escobar', 'Flores', 'Guzmán', 'Herrera', 'Jiménez', 'López', 'Mendoza', 'Morales', 'Navarro', 'Peña', 'Ramos', 'Reyes', 'Soto', 'Vega'],
    west_african: ['Asante', 'Boakye', 'Diallo', 'Djibril', 'Kone', 'Mensah', 'Osei', 'Owusu', 'Sow', 'Toure', 'Yeboah', 'Appiah', 'Agyeman', 'Bonsu', 'Kofi', 'Ababio', 'Kwabena', 'Adjei', 'Antwi', 'Boaten'],
    east_african: ['Abdi', 'Ali', 'Haji', 'Hassan', 'Juma', 'Kamau', 'Kariuki', 'Kiplagat', 'Mbugua', 'Mureithi', 'Mwakio', 'Njoroge', 'Oduya', 'Wafula'],
    central_asian: ['Aitbayev', 'Bissenov', 'Dzhaksybekov', 'Iskakov', 'Kassym-Jomart', 'Kenzhetayev', 'Kudabayev', 'Mukhtarov', 'Nazarbayev', 'Ospanov', 'Rakhimov', 'Sadvokasov', 'Shayakhmetov', 'Smaylov', 'Toleubay'],
  };
  const pool = names[lang] ?? names['latin'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function regionForCountry(id: string): string {
  const map: Record<string, string> = {
    ar: 'latin', au: 'germanic', bd: 'south_asian', br: 'latin', ca: 'germanic',
    cl: 'latin', cn: 'east_asian', co: 'latin', cu: 'latin', eg: 'arabic',
    fr: 'romance', de: 'germanic', gh: 'west_african', gr: 'greek', hu: 'germanic',
    in: 'south_asian', id: 'east_asian', ir: 'persian', il: 'hebrew', it: 'romance',
    jm: 'latin', jp: 'east_asian', ke: 'east_african', kp: 'east_asian', kr: 'east_asian',
    mx: 'latin', my: 'east_asian', ng: 'west_african', nl: 'germanic', no: 'nordic',
    nz: 'germanic', ph: 'east_asian', pk: 'south_asian', pl: 'germanic', pt: 'romance',
    qa: 'arabic', ru: 'slavic', sa: 'arabic', se: 'nordic', sg: 'east_asian',
    th: 'southeast_asian', tr: 'turkic', ua: 'slavic', gb: 'germanic', us: 'germanic',
    ve: 'latin', vn: 'east_asian', za: 'west_african', es: 'romance', ch: 'germanic',
  };
  return map[id] ?? 'germanic';
}

function makeFictionalLeader(region: string): string {
  return `${firstName(region)} ${surname(region)}`;
}

function makeFictionalParty(region: string): string {
  const parties: Record<string, string[]> = {
    latin: ['Alliance for Progress', 'Broad Popular Front', 'Christian Democratic Union', 'Democratic Renewal Party', 'Ecologist Coalition', 'Free Democratic Alliance', 'Green Progressive Front', 'Humanist Movement', 'Independent Civic Network', 'Justice and Development Party', 'Liberal Reformist Bloc', 'National Reconciliation Movement', 'Patriotic Democratic Alliance', 'People\'s Sovereignty Front', 'Radical Civic Union', 'Social Democratic Forum', 'Workers and Peasants Alliance'],
    slavic: ['All-Russian Popular Front', 'Civic Platform', 'Democratic Choice Movement', 'Eurasian Union Party', 'Free Russia Bloc', 'Green Alternative', 'Homeland Party', 'Intellectual Russia', 'Justice Party', 'Liberal Democratic Union', 'New Policy Forum', 'People\'s Democratic Alliance', 'Progressive Russia', 'Russian Civic Movement', 'Social Democratic Party', 'United Democratic Front', 'Yabloko Reform Bloc'],
    germanic: ['Alliance for Germany', 'Bavarian Christian Social Union', 'Christian Democratic Union', 'Free Democratic Party', 'Green Alliance', 'Left Party', 'Progressive Democrats', 'Social Democratic Party', 'The Left', 'Three Lions Alliance'],
    east_asian: ['Asia Pacific Solidarity', 'Civic Democratic Party', 'Constructive Development Party', 'Democratic Alliance', 'Future Progress Party', 'Harmonious Society Movement', 'Justice and Peace Party', 'Korean Progressive Alliance', 'Liberal Renewal Party', 'New Century Democratic', 'New Frontier Alliance', 'People\'s Power Movement', 'Prosperous Nation Party', 'Reform and Justice', 'United Democratic Party', 'Vision 2030 Alliance'],
    south_asian: ['All India Trinamool Congress', 'Communist Party of India', 'Congress Party', 'Democratic Front', 'Nationalist Congress Party', 'Aam Aadmi Party', 'Bahujan Samaj Party', 'Shiv Sena', 'Telugu Desam Party', 'Regional Democratic Forum', 'National Integration Alliance', 'Progressive Farmers Alliance', 'Urban Democratic Network'],
    arabic: ['Arab Democratic Front', 'Arab Socialist Union', 'Constitutional Democratic Rally', 'Free Iraqiya Party', 'Islamic Action Front', 'Islamic Renaissance Party', 'National Democratic Alliance', 'National Progressive Front', 'Reform and Development Party', 'Social Democratic Party', 'Wafiq Party', 'National Reconciliation Party', 'Arab Progressive Union', 'Civic Democratic Movement'],
    romance: ['Alleanza Verde', 'Centrist Democratic Union', 'Democratic Party', 'Forza Italia', 'Lega Nord', 'Movimiento Asociativo', 'National Renewal', 'Partido Popular', 'Progressive Alliance', 'Radical Civic Movement', 'Social Democratic Party', 'Spanish Socialist Workers', 'Alianza Civica Progresista', 'Bloque Nacional Democratico', 'Coalicion Reformista', 'Convergencia Democratica', 'Federacion Progresista'],
    nordic: ['Center Party', 'Christian Democratic Party', 'Conservative Party', 'Green Party', 'Left Party', 'Liberal Party', 'Moderate Party', 'Progressive Party', 'Red-Green Alliance', 'Social Democrats', 'Swedish Democrats', 'Scandinavian Democratic Alliance', 'Nordic People\'s Movement', 'Baltic Liberal Forum', 'Folk Democratic Party'],
    greek: ['Coalition of the Radical Left', 'Democratic Alignment', 'Greek Communist Party', 'Independent Greeks', 'Movement for Change', 'New Democracy', 'Pan-Hellenic Socialist'],
    turkic: ['CHP Republican People\'s', 'Democrat Party', 'Future Party', 'Good Party', 'Justice Party', 'Nationalist Movement Party', 'Peace and Democracy', 'Republican People\'s Party', 'Anatolia Democratic Union', 'Civic Development Alliance', 'Liberal Republican Party', 'Nationalist Democratic Front', 'Progressive Republican Alliance', 'Social Democratic Movement', 'Union of Democratic Forces'],
    hebrew: ['Blue and White', 'Joint List', 'Labour-Gesher', 'Likud', 'Shas', 'The Jewish Home', 'Torah Judaism', 'Yisrael Beiteinu', 'Yesh Atid'],
    persian: ['Alliance of the Nationalist-Religious', 'Combatant Clergy Association', 'Executives of Construction Party', 'Foundation of Islam', 'Islamic Coalition Party', 'Islamic Democratic Party', 'Islamic Iran Freedom', 'Islamic Republic Party', 'Moderation and Development', 'National Confidence Party', 'Nationalist Front', 'Pervasive Coalition of Islamists', 'Society of the Teachers', 'Workers\' House'],
    west_african: ['All Progressives Congress', 'National Democratic Congress', 'New Patriotic Party', 'Nigerian Democratic Party', 'People\'s Democratic Party', 'Progressive People\'s Party', 'Social Democratic Front', 'Union for the Republic', 'Progressive Democratic Alliance', 'Popular Democratic Movement', 'National Reconstruction Party', 'Coalition for Democratic Change', 'West African Democratic Forum', 'Civic Alliance for Development'],
    east_african: ['Alliance for Democratic Change', 'CORD Coalition', 'Forum for Democratic Change', 'Jubilee Alliance', 'National Super Alliance', 'Orange Democratic Movement', 'United Democratic Front', 'Wiper Democratic Party'],
    central_asian: ['Agrarian Party', 'Ak Zhol Democratic Party', 'All-National PPC', 'CEC Party', 'Communist Party', 'Democratic Party', 'National Social Democratic Party', 'Nur Otan Party', 'Party of Peace and Development', 'People\'s Party of Kazakhstan', 'Republican People\'s Party'],
  };
  const pool = parties[region] ?? parties['germanic'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Fields to clear (stale hardcoded values) ──────────────────────────────
const AMOUNT_FIELDS = [
  'gdp_description',
  'aid_amount',
  'disaster_cost',
  'graft_amount',
  'infrastructure_cost',
  'military_budget_amount',
  'sanctions_amount',
  'trade_value',
];

// ── Fields to anonymize ───────────────────────────────────────────────────
const LEADER_FIELDS = ['governing_party_leader', 'opposition_party_leader'];
const PARTY_FIELDS = ['governing_party', 'opposition_party'];

async function migrateCountry(ref: DocumentReference, id: string) {
  const snap = await ref.get();
  if (!snap.exists) return null;

  const tokens = (snap.data() as Record<string, unknown>).tokens as Record<string, string | null> | undefined;
  if (!tokens) return null;

  const region = regionForCountry(id);
  const updates: Record<string, string | null> = {};

  // Clear stale hardcoded amounts
  for (const field of AMOUNT_FIELDS) {
    if (tokens[field] !== undefined && tokens[field] !== null) {
      updates[field] = null;
    }
  }

  for (const field of LEADER_FIELDS) {
    if (tokens[field] !== undefined && tokens[field] !== null) {
      updates[field] = null;
    }
  }

  for (const field of PARTY_FIELDS) {
    if (tokens[field] !== undefined && tokens[field] !== null) {
      updates[field] = null;
    }
  }

  if (Object.keys(updates).length === 0) return null;
  return updates;
}

async function main() {
  const countryIds = [
    'ar', 'au', 'bd', 'br', 'ca', 'cl', 'cn', 'co', 'cu', 'eg',
    'fr', 'de', 'gh', 'gr', 'hu', 'in', 'id', 'ir', 'il', 'it',
    'jm', 'jp', 'ke', 'kp', 'kr', 'mx', 'my', 'ng', 'nl', 'no',
    'nz', 'ph', 'pk', 'pl', 'pt', 'qa', 'ru', 'sa', 'se', 'sg',
    'th', 'tr', 'ua', 'gb', 'us', 've', 'vn', 'za', 'es', 'ch',
  ];

  const allUpdates: Record<string, Record<string, string | null>> = {};

  for (const id of countryIds) {
    const updates = await migrateCountry(db.doc(`countries/${id}`), id);
    if (updates) allUpdates[id] = updates;
  }

  if (Object.keys(allUpdates).length === 0) {
    console.log('No changes needed.');
    return;
  }

  console.log(`Would update ${Object.keys(allUpdates).length} countries:\n`);
  for (const [id, updates] of Object.entries(allUpdates)) {
    const cleared = Object.entries(updates).filter(([, v]) => v === null).map(([k]) => k);
    const changed = Object.entries(updates).filter(([, v]) => v !== null).map(([k, v]) => `${k}=${v}`);
    if (cleared.length) console.log(`  ${id}: CLEAR ${cleared.join(', ')}`);
    if (changed.length) console.log(`  ${id}: SET ${changed.join(', ')}`);
    console.log();
  }

  if (WRITE) {
    const batch = db.batch();
    let count = 0;
    for (const [id, updates] of Object.entries(allUpdates)) {
      const tokensRef = db.doc(`countries/${id}`);
      batch.update(tokensRef, { tokens: updates });
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Wrote batch of ${count} countries...`);
      }
    }
    await batch.commit();
    console.log(`\n✅ Written ${count} country updates to Firestore.`);
  } else {
    console.log(`\nRun with --write to apply.`);
  }
}

main().catch(console.error);
