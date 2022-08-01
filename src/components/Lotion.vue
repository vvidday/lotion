<template>
  <div class="w-[65ch] mx-auto my-24">
    <h1 id="title" contenteditable="true" spellcheck="false" data-ph="Untitled" @blur="props.page.name=($event.target as HTMLElement).innerText.replace('\n', '')"
      class="px-4 sm:px-0 focus:outline-none focus-visible:outline-none text-5xl font-bold mb-12"
      :class="props.page.name ? '' : 'empty'">
      {{ props.page.name || '' }}
    </h1>
    <draggable tag="div" :list="props.page.blocks"  handle=".handle" :contenteditable="isContentEditable" @keydown="keyDownHandler"
      v-bind="dragOptions" class="-ml-24 space-y-2 pb-4" @mousedown="() => isContentEditable = false">
      <transition-group type="transition">
        <BlockComponent :block="block" v-for="block, i in props.page.blocks" :key="i"
          :ref="el => blockElements[i] = (el as unknown as typeof Block)" 
          @deleteBlock="props.page.blocks.splice(i, 1)"
          @newBlock="insertBlock(i)"
          @moveToPrevChar="() => { if (blockElements[i-1]) blockElements[i-1].moveToEnd(); scrollIntoView(); }"
          @moveToNextChar="() => { if (blockElements[i+1]) blockElements[i+1].moveToStart(); scrollIntoView(); }"
          @moveToPrevLine="() => { if (blockElements[i-1]) blockElements[i-1].moveToLastLine(); scrollIntoView(); }"
          @moveToNextLine="() => { if (blockElements[i+1]) blockElements[i+1].moveToFirstLine(); scrollIntoView(); }"
          @merge="merge(i)"
          @split="split(i)"
          @setBlockType="type => setBlockType(i, type)"
          />
      </transition-group>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUpdate, PropType, nextTick } from 'vue'
import { VueDraggableNext as draggable } from 'vue-draggable-next'
import { Block, BlockType } from '@/utils/types'
import BlockComponent from './Block.vue'

const props = defineProps({
  page: {
    type: Object as PropType<{ name:string, blocks:Block[] }>,
    required: true,
  }
})

const dragOptions = {
  animation: 150,
  group: 'blocks',
  disabled: false,
  ghostClass: 'ghost',
}


onBeforeUpdate(() => {
  blockElements.value = []
})

const blockElements = ref<typeof BlockComponent[]>([])

const isContentEditable = ref<boolean | null>(false);

// Listener to set contentEditable on parent div to true when selecting (enables multi-line select)
document.addEventListener('selectionchange', (e) => {
  const selection = window.getSelection();
  if (selection != null && !selection.isCollapsed) {
    isContentEditable.value = true;
  } else {
  }
})

function keyDownHandler(event : KeyboardEvent) {
  // When parent isContentEditable = true, this handler will fire instead of the one in Block.vue
  const selection = window.getSelection();
  if (selection === null || selection.anchorNode === null || selection.focusNode === null) return; 
  // We only need to change default behaviour if the selection spans multiple blocks, otherwise just use standard browser behaviour
  if (inDifferentBlocks(selection)) {
    const anchorIdx = getBlockIndex(selection.anchorNode);
    const focusIdx = getBlockIndex(selection.focusNode);
    if (anchorIdx === -1 || focusIdx === -1) {
      console.log("Something went wrong");
    }
    // *Unconfirmed*, https://stackoverflow.com/a/58658881 - KIV better way to determine if char is printable
    if (event.key.length === 1) {
      multiLineDelete(anchorIdx, focusIdx, selection, event.key);
      event.preventDefault();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      multiLineDelete(anchorIdx, focusIdx, selection);
      split(Math.min(anchorIdx, focusIdx));
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      multiLineDelete(anchorIdx, focusIdx, selection);
    }
  } 
}

