export { RendererManager, getSharedRendererManager } from './RendererManager';
export { CameraManager, getSharedCameraManager } from './CameraManager';
export { RenderLoop, getSharedRenderLoop, resetSharedRenderLoop } from './RenderLoop';
export { InteractionBus, getSharedInteractionBus, resetSharedInteractionBus } from './InteractionBus';
export { SceneGraph, getSharedSceneGraph, resetSharedSceneGraph } from './SceneGraph';
export { SceneManager } from './SceneManager';
export { default as SceneOptimizer } from './SceneOptimizer';

export default {
  RendererManager: require('./RendererManager').RendererManager,
  CameraManager: require('./CameraManager').CameraManager,
  RenderLoop: require('./RenderLoop').RenderLoop,
  InteractionBus: require('./InteractionBus').InteractionBus,
  SceneGraph: require('./SceneGraph').SceneGraph,
  SceneManager: require('./SceneManager').SceneManager,
  SceneOptimizer: require('./SceneOptimizer').default,
};
