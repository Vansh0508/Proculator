export enum DimensionUnit {
  CM = 'cm',
  INCH = 'inch'
}

export interface ServiceabilityData {
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  zone: string;
  city: string;
  state: string;
}

export interface LogisticsSettings {
  volumetricDivisor: number;
  minChargeableWeight: number; // e.g. 20kg
  minFreightAmount: number; // e.g. 350
  
  // Surcharges
  fuelSurchargePercent: number; // 25
  awbCharge: number; // 100
  cftDensityMin: number; // 7 (optional usage)
  
  // ODA
  odaPerKg: number; // 8
  odaMin: number; // 1000
  
  // Handling
  handling70to200: number; // 3
  handlingAbove200: number; // 4
  
  // Value Added Services
  codPercent: number; // 1
  codMin: number; // 50
  rovPercent: number; // 0.5
  rovMin: number; // 100
  
  // Extra
  csdCharge: number; // 1000
  timeSpecificPerKg: number; // 3
  timeSpecificMin: number; // 1500
  mallDeliveryPerKg: number; // 3
  mallDeliveryMin: number; // 500
  reattemptPerKg: number; // 3
  reattemptMin: number; // 500
  
  regionalSurcharge: number; // 5

  // Data
  serviceabilityMap: Record<string, ServiceabilityData> | null;
}

export interface Dimensions {
  length: number;
  breadth: number;
  height: number;
}

export interface LocationData {
  pincode: string;
  city: string;
  state: string;
  loading: boolean;
}

export interface RateMatrixRow {
  [destinationZone: string]: number;
}

export interface RateMatrix {
  [sourceZone: string]: RateMatrixRow;
}

export interface CalculationResult {
  volumetricWeight: number;
  deadWeight: number;
  chargeableWeight: number;
  zoneFrom: string;
  zoneTo: string;
  baseRate: number;
  freightCharge: number;
  
  // Surcharges
  fuelSurcharge: number;
  awbCharge: number;
  odaCharge: number;
  handlingCharge: number;
  rovCharge: number;
  codCharge: number;
  regionalCharge: number;
  otherSurcharges: number; // Mall, CSD, etc.
  
  totalCost: number;
  isOda: boolean;
  pickupOda: boolean;
  deliveryOda: boolean;
  warnings: string[];
}

export interface ShipmentOptions {
  isCod: boolean;
  isRov: boolean; // Carrier Risk
  isCsd: boolean;
  isMallDelivery: boolean;
  isTimeSpecific: boolean;
  isHoliday: boolean;
  isReattempt: boolean;
}