/**
 * Unit detection for DXF import
 * Provides heuristics to detect appropriate units based on file extent
 *
 * The detection algorithm scores each unit based on how well the file's
 * extent matches the expected range for that unit. The unit with the
 * highest score is selected.
 *
 * Typical ranges:
 * - mm (millimeters): 100-50,000 units (e.g., architectural drawings)
 * - cm (centimeters): 10-5,000 units
 * - m (meters): 1-500 units
 * - ft (feet): 3-1,600 units
 */

const UNIT_THRESHOLDS = {
  mm: { min: 100, max: 50000 },
  cm: { min: 10, max: 5000 },
  m: { min: 1, max: 500 },
  ft: { min: 3, max: 1600 },
};

const UNIT_SCALE_TO_METERS = {
  mm: 0.001,
  cm: 0.01,
  m: 1.0,
  ft: 0.3048,
  auto: 1.0,
};

/**
 * Detects the most likely unit based on file extent
 * @param {Object} extent - The bounding box of the DXF file
 * @param {number} extent.minX - Minimum X coordinate
 * @param {number} extent.maxX - Maximum X coordinate
 * @param {number} extent.minY - Minimum Y coordinate
 * @param {number} extent.maxY - Maximum Y coordinate
 * @returns {string} Detected unit ('mm', 'cm', 'm', 'ft', or 'auto')
 */
export function detectUnit(extent) {
  if (!extent || typeof extent !== 'object') {
    return 'auto';
  }

  const { minX, maxX, minY, maxY } = extent;

  if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
    return 'auto';
  }

  const width = Math.abs(maxX - minX);
  const height = Math.abs(maxY - minY);
  const maxDimension = Math.max(width, height);

  if (maxDimension === 0) {
    return 'auto';
  }

  const unitScores = Object.entries(UNIT_THRESHOLDS).map(([unit, { min, max }]) => {
    let score = 0;

    if (maxDimension >= min && maxDimension <= max) {
      const midpoint = (min + max) / 2;
      const deviation = Math.abs(maxDimension - midpoint);
      const normalizedDeviation = deviation / (max - min);
      score = 1.0 - normalizedDeviation;
    }

    return { unit, score };
  });

  unitScores.sort((a, b) => b.score - a.score);

  if (unitScores[0].score > 0) {
    return unitScores[0].unit;
  }

  if (maxDimension < 1) {
    return 'cm';
  }
  if (maxDimension < 100) {
    return 'm';
  }
  if (maxDimension < 1000) {
    return 'cm';
  }
  return 'mm';
}

/**
 * Calculates the scale factor between two units
 * @param {string} unit - Source unit
 * @param {string} targetUnit - Target unit (default: 'm')
 * @returns {number} Scale factor to convert from source to target
 */
export function getScaleFactor(unit, targetUnit = 'm') {
  const fromScale = UNIT_SCALE_TO_METERS[unit] || 1.0;
  const toScale = UNIT_SCALE_TO_METERS[targetUnit] || 1.0;
  return fromScale / toScale;
}

/**
 * Gets the localized label for a unit
 * @param {string} unit - Unit identifier
 * @returns {string} Localized Chinese label
 */
export function getUnitLabel(unit) {
  const labels = {
    auto: '自动',
    mm: '毫米',
    cm: '厘米',
    m: '米',
    ft: '英尺',
  };
  return labels[unit] || unit;
}
