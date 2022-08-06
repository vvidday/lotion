<template>
  <div class="group flex w-full rounded"
    :class="{
      // Add top margin for headings
      'pt-12 first:pt-0': block.type === BlockType.H1,
      'pt-4 first:pt-0': block.type === BlockType.H2,
    }">
    <div class="h-full px-2 pl-4 py-1.5 text-center cursor-pointer transition-all duration-150 text-neutral-300 flex"
      :class="{
        'py-3.5': block.type === BlockType.H1,
        'py-3': block.type === BlockType.H2,
        'py-2.5': block.type === BlockType.H3,
      }">
      <Tooltip value="<span class='text-neutral-400'><span class='text-white'>Click</span> to delete block</span>">
        <v-icon name="hi-trash" @click="emit('deleteBlock')"
          class="w-6 h-6 hover:bg-neutral-100 hover:text-neutral-400 p-0.5 rounded group-hover:opacity-100 opacity-0" />
      </Tooltip>
      <Tooltip value="<span class='text-neutral-400'><span class='text-white'>Click</span> to add block below</span>">
        <v-icon name="hi-plus" @click="emit('newBlock')"
          class="w-6 h-6 hover:bg-neutral-100 hover:text-neutral-400 p-0.5 rounded group-hover:opacity-100 opacity-0" />
      </Tooltip>
      <BlockMenu ref="menu"
        @setBlockType="type => emit('setBlockType', type)"
        @clearSearch="clearSearch"
        />
    </div>
    <div class="w-full relative" :class="{ 'px-4 sm:px-0': block.type !== BlockType.Divider }">
      <!-- Actual content -->
      <component :is="BlockComponents[props.block.type]" ref="content"
        :block="block"
        @keydown.capture="keyDownHandler"
        @keyup="parseMarkdown" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType } from 'vue'
import { Block, BlockType, BlockComponents } from '@/utils/types'
import BlockMenu from './BlockMenu.vue'
import Tooltip from './elements/Tooltip.vue'

const props = defineProps({
  block: {
    type: Object as PropType<Block>,
    default: {
      type: BlockType.Text,
      details: {},
    },
  },
})

const emit = defineEmits([
  'deleteBlock',
  'newBlock',
  'moveToPrevChar',
  'moveToNextChar',
  'moveToPrevLine',
  'moveToNextLine',
  'merge',
  'split',
  'setBlockType',
])

function getFirstChild () {
  if (props.block.type === BlockType.Text || props.block.type === BlockType.Quote) {
    let currNode = (content.value as any).$el.firstChild.firstChild
    while (currNode.childNodes.length > 0) {
      currNode = currNode.childNodes[0]
    }
    return currNode
  } else {
    if ((content.value as any).$el) return (content.value as any).$el.firstChild || content.value.$el
    else return (content.value as any).firstChild || content.value
  }
}

function getLastChild () {
  if (props.block.type === BlockType.Text || props.block.type === BlockType.Quote) {
    let currNode = (content.value as any).$el.firstChild.firstChild
    while (currNode.childNodes.length > 0) {
      currNode = currNode.childNodes[currNode.childNodes.length - 1]
    }
    return currNode
  } else {
    if ((content.value as any).$el) return (content.value as any).$el.firstChild || content.value.$el
    else return (content.value as any).firstChild || content.value
  }
}

function getInnerContent () {
  if (props.block.type === BlockType.Text || props.block.type === BlockType.Quote) {
    return (content.value as any).$el.firstChild.firstChild.firstChild
  } else {
    return (content.value as any).$el.firstChild
  }
}

function getTextContent () {
  const innerContent = getInnerContent()
  if (innerContent) return innerContent.parentElement ? innerContent.parentElement.textContent : innerContent.textContent
  else return ''
}

function getHtmlContent () {
  const innerContent = getInnerContent()
  if (innerContent) return innerContent.parentElement.innerHTML
  else return ''
}

function keyDownHandler (event:KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    if (menu.value?.open) {
      event.preventDefault()
    }
    // If at first line, move to previous block
    else if (atFirstLine()) {
      event.preventDefault()
      emit('moveToPrevLine')
    }
  } else if (event.key === 'ArrowDown') {
    if (menu.value?.open) {
      event.preventDefault()
    }
    // If at last line, move to next block
    else if (atLastLine()) {
      event.preventDefault()
      emit('moveToNextLine')
    }
  } else if (event.key === 'ArrowLeft') {
    // If at first character, move to previous block
    if (atFirstChar()) {
      event.preventDefault()
      emit('moveToPrevChar')
    }
  } else if (event.key === 'ArrowRight') {
    // If at last character, move to next block
    if (atLastChar()) {
      event.preventDefault()
      emit('moveToNextChar')
    }
  } else if (event.key === 'Backspace' && highlightedLength() === 0) {
    if (!(menu.value && menu.value.open) && atFirstChar()) {
      event.preventDefault()
      emit('merge')
    }
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (!(menu.value && menu.value.open)) {
      emit('split')
    }
  }
}

