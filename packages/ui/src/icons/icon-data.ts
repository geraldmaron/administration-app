// The icon set: each name the player uses, bound to a Phosphor glyph. Screens
// name a glyph by what it means here (`departmentDefense`, `order`), so a
// different drawing is a change to this table and never to a screen.

import type { Icon as Glyph } from "phosphor-react-native";
import { AirplaneIcon } from "phosphor-react-native/src/icons/Airplane";
import { AnchorIcon } from "phosphor-react-native/src/icons/Anchor";
import { ArchiveIcon } from "phosphor-react-native/src/icons/Archive";
import { ArmchairIcon } from "phosphor-react-native/src/icons/Armchair";
import { ArrowFatLinesUpIcon } from "phosphor-react-native/src/icons/ArrowFatLinesUp";
import { ArrowUUpLeftIcon } from "phosphor-react-native/src/icons/ArrowUUpLeft";
import { ArrowsLeftRightIcon } from "phosphor-react-native/src/icons/ArrowsLeftRight";
import { ArrowsOutSimpleIcon } from "phosphor-react-native/src/icons/ArrowsOutSimple";
import { ArrowsInSimpleIcon } from "phosphor-react-native/src/icons/ArrowsInSimple";
import { AtomIcon } from "phosphor-react-native/src/icons/Atom";
import { BankIcon } from "phosphor-react-native/src/icons/Bank";
import { BatteryChargingIcon } from "phosphor-react-native/src/icons/BatteryCharging";
import { BatteryWarningIcon } from "phosphor-react-native/src/icons/BatteryWarning";
import { BoatIcon } from "phosphor-react-native/src/icons/Boat";
import { BookBookmarkIcon } from "phosphor-react-native/src/icons/BookBookmark";
import { BookOpenIcon } from "phosphor-react-native/src/icons/BookOpen";
import { BookOpenTextIcon } from "phosphor-react-native/src/icons/BookOpenText";
import { BoxArrowDownIcon } from "phosphor-react-native/src/icons/BoxArrowDown";
import { BreadIcon } from "phosphor-react-native/src/icons/Bread";
import { BridgeIcon } from "phosphor-react-native/src/icons/Bridge";
import { BrowserIcon } from "phosphor-react-native/src/icons/Browser";
import { BuildingOfficeIcon } from "phosphor-react-native/src/icons/BuildingOffice";
import { CalculatorIcon } from "phosphor-react-native/src/icons/Calculator";
import { CalendarDotsIcon } from "phosphor-react-native/src/icons/CalendarDots";
import { CarIcon } from "phosphor-react-native/src/icons/Car";
import { FastForwardIcon } from "phosphor-react-native/src/icons/FastForward";
import { ShuffleIcon } from "phosphor-react-native/src/icons/Shuffle";
import { CardsIcon } from "phosphor-react-native/src/icons/Cards";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { CellTowerIcon } from "phosphor-react-native/src/icons/CellTower";
import { ChartLineIcon } from "phosphor-react-native/src/icons/ChartLine";
import { ChartLineDownIcon } from "phosphor-react-native/src/icons/ChartLineDown";
import { ChartLineUpIcon } from "phosphor-react-native/src/icons/ChartLineUp";
import { ChatsCircleIcon } from "phosphor-react-native/src/icons/ChatsCircle";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { CircleNotchIcon } from "phosphor-react-native/src/icons/CircleNotch";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { CoinsIcon } from "phosphor-react-native/src/icons/Coins";
import { CpuIcon } from "phosphor-react-native/src/icons/Cpu";
import { CrosshairIcon } from "phosphor-react-native/src/icons/Crosshair";
import { CrownIcon } from "phosphor-react-native/src/icons/Crown";
import { CubeIcon } from "phosphor-react-native/src/icons/Cube";
import { CurrencyDollarIcon } from "phosphor-react-native/src/icons/CurrencyDollar";
import { DeskIcon } from "phosphor-react-native/src/icons/Desk";
import { DetectiveIcon } from "phosphor-react-native/src/icons/Detective";
import { DiamondIcon } from "phosphor-react-native/src/icons/Diamond";
import { DropIcon } from "phosphor-react-native/src/icons/Drop";
import { EyeIcon } from "phosphor-react-native/src/icons/Eye";
import { EyeSlashIcon } from "phosphor-react-native/src/icons/EyeSlash";
import { FactoryIcon } from "phosphor-react-native/src/icons/Factory";
import { FileTextIcon } from "phosphor-react-native/src/icons/FileText";
import { FingerprintIcon } from "phosphor-react-native/src/icons/Fingerprint";
import { FireIcon } from "phosphor-react-native/src/icons/Fire";
import { FirstAidIcon } from "phosphor-react-native/src/icons/FirstAid";
import { FlagIcon } from "phosphor-react-native/src/icons/Flag";
import { FlameIcon } from "phosphor-react-native/src/icons/Flame";
import { FlaskIcon } from "phosphor-react-native/src/icons/Flask";
import { FolderIcon } from "phosphor-react-native/src/icons/Folder";
import { FolderOpenIcon } from "phosphor-react-native/src/icons/FolderOpen";
import { GaugeIcon } from "phosphor-react-native/src/icons/Gauge";
import { GavelIcon } from "phosphor-react-native/src/icons/Gavel";
import { HandTapIcon } from "phosphor-react-native/src/icons/HandTap";
import { GlobeHemisphereWestIcon } from "phosphor-react-native/src/icons/GlobeHemisphereWest";
import { GlobeStandIcon } from "phosphor-react-native/src/icons/GlobeStand";
import { GraduationCapIcon } from "phosphor-react-native/src/icons/GraduationCap";
import { GrainsIcon } from "phosphor-react-native/src/icons/Grains";
import { HammerIcon } from "phosphor-react-native/src/icons/Hammer";
import { HandFistIcon } from "phosphor-react-native/src/icons/HandFist";
import { HandHeartIcon } from "phosphor-react-native/src/icons/HandHeart";
import { HandshakeIcon } from "phosphor-react-native/src/icons/Handshake";
import { HardHatIcon } from "phosphor-react-native/src/icons/HardHat";
import { HeadphonesIcon } from "phosphor-react-native/src/icons/Headphones";
import { HeartbeatIcon } from "phosphor-react-native/src/icons/Heartbeat";
import { HouseIcon } from "phosphor-react-native/src/icons/House";
import { HouseLineIcon } from "phosphor-react-native/src/icons/HouseLine";
import { HurricaneIcon } from "phosphor-react-native/src/icons/Hurricane";
import { IdentificationCardIcon } from "phosphor-react-native/src/icons/IdentificationCard";
import { InfoIcon } from "phosphor-react-native/src/icons/Info";
import { LeafIcon } from "phosphor-react-native/src/icons/Leaf";
import { LightningIcon } from "phosphor-react-native/src/icons/Lightning";
import { ListChecksIcon } from "phosphor-react-native/src/icons/ListChecks";
import { ListIcon } from "phosphor-react-native/src/icons/List";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { MapPinIcon } from "phosphor-react-native/src/icons/MapPin";
import { MedalIcon } from "phosphor-react-native/src/icons/Medal";
import { MicrophoneIcon } from "phosphor-react-native/src/icons/Microphone";
import { MinusCircleIcon } from "phosphor-react-native/src/icons/MinusCircle";
import { MoneyIcon } from "phosphor-react-native/src/icons/Money";
import { MountainsIcon } from "phosphor-react-native/src/icons/Mountains";
import { NewspaperIcon } from "phosphor-react-native/src/icons/Newspaper";
import { NewspaperClippingIcon } from "phosphor-react-native/src/icons/NewspaperClipping";
import { NotebookIcon } from "phosphor-react-native/src/icons/Notebook";
import { PaperPlaneTiltIcon } from "phosphor-react-native/src/icons/PaperPlaneTilt";
import { PauseCircleIcon } from "phosphor-react-native/src/icons/PauseCircle";
import { PentagonIcon } from "phosphor-react-native/src/icons/Pentagon";
import { PercentIcon } from "phosphor-react-native/src/icons/Percent";
import { PillIcon } from "phosphor-react-native/src/icons/Pill";
import { PlantIcon } from "phosphor-react-native/src/icons/Plant";
import { PlugIcon } from "phosphor-react-native/src/icons/Plug";
import { ProhibitIcon } from "phosphor-react-native/src/icons/Prohibit";
import { PulseIcon } from "phosphor-react-native/src/icons/Pulse";
import { RadioIcon } from "phosphor-react-native/src/icons/Radio";
import { ScalesIcon } from "phosphor-react-native/src/icons/Scales";
import { ScrollIcon } from "phosphor-react-native/src/icons/Scroll";
import { SealIcon } from "phosphor-react-native/src/icons/Seal";
import { SealWarningIcon } from "phosphor-react-native/src/icons/SealWarning";
import { ShieldCheckIcon } from "phosphor-react-native/src/icons/ShieldCheck";
import { ShieldChevronIcon } from "phosphor-react-native/src/icons/ShieldChevron";
import { ShieldStarIcon } from "phosphor-react-native/src/icons/ShieldStar";
import { ShippingContainerIcon } from "phosphor-react-native/src/icons/ShippingContainer";
import { ShovelIcon } from "phosphor-react-native/src/icons/Shovel";
import { SignatureIcon } from "phosphor-react-native/src/icons/Signature";
import { SirenIcon } from "phosphor-react-native/src/icons/Siren";
import { SignpostIcon } from "phosphor-react-native/src/icons/Signpost";
import { SlidersHorizontalIcon } from "phosphor-react-native/src/icons/SlidersHorizontal";
import { SolarPanelIcon } from "phosphor-react-native/src/icons/SolarPanel";
import { SquaresFourIcon } from "phosphor-react-native/src/icons/SquaresFour";
import { StackIcon } from "phosphor-react-native/src/icons/Stack";
import { StampIcon } from "phosphor-react-native/src/icons/Stamp";
import { StorefrontIcon } from "phosphor-react-native/src/icons/Storefront";
import { SuitcaseIcon } from "phosphor-react-native/src/icons/Suitcase";
import { SunIcon } from "phosphor-react-native/src/icons/Sun";
import { SwordIcon } from "phosphor-react-native/src/icons/Sword";
import { TShirtIcon } from "phosphor-react-native/src/icons/TShirt";
import { TargetIcon } from "phosphor-react-native/src/icons/Target";
import { TelevisionIcon } from "phosphor-react-native/src/icons/Television";
import { ToolboxIcon } from "phosphor-react-native/src/icons/Toolbox";
import { TrainIcon } from "phosphor-react-native/src/icons/Train";
import { TrayIcon } from "phosphor-react-native/src/icons/Tray";
import { TreeIcon } from "phosphor-react-native/src/icons/Tree";
import { TrendDownIcon } from "phosphor-react-native/src/icons/TrendDown";
import { TrendUpIcon } from "phosphor-react-native/src/icons/TrendUp";
import { UserIcon } from "phosphor-react-native/src/icons/User";
import { UserMinusIcon } from "phosphor-react-native/src/icons/UserMinus";
import { UserPlusIcon } from "phosphor-react-native/src/icons/UserPlus";
import { UsersThreeIcon } from "phosphor-react-native/src/icons/UsersThree";
import { VaultIcon } from "phosphor-react-native/src/icons/Vault";
import { VirusIcon } from "phosphor-react-native/src/icons/Virus";
import { WalletIcon } from "phosphor-react-native/src/icons/Wallet";
import { WarningIcon } from "phosphor-react-native/src/icons/Warning";
import { WaveformIcon } from "phosphor-react-native/src/icons/Waveform";
import { WavesIcon } from "phosphor-react-native/src/icons/Waves";
import { WrenchIcon } from "phosphor-react-native/src/icons/Wrench";
import { XCircleIcon } from "phosphor-react-native/src/icons/XCircle";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { GasPumpIcon } from "phosphor-react-native/src/icons/GasPump";
import { ThermometerHotIcon } from "phosphor-react-native/src/icons/ThermometerHot";
import { TornadoIcon } from "phosphor-react-native/src/icons/Tornado";
import { SnowflakeIcon } from "phosphor-react-native/src/icons/Snowflake";
import { ProhibitInsetIcon } from "phosphor-react-native/src/icons/ProhibitInset";
import { SealQuestionIcon } from "phosphor-react-native/src/icons/SealQuestion";
import { HourglassIcon } from "phosphor-react-native/src/icons/Hourglass";
import { SealCheckIcon } from "phosphor-react-native/src/icons/SealCheck";
import { CircleHalfIcon } from "phosphor-react-native/src/icons/CircleHalf";
import { MoonIcon } from "phosphor-react-native/src/icons/Moon";
import { CrudeBarrelIcon } from "./custom/commodity-glyphs";
import {
  AircraftCarrierIcon,
  ArmoredVehicleIcon,
  BomberIcon,
  FighterJetIcon,
  GroundFormationIcon,
  HelicopterIcon,
  MissileIcon,
  SatelliteIcon,
  SubmarineIcon,
  SurfaceCombatantIcon,
  TransportAircraftIcon,
} from "./custom/unit-glyphs";

