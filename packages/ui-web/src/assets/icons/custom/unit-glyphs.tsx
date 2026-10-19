import { makeGlyph } from "./make-glyph.js";

// Force silhouettes, keyed by what the force catalog counts (platform kinds
// and unit symbols), not by the 46 asset ids. Aircraft are plan views, nose up;
// ships and ground vehicles are profiles facing right; the unit symbol is the
// standard rectangle with the crossed-lines infantry mark.

export const FighterJetIcon = makeGlyph({
  name: "FighterJet",
  body: "M128 28C136 56 140 84 140 108L228 168V190L140 168L136 208L164 226V236L128 228L92 236V226L120 208L116 168L28 190V168L116 108C116 84 120 56 128 28Z",
  detail: "M128 64V88",
});

export const BomberIcon = makeGlyph({
  name: "Bomber",
  body: "M128 40L148 80L228 164L196 176L170 164L148 184L128 176L108 184L86 164L60 176L28 164L108 80Z",
  detail: "M128 76V116",
});

export const TransportAircraftIcon = makeGlyph({
  name: "TransportAircraft",
  body: "M128 28C140 28 146 40 146 56V100L232 118V144L146 136V204L176 218V232L128 224L80 232V218L110 204V136L24 144V118L110 100V56C110 40 116 28 128 28Z",
});

export const HelicopterIcon = makeGlyph({
  name: "Helicopter",
  body: "M60 128C60 104 84 92 112 92H148C176 92 188 112 196 128V140C196 156 184 164 168 164H92C72 164 60 150 60 128Z",
  detail: "M44 60H212M128 60V92M196 124L232 108M232 88V128M60 196H188M92 164V196M156 164V196",
});

export const AircraftCarrierIcon = makeGlyph({
  name: "AircraftCarrier",
  body: "M20 152H236L212 200H56ZM156 152V116H188V152",
  detail: "M172 116V88",
});

export const SurfaceCombatantIcon = makeGlyph({
  name: "SurfaceCombatant",
  body: "M28 156H228L200 200H64ZM84 156L100 116H172L188 156",
  detail: "M136 116V72M116 92H156M200 140H224",
});

export const SubmarineIcon = makeGlyph({
  name: "Submarine",
  body: "M40 148C40 124 64 112 96 112H196C224 112 232 130 232 148C232 166 224 184 196 184H96C64 184 40 172 40 148ZM100 112V84H148V112",
  detail: "M132 84V60H160M44 130L28 104M44 166L28 192",
});

export const ArmoredVehicleIcon = makeGlyph({
  name: "ArmoredVehicle",
  body: "M60 164H196A24 24 0 0 1 196 212H60A24 24 0 0 1 60 164ZM84 164V132C84 124 90 120 98 120H160C168 120 172 124 172 132V164",
  detail: "M172 140H236M92 188H92.01M128 188H128.01M164 188H164.01",
});

export const GroundFormationIcon = makeGlyph({
  name: "GroundFormation",
  body: "M40 100H216V188H40Z",
  detail: "M40 100L216 188M216 100L40 188M116 60V72M140 60V72",
});

export const MissileIcon = makeGlyph({
  name: "Missile",
  body: "M128 24C148 48 152 84 148 150V190H108V150C104 84 108 48 128 24ZM108 160L80 196V220L108 200ZM148 160L176 196V220L148 200Z",
  detail: "M128 214V236M108 110H148",
});

export const SatelliteIcon = makeGlyph({
  name: "Satellite",
  body: "M104 104H152V152H104ZM20 96H84V160H20ZM172 96H236V160H172Z",
  detail: "M84 128H104M152 128H172M52 96V160M204 96V160M128 152V180M112 180H144",
  rotate: -45,
});
