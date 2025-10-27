/**
 * QSO generation utilities
 */

import { generateCallsign } from './callsign';

interface SignalReportOption {
  readability: number;
  signal: number;
  tone: number;
  weight: number;
}

const signalReportOptions: SignalReportOption[] = [
  // Perfect signals - most common
  { readability: 5, signal: 9, tone: 9, weight: 40 },

  // Very good signals - common
  { readability: 5, signal: 8, tone: 9, weight: 20 },
  { readability: 5, signal: 7, tone: 9, weight: 15 },

  // Good signals - less common
  { readability: 5, signal: 6, tone: 9, weight: 10 },
  { readability: 5, signal: 5, tone: 9, weight: 8 },

  // Decent but weaker
  { readability: 5, signal: 9, tone: 8, weight: 3 },
  { readability: 5, signal: 7, tone: 8, weight: 2 },

  // Weak signals - rare
  { readability: 4, signal: 4, tone: 9, weight: 3 },
  { readability: 3, signal: 3, tone: 9, weight: 2 },
  { readability: 4, signal: 5, tone: 9, weight: 2 },
];

/**
 * Select a signal report using weighted random selection
 */
function selectWeightedSignalReport(options: SignalReportOption[]): SignalReportOption {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let random = Math.random() * totalWeight;

  for (const option of options) {
    random -= option.weight;
    if (random <= 0) {
      return option;
    }
  }

  // Fallback to last option (should never happen)
  return options[options.length - 1];
}

/**
 * Generate a random signal report in RST format
 * Returns a string like "599", "5NN", "579", etc.
 *
 * RST format:
 * - Readability (1-5): How easy it is to understand
 * - Signal strength (1-9): How strong the signal is
 * - Tone (1-9): Quality of the CW tone
 *
 * Sometimes uses 'N' as an abbreviation for 9 (e.g., '5NN' for '599')
 */
export function generateSignalReport(): string {
  const report = selectWeightedSignalReport(signalReportOptions);

  let result = String(report.readability);

  // Determine if we should use 'N' notation (~35% of the time when applicable)
  const useN = Math.random() < 0.35;

  // If both signal and tone are 9, we can use NN
  if (report.signal === 9 && report.tone === 9 && useN) {
    return result + 'NN';
  }

  // Add signal strength
  result += String(report.signal);

  // Add tone, possibly using 'N' for 9
  if (report.tone === 9 && useN) {
    result += 'N';
  } else {
    result += String(report.tone);
  }

  return result;
}

/**
 * Common amateur radio transceivers
 */
const rigs = [
  'ICOM IC7300',
  'ICOM IC7610',
  'ICOM IC9700',
  'ICOM IC705',
  'ICOM IC718',
  'YAESU FT991A',
  'YAESU FT857D',
  'YAESU FT891',
  'YAESU FT817',
  'YAESU FTDX10',
  'KENWOOD TS590',
  'KENWOOD TS890',
  'KENWOOD TS480',
  'ELECRAFT K3',
  'ELECRAFT KX3',
  'ELECRAFT K4',
  'FLEX 6400',
  'XIEGU G90',
  'QCX',
  'HOMEBREW',
];

/**
 * Common amateur radio antennas
 */
const antennas = [
  'DIPOLE',
  'INVERTED VEE',
  'VERTICAL',
  '3 EL YAGI',
  'HEXBEAM',
  'G5RV',
  'END FED',
  'LONGWIRE',
  'MAGNETIC LOOP',
  'DELTA LOOP',
  'OCF DIPOLE',
  'GAP TITAN',
  'HUSTLER 6BTV',
  'MOXON',
  'WINDOM',
  'ZS6BKW',
  'MOBILE WHIP',
  'ATTIC DIPOLE',
  'WIRE BEAM',
  'QUAD',
];

/**
 * Generate a random rig (transceiver) name
 */
