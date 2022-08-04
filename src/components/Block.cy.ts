import { Block, BlockType } from "@/utils/types"
import { mount } from "cypress/vue"
import BlockComp from "./Block.vue"

interface TestValue {
  text: string;
  posOfB: number;
}

const TEST_STRINGS_REG = [
  { str: "aaaaaB aaaaaa", idx: 6 },
  { str: "aaaaa aBaaaaa", idx: 8 },
  { str: "aaaaa aaaaaBa", idx: 12 },
];
const TEST_STRINGS_BOLD = [
  { str: "<strong>aaaaaB</strong> aaaaaa", idx: 6 },
  { str: "aaa<strong>aa aB</strong>aaaaa", idx: 8 },
  { str: "<strong>a</strong>aaaa aaaaaBa", idx: 12 },
];

const TEST_STRINGS_ITALIC = [
  { str: "<em>aaaaaB</em> aaaaaa", idx: 6 },
  { str: "aaa<em>aa aB</em>aaaaa", idx: 8 },
  { str: "<em>a</em>aaaa aaaaaBa", idx: 12 },
];

const TEST_STRINGS_BOLD_ITALIC = [
  { str: "<strong>a<em>a</em>aaaB</strong> aaaaaa", idx: 6 },
  { str: "<strong>a<em>aaaaB</em></strong> aaaaaa", idx: 6 },
  { str: "aaaaa <em>a</em><strong><em>Baa</em></strong><em>aa</em>a", idx: 8 },
  { str: "<strong>aaa</strong>aa <em>a</em><strong><em>Baa</em></strong><em>aa</em>a", idx: 8 },
  { str: "<strong>aaa<em>aa</em></strong> aaaaaBa", idx: 12 },
  { str: "a<em>aaaa</em> aaa<strong><em>aaB</em>a</strong>", idx: 12 },
];

const TESTS = [TEST_STRINGS_REG, TEST_STRINGS_BOLD, TEST_STRINGS_ITALIC, TEST_STRINGS_BOLD_ITALIC];
const TEST_VALUES: TestValue[] = [];

for (const arr of TESTS) {
  for (const test of arr) {
    TEST_VALUES.push({ text: `<p>${test.str}</p>`, posOfB: test.idx });
  }
}

describe("getCaretPos and getCaretPosWithoutTags correctly get position of caret", () => {
  for (const TestVal of TEST_VALUES) {
    it("should return the correct value", () => {
      const block: Block = {
        type: BlockType.Text,
        details: {
          value: TestVal.text,
        },
      };
      mount(BlockComp, {
        propsData: {
          block,
        },
      }).then((wrapper) => {
        // Move to start of line
        const x = cy.get(".ProseMirror").type("{home}");
        // Move to startPos
        for (let i = 0; i < TestVal.posOfB - 1; i++) {
          x.type("{rightArrow}");
        }
        x.type("{rightArrow}").then(() => {
          // Test getCaretPos()
          const pos = wrapper.vm.getCaretPos();
          expect(pos.pos).to.be.eq(TestVal.text.indexOf("B") + 1);
          // Test getCaretPosWithoutTags()
          const posNoTags = wrapper.vm.getCaretPosWithoutTags();
          expect(posNoTags.pos).to.be.eq(TestVal.posOfB);
        });
      });
    });
  }
});

describe("setCaretPos correctly sets caret position", () => {
  const testString = "<p>R<strong>utr<em>um </em>la</strong>c<em>in</em><strong><em>ia f</em></strong><em>rin</em>gilla quis ull</p>"
  const testCases = [
    {idx: 0, textContent: 'R', offset: 0},
    {idx: 1, textContent: 'R', offset: 1},
    {idx: 3, textContent: 'utr', offset: 2},
    {idx: 6, textContent: 'um ', offset: 2},
    {idx: 9, textContent: 'la', offset: 2},
    {idx: 11, textContent: 'in', offset: 1},
    {idx: 14, textContent: 'ia f', offset: 2},
    {idx: 19, textContent: 'rin', offset: 3},
    {idx: 25, textContent: 'gilla quis ull', offset: 6},
  ]
  for (const testCase of testCases) {
    it("should set caret to correct position", () => {
      const block: Block = {
        type: BlockType.Text,
        details: {
          value: testString
        }
      }
      mount(BlockComp, {
        propsData: {
          block
        }
      }).then((wrapper) => {
        wrapper.vm.setCaretPos(testCase.idx)
        const sel = window.getSelection()
        expect(sel?.anchorNode?.textContent).to.be.eq(testCase.textContent)
        expect(sel?.anchorOffset).to.be.eq(testCase.offset)
      })
    })
  }
})