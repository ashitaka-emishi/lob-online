import { z } from 'zod';

import { BaseCounterRef } from './shared.schema.js';

const CounterRef = BaseCounterRef;

// #316 — bounded primitives for entity identifiers across all OOB sub-schemas
const EntityId = z.string().max(64);
const EntityName = z.string().max(128);

const WeaponType = z.enum(['R', 'M', 'SR', 'C']);
const GunType = z.enum(['R', 'N', 'H', 'L', 'HvR']);
const MoraleRating = z.enum(['A', 'B', 'C', 'D']);
const UnitType = z.enum(['infantry', 'cavalry', 'artillery']);

const InfantryCavalryUnit = z.object({
  id: EntityId,
  name: EntityName,
  type: UnitType,
  morale: MoraleRating,
  weapon: WeaponType,
  strengthPoints: z.number().int().positive(),
  counterRef: CounterRef.optional(),
  _errata: z.string().optional(),
  _note: z.string().optional(),
});

const ArtilleryBattery = z.object({
  id: EntityId,
  name: EntityName,
  gunType: GunType,
  strengthPoints: z.number().int().positive(),
  morale: MoraleRating,
  counterRef: CounterRef.optional(),
  _errata: z.string().optional(),
  _note: z.string().optional(),
});

const HqNode = z.object({
  id: EntityId,
  name: EntityName,
  counterRef: CounterRef.optional(),
});

const SupplyNode = z.object({
  id: EntityId,
  name: EntityName,
  counterRef: CounterRef.optional(),
});

const Brigade = z.object({
  id: EntityId,
  name: EntityName.optional(),
  wreckThreshold: z.number().int().positive(),
  successionIds: z.array(EntityId).optional().default([]),
  counterRef: CounterRef.optional(),
  regiments: z.array(InfantryCavalryUnit),
  batteries: z.array(ArtilleryBattery).optional(),
  _note: z.string().optional(),
});

const ArtilleryGroup = z.record(
  z.string(),
  z.object({
    name: EntityName.optional(),
    batteries: z.array(ArtilleryBattery),
  })
);

const Division = z.object({
  id: EntityId,
  name: EntityName,
  wreckThreshold: z.number().int().positive(),
  successionIds: z.array(EntityId).optional().default([]),
  counterRef: CounterRef.optional(),
  hq: HqNode.optional(),
  artillery: ArtilleryGroup.optional(),
  batteries: z.array(ArtilleryBattery).optional(),
  brigades: z.array(Brigade),
});

const Corps = z.object({
  id: EntityId,
  name: EntityName,
  successionIds: z.array(EntityId).optional().default([]),
  counterRef: CounterRef.optional(),
  hq: HqNode.optional(),
  supply: SupplyNode.optional(),
  corpsUnits: z.array(InfantryCavalryUnit).optional(),
  artillery: ArtilleryGroup.optional(),
  divisions: z.array(Division),
});

const CavalryDivision = z.object({
  id: EntityId,
  name: EntityName,
  successionIds: z.array(EntityId).optional().default([]),
  counterRef: CounterRef.optional(),
  hq: HqNode.optional(),
  _note: z.string().optional(),
  artillery: ArtilleryGroup.optional(),
  brigades: z.array(Brigade),
});

const UnionOOB = z.object({
  army: EntityName,
  supplyTrain: SupplyNode,
  corps: z.array(Corps),
  cavalryDivision: CavalryDivision,
});

const ConfederateOOB = z.object({
  army: EntityName,
  wing: EntityName,
  supplyWagon: SupplyNode,
  independent: z.object({
    _note: z.string().optional(),
    cavalry: z.array(InfantryCavalryUnit),
    artillery: z.array(ArtilleryBattery),
  }),
  reserveArtillery: z.object({
    _note: z.string().optional(),
    batteries: z.array(ArtilleryBattery),
  }),
  divisions: z.array(Division),
});

const IndependentBrigade = z.object({
  id: EntityId,
  name: EntityName,
  _note: z.string().optional(),
  wreckThreshold: z.number().int().positive(),
  successionIds: z.array(EntityId).optional().default([]),
  counterRef: CounterRef.optional(),
  artillery: ArtilleryGroup.optional(),
  regiments: z.array(InfantryCavalryUnit),
});

const ConfederateOOBWithIndependent = ConfederateOOB.extend({
  independentBrigades: z.array(IndependentBrigade).optional(),
});

export const OOBSchema = z
  .object({
    _status: z.string(),
    _source: z.string(),
    _errata_applied: z.array(z.string()),
    _notes: z.record(z.string(), z.string()).optional(),
    _savedAt: z.number().optional(),
    union: UnionOOB,
    confederate: ConfederateOOBWithIndependent,
  })
  .strict();
