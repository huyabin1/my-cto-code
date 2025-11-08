// Mock Worker for testing environment
class MockWorker {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(data) {
    // Simulate async worker response
    setTimeout(() => {
      // Check for invalid content
      if (data.dxfContent === 'invalid content') {
        if (this.onerror) {
          this.onerror(new Error('Mock worker error'));
        }
        return;
      }

      if (this.onmessage) {
        // Simple mock for DXF parsing
        this.onmessage({
          data: {
            success: true,
            result: {
              layers: [{ id: 'test', name: 'Test', visible: true }],
              entities: [],
              threeObjects: [],
              conversionFactor: 1,
              units: 'Millimeters',
              header: {},
            },
          },
        });
      }
    }, 100);
  }

  terminate() {
    // Mock terminate
  }
}

// Mock URL.createObjectURL
global.URL = {
  createObjectURL: jest.fn(() => 'mock-worker-url'),
  revokeObjectURL: jest.fn(),
};

// Mock Worker constructor
global.Worker = MockWorker;