export function generateRig(): string {
  return rigs[Math.floor(Math.random() * rigs.length)];
}

/**
 * Generate a random antenna name
 */
export function generateAntenna(): string {
  return antennas[Math.floor(Math.random() * antennas.length)];
}

/**
 * Common amateur radio operator names
 */
const names = [
  'JOHN',
  'MIKE',
  'BOB',
  'DAVE',
  'TOM',
  'JIM',
  'BILL',
  'STEVE',
  'PAUL',
  'MARK',
  'DAN',
  'RON',
  'RICK',
  'JEFF',
  'GARY',
  'DOUG',
  'LARRY',
  'DENNIS',
  'FRED',
  'GEORGE',
  'RICHARD',
  'ROBERT',
  'CHARLES',
  'DONALD',
  'JOSEPH',
  'THOMAS',
  'CHRIS',
  'BRIAN',
  'KEVIN',
  'SCOTT',
  'ERIC',
  'GREG',
  'KEN',
  'TONY',
  'RAY',
  'FRANK',
  'JACK',
  'CARL',
  'PETER',
  'ALAN',
  'ROGER',
  'JOE',
  'AL',
  'BRUCE',
  'HOWARD',
  'HENRY',
  'WALTER',
  'ARTHUR',
  'ED',
  'HAROLD',
  'TERRY',
  'RALPH',
  'WAYNE',
  'VICTOR',
  'MARTIN',
  'CRAIG',
  'PHIL',
  'ANDY',
  'SEAN',
  'BARRY',
  'GENE',
  'GLENN',
  'LLOYD',
  'EARL',
  'DEAN',
  'RANDY',
  'KEITH',
  'TODD',
  'BRAD',
  'ROY',
  'DALE',
  'NEIL',
  'SAM',
  'MAX',
  'HAL',
  'KURT',
  'LEON',
  'BEN',
  'JOEL',
  'JUAN',
  'LUIS',
  'JOSE',
  'CARLOS',
  'MIGUEL',
  'MARCUS',
  'IVAN',
  'ALEX',
  'NICK',
  'RICH',
  'STAN',
  'CHAD',
  'CURT',
  'HERB',
  'NORM',
  'WALLY',
  'VERN',
  'LARS',
  'HANS',
  'KLAUS',
  'PIERRE',
];

/**
 * Generate a random operator name
 */
