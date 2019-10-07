<template>
  <div class="log code">
    <BlurredPopover
      ref="addItemPopover"
      :width="200"
      :height="100"
      placement="top"
      popover-body-class="filter-popover">
      <el-select v-model="logLevelFilter">
        <el-option :value="levels.VERBOSE" label="Verbose"/>
        <el-option :value="levels.INFORMATION" label="Information"/>
        <el-option :value="levels.WARNING" label="Warning"/>
        <el-option :value="levels.ERROR" label="Error"/>
      </el-select>
      <el-button v-tooltip="'Filter Log'" v-if="!isDebugLog" slot="reference" class="filter-btn"><i class="mdi mdi-filter"/></el-button>
    </BlurredPopover>
    <el-button v-tooltip="'Copy Log'" class="copy-btn" @click="onCopyLog"><i class="mdi mdi-content-copy"/></el-button>
    <div class="scroll">
      <span
        v-for="(entry, index) in filteredLogs"
        :key="index"
        :class="getClassFromLog(entry) + (!isDebugLog && !isNodeLog && entry.nodeId !== undefined ? ' clickable' : '')"
        class="entry"
        @click="!isDebugLog && !isNodeLog && onLogClick(entry)">
        <span class="timestamp">{{ (entry.time || entry.timestamp) | moment(logTimeFormat) }}</span>
        <span v-if="!isDebugLog" class="entry-level">{{ getFormattedTagFromLogLevel(entry.level) }}</span>
        <span class="message">{{ entry.entry || entry.message }}</span>
      </span>
      <span v-if="filteredLogs.length === 0" class="muted">No Logs</span>
    </div>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop } from "vue-property-decorator"

  import BlurredPopover from "@/components/standalone/BlurredPopover.vue"
  import { FlowRunnerLogLevel, FlowRunnerLogEntry } from "@/utils/FlowRunner";
  import { DEFAULT_NOTIFY_OPTIONS } from "@/utils/utils";
  import { DebugLog } from "@/sendCurl";

  @Component({ components: { BlurredPopover }})
  export default class LogPane<T> extends Vue {
    @Prop(Array) log!: (FlowRunnerLogEntry | DebugLog)[]
    @Prop(String) nodeId?: string
    @Prop(Boolean) isDebugLog?: boolean

    protected levels = FlowRunnerLogLevel; // expose the constant to the template
    protected logLevelFilter = FlowRunnerLogLevel.VERBOSE // TODO: persist
    protected readonly logTimeFormat = "HH:mm:ss.SSS"
    protected readonly logFullTimeFormat = "L-HH:mm:ss.SSS" // TODO: add full date format as an option when viewing logs

    public $refs!: Vue['$refs'] & {
      addItemPopover: BlurredPopover,
    };

    get isNodeLog() {
      return !!this.nodeId;
    }

    get filteredLogs() {
      return this.log.filter((entry) => {
        // filter by node id if one is defined
        if (this.isNodeLog && entry.nodeId !== this.nodeId) return false;

        // filter by level
        switch((entry as FlowRunnerLogEntry).level) {
          case FlowRunnerLogLevel.VERBOSE:
            if (this.logLevelFilter == FlowRunnerLogLevel.INFORMATION) return false;
            // falls through
          case FlowRunnerLogLevel.INFORMATION:
            if (this.logLevelFilter == FlowRunnerLogLevel.WARNING) return false;
            // falls through
          case FlowRunnerLogLevel.WARNING:
            if(this.logLevelFilter == FlowRunnerLogLevel.ERROR) return false;
            // falls through
          case FlowRunnerLogLevel.ERROR:
            return true;
        }

        return true;
      });
    }


    public onLogClick(logEntry: FlowRunnerLogEntry) {
      this.$emit("log-click", logEntry);
    }

    public onCopyLog() {
      let text = "";
      for(let entry of this.log) {
        if(this.nodeId !== undefined && entry.nodeId != this.nodeId) continue;

        text += (this as any).$moment(entry.time).format(this.logFullTimeFormat) + " " +
          this.getFormattedTagFromLogLevel(entry.level) + " " +
          entry.entry + "\n";
      }
      (navigator as any).clipboard.writeText(text);
      this.$notify.success({...DEFAULT_NOTIFY_OPTIONS, title: "Log Copied"});
    }

    protected getFormattedTagFromLogLevel(log: FlowRunnerLogEntry | DebugLog) {
      switch((log as FlowRunnerLogEntry).level) {
        case FlowRunnerLogLevel.ERROR:
          return "ERR ";
        case FlowRunnerLogLevel.WARNING:
          return "WARN";
        case FlowRunnerLogLevel.INFORMATION:
          return "INFO";
        case FlowRunnerLogLevel.VERBOSE:
          return "VRBS";
        default:
          return "";
      }
    }

    protected getClassFromLog(log: FlowRunnerLogEntry | DebugLog) {
      switch((log as FlowRunnerLogEntry).level) {
        case FlowRunnerLogLevel.ERROR:
          return "error-entry";
        case FlowRunnerLogLevel.WARNING:
          return "warning-entry";
        case FlowRunnerLogLevel.INFORMATION:
          return "information-entry";
        case FlowRunnerLogLevel.VERBOSE:
          return "verbose-entry";
        default:
          return "misc-entry";
      }
    }
  }
</script>

<style lang="scss" scoped>
  .log {
    background-color: #000a12;
    padding: 15px 30px;
    height: 100%;
    font-size: 14px;
    position: relative;

    .filter-btn, .copy-btn {
      position: absolute;
      top: 10px;
      padding: 10px;
    }
    .filter-btn {
      right: 60px;
    }
    .copy-btn {
      right: 20px;
    }
    
    .entry {
      display: flex;
      padding: 3px;

      &.clickable {
        cursor: pointer;

        &:before {
          content: "·";
          margin-left: -10.406px;
          color: white;
          padding-right: 2px;
        }
        &:hover {
          background-color: #ffffff3d;
        }
      }

      .timestamp {
        color: #a0a0a0;
        padding-right: 10px;
      }

      .entry-level {
        font-weight: 800;
        min-width: 40px;
        margin-left: 10px;
        display: inline-block;
      }

      .message {
        word-break: break-word;
      }

      &.error-entry {
        color: red;
      }
      &.warning-entry {
        color: yellow;
      }
      &.information-entry {
        color: white;
      }
      &.verbose-entry {
        color: #5bd9f1;
      }
    }
  }
</style>