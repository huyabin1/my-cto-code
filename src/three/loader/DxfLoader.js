import DxfParser from 'dxf-parser';

function approximateArc(arc) {
  const points = [];
  const { center, radius, startAngle, angleLength } = arc;

  if (!center || radius === undefined) {
    return points;
  }

  const actualSegments = Math.max(8, Math.ceil(Math.abs(angleLength) / (Math.PI / 8)));
  const step = angleLength / actualSegments;

  for (let i = 0; i <= actualSegments; i += 1) {
    const angle = startAngle + step * i;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return points;
}

function normalizeEntity(entity) {
  if (!entity || !entity.type) {
    return null;
  }

  const normalized = {
    type: entity.type,
    layer: entity.layer || '0',
    color: entity.colorIndex !== undefined ? entity.colorIndex : 7,
    points: [],
  };

  switch (entity.type) {
    case 'LINE':
      if (entity.vertices && entity.vertices.length >= 2) {
        normalized.points = entity.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z || 0 }));
      }
      break;

    case 'LWPOLYLINE':
    case 'POLYLINE':
      if (entity.vertices && entity.vertices.length > 0) {
        normalized.points = entity.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z || 0 }));
      }
      break;

    case 'ARC':
      if (entity.center && entity.radius !== undefined) {
        const arcPoints = approximateArc(entity);
        normalized.points = arcPoints.map((p) => ({ x: p.x, y: p.y, z: 0 }));
      }
      break;

    case 'CIRCLE':
      if (entity.center && entity.radius !== undefined) {
        const segments = 64;
        for (let i = 0; i <= segments; i += 1) {
          const angle = (i / segments) * Math.PI * 2;
          normalized.points.push({
            x: entity.center.x + entity.radius * Math.cos(angle),
            y: entity.center.y + entity.radius * Math.sin(angle),
            z: 0,
          });
        }
      }
      break;

    default:
      return null;
  }

  if (normalized.points.length === 0) {
    return null;
  }

  return normalized;
}

function calculateExtent(entities) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  entities.forEach((entity) => {
    if (entity.points) {
      entity.points.forEach((point) => {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
      });
    }
  });

  if (minX === Infinity) {
    return null;
  }

  return { minX, maxX, minY, maxY };
}

function parseDxfContentSync(content) {
  const parser = new DxfParser();
  let dxf;

  try {
    dxf = parser.parseSync(content);
  } catch (err) {
    throw new Error(`DXF parsing failed: ${err.message}`);
  }

  if (!dxf || !dxf.entities) {
    throw new Error('Invalid DXF file: no entities found');
  }

  const normalizedEntities = [];
  const layersMap = {};

  dxf.entities.forEach((entity) => {
    const normalized = normalizeEntity(entity);
    if (normalized) {
      normalizedEntities.push(normalized);

      if (!layersMap[normalized.layer]) {
        layersMap[normalized.layer] = {
          name: normalized.layer,
          visible: true,
          entities: [],
        };
      }
      layersMap[normalized.layer].entities.push(normalized);
    }
  });

  const extent = calculateExtent(normalizedEntities);
  const layers = Object.values(layersMap);

  return {
    entities: normalizedEntities,
    layers,
    extent,
    totalEntities: normalizedEntities.length,
  };
}

/**
 * DXF file loader with web worker support
 *
 * Parses DXF (Drawing Exchange Format) files and normalizes entities
 * into a unified polyline representation for rendering.
 *
 * Features:
 * - Asynchronous parsing via web workers (when available)
 * - Synchronous fallback for test/legacy environments
 * - Entity normalization (LINE, LWPOLYLINE, ARC, CIRCLE)
 * - Layer and color extraction
 * - Bounding box calculation
 *
 * @example
 * const loader = new DxfLoader();
 * const result = await loader.load(file);
 * console.log(result.entities, result.layers, result.extent);
 * loader.dispose();
 */
class DxfLoader {
  constructor() {
    this.worker = null;
    this.workerAvailable = typeof Worker !== 'undefined';
    this.pendingRequests = new Map();
    this.nextRequestId = 0;
  }

