import { Block, BlockType } from "@/utils/types";
import { mount } from "cypress/vue";
import BlockComp from "./Block.vue";

const template = {
  template: `<Block />`,
  props: {
    block: {
      type: BlockType.Text,
      details: {},
    },
  },
};

// const block: Block = {
//   type: BlockType.Text,
//   details: {
//     value: "lorem ipsum",
//   },
// };

interface TestValue {
  text: string;
  posOfB: number;
}

// function newTestValue(str: string, idx: number): TestValue {
//   return {
//     text: "<p>" + insertStr(str, idx, "B") + "</p>",
//     posOfB: idx,
//   };
// }

// function newTagTestValue() {
//   return insertTags(insertStr(TEST_STRINGS_REG[0], 4, "B"), [{name: 'strong', startIdx: }])
// }

// function insertStr(str: string, idx: number, ins: string) {
//   return str.slice(0, idx) + ins + str.slice(idx);
// }

// interface TagInfo {
//   name: string;
//   startIdx: number;
//   endIdx: number;
// }
// function insertTags(str: string, tags: TagInfo[]) {
//   let result = str.slice(0, tags[0].startIdx);
//   for (let i = 0; i < tags.length; i++) {
//     result += `<${tags[i].name}>` + str.slice(tags[0].startIdx, tags[0].endIdx) + `</${tags[i].name}>`;
//     if (i < tags.length - 1) result += str.slice(tags[i].endIdx, tags[i + 1].startIdx);
//   }
//   return result;
// }

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
  { str: "aaaaa <em>a</em><strong>Baa</strong><em>aa</em>a", idx: 8 },
  { str: "<strong>aaa</strong>aa <em>a</em><strong>Baa</strong><em>aa</em>a", idx: 8 },
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

// for (const test of TEST_STRINGS_REG) {
//   TEST_VALUES.push({ text: `<p>${test.str}</p>`, posOfB: test.idx });
// }
// for (const test of TEST_STRINGS_BOLD) {
//   TEST_VALUES.push({ text: `<p>${test.str}</p>`, posOfB: test.idx });
// }
// for (const test of TEST_STRINGS_ITALIC) {
//   TEST_VALUES.push({ text: `<p>${test.str}</p>`, posOfB: test.idx });
// }
// for (const test of TEST_STRINGS_BOLD_ITALIC) {
//   TEST_VALUES.push({ text: `<p>${test.str}</p>`, posOfB: test.idx });
// }

const { _, $ } = Cypress;

describe("renders", () => {
  for (const TestVal of TEST_VALUES) {
    it("", () => {
      //console.log(TestVal);
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
        // Click on editor
        //cy.get(".ProseMirror").click();
        // Move to start of line
        const x = cy.get(".ProseMirror").type("{home}");
        // Move to startPos
        for (let i = 0; i < TestVal.posOfB - 1; i++) {
          x.type("{rightArrow}");
        }
        x.type("{rightArrow}").then(() => {
          // Test getCaretPos()
          const pos = wrapper.vm.getCaretPos();
          console.log(pos);
          expect(pos.pos).to.be.equal(TestVal.text.indexOf("B") + 1);
          // Test getCaretPosWithoutTags()
          const posNoTags = wrapper.vm.getCaretPosWithoutTags();
          console.log(posNoTags);
          expect(posNoTags.pos).to.be.equal(TestVal.posOfB);
        });
      });
    });
  }
});
