<template>
  <div class="titlebar">
    <p class="title">
      {{ title }}
    </p>
    <div class="title-bar-btns">
      <button id="min-btn" @click="minimize()"><i class="mdi mdi-window-minimize" /></button>
      <button id="max-btn" @click="maximize()"><i class="mdi mdi-window-maximize"/></button>
      <button id="close-btn" @click="appClose()"><i class="mdi mdi-window-close"/></button>
    </div>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop } from "vue-property-decorator"
  import { remote } from "electron"
  const BrowserWindow = remote.getCurrentWindow();

  @Component({})
  export default class TitleBar extends Vue {
    @Prop(String) title!: string

    minimize() {
      BrowserWindow.minimize();
    }
    maximize() {
      if (!BrowserWindow.isMaximized()) {
        BrowserWindow.maximize();
      } else {
        BrowserWindow.unmaximize();
      }
    }
    appClose() {
      BrowserWindow.close();
    }
  }
</script>

<style lang="scss">
  @import "@/style/mixins.scss";

  .titlebar {
    @include dark-container;

    -webkit-app-region: drag;

    width: 100%;
    padding: 5px;
    position: relative;

    .title {
      text-align: center;
    }

    .title-bar-btns {
      position: absolute;
      background-color: unset;
      right: 0px;
      top: 0px;
      
      button {
        background-color: transparent;
        -webkit-app-region: no-drag;
        padding: 7px 20px;
        border: none;
        cursor: pointer;
        color: white;
        transition: background-color 150ms linear;

        &:focus {
            outline: none;
            border: none;
        }
        &#min-btn:hover, &#max-btn:hover {
            background-color: rgba(255, 255, 255, .2);
        }
        &#close-btn:hover {
            background-color: #c62828;
        }
      }
    }
  }
</style>
