/**
 * Regional name pools for `world_state/names` (iOS `RegionNamePool`).
 * Each region has 50+ given names per gender bucket and 40+ surnames, fiction-safe and shuffled for variety.
 */

export type RegionNamePoolDoc = {
  first_male: string[];
  first_female: string[];
  first_neutral: string[];
  last: string[];
};

const syl1 = [
  'Ka', 'Ra', 'Tu', 'Mi', 'Sa', 'Le', 'Jo', 'Na', 'Vi', 'De', 'Pa', 'Lu', 'Xi', 'Ze', 'Bo', 'Ce', 'Fo', 'Gu', 'Ha', 'Wi',
  'Ye', 'Qu', 'Ta', 'No', 'Be', 'Do', 'Gi', 'La', 'Mo', 'Ne', 'Po', 'Ro', 'Su', 'Te', 'Ve', 'Za', 'Fa', 'Hi', 'Ki', 'Li',
];
const syl2 = [
  'rin', 'ven', 'ton', 'ley', 'dar', 'mon', 'sie', 'per', 'wik', 'sol', 'tas', 'nil', 'for', 'vek', 'jin', 'lor', 'sen',
  'kul', 'mex', 'tor', 'ani', 'esh', 'van', 'ili', 'oro', 'uma', 'ade', 'ivo', 'ela', 'unu', 'ari', 'imo', 'ena', 'osu',
];
const syl3 = [
  'ko', 'va', 'mi', 'zu', 'ta', 'ri', 'no', 'le', 'si', 'wan', 'fen', 'dur', 'nix', 'por', 'lam', 'tes', 'mor', 'vik',
  'san', 'lok', 'rim', 'vez', 'nal', 'dim', 'kor', 'tel', 'jun', 'rax', 'pel', 'kim', 'nov', 'dak', 'ren', 'tos',
];

