<script>
  import ramjet from 'ramjet'

  export default {
    name: 'MorphingCollapse',
    components: {},
    props: { 
      collapseItemName: { type: String, required: true },
      subItemCount: { type: Number, required: true }
    },
    data() { return { firstElement: null } },
    methods: {
      isCollapseExpanded() {
        return this.$el.getElementsByClassName("el-collapse-item__wrap")[0].style.display !== "none";
      },
      getContentElement() {
        return this.$el.getElementsByClassName("el-collapse-item__content")[0];
      },
      //from vue-overdrive
      getPosition(node) {
        const rect = node.getBoundingClientRect();
        const computedStyle = getComputedStyle(node);
        const marginTop = parseInt(computedStyle.marginTop, 10);
        const marginLeft = parseInt(computedStyle.marginLeft, 10);
        return {
          top: (rect.top - marginTop) + 'px',
          left: (rect.left - marginLeft) + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
          margin: computedStyle.margin,
          padding: computedStyle.padding,
          borderRadius: computedStyle.borderRadius,
          position: 'absolute'
        };
      },
      beforeEnter(element) {
        const content = this.getContentElement();
        //skip the transform if we're hidden
        if(!this.isCollapseExpanded()) {
          //clear the collapse content container height so that it isn't out of date
          content.style.height = "";
          return;
        }
        //hide the entering element so it doesn't mess with the layout yet
        element.style.display = "none";
        //explictly set the collapse content container height so we can animate it
        content.style.height = content.getBoundingClientRect().height + "px";
      },
      enter(element, done) {
        if(this.firstElement == null) {
          this.firstElement = {element, done};
        } else {
          this.transform(this.firstElement, {element, done});
          this.firstElement = null;
        }
      },
      leave(element, done) {
        if(this.firstElement == null) {
          this.firstElement = {element, done};
        } else {
          this.transform({element, done}, this.firstElement);
          this.firstElement = null;
        }
      },
      transform(from, to) {
        //skip the transform if we're hidden
        if(!this.isCollapseExpanded()) {
          from.done();
          to.done();
          return;
        }
        const content = this.getContentElement();
        //clone the leaving element with absolute positioning
        let fromParent = from.element.parentElement;
        let clone = from.element.cloneNode(true);
        const parentPosition = content.getBoundingClientRect();
        const fromPosition = this.getPosition(from.element);
        fromPosition.top = (fromPosition.top.replace('px', '') - parentPosition.top) + "px";
        fromPosition.left = (fromPosition.left.replace('px', '') - parentPosition.left) + "px";
        Object.assign(clone.style, fromPosition);
        fromParent.appendChild(clone);
        //have vue remove the original element
        from.done();
        ramjet.hide(clone)
        ramjet.hide(to.element)
        //show the entering element
        to.element.style.display = "";
        //animate the collapse content container
        content.style.height = (content.style.height.replace('px', '') - fromPosition.height.replace('px', '') + to.element.getBoundingClientRect().height) + "px";
        //transform from our clone to the entering element
        ramjet.transform(clone, to.element, { duration: 150, done(){
          to.done();
          ramjet.show(to.element);
          fromParent.removeChild(clone);
          content.style.height = "";
        }});
      }
    },
    render() {
      const subSlots = [];
      for(let i = 1; i <= this.subItemCount; i++) {
        subSlots.push(
          <transition onBeforeEnter={this.beforeEnter} onEnter={this.enter} onLeave={this.leave}>
            { this.$slots["subSlot"+i] }
          </transition>
        );
      }
      return (
        <el-collapse-item name={ this.collapseItemName } class="morphing-collapse">
          <template slot="title">
            <div class="tree-title">
              { this.collapseItemName }
              { this.$slots.select }
            </div>
          </template>
          { subSlots }
        </el-collapse-item>
      );
    }
  }
</script>

<style lang="scss">
  .morphing-collapse .el-collapse-item__content {
    transition: height 150ms linear;
    position: relative;
  }
</style>
