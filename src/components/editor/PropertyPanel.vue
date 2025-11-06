<template>
  <section class="sidebar-block property-panel">
    <header class="property-header">
      <h2>属性面板</h2>
      <span class="property-subtitle">{{ activeWall ? activeWall.name : '未选择墙体' }}</span>
    </header>

    <div v-if="activeWall" class="property-form">
      <!-- Position Properties -->
      <div class="property-group">
        <h3 class="group-title">位置</h3>
        
        <div class="property-field">
          <label class="field-label">起点 X</label>
          <el-input-number
            v-model.lazy="startX"
            :step="0.1"
            :precision="2"
            size="small"
            class="field-control"
            @change="updateWallProperty('startX', $event)"
          />
        </div>

        <div class="property-field">
          <label class="field-label">起点 Z</label>
          <el-input-number
            v-model.lazy="startZ"
            :step="0.1"
            :precision="2"
            size="small"
            class="field-control"
            @change="updateWallProperty('startZ', $event)"
          />
        </div>

        <div class="property-field">
          <label class="field-label">终点 X</label>
          <el-input-number
            v-model.lazy="endX"
            :step="0.1"
            :precision="2"
            size="small"
            class="field-control"
            @change="updateWallProperty('endX', $event)"
          />
        </div>

        <div class="property-field">
          <label class="field-label">终点 Z</label>
          <el-input-number
            v-model.lazy="endZ"
            :step="0.1"
            :precision="2"
            size="small"
            class="field-control"
            @change="updateWallProperty('endZ', $event)"
          />
        </div>
      </div>

      <!-- Dimension Properties -->
      <div class="property-group">
        <h3 class="group-title">尺寸</h3>
        
        <div class="property-field">
          <label class="field-label">高度</label>
          <el-input-number
            v-model.lazy="height"
            :step="0.1"
            :precision="2"
            :min="0.1"
            size="small"
            class="field-control"
            @change="updateWallProperty('height', $event)"
          />
        </div>

        <div class="property-field">
          <label class="field-label">厚度</label>
          <el-input-number
            v-model.lazy="thickness"
            :step="0.01"
            :precision="3"
            :min="0.01"
            size="small"
            class="field-control"
            @change="updateWallProperty('thickness', $event)"
          />
        </div>
      </div>

      <!-- Material Properties -->
      <div class="property-group">
        <h3 class="group-title">材质</h3>
        
        <div class="property-field">
          <label class="field-label">墙体材料</label>
          <el-select 
            v-model="material" 
            size="small" 
            class="field-control"
            @change="updateWallProperty('material', $event)"
          >
            <el-option
              v-for="materialOption in materials"
              :key="materialOption.value"
              :label="materialOption.label"
              :value="materialOption.value"
            />
          </el-select>
        </div>

        <div class="property-field">
          <label class="field-label">墙体颜色</label>
          <el-color-picker 
            v-model="color" 
            size="small" 
            class="field-control"
            @change="updateWallProperty('color', $event)"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="property-group">
        <h3 class="group-title">操作</h3>
        
        <div class="action-buttons">
          <el-button 
            type="primary" 
            size="small" 
            icon="el-icon-copy-document"
            @click="copyWall"
          >
            复制墙体
          </el-button>
          <el-button 
            type="danger" 
            size="small" 
            icon="el-icon-delete"
            @click="deleteWall"
          >
            删除墙体
          </el-button>
        </div>
      </div>
    </div>

    <div v-else class="no-selection">
      <p>请选择一个墙体以编辑其属性</p>
    </div>
  </section>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { wallFactory } from '../../utils/wallManager';