export type IconCategory = "navigation" | "status" | "action" | "timeline" | "object" | "illustration" | "sector" | "commodity" | "instrument" | "department" | "economy" | "event" | "layer" | "subject" | "utility" | "format" | "unit";

export const ICONS = {
  desk: { category: "navigation", glyph: DeskIcon },
  domesticLedger: { category: "navigation", glyph: NotebookIcon },
  record: { category: "navigation", glyph: BookBookmarkIcon },
  westWing: { category: "navigation", glyph: BankIcon },
  world: { category: "navigation", glyph: GlobeHemisphereWestIcon },
  active: { category: "status", glyph: PulseIcon },
  adverse: { category: "status", glyph: TrendDownIcon },
  caution: { category: "status", glyph: WarningIcon },
  favorable: { category: "status", glyph: TrendUpIcon },
  hidden: { category: "status", glyph: EyeSlashIcon },
  info: { category: "status", glyph: InfoIcon },
  locked: { category: "status", glyph: LockIcon },
  neutral: { category: "status", glyph: MinusCircleIcon },
  open: { category: "status", glyph: FolderOpenIcon },
  statusBlocked: { category: "status", glyph: ProhibitInsetIcon },
  statusChallenged: { category: "status", glyph: SealQuestionIcon },
  statusExpired: { category: "status", glyph: HourglassIcon },
  statusIssued: { category: "status", glyph: SealCheckIcon },
  expandPanel: { category: "action", glyph: ArrowsOutSimpleIcon },
  restorePanel: { category: "action", glyph: ArrowsInSimpleIcon },
  chevron: { category: "action", glyph: CaretRightIcon },
  tap: { category: "action", glyph: HandTapIcon },
  glossary: { category: "action", glyph: BookOpenTextIcon },
  menu: { category: "action", glyph: ListIcon },
  close: { category: "action", glyph: XIcon },
  paused: { category: "status", glyph: PauseCircleIcon },
  pending: { category: "status", glyph: ClockIcon },
  appoint: { category: "action", glyph: UserPlusIcon },
  approve: { category: "action", glyph: CheckCircleIcon },
  archive: { category: "action", glyph: ArchiveIcon },
  brief: { category: "action", glyph: FileTextIcon },
  dispatch: { category: "action", glyph: PaperPlaneTiltIcon },
  escalate: { category: "action", glyph: ArrowFatLinesUpIcon },
  reject: { category: "action", glyph: XCircleIcon },
  return: { category: "action", glyph: ArrowUUpLeftIcon },
  review: { category: "action", glyph: MagnifyingGlassIcon },
  search: { category: "action", glyph: MagnifyingGlassIcon },
  schedule: { category: "action", glyph: CalendarDotsIcon },
  quickStart: { category: "action", glyph: FastForwardIcon },
  shuffle: { category: "action", glyph: ShuffleIcon },
  sign: { category: "action", glyph: SignatureIcon },
  veto: { category: "action", glyph: ProhibitIcon },
  budget: { category: "timeline", glyph: WalletIcon },
  conflict: { category: "timeline", glyph: CrosshairIcon },
  court: { category: "timeline", glyph: GavelIcon },
  decision: { category: "timeline", glyph: SignpostIcon },
  election: { category: "timeline", glyph: BoxArrowDownIcon },
  intel: { category: "timeline", glyph: DetectiveIcon },
  law: { category: "timeline", glyph: ScrollIcon },
  order: { category: "timeline", glyph: StampIcon },
  press: { category: "timeline", glyph: NewspaperIcon },
  summit: { category: "timeline", glyph: HandshakeIcon },
  ballot: { category: "object", glyph: ListChecksIcon },
  building: { category: "object", glyph: BuildingOfficeIcon },
  dossier: { category: "object", glyph: IdentificationCardIcon },
  flag: { category: "object", glyph: FlagIcon },
  folder: { category: "object", glyph: FolderIcon },
  gavel: { category: "object", glyph: GavelIcon },
  graph: { category: "object", glyph: ChartLineIcon },
  mapPin: { category: "object", glyph: MapPinIcon },
  microphone: { category: "object", glyph: MicrophoneIcon },
  shield: { category: "object", glyph: ShieldStarIcon },
  decisionChip: { category: "illustration", glyph: CardsIcon },
  emptyCabinet: { category: "illustration", glyph: ArmchairIcon },
  emptyInbox: { category: "illustration", glyph: TrayIcon },
  emptyRecord: { category: "illustration", glyph: BookOpenIcon },
  loadingOrbit: { category: "illustration", glyph: CircleNotchIcon },
  notificationStack: { category: "illustration", glyph: StackIcon },
  sectorAerospace: { category: "sector", glyph: AirplaneIcon },
  sectorAgriculture: { category: "sector", glyph: GrainsIcon },
  sectorAuto: { category: "sector", glyph: CarIcon },
  sectorChemicals: { category: "sector", glyph: FlaskIcon },
  sectorDefenseIndustrial: { category: "sector", glyph: ShieldChevronIcon },
  sectorEnergyGas: { category: "sector", glyph: FlameIcon },
  sectorEnergyNuclear: { category: "sector", glyph: AtomIcon },
  sectorEnergyOil: { category: "sector", glyph: DropIcon },
  sectorEnergyRenewables: { category: "sector", glyph: SolarPanelIcon },
  sectorFinance: { category: "sector", glyph: CurrencyDollarIcon },
  sectorFoodProcessing: { category: "sector", glyph: BreadIcon },
  sectorHealthcare: { category: "sector", glyph: FirstAidIcon },
  sectorHousingConstruction: { category: "sector", glyph: HardHatIcon },
  sectorMining: { category: "sector", glyph: ShovelIcon },
  sectorPharma: { category: "sector", glyph: PillIcon },
  sectorPortsShipping: { category: "sector", glyph: AnchorIcon },
  sectorPublicInfrastructure: { category: "sector", glyph: BridgeIcon },
  sectorSemiconductors: { category: "sector", glyph: CpuIcon },
  sectorSteelHeavy: { category: "sector", glyph: FactoryIcon },
  sectorTelecomCyber: { category: "sector", glyph: CellTowerIcon },
  sectorTextiles: { category: "sector", glyph: TShirtIcon },
  sectorTourismHospitality: { category: "sector", glyph: SuitcaseIcon },
  sectorUtilities: { category: "sector", glyph: PlugIcon },
  commodityAluminum: { category: "commodity", glyph: CubeIcon },
  commodityBatteries: { category: "commodity", glyph: BatteryChargingIcon },
  commodityCriticalMinerals: { category: "commodity", glyph: DiamondIcon },
  commodityCrudeOil: { category: "commodity", glyph: CrudeBarrelIcon },
  commodityFertilizer: { category: "commodity", glyph: LeafIcon },
  commodityMachineTools: { category: "commodity", glyph: WrenchIcon },
  commodityRefinedFuel: { category: "commodity", glyph: GasPumpIcon },
  commodityShipbuilding: { category: "commodity", glyph: BoatIcon },
  commoditySpecialtyCrops: { category: "commodity", glyph: PlantIcon },
  commoditySteel: { category: "commodity", glyph: HammerIcon },
  instrumentAssistance: { category: "instrument", glyph: HandHeartIcon },
  instrumentCovert: { category: "instrument", glyph: EyeIcon },
  instrumentDiplomatic: { category: "instrument", glyph: ChatsCircleIcon },
  instrumentEconomic: { category: "instrument", glyph: CoinsIcon },
  instrumentMilitary: { category: "instrument", glyph: SwordIcon },
  departmentBudget: { category: "department", glyph: CalculatorIcon },
  departmentCentralBank: { category: "department", glyph: VaultIcon },
  departmentCommerce: { category: "department", glyph: StorefrontIcon },
  departmentDefense: { category: "department", glyph: PentagonIcon },
  departmentEducation: { category: "department", glyph: GraduationCapIcon },
  departmentEnergy: { category: "department", glyph: LightningIcon },
  departmentEnvironment: { category: "department", glyph: TreeIcon },
  departmentHealthHumanServices: { category: "department", glyph: HeartbeatIcon },
  departmentHomelandSecurity: { category: "department", glyph: ShieldCheckIcon },
  departmentHousingUrban: { category: "department", glyph: HouseIcon },
  departmentInterior: { category: "department", glyph: MountainsIcon },
  departmentInvestigation: { category: "department", glyph: FingerprintIcon },
  departmentJustice: { category: "department", glyph: ScalesIcon },
  departmentLabor: { category: "department", glyph: ToolboxIcon },
  departmentNationalSecurity: { category: "department", glyph: TargetIcon },
  departmentState: { category: "department", glyph: GlobeStandIcon },
  departmentTransportation: { category: "department", glyph: TrainIcon },
  departmentTreasury: { category: "department", glyph: MoneyIcon },
  departmentVeteransAffairs: { category: "department", glyph: MedalIcon },
  economyGrowth: { category: "economy", glyph: ChartLineUpIcon },
  economyInflation: { category: "economy", glyph: PercentIcon },
  economyRecession: { category: "economy", glyph: ChartLineDownIcon },
  economyUnemployment: { category: "economy", glyph: UserMinusIcon },
  eventCyclone: { category: "event", glyph: HurricaneIcon },
  eventDrought: { category: "event", glyph: SunIcon },
  eventEarthquake: { category: "event", glyph: WaveformIcon },
  eventEnergyShortage: { category: "event", glyph: BatteryWarningIcon },
  eventFiscalCrisis: { category: "event", glyph: SealWarningIcon },
  eventFlood: { category: "event", glyph: WavesIcon },
  eventHousingCrunch: { category: "event", glyph: HouseLineIcon },
  eventPandemic: { category: "event", glyph: VirusIcon },
  eventHeatWave: { category: "event", glyph: ThermometerHotIcon },
  eventTornado: { category: "event", glyph: TornadoIcon },
  eventWinterStorm: { category: "event", glyph: SnowflakeIcon },
  eventEmergency: { category: "event", glyph: SirenIcon },
  eventUnrest: { category: "event", glyph: HandFistIcon },
  eventWildfire: { category: "event", glyph: FireIcon },
  unitAircraftCarrier: { category: "unit", glyph: AircraftCarrierIcon },
  unitArmoredVehicle: { category: "unit", glyph: ArmoredVehicleIcon },
  unitBomber: { category: "unit", glyph: BomberIcon },
  unitFighterJet: { category: "unit", glyph: FighterJetIcon },
  unitGroundFormation: { category: "unit", glyph: GroundFormationIcon },
  unitHelicopter: { category: "unit", glyph: HelicopterIcon },
  unitMissile: { category: "unit", glyph: MissileIcon },
  unitSatellite: { category: "unit", glyph: SatelliteIcon },
  unitSubmarine: { category: "unit", glyph: SubmarineIcon },
  unitSurfaceCombatant: { category: "unit", glyph: SurfaceCombatantIcon },
  unitTransportAircraft: { category: "unit", glyph: TransportAircraftIcon },
  layerBlocs: { category: "layer", glyph: SquaresFourIcon },
  layerConflict: { category: "layer", glyph: SwordIcon },
  layerLean: { category: "layer", glyph: ArrowsLeftRightIcon },
  layerReading: { category: "layer", glyph: GaugeIcon },
  layerRegime: { category: "layer", glyph: CrownIcon },
  layerTrust: { category: "layer", glyph: HandshakeIcon },
  subjectCapitol: { category: "subject", glyph: BankIcon },
  subjectChamber: { category: "subject", glyph: UsersThreeIcon },
  subjectPerson: { category: "subject", glyph: UserIcon },
  subjectSeal: { category: "subject", glyph: SealIcon },
  subjectTrade: { category: "subject", glyph: ShippingContainerIcon },
  utilitySettings: { category: "utility", glyph: SlidersHorizontalIcon },
  utilityThemeSystem: { category: "utility", glyph: CircleHalfIcon },
  utilityThemeLight: { category: "utility", glyph: SunIcon },
  utilityThemeDark: { category: "utility", glyph: MoonIcon },
  formatCable: { category: "format", glyph: TelevisionIcon },
  formatPodcast: { category: "format", glyph: HeadphonesIcon },
  formatRadio: { category: "format", glyph: RadioIcon },
  formatRegional: { category: "format", glyph: NewspaperClippingIcon },
  formatSite: { category: "format", glyph: BrowserIcon },
} as const satisfies Readonly<Record<string, { readonly category: IconCategory; readonly glyph: Glyph }>>;

export type IconName = keyof typeof ICONS;