function isContentBlock () {
  return [BlockType.Text, BlockType.Quote, BlockType.H1, BlockType.H2, BlockType.H3].includes(props.block.type)
}

const content = ref<any>(null)
const menu = ref<typeof BlockMenu|null>(null)

function atFirstChar () {
  const startCoord = getStartCoordinates()
  const coord = getCaretCoordinates()
  return coord?.x === startCoord.x && coord?.y === startCoord.y
}

function atLastChar () {
  const endCoord = getEndCoordinates()
  const coord = getCaretCoordinates()
  return coord?.x === endCoord.x && coord?.y === endCoord.y
}
function atFirstLine () {
  const startCoord = getStartCoordinates()
  const coord = getCaretCoordinates()
  return coord?.y === startCoord.y
}

function atLastLine () {
  const endCoord = getEndCoordinates()
  const coord = getCaretCoordinates()
  return coord?.y === endCoord.y
}

function highlightedLength () {
  return window.getSelection()?.toString().length
}

function moveToStart () {
  if (isContentBlock()) {
    const firstChild = getFirstChild()
    if (firstChild) {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(firstChild)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    } 
  } else {
    emit('moveToNextChar')
  }
}

function moveToEnd () {
  if (isContentBlock()) {
    const lastChild = getLastChild()
    if (lastChild) {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(lastChild)
      range.collapse()
      selection?.removeAllRanges()
      selection?.addRange(range)
    } 
  } else {
    emit('moveToPrevChar')
  }
}

async function moveToFirstLine () {
  if (isContentBlock()) {
    const textContent = getTextContent()
    if (!textContent) {
      moveToStart()
    } else {
      let prevCoord = getCaretCoordinates()
      let prevDist = 99999
      let caretPos = 1
      while (true) {
        setCaretPos(caretPos)
        const newCoord = getCaretCoordinates()
        const newDist = Math.abs((newCoord?.x as number) - (prevCoord?.x as number))
        if (newDist > prevDist) {
          if (caretPos > 0) setCaretPos(caretPos - 1)
          break
        } else if (caretPos === textContent.length || caretPos > 999) {
          // Reached end of line
          break
        } else {
          prevDist = newDist
          caretPos += 1
        }
      }
    } 
  } else {
    emit('moveToNextLine')
  }
}

async function moveToLastLine () {
  if (isContentBlock()) {
    const textContent = getTextContent()
    if (!textContent) {
      moveToStart()
    } else {
      let prevCoord = getCaretCoordinates()
      let prevDist = 99999
      let caretPos = textContent.length
      while (true) {
        setCaretPos(caretPos)
        const newCoord = getCaretCoordinates()
        const newDist = Math.abs((newCoord?.x as number) - (prevCoord?.x as number))
        if (newDist > prevDist) {
          if (caretPos < textContent.length) setCaretPos(caretPos + 1)
          break
        } else if (caretPos === 0) {
          // Reached start of line
          break
        } else {
          prevDist = newDist
          caretPos -= 1
        }
      }
    }
  } else {
    emit('moveToPrevLine')
  }
}

function getCaretCoordinates () {
  let x = 0, y = 0
  const selection = window.getSelection()
  if ((selection?.rangeCount as number) > 0) {
    const range = selection?.getRangeAt(0)
    if (range?.startContainer.firstChild) {
      const newRange = document.createRange()
      newRange.selectNodeContents(range.startContainer.firstChild)
      newRange.collapse(true)
      const rect = newRange.getBoundingClientRect()
      return rect
    }
    const rect = range?.getBoundingClientRect()
    return rect
  }
  return { x, y }
}

interface OffsetRes {
  offsetNoTags: number,
  offset: number,
  found: boolean
  tags: string[]
}