  initWorker() {
    if (!this.workerAvailable || this.worker) {
      return;
    }

    if (process.env.NODE_ENV === 'test') {
      this.workerAvailable = false;
      return;
    }

    try {
      const workerCode = `
        import DxfParser from 'dxf-parser';
        
        function approximateArc(arc, segments = 32) {
          const points = [];
          const { center, radius, startAngle, endAngle, angleLength } = arc;
          if (!center || radius === undefined) {
            return points;
          }
          const actualSegments = Math.max(8, Math.ceil(Math.abs(angleLength) / (Math.PI / 8)));
          const step = angleLength / actualSegments;
          for (let i = 0; i <= actualSegments; i += 1) {
            const angle = startAngle + step * i;
            points.push({
              x: center.x + radius * Math.cos(angle),
              y: center.y + radius * Math.sin(angle),
            });
          }
          return points;
        }
        
        function normalizeEntity(entity) {
          if (!entity || !entity.type) {
            return null;
          }
          const normalized = {
            type: entity.type,
            layer: entity.layer || '0',
            color: entity.colorIndex !== undefined ? entity.colorIndex : 7,
            points: [],
          };
          switch (entity.type) {
            case 'LINE':
              if (entity.vertices && entity.vertices.length >= 2) {
                normalized.points = entity.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z || 0 }));
              }
              break;
            case 'LWPOLYLINE':
            case 'POLYLINE':
              if (entity.vertices && entity.vertices.length > 0) {
                normalized.points = entity.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z || 0 }));
              }
              break;
            case 'ARC':
              if (entity.center && entity.radius !== undefined) {
                const arcPoints = approximateArc(entity);
                normalized.points = arcPoints.map((p) => ({ x: p.x, y: p.y, z: 0 }));
              }
              break;
            case 'CIRCLE':
              if (entity.center && entity.radius !== undefined) {
                const segments = 64;
                for (let i = 0; i <= segments; i += 1) {
                  const angle = (i / segments) * Math.PI * 2;
                  normalized.points.push({
                    x: entity.center.x + entity.radius * Math.cos(angle),
                    y: entity.center.y + entity.radius * Math.sin(angle),
                    z: 0,
                  });
                }
              }
              break;
            default:
              return null;
          }
          if (normalized.points.length === 0) {
            return null;
          }
          return normalized;
        }
        
        function calculateExtent(entities) {
          let minX = Infinity;
          let maxX = -Infinity;
          let minY = Infinity;
          let maxY = -Infinity;
          entities.forEach((entity) => {
            if (entity.points) {
              entity.points.forEach((point) => {
                if (point.x < minX) minX = point.x;
                if (point.x > maxX) maxX = point.x;
                if (point.y < minY) minY = point.y;
                if (point.y > maxY) maxY = point.y;
              });
            }
          });
          if (minX === Infinity) {
            return null;
          }
          return { minX, maxX, minY, maxY };
        }
        
        function parseDxfContentSync(content) {
          const parser = new DxfParser();
          let dxf;
          try {
            dxf = parser.parseSync(content);
          } catch (err) {
            throw new Error(\`DXF parsing failed: \${err.message}\`);
          }
          if (!dxf || !dxf.entities) {
            throw new Error('Invalid DXF file: no entities found');
          }
          const normalizedEntities = [];
          const layersMap = {};
          dxf.entities.forEach((entity) => {
            const normalized = normalizeEntity(entity);
            if (normalized) {
              normalizedEntities.push(normalized);
              if (!layersMap[normalized.layer]) {
                layersMap[normalized.layer] = {
                  name: normalized.layer,
                  visible: true,
                  entities: [],
                };
              }
              layersMap[normalized.layer].entities.push(normalized);
            }
          });
          const extent = calculateExtent(normalizedEntities);
          const layers = Object.values(layersMap);
          return {
            entities: normalizedEntities,
            layers,
            extent,
            totalEntities: normalizedEntities.length,
          };
        }
        
        self.addEventListener('message', (event) => {
          const { id, content } = event.data;
          try {
            const result = parseDxfContentSync(content);
            self.postMessage({ id, success: true, data: result });
          } catch (error) {
            self.postMessage({ id, success: false, error: error.message });
          }
        });
      `;

      const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(workerBlob), { type: 'module' });

      this.worker.addEventListener('message', (event) => {
        const { id, success, data, error } = event.data;
        const request = this.pendingRequests.get(id);

        if (!request) {
          return;
        }

        this.pendingRequests.delete(id);

        if (success) {
          request.resolve(data);
        } else {
          request.reject(new Error(error));
        }
      });

      this.worker.addEventListener('error', () => {
        this.worker = null;
        this.workerAvailable = false;
      });
    } catch (err) {
      this.worker = null;
      this.workerAvailable = false;
    }
  }

  async parseAsync(content) {
    if (!this.workerAvailable) {
      return parseDxfContentSync(content);
    }

    if (!this.worker) {
      this.initWorker();
    }

    if (!this.worker) {
      return parseDxfContentSync(content);
    }

    const id = this.nextRequestId;
    this.nextRequestId += 1;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ id, content });
    });
  }

  static parseSync(content) {
    return parseDxfContentSync(content);
  }

  async load(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const content = event.target.result;
          const result = await this.parseAsync(content);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

export default DxfLoader;