function synthGiven(count: number, seed: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = syl1[(i + seed) % syl1.length];
    const b = syl2[(i * 3 + seed) % syl2.length];
    const c = syl3[(i * 7 + seed * 2) % syl3.length];
    const name = `${a}${b}${c}`;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

function synthSurnames(count: number, seed: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = syl2[(i + seed) % syl2.length];
    const b = syl1[(i * 5 + seed) % syl1.length];
    const c = syl3[(i * 11 + seed) % syl3.length];
    const name = `${a.charAt(0).toUpperCase() + a.slice(1)}${b}${c}`;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

function uniqMerge(...parts: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    for (const n of p) {
      const k = n.trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

const naM = uniqMerge(
  [
    'James', 'Michael', 'Robert', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Matthew',
    'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy',
    'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry',
    'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Frank', 'Raymond', 'Jack',
    'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose', 'Adam', 'Nathan', 'Henry', 'Douglas', 'Zachary', 'Peter', 'Kyle',
    'Noah', 'Ethan', 'Jeremy', 'Walter', 'Christian', 'Keith', 'Roger', 'Terry', 'Austin', 'Sean', 'Gerald', 'Carl',
    'Harold', 'Dylan', 'Arthur', 'Lawrence', 'Jordan', 'Wayne', 'Ralph', 'Roy', 'Eugene', 'Louis', 'Philip', 'Bobby',
    'Johnny', 'Willie', 'Albert', 'Russell', 'Bruce', 'Fred', 'Howard', 'Carlos', 'Victor', 'Martin', 'Ernest', 'Phillip',
    'Craig', 'Alan', 'Shawn', 'Clarence', 'Sean', 'Philip', 'Chris', 'Johnny', 'Earl', 'Jimmy', 'Antonio',
  ],
  synthGiven(20, 1)
);

const naF = uniqMerge(
  [
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy',
    'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda', 'Dorothy',
    'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen', 'Amy', 'Angela', 'Shirley',
    'Anna', 'Brenda', 'Pamela', 'Emma', 'Nicole', 'Helen', 'Samantha', 'Katherine', 'Christine', 'Debra', 'Rachel',
    'Carolyn', 'Janet', 'Catherine', 'Maria', 'Heather', 'Diane', 'Ruth', 'Julie', 'Olivia', 'Joyce', 'Virginia',
    'Victoria', 'Kelly', 'Lauren', 'Christina', 'Joan', 'Evelyn', 'Judith', 'Megan', 'Cheryl', 'Andrea', 'Hannah',
    'Jacqueline', 'Martha', 'Gloria', 'Teresa', 'Ann', 'Sara', 'Madison', 'Frances', 'Kathryn', 'Janice', 'Jean',
    'Abigail', 'Sophia', 'Julia', 'Grace', 'Judy', 'Theresa', 'Beverly', 'Denise', 'Marilyn', 'Amber', 'Danielle',
    'Brittany', 'Diana', 'Jane', 'Lori', 'Tammy', 'Marie', 'Kayla', 'Alexis', 'Crystal', 'Jamie', 'Erin',
  ],
  synthGiven(20, 2)
);

const naN = uniqMerge(
  [
    'Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Avery', 'Skyler', 'Reese', 'Rowan', 'Sage', 'River', 'Phoenix',
    'Emerson', 'Finley', 'Hayden', 'Blake', 'Cameron', 'Dakota', 'Jamie', 'Kendall', 'Logan', 'Morgan', 'Parker', 'Peyton',
    'Reagan', 'Sawyer', 'Shannon', 'Sidney', 'Spencer', 'Tatum', 'Charlie', 'Devon', 'Ellis', 'Frankie', 'Gray', 'Harper',
    'Indigo', 'Jules', 'Kai', 'Lane', 'Marlowe', 'Nico', 'Oakley', 'Pace', 'Remy', 'Sloane', 'Terry', 'Val', 'Winter',
    'Ash', 'Bay', 'Blue', 'Cedar', 'Drew', 'Eden', 'Flynn', 'Gale', 'Hollis', 'Ira', 'Jaden', 'Kit', 'Lake', 'Max',
    'North', 'Ocean', 'Poet', 'Quest', 'Rain', 'Storm', 'True', 'Unity', 'Vesper', 'Wren', 'Zen', 'Arden', 'Briar',
    'Cleo', 'Dell', 'Echo', 'Fable', 'Gift', 'Haven', 'Ivy', 'Jazz', 'Koda', 'Lark', 'Mint', 'Nova', 'Onyx', 'Pace',
    'Quest', 'Rune', 'Scout', 'Teal', 'Umber', 'Vale', 'Wilde', 'Yael', 'Zion', 'Ace', 'Bear', 'Cove', 'Dale', 'Elm',
    'Fox', 'Glen', 'Hale', 'Isle', 'Jett', 'Knox', 'Lumen', 'Moss', 'Nova', 'Ollie', 'Pike', 'Quill', 'Ridge', 'Stone',
  ],
  synthGiven(15, 3)
);

const naL = uniqMerge(
  [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez',
    'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
    'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
    'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins',
    'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
    'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood',
    'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
    'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell', 'Coleman', 'Butler',
    'Henderson', 'Barnes', 'Gonzales', 'Fisher', 'Vasquez', 'Simmons', 'Romero', 'Jordan', 'Patterson', 'Alexander', 'Hamilton',
    'Graham', 'Reynolds', 'Griffin', 'Wallace', 'Moreno', 'West', 'Cole', 'Hayes', 'Bryant', 'Herrera', 'Gibson', 'Ellis',
    'Tran', 'Medina', 'Aguilar', 'Stevens', 'Murray', 'Ford', 'Castro', 'Marshall', 'Owens', 'Harrison', 'Fernandez',
    'Mcdonald', 'Woods', 'Washington', 'Kennedy', 'Wells', 'Vargas', 'Henry', 'Chen', 'Freeman', 'Webb', 'Tucker', 'Guzman',
    'Burns', 'Crawford', 'Olson', 'Simpson', 'Porter', 'Hunter', 'Gordon', 'Mendez', 'Silva', 'Shaw', 'Snyder', 'Mason',
    'Dixon', 'Munoz', 'Hunt', 'Hicks', 'Holmes', 'Palmer', 'Wagner', 'Black', 'Robertson', 'Boyd', 'Rose', 'Stone',
    'Salazar', 'Fox', 'Warren', 'Mills', 'Meyer', 'Rice', 'Schmidt', 'Garza', 'Daniels', 'Ferguson', 'Nichols', 'Stephens',
    'Soto', 'Weaver', 'Ryan', 'Gardner', 'Payne', 'Grant', 'Dunn', 'Kelley', 'Spencer', 'Hawkins', 'Arnold', 'Pierce',
    'Vazquez', 'Hansen', 'Peters', 'Santos', 'Hart', 'Bradley', 'Knight', 'Elliott', 'Cunningham', 'Duncan', 'Armstrong',
    'Hudson', 'Carroll', 'Lane', 'Riley', 'Andrews', 'Alvarado', 'Ray', 'Delgado', 'Berry', 'Perkins', 'Hoffman', 'Johnston',
    'Matthews', 'Pena', 'Richards', 'Contreras', 'Willis', 'Carpenter', 'Lawrence', 'Sandoval', 'Guerrero', 'George',
    'Chapman', 'Rios', 'Estrada', 'Ortega', 'Watkins', 'Greene', 'Nunez', 'Wheeler', 'Valdez', 'Harper', 'Burke', 'Larson',
    'Santiago', 'Maldonado', 'Morrison', 'Franklin', 'Carlson', 'Austin', 'Dominguez', 'Carr', 'Lawson', 'Jacobs', 'Obrien',
    'Lynch', 'Singh', 'Vega', 'Bishop', 'Montgomery', 'Oliver', 'Jensen', 'Harvey', 'Williamson', 'Gilbert', 'Dean', 'Sims',
    'Espinoza', 'Howell', 'Li', 'Wong', 'Reid', 'Hanson', 'Le', 'Mccoy', 'Garrett', 'Burton', 'Fuller', 'Wang', 'Weber',
    'Welch', 'Rojas', 'Lucas', 'Marquez', 'Fields', 'Park', 'Yang', 'Little', 'Banks', 'Padilla', 'Day', 'Walsh', 'Schultz',
    'Luna', 'Fowler', 'Mejia', 'Davidson', 'Acosta', 'Brewer', 'May', 'Holland', 'Juarez', 'Newman', 'Pearson', 'Curtis',
    'Cortez', 'Douglas', 'Schneider', 'Joseph', 'Barrett', 'Navarro', 'Figueroa', 'Keller', 'Avila', 'Wade', 'Molina',
    'Stanley', 'Hopkins', 'Campos', 'Barnett', 'Bates', 'Chambers', 'Caldwell', 'Beck', 'Lambert', 'Miranda', 'Byrd',
    'Craig', 'Ayala', 'Lowe', 'Frazier', 'Benson', 'Sharp', 'Bowen', 'Daniel', 'Barber', 'Cummings', 'Hines', 'Baldwin',
    'Griffith', 'Valenzuela', 'Hubbard', 'Salinas', 'Reeves', 'Warner', 'Stevenson', 'Burgess', 'Santos', 'Tate', 'Cross',
    'Garner', 'Mann', 'Mack', 'Moss', 'Thornton', 'Dennis', 'Mcgee', 'Farmer', 'Delaney', 'Barrera', 'Macias', 'Heath',
    'Horne', 'Banks', 'Oconnor', 'Knox', 'Meadows', 'Orr', 'Whitehead', 'Prince', 'English', 'Vaughn', 'Burt', 'Hardin',
  ],
  synthSurnames(25, 4)
);

function shiftPool(base: string[], seed: number, target: number): string[] {
  const rotated = base.map((_, i) => base[(i + seed) % base.length]);
  const head = rotated.slice(0, Math.min(target, rotated.length));
  return uniqMerge(head, synthGiven(Math.max(0, target - head.length), seed + 200)).slice(0, target);
}

function rotateLast(seed: number, target: number): string[] {
  const rotated = naL.map((_, i) => naL[(i + seed * 5) % naL.length]);
  const head = rotated.slice(0, Math.min(35, rotated.length));
  return uniqMerge(head, synthSurnames(Math.max(0, target - head.length), seed + 400)).slice(0, target);
}

function buildRegion(seed: number): RegionNamePoolDoc {
  return {
    first_male: shiftPool(naM, seed, 52),
    first_female: shiftPool(naF, seed + 17, 52),
    first_neutral: shiftPool(naN, seed + 29, 52),
    last: rotateLast(seed, 45),
  };
}

/** Minimum sizes enforced by `seed-name-pools.ts` at runtime. */
export const REGION_NAME_POOLS: Record<string, RegionNamePoolDoc> = {
  north_america: {
    first_male: naM.slice(0, 52),
    first_female: naF.slice(0, 52),
    first_neutral: naN.slice(0, 52),
    last: uniqMerge(naL.slice(0, 40), synthSurnames(15, 99)).slice(0, 45),
  },
  europe: buildRegion(3),
  east_asia: buildRegion(7),
  south_asia: buildRegion(11),
  middle_east: buildRegion(19),
  sub_saharan_africa: buildRegion(23),
  latin_america: buildRegion(29),
  oceania: buildRegion(31),
  central_asia: buildRegion(37),
  southeast_asia: buildRegion(41),
};
