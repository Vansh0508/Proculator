import { RateMatrix } from '../types';

export const STATE_ZONE_MAP: Record<string, string> = {
  'delhi': 'N1',
  'new delhi': 'N1',
  'uttar pradesh': 'N1',
  'haryana': 'N1',
  'rajasthan': 'N1',
  
  'chandigarh': 'N2',
  'punjab': 'N2',
  'himachal pradesh': 'N2',
  'uttarakhand': 'N2',
  'jammu & kashmir': 'N2',
  'jammu and kashmir': 'N2',
  'ladakh': 'N2',
  
  'west bengal': 'E',
  'odisha': 'E',
  'bihar': 'E',
  'jharkhand': 'E',
  'chhattisgarh': 'E',
  
  'assam': 'NE',
  'meghalaya': 'NE',
  'tripura': 'NE',
  'arunachal pradesh': 'NE',
  'mizoram': 'NE',
  'manipur': 'NE',
  'nagaland': 'NE',
  'sikkim': 'NE',
  
  'gujarat': 'W1',
  'daman & diu': 'W1',
  'daman and diu': 'W1',
  'dadra & nagar haveli': 'W1',
  
  'maharashtra': 'W2',
  'goa': 'W2',
  
  'andhra pradesh': 'S1',
  'telangana': 'S1',
  'karnataka': 'S1',
  'tamil nadu': 'S1',
  'puducherry': 'S1',
  
  'kerala': 'S2',
  
  'madhya pradesh': 'Central'
};

export const ZONE_PRICE_MATRIX: RateMatrix = {
  'N1': { 'N1': 7.5, 'N2': 8.5, 'E': 15, 'NE': 20.5, 'W1': 11, 'W2': 12.5, 'S1': 13.5, 'S2': 14.5, 'Central': 10 },
  'N2': { 'N1': 8.78, 'N2': 10.13, 'E': 17.89, 'NE': 23.96, 'W1': 14.51, 'W2': 14.51, 'S1': 15.93, 'S2': 16.88, 'Central': 11.81 },
  'E': { 'N1': 11.14, 'N2': 12.83, 'E': 11.14, 'NE': 16.54, 'W1': 14.85, 'W2': 14.85, 'S1': 14.58, 'S2': 14.58, 'Central': 14.51 },
  'NE': { 'N1': 15.86, 'N2': 17.21, 'E': 12.83, 'NE': 13.84, 'W1': 19.24, 'W2': 19.24, 'S1': 18.23, 'S2': 18.98, 'Central': 20.93 },
  'W1': { 'N1': 10.8, 'N2': 12.83, 'E': 19.58, 'NE': 27, 'W1': 7.76, 'W2': 7.76, 'S1': 12.83, 'S2': 12.83, 'Central': 9.79 },
  'W2': { 'N1': 15.19, 'N2': 16.2, 'E': 23.29, 'NE': 30.71, 'W1': 11.14, 'W2': 11.14, 'S1': 15.53, 'S2': 15.53, 'Central': 11.81 },
  'S1': { 'N1': 18.56, 'N2': 19.58, 'E': 21.6, 'NE': 27.34, 'W1': 13.84, 'W2': 13.84, 'S1': 9.18, 'S2': 10.13, 'Central': 16.2 },
  'S2': { 'N1': 21.94, 'N2': 23.29, 'E': 24.64, 'NE': 29.36, 'W1': 17.55, 'W2': 17.55, 'S1': 11.88, 'S2': 11.88, 'Central': 19.58 },
  'Central': { 'N1': 11.81, 'N2': 12.83, 'E': 15.86, 'NE': 23.63, 'W1': 11.14, 'W2': 11.14, 'S1': 13.5, 'S2': 13.91, 'Central': 7.76 }
};

export const getZone = (stateName: string): string | null => {
  if (!stateName) return null;
  const normalized = stateName.toLowerCase().trim();
  return STATE_ZONE_MAP[normalized] || null;
};