/*
  Function that gets offset of a node within a text-based (tiptap editor) block
  @param selectedNode - The target node to get the offset for
  @param parentNode - The parent node containing the content - the div with class="ProseMirror"
  @param layer - Used for recursion
  @param tags - Used for recursion
  @return OffsetRes
    offsetNoTags - Integer representing offset of selectedNode without any tags
    offset - Integer representing offset of selectedNode including all html tags (<p>, <strong>, etc)
    found - Boolean indicating if selectedNode was found
    tags - Array of strings indicating the tag(s), if any, that wrap the selectedNode
*/
function getNodeOffset (selectedNode: Node, parentNode: any, layer:number = 1, tags:string[] = []) : OffsetRes {
  // Edge case for single character in #33 and after split - at most 2 layers deep
  // Walks down tree to find text node - Anchor node should always be text node, else the line is empty
  if (layer === 1 && selectedNode.childNodes.length > 0) {
    while (selectedNode.childNodes.length > 0) {
      selectedNode = selectedNode.childNodes[0]
    }
    // 3 = Text node - If not text node, line is empty
    if (selectedNode.nodeType !== 3) {
      return {offsetNoTags: 0, offset: 0, found: true, tags: []}
    }
  }
  // Maximum depth of 3 at all times, cannot nest more than <p><strong><em></em></strong></p>
  if (layer > 4) return {offsetNoTags: 0, offset: 0, found: false, tags: []}
  let offsetNoTags = 0, offset = 0
  for (const [_, node] of parentNode.childNodes.entries()) {
    if (node === selectedNode) {
      return {offsetNoTags: offsetNoTags, offset: offset, found: true, tags: tags}
    }
    if (node.childNodes.length > 0) {
      // Means current node is a <strong> or <em> node
      offset += node.tagName.length + 2
      // Ignore <p>
      if (node.tagName !== 'P') 
        tags.push(node.tagName.toLowerCase())
      // Recursively walk down tree to find text nodes
      const res = getNodeOffset(selectedNode, node, layer + 1, tags)
      if (res.found) return {offsetNoTags: offsetNoTags + res.offsetNoTags, offset: offset + res.offset, found: true, tags: res.tags}
      // Node not found, add closing tag (+3 for </>)
      offset += res.offset + node.tagName.length + 3
      offsetNoTags += res.offsetNoTags
      // Backtrack - the inner tag no longer wraps the following nodes
      tags.pop()
    } else {
      // Current node is a regular text node, add length
      offset += node.textContent.length
      offsetNoTags += node.textContent.length
    }
  }
  return {offsetNoTags: offsetNoTags, offset: offset, found: false, tags: tags}
}

function getCaretPos () {
  const selection = window.getSelection()
  if (selection && selection.anchorNode) {
    // If editor type, use getNodeOffset, else just return anchor offset
    if (props.block.type === BlockType.Text || props.block.type === BlockType.Quote) {
      const res = getNodeOffset(selection.anchorNode, (content.value as any).$el.firstChild)
      return {pos: selection.anchorOffset + res.offset, tags: res.tags}
    } else return {pos: selection.anchorOffset, tags: []}
  } else return {pos: 0, tags: []}
}

function getCaretPosWithoutTags () {
  const selection = window.getSelection()
  if (selection && selection.anchorNode) {
    // If editor type, use getNodeOffset, else just return anchor offset
    if (props.block.type === BlockType.Text || props.block.type === BlockType.Quote)
      return {pos: selection.anchorOffset + getNodeOffset(selection.anchorNode, (content.value as any).$el.firstChild).offsetNoTags}
    else return {pos: selection.anchorOffset}
  } else return {pos: 0}
}

interface NodeSelectRes {
  node?: Node,
  offset: number,
  found: boolean
}

/*
  Function that gets the node that we want to set the caret on, based on ideal caret position
  @param caretPos - The offset (no tags) of the ideal position of the caret
  @param parentNode - The parent node containing the content - the div with class="ProseMirror"
  @param layer - Used for recursion
  @return NodeSelectRes
    node - The node to set the caret on
    offset - Integer representing exact offset to set the caret on
    found - Boolean indicating if node was found
*/
function getNodeToSelect (caretPos: number, parentNode: any, layer: number = 1) : NodeSelectRes {
  if (layer > 4) return {offset: caretPos, found: false}
  for (const [_, node] of parentNode.childNodes.entries()) {
    if (node.childNodes.length > 0) {
      // Not in a text node - recursively walk down the tree until we get a text node
      const res = getNodeToSelect(caretPos, node, layer + 1)
      if (res.found) return {node: res.node, offset: res.offset, found: true}
      caretPos = res.offset
    } else {
      // If we are in a text node and caretPos <= length, this is the correct node
      if (caretPos <= node.textContent.length) {
        return {node: node, offset: caretPos, found: true}
      }
      caretPos -= node.textContent.length
    }
  }
  return {offset: caretPos, found: false}
}

