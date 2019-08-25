<template>
  <!-- TODO: put a pr for the height change -->
  <!-- eslint-disable -->
  <div>
    <transition
      :name="transition"
      @after-enter="handleAfterEnter"
      @after-leave="handleAfterLeave">
      <div
        class="el-popover el-popper"
        :class="[popperClass, content && 'el-popover--plain']"
        ref="popper"
        v-show="!disabled && showPopper"
        :style="{ width: width + 'px', height: height + 'px' }"
        role="tooltip"
        :id="tooltipId"
        :aria-hidden="(disabled || !showPopper) ? 'true' : 'false'"
      >
        <div class="el-popover__title" v-if="title" v-text="title"></div>
        <slot>{{ content }}</slot>
      </div>
    </transition>
    <slot name="reference"></slot>
  </div>
</template>
<script lang="ts">
/* eslint-disable */
// @ts-ignore
import Popper from 'element-ui/src/utils/vue-popper';
// @ts-ignore
import { on, off } from 'element-ui/src/utils/dom';
// @ts-ignore
import { addClass, removeClass } from 'element-ui/src/utils/dom';
// @ts-ignore
import { generateId } from 'element-ui/src/utils/util';

export default {
  name: 'ElPopover2',

  mixins: [Popper],

  props: {
    trigger: {
      type: String,
      default: 'click',
      // @ts-ignore
      validator: value => ['click', 'focus', 'hover', 'manual'].indexOf(value) > -1
    },
    openDelay: {
      type: Number,
      default: 0
    },
    title: String,
    disabled: Boolean,
    content: String,
    reference: {},
    popperClass: String,
    width: {},
    height: {},
    visibleArrow: {
      default: true
    },
    arrowOffset: {
      type: Number,
      default: 0
    },
    transition: {
      type: String,
      default: 'fade-in-linear'
    }
  },

  computed: {
    tooltipId() {
      return `el-popover-${generateId()}`;
    }
  },
  watch: {
    // @ts-ignore
    showPopper(val) {
      // @ts-ignore
      if (this.disabled) {
        return;
      }
      // @ts-ignore
      val ? this.$emit('show') : this.$emit('hide');
    }
  },

  mounted() {
    // @ts-ignore
    let reference = this.referenceElm = this.reference || this.$refs.reference;
    // @ts-ignore
    const popper = this.popper || this.$refs.popper;

    // @ts-ignore
    if (!reference && this.$slots.reference && this.$slots.reference[0]) {
      // @ts-ignore
      reference = this.referenceElm = this.$slots.reference[0].elm;
    }
    // 可访问性
    if (reference) {
      addClass(reference, 'el-popover__reference');
      // @ts-ignore
      reference.setAttribute('aria-describedby', this.tooltipId);
      // @ts-ignore
      reference.setAttribute('tabindex', 0); // tab序列
      popper.setAttribute('tabindex', 0);

      // @ts-ignore
      if (this.trigger !== 'click') {
        on(reference, 'focusin', () => {
          // @ts-ignore
          this.handleFocus();
          // @ts-ignore
          const instance = reference.__vue__;
          if (instance && typeof instance.focus === 'function') {
            instance.focus();
          }
        });
        // @ts-ignore
        on(popper, 'focusin', this.handleFocus);
        // @ts-ignore
        on(reference, 'focusout', this.handleBlur);
        // @ts-ignore
        on(popper, 'focusout', this.handleBlur);
      }
      // @ts-ignore
      on(reference, 'keydown', this.handleKeydown);
      // @ts-ignore
      on(reference, 'click', this.handleClick);
    }
    // @ts-ignore
    if (this.trigger === 'click') {
      // @ts-ignore
      on(reference, 'click', this.doToggle);
      // @ts-ignore
      on(document, 'click', this.handleDocumentClick);
      // @ts-ignore
    } else if (this.trigger === 'hover') {
      // @ts-ignore
      on(reference, 'mouseenter', this.handleMouseEnter);
      // @ts-ignore
      on(popper, 'mouseenter', this.handleMouseEnter);
      // @ts-ignore
      on(reference, 'mouseleave', this.handleMouseLeave);
      // @ts-ignore
      on(popper, 'mouseleave', this.handleMouseLeave);
      // @ts-ignore
    } else if (this.trigger === 'focus') {
      // @ts-ignore
      if (reference.querySelector('input, textarea')) {
        // @ts-ignore
        on(reference, 'focusin', this.doShow);
        // @ts-ignore
        on(reference, 'focusout', this.doClose);
      } else {
        // @ts-ignore
        on(reference, 'mousedown', this.doShow);
        // @ts-ignore
        on(reference, 'mouseup', this.doClose);
      }
    }
  },

  methods: {
    doToggle() {
      // @ts-ignore
      this.showPopper = !this.showPopper;
    },
    doShow() {
      // @ts-ignore
      this.showPopper = true;
    },
    doClose() {
      // @ts-ignore
      this.showPopper = false;
    },
    handleFocus() {
      // @ts-ignore
      addClass(this.referenceElm, 'focusing');
      // @ts-ignore
      if (this.trigger !== 'manual') this.showPopper = true;
    },
    handleClick() {
      // @ts-ignore
      removeClass(this.referenceElm, 'focusing');
    },
    handleBlur() {
      // @ts-ignore
      removeClass(this.referenceElm, 'focusing');
      // @ts-ignore
      if (this.trigger !== 'manual') this.showPopper = false;
    },
    handleMouseEnter() {
      // @ts-ignore
      clearTimeout(this._timer);
      // @ts-ignore
      if (this.openDelay) {
        // @ts-ignore
        this._timer = setTimeout(() => {
          // @ts-ignore
          this.showPopper = true;
          // @ts-ignore
        }, this.openDelay);
      } else {
        // @ts-ignore
        this.showPopper = true;
      }
    },
    // @ts-ignore
    handleKeydown(ev) {
      // @ts-ignore
      if (ev.keyCode === 27 && this.trigger !== 'manual') { // esc
        this.doClose();
      }
    },
    handleMouseLeave() {
      // @ts-ignore
      clearTimeout(this._timer);
      // @ts-ignore
      this._timer = setTimeout(() => {
        // @ts-ignore
        this.showPopper = false;
      }, 200);
    },
    // @ts-ignore
    handleDocumentClick(e) {
      // @ts-ignore
      let reference = this.reference || this.$refs.reference;
      // @ts-ignore
      const popper = this.popper || this.$refs.popper;

      // @ts-ignore
      if (!reference && this.$slots.reference && this.$slots.reference[0]) {
        // @ts-ignore
        reference = this.referenceElm = this.$slots.reference[0].elm;
      }
      // @ts-ignore
      if (!this.$el ||
        !reference ||
        // @ts-ignore
        this.$el.contains(e.target) ||
        // @ts-ignore
        reference.contains(e.target) ||
        !popper ||
        popper.contains(e.target)) return;
      // @ts-ignore
      this.showPopper = false;
    },
    handleAfterEnter() {
      // @ts-ignore
      this.$emit('after-enter');
    },
    handleAfterLeave() {
      // @ts-ignore
      this.$emit('after-leave');
      // @ts-ignore
      this.doDestroy();
    }
  },

  destroyed() {
    // @ts-ignore
    const reference = this.reference;

    // @ts-ignore
    off(reference, 'click', this.doToggle);
    // @ts-ignore
    off(reference, 'mouseup', this.doClose);
    // @ts-ignore
    off(reference, 'mousedown', this.doShow);
    // @ts-ignore
    off(reference, 'focusin', this.doShow);
    // @ts-ignore
    off(reference, 'focusout', this.doClose);
    // @ts-ignore
    off(reference, 'mousedown', this.doShow);
    // @ts-ignore
    off(reference, 'mouseup', this.doClose);
    // @ts-ignore
    off(reference, 'mouseleave', this.handleMouseLeave);
    // @ts-ignore
    off(reference, 'mouseenter', this.handleMouseEnter);
    // @ts-ignore
    off(document, 'click', this.handleDocumentClick);
  }
};
</script>