/*
  Handles deletion of multiple lines
  @param anchorIdx - index of anchor node (position in block array)
  @param focusIdx - index of focus node (poisiton in block array)
  @param selection - Selection object that triggered deletion
  @param insert - optional character to insert after deletion
*/
function multiLineDelete(anchorIdx: number, focusIdx: number, selection: Selection, insert: string = '') {
  if (selection.anchorNode === null || selection.focusNode === null) return;
  // Either anchor or focus, whichever is earlier/later in the page
  const isAnchorEarlier = anchorIdx < focusIdx;
  const earlierNode = isAnchorEarlier ? selection.anchorNode : selection.focusNode;
  const earlierOffset = isAnchorEarlier ? selection.anchorOffset : selection.focusOffset;
  const earlierIdx = isAnchorEarlier ? anchorIdx : focusIdx;
  const laterNode = isAnchorEarlier ?  selection.focusNode : selection.anchorNode;
  const laterOffset = isAnchorEarlier ?  selection.focusOffset : selection.anchorOffset;
  const laterIdx = isAnchorEarlier ? focusIdx : anchorIdx;

  // Walk up element tree
  const earlierNodeParent = getBlockParentNode(earlierNode);
  const laterNodeParent = getBlockParentNode(laterNode);

  if (earlierNodeParent && laterNodeParent) {
    modifyPageData(earlierIdx, processEarlierNode(earlierNodeParent, earlierNode, earlierOffset, insert));
    modifyPageData(laterIdx, processLaterNode(laterNodeParent, laterNode, laterOffset));
  }
  // Perform merge
  if (insert != '') {
    // Increase offset by 1 to take into account character
    multiMerge(earlierIdx, laterIdx, earlierNode, earlierOffset + 1);
  } else {
    multiMerge(earlierIdx, laterIdx, earlierNode, earlierOffset);
  }
}

function modifyPageData(idx: number, newData: string) {
  props.page.blocks[idx].details.value = newData;
}

/* Modifies node to get rid of everything after provided offset.
  To be called on the node on the earlier line during a multi-line merge.
  @param parentNode - The parent node containing text, i.e. class="ProseMirror" for text
  @param selectionNode - The node pointed to by selection (either anchorNode or focusNode)
  @param offset - The provided offset by selection (anchorOffset or focusOffset)
  @param insert - Character to be inserted at the end (due to user's input)
*/
function processEarlierNode(parentNode: Node, selectionNode: Node, offset: number, insert: string) {
  // Todo: headings
  // In the case of simple text (no bold/italics) or headings, there is only one child
  if (parentNode.childNodes.length === 1) {
    // Directly use offset
    return `<p>${parentNode.childNodes[0].textContent?.substring(0, offset) + insert}</p>`;
  } else {
    // Todo - case where there's multiple children eg lorem<strong>ipsum</strong><em>dolor</em>
    return `<p></p>`
  }
}

// Modifies node to get rid of everything before provided offset
function processLaterNode(node: Node, selectionNode: Node, offset: number) {
    // Todo: headings
    if (node.childNodes.length === 1) {
    // Directly use offset
    return `<p>${node.childNodes[0].textContent?.substring(offset)}</p>`;
  } else {
    // Todo - case where there's multiple children eg lorem<strong>ipsum</strong><em>dolor</em>
    return `<p></p>`
  }
}

// Gets the direect parent div for the block content 
function getBlockParentNode(node : Node) {
  // Walk up element tree to find container div 
  // TODO: support for divider
  let currEle = node.parentElement;
  while (currEle != null) {
    const parent = currEle.parentElement;
    if (parent != null && (parent.classList.contains('ProseMirror') || parent.hasAttribute('block-type'))) {
      if (parent.children.length > 0)
        return parent.children[0];
    }
  }
  return null;
}

function inDifferentBlocks(selection : Selection) {
  return selection.anchorNode !== selection.focusNode;
}

// Get index of block in page array 
function getBlockIndex(anchorNode : Node) {
  // Walk up element tree to try and find container div 
  let currEle = anchorNode.parentElement;
  while (currEle !== null) {
    const parent = currEle.parentElement;
    if (parent !== null && parent.getAttribute('group') === 'blocks') {
      for (let i = 0; i < parent.children.length; i++) {
        if (parent.children[i] === currEle) {
          return i;
        }
      }
    }
    currEle = currEle.parentElement;
  }
  return -1;
}

function scrollIntoView () {
  const selection = window.getSelection()
  if (selection?.anchorNode?.nodeType === Node.ELEMENT_NODE) {
    (selection?.anchorNode as HTMLElement).scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"})
  } else {
    (selection?.anchorNode?.parentElement as HTMLElement).scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"})
  }
}

