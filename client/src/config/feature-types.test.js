import { describe, it, expect } from 'vitest';
import {
  TERRAIN_COLORS,
  ROAD_GROUPS,
  STREAM_WALL_GROUPS,
  CONTOUR_GROUPS,
  FORD_BRIDGE_SYMBOLS,
} from './feature-types.js';

describe('feature-types', () => {
  describe('TERRAIN_COLORS', () => {
    it('exports an object keyed by terrain type', () => {
      expect(TERRAIN_COLORS).toBeTypeOf('object');
    });

    it('includes all required terrain types', () => {
      const required = [
        'clear',
        'woods',
        'orchard',
        'marsh',
        'slopingGround',
        'woodedSloping',
        'unknown',
      ];
      for (const type of required) {
        expect(TERRAIN_COLORS).toHaveProperty(type);
      }
    });

    it('clear terrain has null color (no fill)', () => {
      expect(TERRAIN_COLORS.clear).toBeNull();
    });

    it('non-clear terrains have rgba color strings', () => {
      const colored = ['woods', 'orchard', 'marsh', 'slopingGround', 'woodedSloping', 'unknown'];
      for (const type of colored) {
        expect(TERRAIN_COLORS[type]).toMatch(/^rgba\(/);
      }
    });
  });

  describe('ROAD_GROUPS', () => {
    it('is an array with three entries', () => {
      expect(Array.isArray(ROAD_GROUPS)).toBe(true);
      expect(ROAD_GROUPS).toHaveLength(3);
    });

    it('each entry has types, color, strokeWidth', () => {
      for (const group of ROAD_GROUPS) {
        expect(Array.isArray(group.types)).toBe(true);
        expect(group.types.length).toBeGreaterThan(0);
        expect(group.color).toBeTypeOf('string');
        expect(group.strokeWidth).toBeTypeOf('number');
      }
    });

    it('covers trail, road, pike', () => {
      const allTypes = ROAD_GROUPS.flatMap((g) => g.types);
      expect(allTypes).toContain('trail');
      expect(allTypes).toContain('road');
      expect(allTypes).toContain('pike');
    });

    it('trail has a dash pattern', () => {
      const trailGroup = ROAD_GROUPS.find((g) => g.types.includes('trail'));
      expect(trailGroup.dash).toBeTypeOf('string');
    });
  });

  describe('STREAM_WALL_GROUPS', () => {
    it('is an array with two entries', () => {
      expect(Array.isArray(STREAM_WALL_GROUPS)).toBe(true);
      expect(STREAM_WALL_GROUPS).toHaveLength(2);
    });

    it('covers stream and stoneWall', () => {
      const allTypes = STREAM_WALL_GROUPS.flatMap((g) => g.types);
      expect(allTypes).toContain('stream');
      expect(allTypes).toContain('stoneWall');
    });
  });

  describe('CONTOUR_GROUPS', () => {
    it('is an array with four entries', () => {
      expect(Array.isArray(CONTOUR_GROUPS)).toBe(true);
      expect(CONTOUR_GROUPS).toHaveLength(4);
    });

    it('covers elevation, slope, extremeSlope, verticalSlope', () => {
      const allTypes = CONTOUR_GROUPS.flatMap((g) => g.types);
      expect(allTypes).toContain('elevation');
      expect(allTypes).toContain('slope');
      expect(allTypes).toContain('extremeSlope');
      expect(allTypes).toContain('verticalSlope');
    });

    it('verticalSlope has a red-ish color', () => {
      const group = CONTOUR_GROUPS.find((g) => g.types.includes('verticalSlope'));
      expect(group.color).toMatch(/#[cC][cC]/); // starts with #cc
    });
  });

  describe('FORD_BRIDGE_SYMBOLS', () => {
    it('exports symbols for ford and bridge', () => {
      expect(FORD_BRIDGE_SYMBOLS).toHaveProperty('ford');
      expect(FORD_BRIDGE_SYMBOLS).toHaveProperty('bridge');
    });

    it('values are non-empty strings', () => {
      expect(FORD_BRIDGE_SYMBOLS.ford).toBeTypeOf('string');
      expect(FORD_BRIDGE_SYMBOLS.ford.length).toBeGreaterThan(0);
      expect(FORD_BRIDGE_SYMBOLS.bridge).toBeTypeOf('string');
      expect(FORD_BRIDGE_SYMBOLS.bridge.length).toBeGreaterThan(0);
    });
  });
});
