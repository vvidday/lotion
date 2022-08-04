import { BlockType } from "@/utils/types";
import { mount } from "cypress/vue";
import Lotion from "./Lotion.vue";

const defaultData = {
  name: "🧴 Lotion",
  blocks: [
    {
      type: BlockType.Text,
      details: {
        value: "<p>Dummy Element</p>",
      },
    },
    {
      type: BlockType.Text,
      details: {
        value: "<p><strong><em>Italic Bold</em></strong></p>",
      },
    },
    {
      type: BlockType.H1,
      details: {
        value: "Dummy Header",
      },
    },
  ],
};

let page = {...defaultData}

function walkToParent (node: Node) {
  let parent = node.parentElement;
  if (parent?.classList.contains("ProseMirror")) return parent;
  let gp = parent?.parentElement;
  while (gp) {
    if (gp.classList.contains("ProseMirror")) {
      return gp;
    }
    parent = gp;
    gp = gp.parentElement;
  }
}


describe("app should be functional when operations are performed on/within italic bold text", () => {
  beforeEach(() => {
    mount(Lotion, {
      propsData: {
        page,
      },
    });
  });
  it("should go to previous block when left arrow key is pressed at start of block", () => {
    expect(1).to.be.eq(1);
    cy.get(".ProseMirror")
      .eq(1)
      .type("{home}")
      .type("{leftArrow}")
      .then(() => {
        const sel = window.getSelection();
        if (sel !== null && sel.anchorNode !== null) {
          const parent = walkToParent(sel.anchorNode);
          expect(parent?.innerHTML).to.be.eq("<p>Dummy Element</p>");
        }
      });
  });

  it("should go to previous block when up arrow key is pressed", () => {
    cy.get(".ProseMirror")
      .eq(1)
      .type("{home}")
      .type("{upArrow}")
      .then(() => {
        const sel = window.getSelection();
        if (sel !== null && sel.anchorNode !== null) {
          const parent = walkToParent(sel.anchorNode);
          expect(parent?.innerHTML).to.be.eq("<p>Dummy Element</p>");
        }
      });
  });

  it("should go to next block when right arrow key is pressed at end of block", () => {
    cy.get(".ProseMirror")
      .eq(1)
      .type("{rightArrow}")
      .then(() => {
        const sel = window.getSelection();
        expect(sel?.anchorNode?.textContent).to.be.eq('Dummy Header')
      });
  });

  it("should merge properly if first character is italic bold", () => {
    cy.get(".ProseMirror").eq(1).type("{home}").type("{backspace}").then(() => {
      const sel = window.getSelection()
      if (sel !== null && sel.anchorNode !== null) {
        const parent = walkToParent(sel.anchorNode)
        expect(parent?.innerHTML).to.be.eq("<p>Dummy Element<strong><em>Italic Bold</em></strong></p>")
      }
    })
  })

  it("should split properly if initiated within italic bold", () => {
    cy.get(".ProseMirror").eq(0).type("{leftArrow}").type("{leftArrow}").type("{enter}").then(() => {
      const sel = window.getSelection()
      if (sel !== null && sel.anchorNode !== null) {
        const parent = walkToParent(sel.anchorNode)
        expect(parent?.innerHTML).to.be.eq("<p><strong><em>ld</em></strong></p>")
      }
    })
  })

  it("should keep tags and caret position upon changing type to quote", () => {
    cy.get(".ProseMirror").eq(0).type("{leftArrow}").type("/quote").type("{enter}").then(() => {
      const sel = window.getSelection()
      if (sel !== null && sel.anchorNode !== null) {
        const parent = walkToParent(sel.anchorNode)
        expect(parent?.innerHTML).to.be.eq("<p>Dummy Element<strong><em>Italic Bo</em></strong></p>")
        // maintain caret position
        expect(sel.anchorOffset).to.be.eq(8)
      }
    })
  })

});
