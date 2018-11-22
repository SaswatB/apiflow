<template>
  <div id="app">
    <TitleBar title="ApiFlow"/>
    <router-view/>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import Component from 'vue-class-component'
  import TitleBar from './components/standalone/TitleBar.vue'

  @Component({components: {TitleBar}})
  export default class Apiflow extends Vue {}
</script>

<style lang="scss">
  #app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-image: linear-gradient( 135deg, #37474f 10%, #102027 100%);
  }
</style>