function setCaretPos (caretPos:number) {
  const innerContent = getInnerContent()
  if (innerContent) {
    if (props.block.type === BlockType.Text || props.block.type === BlockType.Quote) {
      const res = getNodeToSelect(caretPos, (content.value as any).$el.firstChild)
      if (res.node !== undefined) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.setStart(res.node, res.offset)
        range.setEnd(res.node, res.offset)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    } else {
      const selection = window.getSelection()
      const range = document.createRange()
      range.setStart(innerContent, caretPos)
      range.setEnd(innerContent, caretPos)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }
}

function getStartCoordinates () {
  let x = 0, y = 0
  const firstChild = getFirstChild()
  if (firstChild) {
    const range = document.createRange()
    range.selectNodeContents(firstChild.firstChild || firstChild)
    range.collapse(true)
    const rect = range.getBoundingClientRect()
    x = rect.left
    y = rect.top
  }
  return { x, y }
}

function getEndCoordinates () {
  let x = 0, y = 0
  const lastChild = getLastChild()
  if (lastChild) {
    const range = document.createRange()
    range.selectNodeContents(lastChild.firstChild || lastChild)
    range.collapse()
    const rect = range.getBoundingClientRect()
    x = rect.left
    y = rect.top
  }
  return { x, y }
}

function parseMarkdown (event:KeyboardEvent) {
  const textContent = getTextContent()
  if(!textContent) return

  const headingRegexpMap = {
    [BlockType.H1]: /^#\s(.*)$/,
    [BlockType.H2]: /^##\s(.*)$/,
    [BlockType.H3]: /^###\s(.*)$/,
  }
  const handleHeadingContent = (blockType: keyof typeof headingRegexpMap) => {
    emit('setBlockType', blockType)
    const newContent = textContent.replace(headingRegexpMap[blockType], '$1')
    ;(content.value as any).innerText = newContent
    props.block.details.value = newContent
  }

  if (textContent.match(headingRegexpMap[BlockType.H1]) && event.key === ' ') {
    handleHeadingContent(BlockType.H1)
  } else if (textContent.match(headingRegexpMap[BlockType.H2]) && event.key === ' ') {
    handleHeadingContent(BlockType.H2)
  } else if (textContent.match(headingRegexpMap[BlockType.H3]) && event.key === ' ') {
    handleHeadingContent(BlockType.H3)
  } else if (textContent.match(/^---$/)) {
    emit('setBlockType', BlockType.Divider);
    (content.value as any).innerText = ''
  } else if (event.key === '/') {
    if (menu.value && !menu.value.open) {
      menu.value.open = true
      menu.value.openedWithSlash = true
    }
  }
}

function clearSearch (searchTermLength: number, openedWithSlash: boolean = false) {
  // If openedWithSlash, searchTermLength = 0 but we still need to clear
  if (searchTermLength < 1 && !openedWithSlash) 
    return

  let pos:number, startIdx:number, endIdx:number;
  let finalText:string, finalTextWithTags:string = '';
  // Refers to current block type before change
  if (props.block.type === BlockType.Text || props.block.type === BlockType.Quote) {
    pos = getCaretPos().pos;
    // Subtract extra 3 for <p> in front
    startIdx = pos - searchTermLength - 4;
    endIdx = pos - 3;
    const htmlContent = getHtmlContent();
    finalTextWithTags = htmlContent.substring(0, startIdx) + htmlContent.substring(endIdx);
  } 
  pos = getCaretPosWithoutTags().pos
  startIdx = pos - searchTermLength - 1
  endIdx = pos
  const textContent = getTextContent()
  finalText = textContent.substring(0, startIdx) + textContent.substring(endIdx)

  setTimeout(() => {
    // Refers to block type after change
    if (props.block.type === BlockType.Text || props.block.type === BlockType.Quote) {
      if (finalTextWithTags !== '') {
        props.block.details.value = '<p>' + finalTextWithTags + '</p>'
      } else {
        // We came from a heading type, so use plain text
        props.block.details.value = '<p>' + finalText + '</p>'
      }
    } else if (props.block.type === BlockType.Divider) {
      props.block.details = {}
    } else {
      props.block.details.value = finalText
    }
    setTimeout(() => setCaretPos(startIdx))
  })
}

defineExpose({
  content,
  getTextContent,
  getHtmlContent,
  moveToStart,
  moveToEnd,
  moveToFirstLine,
  moveToLastLine,
  getCaretPos,
  setCaretPos,
})
</script>