export default {
  name: 'PropertyPanel',
  data() {
    return {
      localWallData: {},
    };
  },
  computed: {
    ...mapState('editor', ['materials']),
    ...mapGetters('selection', ['firstActiveObjectId', 'hasActiveSelection']),
    ...mapGetters('walls', ['wallById']),
    
    activeWall() {
      if (!this.hasActiveSelection || !this.firstActiveObjectId) {
        return null;
      }
      // Direct access to the walls state and find the wall
      const walls = this.$store.state.walls.walls;
      return walls.find(wall => wall.id === this.firstActiveObjectId) || null;
    },

    startX: {
      get() {
        return this.activeWall ? this.activeWall.startX : 0;
      },
      set(value) {
        this.localWallData.startX = value;
      },
    },

    startZ: {
      get() {
        return this.activeWall ? this.activeWall.startZ : 0;
      },
      set(value) {
        this.localWallData.startZ = value;
      },
    },

    endX: {
      get() {
        return this.activeWall ? this.activeWall.endX : 0;
      },
      set(value) {
        this.localWallData.endX = value;
      },
    },

    endZ: {
      get() {
        return this.activeWall ? this.activeWall.endZ : 0;
      },
      set(value) {
        this.localWallData.endZ = value;
      },
    },

    height: {
      get() {
        return this.activeWall ? this.activeWall.height : 3;
      },
      set(value) {
        this.localWallData.height = value;
      },
    },

    thickness: {
      get() {
        return this.activeWall ? this.activeWall.thickness : 0.2;
      },
      set(value) {
        this.localWallData.thickness = value;
      },
    },

    material: {
      get() {
        return this.activeWall ? this.activeWall.material : 'concrete';
      },
      set(value) {
        this.localWallData.material = value;
      },
    },

    color: {
      get() {
        return this.activeWall ? this.activeWall.color : '#ffffff';
      },
      set(value) {
        this.localWallData.color = value;
      },
    },
  },
  watch: {
    activeWall: {
      handler(newWall) {
        if (newWall) {
          // Reset local data when active wall changes
          this.localWallData = {};
        }
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions('walls', ['updateWall', 'addWall']),
    ...mapActions('selection', ['clearActiveObjects', 'setActiveObjects']),

    updateWallProperty(property, value) {
      if (!this.activeWall) return;

      // Update via WallFactory
      const updatedWall = wallFactory.update(this.activeWall.id, { [property]: value });
      
      if (updatedWall) {
        // Update store
        this.updateWall({
          id: this.activeWall.id,
          updates: { [property]: value },
        });

        // Emit event for Three.js scene update
        this.$emit('wall-updated', { wall: updatedWall, property, value });
      }
    },

    copyWall() {
      if (!this.activeWall) return;

      const newWall = wallFactory.copy(this.activeWall.id);
      
      if (newWall) {
        // Add to store
        this.addWall(newWall);
        
        // Select the new wall
        this.setActiveObjects([newWall.id]);

        // Emit event for Three.js scene update
        this.$emit('wall-copied', { originalWall: this.activeWall, newWall });
      }
    },

    deleteWall() {
      if (!this.activeWall) return;

      const wallId = this.activeWall.id;
      
      // Delete via WallFactory
      const deleted = wallFactory.delete(wallId);
      
      if (deleted) {
        // Remove from store using the action
        this.$store.dispatch('walls/deleteWall', wallId);
        
        // Clear selection
        this.clearActiveObjects();

        // Emit event for Three.js scene update
        this.$emit('wall-deleted', { wallId });
      }
    },
  },
};
</script>

<style scoped>
.property-panel {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
  margin-top: 16px;
}

.property-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.property-header h2 {
  font-size: 14px;
  color: #111827;
  margin: 0;
}

.property-subtitle {
  font-size: 12px;
  color: #6b7280;
}

.property-group {
  margin-bottom: 20px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #f3f4f6;
}

.property-field {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: #4b5563;
  margin-bottom: 6px;
}

.field-control {
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons .el-button {
  flex: 1;
}

.no-selection {
  text-align: center;
  padding: 20px 0;
  color: #9ca3af;
  font-size: 13px;
}

.no-selection p {
  margin: 0;
}
</style>
