import DxfParser from 'dxf-parser';

export const UNIT_TO_METER = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
};

const DEFAULT_UNIT = 'mm';
const DEFAULT_COLOR = '#9ca3af';
const ACI_COLOR_MAP = {
  0: '#ffffff',
  1: '#ff0000',
  2: '#ffff00',
  3: '#00ff00',
  4: '#00ffff',
  5: '#0000ff',
  6: '#ff00ff',
  7: '#ffffff',
  8: '#808080',
  9: '#c0c0c0',
  10: '#ff0000',
  11: '#ff9900',
  12: '#ffff00',
  13: '#00ff00',
  14: '#00ffff',
  15: '#0000ff',
};
const UNIT_CODE_MAP = {
  4: 'mm',
  5: 'cm',
  6: 'm',
};

function arrayBufferToString(arrayBuffer) {
  if (!arrayBuffer) {
    return '';
  }

  try {
    if (typeof TextDecoder !== 'undefined') {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(arrayBuffer);
    }
  } catch (error) {
    // Fallback to manual conversion below
  }

  const bytes = new Uint8Array(arrayBuffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 1) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function colorFromAci(colorNumber) {
  if (typeof colorNumber !== 'number') {
    return DEFAULT_COLOR;
  }
  return ACI_COLOR_MAP[colorNumber] || DEFAULT_COLOR;
}

function trueColorToHex(color) {
  if (typeof color !== 'number') {
    return null;
  }
  const hex = color.toString(16).padStart(6, '0').slice(-6);
  return `#${hex}`;
}

function resolveEntityColor(entity, layerDefinition) {
  if (!entity) {
    return DEFAULT_COLOR;
  }

  if (typeof entity.trueColor === 'number') {
    const hex = trueColorToHex(entity.trueColor);
    if (hex) {
      return hex;
    }
  }

  if (entity.color && typeof entity.color === 'string') {
    return entity.color;
  }

  if (typeof entity.colorNumber === 'number') {
    return colorFromAci(entity.colorNumber);
  }

  if (layerDefinition && typeof layerDefinition.colorNumber === 'number') {
    return colorFromAci(layerDefinition.colorNumber);
  }

  return DEFAULT_COLOR;
}

function resolveLayerColor(layerDefinition) {
  if (!layerDefinition) {
    return DEFAULT_COLOR;
  }
  if (typeof layerDefinition.trueColor === 'number') {
    const hex = trueColorToHex(layerDefinition.trueColor);
    if (hex) {
      return hex;
    }
  }
  if (typeof layerDefinition.colorNumber === 'number') {
    return colorFromAci(layerDefinition.colorNumber);
  }
  return DEFAULT_COLOR;
}

function extractLayerDefinitions(dxf) {
  const tableCandidate =
    (dxf && dxf.tables && (dxf.tables.layers || dxf.tables.LAYER)) ||
    (dxf && dxf.tables && dxf.tables.layer);

  if (!tableCandidate) {
    return {};
  }

  let layerEntries = [];
  if (Array.isArray(tableCandidate)) {
    layerEntries = tableCandidate;
  } else if (Array.isArray(tableCandidate.layers)) {
    layerEntries = tableCandidate.layers;
  } else if (tableCandidate.layers && typeof tableCandidate.layers === 'object') {
    layerEntries = Object.values(tableCandidate.layers);
  } else if (tableCandidate.entries && Array.isArray(tableCandidate.entries)) {
    layerEntries = tableCandidate.entries;
  }

  return layerEntries.reduce((acc, layer) => {
    if (layer && layer.name) {
      acc[layer.name] = layer;
    }
    return acc;
  }, {});
}

function detectUnit(dxf) {
  const header = (dxf && dxf.header) || {};
  const unitCode = header.$INSUNITS;
  if (UNIT_CODE_MAP[unitCode]) {
    return UNIT_CODE_MAP[unitCode];
  }
  return DEFAULT_UNIT;
}

function sanitizePoints(points) {
  if (!Array.isArray(points)) {
    return [];
  }

  const normalized = points
    .map((point) => {
      if (Array.isArray(point)) {
        return { x: toNumber(point[0]), y: toNumber(point[1]) };
      }
      return {
        x: toNumber(point.x),
        y: toNumber(point.y),
      };
    })
    .filter((point, index, arr) => {
      if (index === 0) {
        return true;
      }
      const prev = arr[index - 1];
      return point.x !== prev.x || point.y !== prev.y;
    });

  if (normalized.length > 1) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (first.x === last.x && first.y === last.y) {
      normalized.pop();
    }
  }

  return normalized;
}

function lineToPolyline(entity) {
  if (!entity || !entity.start || !entity.end) {
    return null;
  }
  return {
    points: [
      { x: toNumber(entity.start.x), y: toNumber(entity.start.y) },
      { x: toNumber(entity.end.x), y: toNumber(entity.end.y) },
    ],
    isClosed: false,
  };
}

function lwPolylineToPolyline(entity) {
  if (!entity || !Array.isArray(entity.vertices) || entity.vertices.length < 2) {
    return null;
  }
  const points = entity.vertices.map((vertex) => ({
    x: toNumber(vertex.x),
    y: toNumber(vertex.y),
  }));

  const isClosed = Boolean(entity.shape) || Boolean(entity.closed) || Boolean(entity.isClosed) || Boolean(entity.flag & 1) || Boolean(entity.flags & 1);

  return {
    points,
    isClosed,
  };
}

