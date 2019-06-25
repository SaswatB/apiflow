import { Vue, Component, Prop } from "vue-property-decorator"
import ramjet from "ramjet"

interface RamjetElement {
  element: Element
  done: Function
}

@Component({ components: {} })
export default class MorphingCollapse extends Vue {
  @Prop(String) collapseItemName!: string
  @Prop(Number) subItemCount!: number
  firstElement: RamjetElement | null = null;

  isCollapseExpanded() {
    const element = this.$el.getElementsByClassName("el-collapse-item__wrap")[0] as HTMLElement;
    return element.style.display !== "none";
  }
  getContentElement() {
    return this.$el.getElementsByClassName("el-collapse-item__content")[0];
  }
    //from vue-overdrive
  getPosition(node: Element) {
    const rect = node.getBoundingClientRect();
    const computedStyle = getComputedStyle(node);
    const marginTop = parseInt(computedStyle.marginTop || '0', 10);
    const marginLeft = parseInt(computedStyle.marginLeft || '0', 10);
    return {
      top: (rect.top - marginTop) + "px",
      left: (rect.left - marginLeft) + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      margin: computedStyle.margin,
      padding: computedStyle.padding,
      borderRadius: computedStyle.borderRadius,
      position: "absolute"
    };
  }
  beforeEnter(element: Element) {
    const content = this.getContentElement() as HTMLElement;
    //skip the transform if we're hidden
    if(!this.isCollapseExpanded()) {
      //clear the collapse content container height so that it isn't out of date
      content.style.height = "";
      return;
    }
    //hide the entering element so it doesn't mess with the layout yet
    (element as HTMLElement).style.display = "none";
    //explictly set the collapse content container height so we can animate it
    content.style.height = content.getBoundingClientRect().height + "px";
  }
  enter(element: Element, done: Function) {
    if(this.firstElement == null) {
      this.firstElement = {element, done};
    } else {
      this.transform(this.firstElement, {element, done});
      this.firstElement = null;
    }
  }
  leave(element: Element, done: Function) {
    if(this.firstElement == null) {
      this.firstElement = {element, done};
    } else {
      this.transform({element, done}, this.firstElement);
      this.firstElement = null;
    }
  }
  transform(from: RamjetElement, to: RamjetElement) {
    //skip the transform if we're hidden
    if(!this.isCollapseExpanded()) {
      from.done();
      to.done();
      return;
    }
    const content = this.getContentElement() as HTMLElement;
    const toElement = to.element as HTMLElement;
    //clone the leaving element with absolute positioning
    let fromParent = from.element.parentElement as HTMLElement;
    let clone = from.element.cloneNode(true) as HTMLElement;
    const parentPosition = content.getBoundingClientRect();
    const fromPosition = this.getPosition(from.element);
    fromPosition.top = (parseInt(fromPosition.top.replace("px", ""), 10) - parentPosition.top) + "px";
    fromPosition.left = (parseInt(fromPosition.left.replace("px", ""), 10) - parentPosition.left) + "px";
    Object.assign(clone.style, fromPosition);
    fromParent.appendChild(clone);
    //have vue remove the original element
    (from.element as HTMLElement).style.display = "none";
    from.done();
    try {
      ramjet.hide(clone);
      ramjet.hide(toElement);
    } catch(e){
      console.error('ramjet error', e)
    }
    //show the entering element to get a height reading and start the transform
    toElement.style.display = "";
    //animate the collapse content container by explictly measuring and setting the height
    content.style.height = (parseInt(content.style.height!.replace("px", ""), 10) - parseInt(fromPosition.height.replace("px", ""), 10) + to.element.getBoundingClientRect().height) + "px";
    
    //transform from our clone to the entering element
    ramjet.transform(clone, toElement, { duration: 150, done(){
      //show the final entering element, with its original style
      toElement.style.display = "";
      to.done();
      ramjet.show(toElement);
      //cleanup
      fromParent.removeChild(clone);
      content.style.height = "";
    }});

    // hide the entering element so that it doesn't interfere with the transform
    toElement.style.display = "none";
  }
  render(h: Function) {
    // TODO revert to jsx when that's properly supported for vue/typescript
    const subSlots = [];
    for(let i = 1; i <= this.subItemCount; i++) {
      // subSlots.push(
      //   <transition onBeforeEnter={this.beforeEnter} onEnter={this.enter} onLeave={this.leave}>
      //     { this.$slots["subSlot"+i] }
      //   </transition>
      // );
      subSlots.push(
        h('transition', {on: {'before-enter': this.beforeEnter, enter: this.enter, leave: this.leave}},
          [ this.$slots["subSlot"+i] ])
      )
    }

    // return (
    //   <el-collapse-item name={ this.collapseItemName } class="morphing-collapse">
    //     <template slot="title">
    //       <div class="tree-title">
    //         { this.collapseItemName }
    //         { this.$slots.select }
    //       </div>
    //     </template>
    //     { subSlots }
    //   </el-collapse-item>
    // );
    return h("div", {attrs: {class: "morphing-collapse"}}, [
      h("el-collapse-item", {props: {name: this.collapseItemName }},
        [
          h('div', {attrs: {class: 'tree-title'}, slot: 'title' }, [ this.collapseItemName, this.$slots.select ]),
          ...subSlots,
        ]
      )
    ]);
  }
}
