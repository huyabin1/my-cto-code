import * as THREE from 'three';
import DXFParser from 'dxf-parser';

/**
 * DXF Loader for parsing DXF files and converting to Three.js objects
 * Supports layer filtering, unit conversion, and async/worker processing
 */
export class DxfLoader {
  constructor() {
    this.parser = new DXFParser();
    this.unitConversions = {
      // DXF units to meters conversion
      Unitless: 1,
      Inches: 0.0254,
      Feet: 0.3048,
      Miles: 1609.344,
      Millimeters: 0.001,
      Centimeters: 0.01,
      Meters: 1,
      Kilometers: 1000,
      Microinches: 0.0000000254,
      Mils: 0.0000254,
      Yards: 0.9144,
      Angstroms: 1e-10,
      Nanometers: 1e-9,
      Microns: 1e-6,
      Decimeters: 0.1,
      Decameters: 10,
      Hectometers: 100,
      Gigameters: 1e9,
      Astronomical: 149597870700,
      Lightyears: 9.461e15,
      Parsecs: 3.086e16,
    };
  }

  /**
   * Parse DXF file content and return structured data
   * @param {string} dxfContent - Raw DXF file content
   * @param {Object} options - Parsing options
   * @param {string} options.targetUnit - Target unit for conversion ('auto', 'mm', 'cm', 'm', 'ft')
   * @param {Array<string>} options.visibleLayers - Array of layer names to include
   * @param {Function} options.onProgress - Progress callback function
   * @returns {Promise<Object>} Parsed DXF data
   */
  async parseAsync(dxfContent, options = {}) {
    const { targetUnit = 'auto', visibleLayers = null, onProgress = null } = options;

    try {
      if (onProgress) onProgress(0.1, '解析 DXF 文件...');

      // Parse DXF content
      const dxf = this.parser.parseSync(dxfContent);

      if (onProgress) onProgress(0.3, '分析图层和实体...');

      // Extract layers and entities
      const layers = DxfLoader.extractLayers(dxf);
      const entities = DxfLoader.extractEntities(dxf, visibleLayers);

      if (onProgress) onProgress(0.5, '转换单位...');

      // Determine unit conversion factor
      const conversionFactor = DxfLoader.getConversionFactor(dxf, targetUnit);

      if (onProgress) onProgress(0.7, '生成 Three.js 对象...');

      // Convert entities to Three.js objects
      const threeObjects = DxfLoader.createThreeObjects(entities, conversionFactor);

      if (onProgress) onProgress(0.9, '完成处理...');

      const sourceUnitCode = dxf.header?.$INSUNITS || 0;
      const sourceUnit = DxfLoader.getUnitNameFromCode(sourceUnitCode);

      const result = {
        layers,
        entities,
        threeObjects,
        conversionFactor,
        units: sourceUnit,
        unitCode: sourceUnitCode,
        header: dxf.header,
      };

      if (onProgress) onProgress(1.0, '完成');

      return result;
    } catch (error) {
      throw new Error(`DXF 解析失败: ${error.message}`);
    }
  }

