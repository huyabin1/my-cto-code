<template>
  <section class="sidebar-block">
    <header class="block-header">
      <h2>项目管理</h2>
      <el-tag v-if="projectInfo.isDirty" type="warning" size="mini">未保存</el-tag>
    </header>

    <div class="project-controls">
      <div class="control-group">
        <span class="control-label">项目名称</span>
        <el-input
          v-model="projectNameModel"
          size="mini"
          placeholder="输入项目名称"
          class="project-name-input"
        />
      </div>

      <div class="control-group">
        <span class="control-label">保存操作</span>
        <div class="button-group">
          <el-button
            type="primary"
            size="small"
            icon="el-icon-document"
            :loading="saving"
            @click="saveProject"
          >
            保存项目
          </el-button>
          <el-button
            type="success"
            size="small"
            icon="el-icon-folder-opened"
            @click="triggerLoadProject"
          >
            加载项目
          </el-button>
        </div>
        <input
          ref="projectInput"
          type="file"
          accept=".json"
          class="project-input"
          @change="onProjectFileChange"
        />
      </div>

      <div class="control-group">
        <span class="control-label">导出格式</span>
        <div class="export-buttons">
          <el-dropdown trigger="click" @command="handleGLTFExport">
            <el-button size="small" icon="el-icon-download">
              导出 glTF <i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="gltf">glTF (.gltf)</el-dropdown-item>
              <el-dropdown-item command="glb">glTF Binary (.glb)</el-dropdown-item>
              <el-dropdown-item command="gltf-walls">仅墙体 glTF</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>

          <el-dropdown trigger="click" @command="handleOBJExport">
            <el-button size="small" icon="el-icon-download">
              导出 OBJ <i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="obj">OBJ + MTL</el-dropdown-item>
              <el-dropdown-item command="obj-walls">仅墙体 OBJ</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>

      <div class="control-group">
        <span class="control-label">自动保存</span>
        <div class="auto-save-controls">
          <el-switch
            v-model="autoSaveEnabledModel"
            active-color="#2563eb"
            inactive-color="#9ca3af"
            @change="toggleAutoSave"
          />
          <span class="auto-save-status">
            {{ autoSaveStatusText }}
          </span>
        </div>
        <el-button
          v-if="autoSaveHistory.length > 0"
          type="text"
          size="mini"
          @click="showAutoSaveHistory"
        >
          查看自动保存历史 ({{ autoSaveHistory.length }})
        </el-button>
      </div>

      <div class="control-group">
        <span class="control-label">项目操作</span>
        <div class="button-group">
          <el-button type="info" size="small" icon="el-icon-plus" @click="createNewProject">
            新建项目
          </el-button>
        </div>
      </div>
    </div>

    <!-- Auto-save History Dialog -->
    <el-dialog title="自动保存历史" :visible.sync="autoSaveHistoryVisible" width="500px">
      <div class="auto-save-list">
        <div v-for="(save, index) in autoSaveHistory" :key="index" class="auto-save-item">
          <div class="save-info">
            <div class="save-time">{{ formatTime(save.timestamp) }}</div>
            <div class="save-details">保存 #{{ save.saveCount }}</div>
          </div>
          <el-button type="primary" size="mini" @click="restoreFromAutoSave(index)">
            恢复
          </el-button>
        </div>
        <div v-if="autoSaveHistory.length === 0" class="no-saves">暂无自动保存记录</div>
      </div>
      <div slot="footer">
        <el-button @click="autoSaveHistoryVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- Status Messages -->
    <el-alert
      v-if="statusMessage"
      :title="statusMessage"
      :type="statusType"
      :closable="false"
      show-icon
      class="status-alert"
    />
  </section>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'ProjectPanel',
  inject: ['store'],
  data() {
    return {
      saving: false,
      loading: false,
      exporting: false,
      autoSaveHistoryVisible: false,
      statusMessage: '',
      statusType: 'info',
      projectManager: null,
      autoSaveEnabled: true,
      autoSaveHistory: [],
    };
  },
  computed: {
    ...mapState('editor', {
      projectInfo: (state) => state.projectInfo,
      lastAutoSave: (state) => state.lastAutoSave,
    }),
    projectNameModel: {
      get() {
        return this.projectInfo.name || 'Untitled Project';
      },
      set(value) {
        this.setProjectInfo({
          ...this.projectInfo,
          name: value || 'Untitled Project',
        });
      },
    },
    autoSaveEnabledModel: {
      get() {
        return this.autoSaveEnabled;
      },
      set(value) {
        this.autoSaveEnabled = value;
      },
    },
    autoSaveStatusText() {
      if (!this.autoSaveEnabled) {
        return '已禁用';
      }
      if (this.lastAutoSave) {
        return `上次保存: ${this.formatTime(this.lastAutoSave)}`;
      }
      return '等待中...';
    },
  },
  mounted() {
    this.initializeProjectManager();
  },
  beforeDestroy() {
    if (this.projectManager) {
      this.projectManager.destroy();
    }
  },
  methods: {
    ...mapActions('editor', ['setProjectInfo']),

    initializeProjectManager() {
      // Get ThreeScene component reference
      const { threeScene } = this.$parent.$refs;
      if (threeScene) {
        // Import and create project manager
        import('@/utils/projectManager').then(({ createProjectManager }) => {
          this.projectManager = createProjectManager(this.store, threeScene);
          this.projectManager.initialize();

          // Update auto-save history
          this.updateAutoSaveHistory();
        });
      }
    },

    async saveProject() {
      if (!this.projectManager) {
        this.showStatus('项目管理器未初始化', 'error');
        return;
      }

      this.saving = true;
      try {
        const result = await this.projectManager.saveProject(this.projectNameModel);
        this.showStatus(`项目已保存: ${result.filename}`, 'success');
      } catch (error) {
        this.showStatus(`保存失败: ${error.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },

    triggerLoadProject() {
      if (this.$refs.projectInput) {
        this.$refs.projectInput.click();
      }
    },

    async onProjectFileChange(event) {
      const { files } = event.target;
      if (!files || !files.length) {
        return;
      }

      const [file] = files;
      const extension = file.name.split('.').pop().toLowerCase();
      if (extension !== 'json') {
        this.showStatus('仅支持 JSON 项目文件', 'error');
        this.resetFileInput(event.target);
        return;
      }

      this.loading = true;
      try {
        const result = await this.projectManager.loadProject(file);
        this.showStatus(`项目已加载: ${result.projectName}`, 'success');
      } catch (error) {
        this.showStatus(`加载失败: ${error.message}`, 'error');
      } finally {
        this.loading = false;
        this.resetFileInput(event.target);
      }
    },

    async handleGLTFExport(command) {
      if (!this.projectManager) {
        this.showStatus('项目管理器未初始化', 'error');
        return;
      }

      this.exporting = true;
      try {
        const options = {
          wallsOnly: command.includes('walls'),
          binary: command === 'glb',
        };

        const result = await this.projectManager.exportToGLTF(options);
        this.showStatus(`已导出 ${result.format} 文件`, 'success');
      } catch (error) {
        this.showStatus(`导出失败: ${error.message}`, 'error');
      } finally {
        this.exporting = false;
      }
    },

    async handleOBJExport(command) {
      if (!this.projectManager) {
        this.showStatus('项目管理器未初始化', 'error');
        return;
      }

      this.exporting = true;
      try {
        const options = {
          wallsOnly: command.includes('walls'),
          includeMaterials: true,
        };

        const result = await this.projectManager.exportToOBJ(options);
        this.showStatus(`已导出 OBJ 文件${result.hasMaterials ? ' (含材质)' : ''}`, 'success');
      } catch (error) {
        this.showStatus(`导出失败: ${error.message}`, 'error');
      } finally {
        this.exporting = false;
      }
    },

    toggleAutoSave(enabled) {
      if (this.projectManager) {
        this.projectManager.autoSaveManager.setEnabled(enabled);
      }
    },

    updateAutoSaveHistory() {
      if (this.projectManager) {
        this.autoSaveHistory = this.projectManager.getAutoSaveHistory();
      }
    },

    showAutoSaveHistory() {
      this.updateAutoSaveHistory();
      this.autoSaveHistoryVisible = true;
    },

    async restoreFromAutoSave(index) {
      if (!this.projectManager) {
        this.showStatus('项目管理器未初始化', 'error');
        return;
      }

      try {
        const result = await this.projectManager.restoreFromAutoSave(index);
        this.showStatus(`已恢复自动保存: ${this.formatTime(result.timestamp)}`, 'success');
        this.autoSaveHistoryVisible = false;
        this.updateAutoSaveHistory();
      } catch (error) {
        this.showStatus(`恢复失败: ${error.message}`, 'error');
      }
    },

    createNewProject() {
      if (this.projectManager) {
        this.projectManager.createNewProject(this.projectNameModel);
        this.showStatus('已创建新项目', 'success');
      }
    },

    resetFileInput(input) {
      if (input) {
        // eslint-disable-next-line no-param-reassign
        input.value = '';
      }
    },

    showStatus(message, type = 'info') {
      this.statusMessage = message;
      this.statusType = type;

      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.statusMessage = '';
      }, 5000);
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
  },
};
</script>

<style scoped>
.project-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.project-name-input {
  width: 100%;
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.project-input {
  display: none;
}

.export-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.auto-save-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auto-save-status {
  font-size: 12px;
  color: #6b7280;
}

.status-alert {
  margin-top: 12px;
}

.auto-save-list {
  max-height: 300px;
  overflow-y: auto;
}

.auto-save-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
}

.save-info {
  flex: 1;
}

.save-time {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}

.save-details {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.no-saves {
  text-align: center;
  color: #6b7280;
  padding: 20px;
  font-size: 14px;
}
</style>