export function generateName(): string {
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Common weather reports exchanged in QSOs
 */
const weatherReports = [
  'SUNNY',
  'CLEAR',
  'CLOUDY',
  'PARTLY CLOUDY',
  'OVERCAST',
  'RAIN',
  'LIGHT RAIN',
  'RAINY',
  'SNOW',
  'SNOWING',
  'FLURRIES',
  'COLD',
  'WARM',
  'HOT',
  'COOL',
  'MILD',
  'SUNNY AND WARM',
  'SUNNY AND COOL',
  'COLD AND CLEAR',
  'WARM AND SUNNY',
  'CLOUDY AND COOL',
  'RAIN HERE',
  'SUNNY HERE',
  'CLEAR SKIES',
  'WINDY',
  'CALM',
  'FOG',
  'FOGGY',
  'HAZY',
  'HUMID',
  'DRY',
  'STORM',
  'SUNNY 75F',
  'COLD 32F',
  'WARM 80F',
  'HOT 95F',
  'COOL 55F',
];

/**
 * Generate a random weather report
 */
export function generateWeather(): string {
  return weatherReports[Math.floor(Math.random() * weatherReports.length)];
}

/**
 * QSO templates with varying styles and lengths
 * Placeholders: {CALL1}, {CALL2}, {NAME1}, {NAME2}, {QTH1}, {QTH2},
 *               {RST1}, {RST2}, {WX1}, {WX2}, {RIG1}, {RIG2}, {ANT1}, {ANT2}
 */
const qsoTemplates = [
  // Contest style - very short
  `CQ CQ CQ DE {CALL1} {CALL1} K
{CALL1} DE {CALL2} {CALL2} AR
{CALL2} DE {CALL1} UR {RST1} {RST1} QTH {QTH1} {QTH1} K
{CALL1} DE {CALL2} R {RST2} {RST2} {QTH2} {QTH2} TU K
{CALL2} DE {CALL1} R TU 73 DE {CALL1} SK
{CALL1} DE {CALL2} 73 SK`,

  // Medium casual exchange
  `CQ CQ CQ DE {CALL1} {CALL1} K
{CALL1} DE {CALL2} {CALL2} AR
{CALL2} DE {CALL1} GE OM TNX FER CALL UR RST {RST1} {RST1} NAME {NAME1} {NAME1} QTH {QTH1} {QTH1} HW? K
{CALL1} DE {CALL2} R R FB {NAME1} UR RST {RST2} {RST2} NAME {NAME2} {NAME2} QTH {QTH2} {QTH2} K
{CALL2} DE {CALL1} R R TNX FER QSO 73 73 {NAME2} DE {NAME1} SK
{CALL1} DE {CALL2} R 73 {NAME1} DE {NAME2} SK`,

  // Long chatty with full details
  `CQ CQ CQ DE {CALL1} {CALL1} K
{CALL1} DE {CALL2} {CALL2} AR
{CALL2} DE {CALL1} GE OM TNX FER CALL UR RST {RST1} {RST1} NAME {NAME1} {NAME1} QTH {QTH1} {QTH1} HW? K
{CALL1} DE {CALL2} R R FB {NAME1} UR RST {RST2} {RST2} NAME {NAME2} {NAME2} QTH {QTH2} {QTH2} WX {WX2} HR K
{CALL2} DE {CALL1} R R {NAME2} WX {WX1} HR RIG {RIG1} ANT {ANT1} HW CPY? K
{CALL1} DE {CALL2} R R FB RIG {RIG2} ANT {ANT2} QSL? K
{CALL2} DE {CALL1} R R QSL VIA BURO TNX FER QSO 73 73 {NAME2} DE {NAME1} SK
{CALL1} DE {CALL2} R R 73 {NAME1} CUL DE {NAME2} SK`,

  // Very brief
  `CQ DE {CALL1} K
{CALL1} DE {CALL2} AR
{CALL2} DE {CALL1} {RST1} {QTH1} K
{CALL1} DE {CALL2} R {RST2} {QTH2} K
{CALL2} DE {CALL1} TU 73 SK
{CALL1} DE {CALL2} 73 SK`,

  // Station details focused
  `CQ CQ DE {CALL1} K
{CALL1} DE {CALL2} {CALL2} AR
{CALL2} DE {CALL1} GM OM UR {RST1} {RST1} NAME {NAME1} QTH {QTH1} RIG {RIG1} ANT {ANT1} HW? K
{CALL1} DE {CALL2} R R FB {NAME1} UR {RST2} {RST2} NAME {NAME2} QTH {QTH2} RIG {RIG2} ANT {ANT2} K
{CALL2} DE {CALL1} R TNX {NAME2} 73 DE {NAME1} SK
{CALL1} DE {CALL2} 73 {NAME1} SK`,

  // Minimal but polite
  `CQ DE {CALL1} K
{CALL1} DE {CALL2} AR
{CALL2} DE {CALL1} GE UR {RST1} NAME {NAME1} QTH {QTH1} K
{CALL1} DE {CALL2} R {RST2} {NAME2} {QTH2} TNX K
{CALL2} DE {CALL1} TU 73 SK
{CALL1} DE {CALL2} 73 SK`,

  // Weather focused ragchew
  `CQ CQ CQ DE {CALL1} K
{CALL1} DE {CALL2} {CALL2} AR
{CALL2} DE {CALL1} GA OM TNX FER CALL UR RST {RST1} NAME {NAME1} QTH {QTH1} WX {WX1} HR HW? K
{CALL1} DE {CALL2} R R FB {NAME1} UR RST {RST2} NAME {NAME2} QTH {QTH2} WX {WX2} HR RIG {RIG2} K
{CALL2} DE {CALL1} R R {NAME2} FB ON WX RIG {RIG1} HR TNX FER FB QSO 73 DE {NAME1} SK
{CALL1} DE {CALL2} 73 {NAME1} CUL DE {NAME2} SK`,

  // Quick exchange
  `CQ DE {CALL1} {CALL1} K
{CALL1} DE {CALL2} AR
{CALL2} DE {CALL1} UR {RST1} {RST1} {NAME1} {QTH1} K
{CALL1} DE {CALL2} R {RST2} {RST2} {NAME2} {QTH2} TU K
{CALL2} DE {CALL1} 73 SK
{CALL1} DE {CALL2} 73 SK`,

  // Detailed with QSL info
  `CQ CQ DE {CALL1} K
{CALL1} DE {CALL2} {CALL2} AR
{CALL2} DE {CALL1} GE OM UR RST {RST1} {RST1} NAME {NAME1} QTH {QTH1} RIG {RIG1} HW? K
{CALL1} DE {CALL2} R FB UR RST {RST2} {RST2} NAME {NAME2} QTH {QTH2} RIG {RIG2} ANT {ANT2} QSL? K
{CALL2} DE {CALL1} R R QSL SURE VIA LOTW TNX FER QSO 73 {NAME2} DE {NAME1} SK
{CALL1} DE {CALL2} R 73 {NAME1} GL DE {NAME2} SK`,

  // Friendly mid-length
  `CQ CQ CQ DE {CALL1} K
{CALL1} DE {CALL2} AR
{CALL2} DE {CALL1} GD MORNING OM UR RST {RST1} NAME {NAME1} {NAME1} QTH {QTH1} HW? K
{CALL1} DE {CALL2} GD MORNING {NAME1} UR RST {RST2} NAME {NAME2} {NAME2} QTH {QTH2} WX {WX2} HR K
{CALL2} DE {CALL1} R R {NAME2} WX {WX1} HR TNX FER FB QSO 73 73 DE {NAME1} SK
{CALL1} DE {CALL2} 73 {NAME1} CUL SK`,
];

/**
 * Generate a random QSO template
 */
export function generateQsoTemplate(): string {
  return qsoTemplates[Math.floor(Math.random() * qsoTemplates.length)];
}

/**
 * Generate a complete random QSO by filling a template with generated values
 */
export function generateQso(): string {
  // Generate all the values we need
  const station1 = generateCallsign();
  const station2 = generateCallsign();

  const name1 = generateName();
  const name2 = generateName();

  const rst1 = generateSignalReport();
  const rst2 = generateSignalReport();

  const wx1 = generateWeather();
  const wx2 = generateWeather();

  const rig1 = generateRig();
  const rig2 = generateRig();

  const ant1 = generateAntenna();
  const ant2 = generateAntenna();

  // Get a random template
  const template = generateQsoTemplate();

  // Replace all placeholders
  const result = template
    .replace(/{CALL1}/g, station1.callsign)
    .replace(/{CALL2}/g, station2.callsign)
    .replace(/{NAME1}/g, name1)
    .replace(/{NAME2}/g, name2)
    .replace(/{QTH1}/g, station1.qth)
    .replace(/{QTH2}/g, station2.qth)
    .replace(/{RST1}/g, rst1)
    .replace(/{RST2}/g, rst2)
    .replace(/{WX1}/g, wx1)
    .replace(/{WX2}/g, wx2)
    .replace(/{RIG1}/g, rig1)
    .replace(/{RIG2}/g, rig2)
    .replace(/{ANT1}/g, ant1)
    .replace(/{ANT2}/g, ant2);

  return result;
}
