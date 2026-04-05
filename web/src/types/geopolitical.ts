export type RelationshipType = 'formal_ally' | 'strategic_partner' | 'neutral' | 'rival' | 'adversary' | 'conflict';

export interface CountryRelationship {
  countryId: string;
  type: RelationshipType;
  strength: number;
  treaty?: string;
  sharedBorder: boolean;
}

export interface GeopoliticalProfile {
  allies: CountryRelationship[];
  adversaries: CountryRelationship[];
  neighbors: CountryRelationship[];
  tags: string[];
  governmentCategory: string;
  regimeStability: number;
}

export interface GeopoliticalPatch {
  allies: CountryRelationship[];
  adversaries: CountryRelationship[];
  neighbors: CountryRelationship[];
  governmentCategory: string;
  regimeStability: number;
  tags: string[];
}

export type GeopoliticalExportFormat = 'json' | 'csv' | 'yaml';

export interface CountryGeopoliticalData {
  id: string;
  name: string;
  region: string;
  geopolitical: GeopoliticalProfile | null;
}