function insertBlock (blockIdx: number) {
  props.page.blocks.splice(blockIdx + 1, 0, {
    type: BlockType.Text,
    details: {
      value: '',
    },
  })
  setTimeout(() => {
    blockElements.value[blockIdx+1].moveToStart()
    scrollIntoView()
  })
}

function setBlockType (blockIdx: number, type: BlockType) {
  if (props.page.blocks[blockIdx].type === BlockType.Text) {
    props.page.blocks[blockIdx].details.value = blockElements.value[blockIdx].getTextContent()
  }
  props.page.blocks[blockIdx].type = type
  if (type === BlockType.Divider) {
    props.page.blocks[blockIdx].details = {}
    insertBlock(blockIdx)
  } else setTimeout(() => blockElements.value[blockIdx].moveToEnd())
}

function multiMerge (startIdx: number, endIdx: number, node: Node, offset: number) {
  if (props.page.blocks[startIdx].type === BlockType.Text) {
    const newContent = props.page.blocks[endIdx].details.value?.replace('<p>', '').replace('</p>', '');
    props.page.blocks[startIdx].details.value = '<p>' + props.page.blocks[startIdx].details.value?.replace('<p>', '').replace('</p>', '') + newContent + '</p>';
  } else {
    // Need to consider divider as well
    const newContent = props.page.blocks[endIdx].details.value?.replace('<p>', '').replace('</p>', '');
    if (newContent !== undefined)
      props.page.blocks[startIdx].details.value += newContent
  }
  props.page.blocks.splice(startIdx + 1, endIdx - startIdx);

  // Update caret position
  const selection = window.getSelection();
  selection?.removeAllRanges();
  const range = document.createRange();
  isContentEditable.value = false;
  // Need to wait until next tick for page props to update
  nextTick(() => {
    range.setStart(node, offset);
    range.setEnd(node, offset);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  })
}

function merge (blockIdx: number) {
  if (props.page.blocks[blockIdx-1].type === BlockType.Text) {
    const prevBlockContentLength = blockElements.value[blockIdx-1].getTextContent().length
    props.page.blocks[blockIdx-1].details.value = ('<p>' + (props.page.blocks[blockIdx-1] as any).details.value.replace('<p>', '').replace('</p>', '') + blockElements.value[blockIdx].getHtmlContent().replace('<p>', '').replace('</p>', '') + '</p>').replace('</strong><strong>', '').replace('</em><em>', '')
    setTimeout(() => {
      blockElements.value[blockIdx-1].setCaretPos(prevBlockContentLength)
      props.page.blocks.splice(blockIdx, 1)
    })
  } else if ([BlockType.H1, BlockType.H2, BlockType.H3].includes(props.page.blocks[blockIdx-1].type)) {
    const prevBlockContentLength = (props.page.blocks[blockIdx-1] as any).details.value.length
    props.page.blocks[blockIdx-1].details.value += blockElements.value[blockIdx].getTextContent()
    setTimeout(() => {
      blockElements.value[blockIdx-1].setCaretPos(prevBlockContentLength)
      props.page.blocks.splice(blockIdx, 1)
    })
  } else {
    props.page.blocks.splice(blockIdx-1, 1)
    setTimeout(() => blockElements.value[blockIdx-1].moveToStart())
  }
}

function split (blockIdx: number) {
  const caretPos = blockElements.value[blockIdx].getCaretPos()
  insertBlock(blockIdx)
  props.page.blocks[blockIdx+1].details.value = (caretPos.tag ? `<p><${caretPos.tag}>` : '<p>') + props.page.blocks[blockIdx].details.value?.slice(caretPos.pos)
  if (props.page.blocks[blockIdx].type === BlockType.Text) {
    props.page.blocks[blockIdx].details.value = props.page.blocks[blockIdx].details.value?.slice(0, caretPos.pos) + (caretPos.tag ? `</${caretPos.tag}></p>` : '</p>')
  } else {
    props.page.blocks[blockIdx].details.value = props.page.blocks[blockIdx].details.value?.slice(0, caretPos.pos) + (caretPos.tag ? `</${caretPos.tag}></p>` : '')
  }
  setTimeout(() => blockElements.value[blockIdx+1].moveToStart())
}
</script>