function polylineToPolyline(entity) {
  if (!entity || !Array.isArray(entity.vertices) || entity.vertices.length < 2) {
    return null;
  }

  const points = entity.vertices.map((vertex) => ({
    x: toNumber(vertex.x),
    y: toNumber(vertex.y),
  }));
  const isClosed = Boolean(entity.closed) || Boolean(entity.isClosed) || Boolean(entity.flags & 1);

  return {
    points,
    isClosed,
  };
}

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

function arcToPolyline(entity, minimumSegments = 24) {
  if (!entity || !entity.center) {
    return null;
  }

  const radius = toNumber(entity.radius || entity.r);
  if (radius <= 0) {
    return null;
  }

  const start = radians(toNumber(entity.startAngle || entity.start || 0));
  let end = radians(toNumber(entity.endAngle || entity.end || 0));

  let sweep = end - start;
  if (sweep === 0) {
    sweep = Math.PI * 2;
  } else if (sweep < 0) {
    sweep += Math.PI * 2;
  }

  const segments = Math.max(minimumSegments, Math.ceil(Math.abs(sweep) / (Math.PI / 24)));
  const points = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = start + (sweep * i) / segments;
    const x = toNumber(entity.center.x) + radius * Math.cos(t);
    const y = toNumber(entity.center.y) + radius * Math.sin(t);
    points.push({ x, y });
  }

  return {
    points,
    isClosed: false,
  };
}

function circleToPolyline(entity) {
  const arcPolyline = arcToPolyline(
    {
      center: entity && entity.center ? entity.center : { x: 0, y: 0 },
      radius: entity ? entity.radius : 0,
      startAngle: 0,
      endAngle: 360,
    },
    48
  );

  if (!arcPolyline) {
    return null;
  }

  arcPolyline.isClosed = true;
  return arcPolyline;
}

function splineToPolyline(entity) {
  if (!entity) {
    return null;
  }

  const sourcePoints = Array.isArray(entity.fitPoints) && entity.fitPoints.length >= 2 ? entity.fitPoints : entity.controlPoints;
  if (!Array.isArray(sourcePoints) || sourcePoints.length < 2) {
    return null;
  }

  const points = sourcePoints.map((point) => ({
    x: toNumber(point.x),
    y: toNumber(point.y),
  }));

  return {
    points,
    isClosed: Boolean(entity.closed) || Boolean(entity.isClosed),
  };
}

function entityToPolylines(entity) {
  if (!entity || !entity.type) {
    return [];
  }

  switch (entity.type) {
    case 'LINE': {
      const polyline = lineToPolyline(entity);
      return polyline ? [polyline] : [];
    }
    case 'LWPOLYLINE': {
      const polyline = lwPolylineToPolyline(entity);
      return polyline ? [polyline] : [];
    }
    case 'POLYLINE': {
      const polyline = polylineToPolyline(entity);
      return polyline ? [polyline] : [];
    }
    case 'ARC': {
      const arcPolyline = arcToPolyline(entity);
      return arcPolyline ? [arcPolyline] : [];
    }
    case 'CIRCLE': {
      const circlePolyline = circleToPolyline(entity);
      return circlePolyline ? [circlePolyline] : [];
    }
    case 'SPLINE': {
      const splinePolyline = splineToPolyline(entity);
      return splinePolyline ? [splinePolyline] : [];
    }
    default:
      return [];
  }
}

function buildLayerData(dxf) {
  const entities = (dxf && Array.isArray(dxf.entities) && dxf.entities) || [];
  const layerDefinitions = extractLayerDefinitions(dxf);

  const layerMetadataMap = new Map();
  const layerGeometries = {};

  entities.forEach((entity) => {
    const polylines = entityToPolylines(entity);
    if (!polylines.length) {
      return;
    }

    const layerName = entity.layer || '0';
    const layerDefinition = layerDefinitions[layerName];
    const layerColor = resolveLayerColor(layerDefinition);
    const entityColor = resolveEntityColor(entity, layerDefinition);

    if (!layerMetadataMap.has(layerName)) {
      const layerRecord = {
        id: layerName,
        name: layerName,
        color: layerColor,
        visible: true,
        entityCount: 0,
      };
      layerMetadataMap.set(layerName, layerRecord);
      layerGeometries[layerName] = {
        name: layerName,
        color: layerColor,
        polylines: [],
      };
    }

    const layerRecord = layerMetadataMap.get(layerName);
    const layerGeometryRecord = layerGeometries[layerName];

    polylines.forEach((polyline) => {
      const sanitizedPoints = sanitizePoints(polyline.points);
      if (sanitizedPoints.length < 2) {
        return;
      }

      layerRecord.entityCount += 1;
      layerGeometryRecord.polylines.push({
        color: polyline.color || entityColor || layerColor,
        points: sanitizedPoints,
        isClosed: Boolean(polyline.isClosed),
      });
    });
  });

  const layers = Array.from(layerMetadataMap.values());

  return {
    layers,
    layerGeometries,
  };
}

export function parseDxfArrayBuffer(arrayBuffer) {
  if (!arrayBuffer) {
    throw new Error('DXF 数据为空');
  }

  const parser = new DxfParser();
  let dxf;
  try {
    const content = arrayBufferToString(arrayBuffer);
    dxf = parser.parseSync(content);
  } catch (error) {
    throw new Error(error && error.message ? error.message : 'DXF 文件解析失败');
  }

  const detectedUnit = detectUnit(dxf);
  const { layers, layerGeometries } = buildLayerData(dxf);

  return {
    layers,
    layerGeometries,
    detectedUnit,
  };
}

export function unitToMeters(unit) {
  return UNIT_TO_METER[unit] || UNIT_TO_METER[DEFAULT_UNIT];
}

export default parseDxfArrayBuffer;
