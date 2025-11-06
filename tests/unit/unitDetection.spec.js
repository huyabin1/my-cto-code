import { detectUnit, getScaleFactor, getUnitLabel } from '@/utils/unitDetection';

describe('unitDetection', () => {
  describe('detectUnit', () => {
    it('should return auto for invalid extent', () => {
      expect(detectUnit(null)).toBe('auto');
      expect(detectUnit({})).toBe('auto');
      expect(detectUnit({ minX: 0 })).toBe('auto');
    });

    it('should return auto for zero dimension', () => {
      const extent = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      expect(detectUnit(extent)).toBe('auto');
    });

    it('should detect mm for large dimensions', () => {
      const extent = { minX: 0, maxX: 5000, minY: 0, maxY: 3000 };
      expect(detectUnit(extent)).toBe('mm');
    });

    it('should detect cm for medium dimensions', () => {
      const extent = { minX: 0, maxX: 2000, minY: 0, maxY: 1500 };
      expect(detectUnit(extent)).toBe('cm');
    });

    it('should detect m for small dimensions', () => {
      const extent = { minX: 0, maxX: 10, minY: 0, maxY: 8 };
      expect(detectUnit(extent)).toBe('m');
    });

    it('should detect m for very small dimensions', () => {
      const extent = { minX: 0, maxX: 5, minY: 0, maxY: 3 };
      expect(detectUnit(extent)).toBe('m');
    });

    it('should handle negative coordinates', () => {
      const extent = { minX: -2500, maxX: 2500, minY: -1500, maxY: 1500 };
      expect(detectUnit(extent)).toBe('mm');
    });
  });

  describe('getScaleFactor', () => {
    it('should return 1.0 for same unit conversion', () => {
      expect(getScaleFactor('m', 'm')).toBe(1.0);
      expect(getScaleFactor('mm', 'mm')).toBe(1.0);
    });

    it('should convert mm to m correctly', () => {
      expect(getScaleFactor('mm', 'm')).toBe(0.001);
    });

    it('should convert cm to m correctly', () => {
      expect(getScaleFactor('cm', 'm')).toBe(0.01);
    });

    it('should convert ft to m correctly', () => {
      expect(getScaleFactor('ft', 'm')).toBeCloseTo(0.3048, 4);
    });

    it('should convert m to mm correctly', () => {
      expect(getScaleFactor('m', 'mm')).toBeCloseTo(1000, 4);
    });

    it('should handle unknown units with default scale', () => {
      expect(getScaleFactor('unknown', 'm')).toBe(1.0);
      expect(getScaleFactor('m', 'unknown')).toBe(1.0);
    });
  });

  describe('getUnitLabel', () => {
    it('should return correct Chinese labels', () => {
      expect(getUnitLabel('auto')).toBe('自动');
      expect(getUnitLabel('mm')).toBe('毫米');
      expect(getUnitLabel('cm')).toBe('厘米');
      expect(getUnitLabel('m')).toBe('米');
      expect(getUnitLabel('ft')).toBe('英尺');
    });

    it('should return the unit itself for unknown units', () => {
      expect(getUnitLabel('unknown')).toBe('unknown');
    });
  });
});