  /**
   * Parse DXF content in a Web Worker
   * @param {string} dxfContent - Raw DXF file content
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} Parsed DXF data
   */
  parseInWorker(dxfContent, options = {}) {
    return new Promise((resolve, reject) => {
      // Create worker code as a blob
      const workerCode = `
        importScripts('https://unpkg.com/dxf-parser@1.1.2/dist/dxf-parser.js');
        
        const parser = new DXFParser();
        const unitConversions = ${JSON.stringify(this.unitConversions)};
        
        self.onmessage = function(e) {
          const { dxfContent, options } = e.data;
          
          try {
            const dxf = parser.parseSync(dxfContent);
            const layers = extractLayers(dxf);
            const entities = extractEntities(dxf, options.visibleLayers);
            const conversionFactor = getConversionFactor(dxf, options.targetUnit);
            const threeObjects = createThreeObjects(entities, conversionFactor);
            
            const sourceUnitCode = dxf.header?.$INSUNITS || 0;
            const sourceUnit = getUnitNameFromCode(sourceUnitCode);
            
            self.postMessage({
              success: true,
              result: {
                layers,
                entities,
                threeObjects,
                conversionFactor,
                units: sourceUnit,
                unitCode: sourceUnitCode,
                header: dxf.header,
              }
            });
          } catch (error) {
            self.postMessage({
              success: false,
              error: error.message
            });
          }
        };
        
        function extractLayers(dxf) {
          const layers = new Set();
          if (dxf.tables && dxf.tables.layer && dxf.tables.layer.layers) {
            Object.keys(dxf.tables.layer.layers).forEach(layerName => {
              layers.add(layerName);
            });
          }
          
          // Also collect layers from entities
          if (dxf.entities) {
            dxf.entities.forEach(entity => {
              if (entity.layer) {
                layers.add(entity.layer);
              }
            });
          }
          
          return Array.from(layers).map(name => ({
            id: name.toLowerCase().replace(/\\s+/g, '-'),
            name: name,
            visible: true
          }));
        }
        
        function extractEntities(dxf, visibleLayers) {
          if (!dxf.entities) return [];
          
          return dxf.entities.filter(entity => {
            if (!visibleLayers) return true;
            return visibleLayers.includes(entity.layer);
          });
        }
        
        function getConversionFactor(dxf, targetUnit) {
          const sourceUnitCode = dxf.header?.$INSUNITS || 0;
          const sourceUnit = getUnitNameFromCode(sourceUnitCode);
          
          if (targetUnit === 'auto') {
            return unitConversions[sourceUnit] || 1;
          }
          
          const targetConversion = {
            'mm': 0.001,
            'cm': 0.01,
            'm': 1,
            'ft': 0.3048
          };
          
          const sourceFactor = unitConversions[sourceUnit] || 1;
          const targetFactor = targetConversion[targetUnit] || 1;
          
          return sourceFactor / targetFactor;
        }
        
        function getUnitNameFromCode(unitCode) {
          const unitCodes = {
            0: 'Unitless',
            1: 'Inches',
            2: 'Feet',
            3: 'Miles',
            4: 'Millimeters',
            5: 'Centimeters',
            6: 'Meters',
            7: 'Kilometers',
            8: 'Microinches',
            9: 'Mils',
            10: 'Yards',
            11: 'Angstroms',
            12: 'Nanometers',
            13: 'Microns',
            14: 'Decimeters',
            15: 'Decameters',
            16: 'Hectometers',
            17: 'Gigameters',
            18: 'Astronomical',
            19: 'Lightyears',
            20: 'Parsecs',
          };
          
          return unitCodes[unitCode] || 'Unitless';
        }
        
        function createThreeObjects(entities, conversionFactor) {
          const objects = [];
          
          entities.forEach(entity => {
            let geometry = null;
            let material = new THREE.LineBasicMaterial({ 
              color: entity.color ? new THREE.Color(entity.color) : 0x000000,
              opacity: 0.8,
              transparent: true
            });
            
            switch (entity.type) {
              case 'LINE':
                if (entity.vertices && entity.vertices.length >= 2) {
                  geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(
                      entity.vertices[0].x * conversionFactor,
                      entity.vertices[0].y * conversionFactor,
                      entity.vertices[0].z || 0
                    ),
                    new THREE.Vector3(
                      entity.vertices[1].x * conversionFactor,
                      entity.vertices[1].y * conversionFactor,
                      entity.vertices[1].z || 0
                    )
                  ]);
                }
                break;
                
              case 'POLYLINE':
              case 'LWPOLYLINE':
                const points = [];
                if (entity.vertices) {
                  entity.vertices.forEach(vertex => {
                    points.push(new THREE.Vector3(
                      vertex.x * conversionFactor,
                      vertex.y * conversionFactor,
                      vertex.z || 0
                    ));
                  });
                } else if (entity.points) {
                  entity.points.forEach(point => {
                    points.push(new THREE.Vector3(
                      point.x * conversionFactor,
                      point.y * conversionFactor,
                      point.z || 0
                    ));
                  });
                } else if (entity.polylineVertices) {
                  // Handle LWPOLYLINE vertices
                  for (let i = 0; i < entity.polylineVertices.length; i += 2) {
                    points.push(new THREE.Vector3(
                      entity.polylineVertices[i] * conversionFactor,
                      entity.polylineVertices[i + 1] * conversionFactor,
                      0
                    ));
                  }
                }
                
                if (points.length > 1) {
                  geometry = new THREE.BufferGeometry().setFromPoints(points);
                  
                  // Close polyline if it's closed
                  if (entity.closed && points.length > 2) {
                    const positions = geometry.attributes.position.array;
                    const newPositions = new Float32Array(positions.length + 3);
                    newPositions.set(positions);
                    newPositions[positions.length] = points[0].x;
                    newPositions[positions.length + 1] = points[0].y;
                    newPositions[positions.length + 2] = points[0].z;
                    geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
                  }
                }
                break;
                
              case 'CIRCLE':
                const circleGeometry = new THREE.CircleGeometry(
                  entity.radius * conversionFactor,
                  32
                );
                geometry = new THREE.BufferGeometry().copy(circleGeometry);
                
                // Position the circle
                geometry.translate(
                  entity.center.x * conversionFactor,
                  entity.center.y * conversionFactor,
                  entity.center.z || 0
                );
                break;
                
              case 'ARC':
                const arcCurve = new THREE.EllipseCurve(
                  entity.center.x * conversionFactor,
                  entity.center.y * conversionFactor,
                  entity.radius * conversionFactor,
                  entity.radius * conversionFactor,
                  entity.startAngle,
                  entity.endAngle,
                  false,
                  0
                );
                
                const arcPoints = arcCurve.getPoints(32);
                geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
                break;
                
              default:
                // Skip unsupported entity types
                return;
            }
            
            if (geometry) {
              const line = new THREE.Line(geometry, material);
              line.userData = {
                entityType: entity.type,
                layer: entity.layer,
                handle: entity.handle,
                originalEntity: entity
              };
              objects.push(line);
            }
          });
          
          return objects;
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      worker.postMessage({ dxfContent, options });

      worker.onmessage = (e) => {
        const { success, result, error } = e.data;
        URL.revokeObjectURL(blob);

        if (success) {
          resolve(result);
        } else {
          reject(new Error(`DXF 解析失败: ${error}`));
        }
      };

      worker.onerror = (error) => {
        URL.revokeObjectURL(blob);
        reject(new Error(`Worker 错误: ${error.message}`));
      };
    });
  }

  /**
   * Extract layer information from DXF
   * @param {Object} dxf - Parsed DXF object
   * @returns {Array<Object>} Array of layer objects
   */
  static extractLayers(dxf) {
    const layers = new Set();

    // Get layers from layer table
    if (dxf.tables && dxf.tables.layer && dxf.tables.layer.layers) {
      Object.keys(dxf.tables.layer.layers).forEach((layerName) => {
        layers.add(layerName);
      });
    }

    // Also collect layers from entities
    if (dxf.entities) {
      dxf.entities.forEach((entity) => {
        if (entity.layer) {
          layers.add(entity.layer);
        }
      });
    }

    return Array.from(layers).map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      visible: true,
    }));
  }

  /**
   * Extract entities from DXF with optional layer filtering
   * @param {Object} dxf - Parsed DXF object
   * @param {Array<string>} visibleLayers - Array of layer names to include
   * @returns {Array<Object>} Array of entity objects
   */
  static extractEntities(dxf, visibleLayers = null) {
    if (!dxf.entities) return [];

    return dxf.entities.filter((entity) => {
      if (!visibleLayers) return true;
      return visibleLayers.includes(entity.layer);
    });
  }

  /**
   * Get unit conversion factor
   * @param {Object} dxf - Parsed DXF object
   * @param {string} targetUnit - Target unit ('auto', 'mm', 'cm', 'm', 'ft')
   * @returns {number} Conversion factor
   */
  static getConversionFactor(dxf, targetUnit) {
    const sourceUnitCode = dxf.header?.$INSUNITS || 0;
    const sourceUnit = this.getUnitNameFromCode(sourceUnitCode);

    if (targetUnit === 'auto') {
      return this.unitConversions[sourceUnit] || 1;
    }

    const targetConversion = {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      ft: 0.3048,
    };

    const sourceFactor = this.unitConversions[sourceUnit] || 1;
    const targetFactor = targetConversion[targetUnit] || 1;

    return sourceFactor / targetFactor;
  }

  /**
   * Convert DXF unit code to unit name
   * @param {number} unitCode - DXF unit code
   * @returns {string} Unit name
   */
  static getUnitNameFromCode(unitCode) {
    const unitCodes = {
      0: 'Unitless',
      1: 'Inches',
      2: 'Feet',
      3: 'Miles',
      4: 'Millimeters',
      5: 'Centimeters',
      6: 'Meters',
      7: 'Kilometers',
      8: 'Microinches',
      9: 'Mils',
      10: 'Yards',
      11: 'Angstroms',
      12: 'Nanometers',
      13: 'Microns',
      14: 'Decimeters',
      15: 'Decameters',
      16: 'Hectometers',
      17: 'Gigameters',
      18: 'Astronomical',
      19: 'Lightyears',
      20: 'Parsecs',
    };

    return unitCodes[unitCode] || 'Unitless';
  }

  /**
   * Create Three.js objects from DXF entities
   * @param {Array<Object>} entities - DXF entities
   * @param {number} conversionFactor - Unit conversion factor
   * @returns {Array<THREE.Object3D>} Array of Three.js objects
   */
  static createThreeObjects(entities, conversionFactor) {
    const objects = [];

    entities.forEach((entity) => {
      let geometry = null;
      const material = new THREE.LineBasicMaterial({
        color: entity.color ? new THREE.Color(entity.color) : 0x000000,
        opacity: 0.8,
        transparent: true,
      });

      switch (entity.type) {
        case 'LINE':
          if (entity.vertices && entity.vertices.length >= 2) {
            geometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(
                entity.vertices[0].x * conversionFactor,
                entity.vertices[0].y * conversionFactor,
                entity.vertices[0].z || 0
              ),
              new THREE.Vector3(
                entity.vertices[1].x * conversionFactor,
                entity.vertices[1].y * conversionFactor,
                entity.vertices[1].z || 0
              ),
            ]);
          }
          break;

        case 'POLYLINE':
        case 'LWPOLYLINE': {
          const points = [];
          if (entity.vertices) {
            entity.vertices.forEach((vertex) => {
              points.push(
                new THREE.Vector3(
                  vertex.x * conversionFactor,
                  vertex.y * conversionFactor,
                  vertex.z || 0
                )
              );
            });
          } else if (entity.points) {
            entity.points.forEach((point) => {
              points.push(
                new THREE.Vector3(
                  point.x * conversionFactor,
                  point.y * conversionFactor,
                  point.z || 0
                )
              );
            });
          } else if (entity.polylineVertices) {
            // Handle LWPOLYLINE vertices
            for (let i = 0; i < entity.polylineVertices.length; i += 2) {
              points.push(
                new THREE.Vector3(
                  entity.polylineVertices[i] * conversionFactor,
                  entity.polylineVertices[i + 1] * conversionFactor,
                  0
                )
              );
            }
          }

          if (points.length > 1) {
            geometry = new THREE.BufferGeometry().setFromPoints(points);

            // Close polyline if it's closed
            if (entity.closed && points.length > 2) {
              const positions = geometry.attributes.position.array;
              const newPositions = new Float32Array(positions.length + 3);
              newPositions.set(positions);
              newPositions[positions.length] = points[0].x;
              newPositions[positions.length + 1] = points[0].y;
              newPositions[positions.length + 2] = points[0].z;
              geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
            }
          }
          break;
        }

        case 'CIRCLE': {
          const circleGeometry = new THREE.CircleGeometry(entity.radius * conversionFactor, 32);
          geometry = new THREE.BufferGeometry().copy(circleGeometry);

          // Position the circle
          geometry.translate(
            entity.center.x * conversionFactor,
            entity.center.y * conversionFactor,
            entity.center.z || 0
          );
          break;
        }

        case 'ARC': {
          const arcCurve = new THREE.EllipseCurve(
            entity.center.x * conversionFactor,
            entity.center.y * conversionFactor,
            entity.radius * conversionFactor,
            entity.radius * conversionFactor,
            entity.startAngle,
            entity.endAngle,
            false,
            0
          );

          const arcPoints = arcCurve.getPoints(32);
          geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
          break;
        }

        default:
          // Skip unsupported entity types
          return;
      }
      }

      if (geometry) {
        const line = new THREE.Line(geometry, material);
        line.userData = {
          entityType: entity.type,
          layer: entity.layer,
          handle: entity.handle,
          originalEntity: entity,
        };
        objects.push(line);
      }
    });

    return objects;
  }

  /**
   * Map DXF entities to internal entity format
   * @param {Array<Object>} entities - DXF entities
   * @param {number} conversionFactor - Unit conversion factor
   * @returns {Array<Object>} Array of internal entity objects
   */
  static mapToInternalEntities(entities, conversionFactor) {
    const internalEntities = [];

    entities.forEach((entity, index) => {
      let internalEntity = null;

      switch (entity.type) {
        case 'LINE':
          if (entity.vertices && entity.vertices.length >= 2) {
            internalEntity = {
              id: `wall-${index}`,
              type: 'wall',
              name: `墙体 ${index + 1}`,
              startPoint: {
                x: entity.vertices[0].x * conversionFactor,
                y: entity.vertices[0].y * conversionFactor,
                z: entity.vertices[0].z || 0,
              },
              endPoint: {
                x: entity.vertices[1].x * conversionFactor,
                y: entity.vertices[1].y * conversionFactor,
                z: entity.vertices[1].z || 0,
              },
              layer: entity.layer || '0',
              material: 'concrete',
              color: '#ffffff',
              visible: true,
            };
          }
          break;

        case 'POLYLINE':
        case 'LWPOLYLINE':
          if (entity.vertices && entity.vertices.length >= 2) {
            internalEntity = {
              id: `reference-${index}`,
              type: 'reference',
              name: `参考线 ${index + 1}`,
              points: entity.vertices.map((v) => ({
                x: v.x * conversionFactor,
                y: v.y * conversionFactor,
                z: v.z || 0,
              })),
              closed: entity.closed || false,
              layer: entity.layer || '0',
              material: 'concrete',
              color: '#cccccc',
              visible: true,
            };
          }
          break;

        case 'CIRCLE':
          // Map circles to door openings if they're small enough
          const radius = entity.radius * conversionFactor;
          if (radius < 2.0) {
            // Assume circles smaller than 2m are door openings
            internalEntity = {
              id: `door-${index}`,
              type: 'door',
              name: `门洞 ${index + 1}`,
              center: {
                x: entity.center.x * conversionFactor,
                y: entity.center.y * conversionFactor,
                z: entity.center.z || 0,
              },
              radius,
              layer: entity.layer || '0',
              material: 'wood',
              color: '#8B4513',
              visible: true,
            };
          } else {
            // Large circles as reference geometry
            internalEntity = {
              id: `reference-${index}`,
              type: 'reference',
              name: `圆形参考 ${index + 1}`,
              center: {
                x: entity.center.x * conversionFactor,
                y: entity.center.y * conversionFactor,
                z: entity.center.z || 0,
              },
              radius,
              layer: entity.layer || '0',
              material: 'concrete',
              color: '#cccccc',
              visible: true,
            };
          }
          break;
      }

      if (internalEntity) {
        internalEntities.push(internalEntity);
      }
    });

    return internalEntities;
  }
}

// Export singleton instance
export default new DxfLoader();
