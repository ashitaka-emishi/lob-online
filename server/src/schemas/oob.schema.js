import { z } from 'zod';

const WeaponType = z.enum(['R', 'M', 'SR', 'C']);
const GunType = z.enum(['R', 'N', 'H', 'L', 'HvR']);
const AmmoClass = z.enum(['B', 'C', 'D']);
const MoraleRating = z.enum(['A', 'B', 'C', 'D']);
const UnitType = z.enum(['infantry', 'cavalry', 'artillery']);

const InfantryCavalryUnit = z.object({
  id: z.string(),
  name: z.string(),
  type: UnitType,
  morale: MoraleRating,
  weapon: WeaponType,
  strengthPoints: z.number().int().positive(),
  stragglerBoxes: z.number().int().positive(),
  _errata: z.string().optional(),
  _note: z.string().optional(),
});

const ArtilleryBattery = z.object({
  id: z.string(),
  name: z.string(),
  gunType: GunType,
  strengthPoints: z.number().int().positive(),
  ammoClass: AmmoClass,
  _errata: z.string().optional(),
  _note: z.string().optional(),
});

const Brigade = z.object({
  id: z.string(),
  name: z.string(),
  morale: MoraleRating,
  wreckThreshold: z.number().int().positive(),
  wreckTrackTotal: z.number().int().positive(),
  regiments: z.array(InfantryCavalryUnit),
  _note: z.string().optional(),
});

const ArtilleryGroup = z.record(
  z.string(),
  z.object({
    name: z.string(),
    batteries: z.array(ArtilleryBattery),
  })
);

const Division = z.object({
  id: z.string(),
  name: z.string(),
  divisionStragglerBoxes: z.number().int().positive(),
  divisionWreckThreshold: z.number().int().positive(),
  artillery: ArtilleryGroup.optional(),
  brigades: z.array(Brigade),
});

const Corps = z.object({
  id: z.string(),
  name: z.string(),
  corpsUnits: z.array(InfantryCavalryUnit).optional(),
  artillery: ArtilleryGroup.optional(),
  divisions: z.array(Division),
});

const CavalryDivision = z.object({
  id: z.string(),
  name: z.string(),
  _note: z.string().optional(),
  artillery: ArtilleryGroup.optional(),
  brigades: z.array(Brigade),
});

const UnionOOB = z.object({
  army: z.string(),
  supplyTrain: z.object({ id: z.string(), name: z.string() }),
  corps: z.array(Corps),
  cavalryDivision: CavalryDivision,
});

const ConfederateOOB = z.object({
  army: z.string(),
  wing: z.string(),
  supplyWagon: z.object({ id: z.string(), name: z.string() }),
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
  id: z.string(),
  name: z.string(),
  _note: z.string().optional(),
  morale: MoraleRating,
  wreckThreshold: z.number().int().positive(),
  wreckTrackTotal: z.number().int().positive(),
  artillery: ArtilleryGroup.optional(),
  regiments: z.array(InfantryCavalryUnit),
});

const ConfederateOOBWithIndependent = ConfederateOOB.extend({
  independentBrigades: z.array(IndependentBrigade).optional(),
});

export const OOBSchema = z.object({
  _status: z.string(),
  _source: z.string(),
  _errata_applied: z.array(z.string()),
  _notes: z.record(z.string(), z.string()).optional(),
  union: UnionOOB,
  confederate: ConfederateOOBWithIndependent,
});
