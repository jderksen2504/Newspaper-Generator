/**
 * Test: Does scrollHeight work correctly with CSS multi-column + overflow:hidden?
 * 
 * This test creates a multi-column div with overflow:hidden and checks if
 * scrollHeight > clientHeight when content overflows.
 */

const puppeteer = require("puppeteer");

async function test() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Test 1: Multi-column with overflow:hidden — does scrollHeight detect overflow?
  await page.setContent(`
    <style>
      .container {
        width: 400px;
        height: 200px;
        column-count: 2;
        column-gap: 12px;
        column-fill: auto;
        overflow: hidden;
        border: 1px solid red;
      }
      .container-no-overflow {
        width: 400px;
        height: 200px;
        column-count: 2;
        column-gap: 12px;
        column-fill: auto;
        border: 1px solid blue;
      }
      .article {
        break-inside: avoid;
        margin-bottom: 10px;
      }
    </style>
    <div class="container" id="test1">
      <div class="article">Article 1: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</div>
      <div class="article">Article 2: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</div>
      <div class="article">Article 3: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</div>
      <div class="article">Article 4: Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
      <div class="article">Article 5: Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</div>
    </div>
    <div class="container-no-overflow" id="test2">
      <div class="article">Article 1: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</div>
      <div class="article">Article 2: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</div>
      <div class="article">Article 3: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</div>
      <div class="article">Article 4: Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
      <div class="article">Article 5: Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</div>
    </div>
  `);

  const result = await page.evaluate(() => {
    const t1 = document.getElementById("test1");
    const t2 = document.getElementById("test2");
    return {
      test1_overflow_hidden: {
        scrollHeight: t1.scrollHeight,
        clientHeight: t1.clientHeight,
        hasOverflow: t1.scrollHeight > t1.clientHeight,
      },
      test2_no_overflow: {
        scrollHeight: t2.scrollHeight,
        clientHeight: t2.clientHeight,
        hasOverflow: t2.scrollHeight > t2.clientHeight,
      },
    };
  });

  console.log("=== Test Results ===");
  console.log("Test 1 (overflow:hidden):", JSON.stringify(result.test1_overflow_hidden, null, 2));
  console.log("Test 2 (no overflow):    ", JSON.stringify(result.test2_no_overflow, null, 2));

  // Test 3: With flex:1 (like the actual code)
  await page.setContent(`
    <style>
      * { box-sizing: border-box; }
      .paper {
        width: 400px;
        height: 300px;
        padding: 16px;
        border: 2px solid black;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .masthead {
        border-bottom: 3px double black;
        padding-bottom: 6px;
        margin-bottom: 8px;
      }
      .columns {
        column-count: 2;
        column-gap: 12px;
        column-fill: auto;
        flex: 1;
        overflow: hidden;
      }
      .columns-no-overflow {
        column-count: 2;
        column-gap: 12px;
        column-fill: auto;
        flex: 1;
      }
      .footer {
        border-top: 1px solid black;
        margin-top: 6px;
        padding-top: 3px;
      }
      .article {
        break-inside: avoid;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid gray;
      }
    </style>
    <div class="paper" id="paper1">
      <div class="masthead">MASTHEAD - Title goes here</div>
      <div class="columns" id="cols1">
        <div class="article">Article 1: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</div>
        <div class="article">Article 2: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</div>
        <div class="article">Article 3: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</div>
        <div class="article">Article 4: Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
        <div class="article">Article 5: Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</div>
      </div>
      <div class="footer">FOOTER</div>
    </div>
    <div class="paper" id="paper2">
      <div class="masthead">MASTHEAD - Title goes here</div>
      <div class="columns-no-overflow" id="cols2">
        <div class="article">Article 1: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</div>
        <div class="article">Article 2: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</div>
        <div class="article">Article 3: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</div>
        <div class="article">Article 4: Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
        <div class="article">Article 5: Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</div>
      </div>
      <div class="footer">FOOTER</div>
    </div>
  `);

  const result2 = await page.evaluate(() => {
    const c1 = document.getElementById("cols1");
    const c2 = document.getElementById("cols2");
    return {
      test3_flex_overflow_hidden: {
        scrollHeight: c1.scrollHeight,
        clientHeight: c1.clientHeight,
        hasOverflow: c1.scrollHeight > c1.clientHeight + 2,
      },
      test4_flex_no_overflow: {
        scrollHeight: c2.scrollHeight,
        clientHeight: c2.clientHeight,
        hasOverflow: c2.scrollHeight > c2.clientHeight + 2,
      },
    };
  });

  console.log("\n=== Test with flex:1 (actual code structure) ===");
  console.log("Test 3 (flex:1 + overflow:hidden):", JSON.stringify(result2.test3_flex_overflow_hidden, null, 2));
  console.log("Test 4 (flex:1, no overflow):    ", JSON.stringify(result2.test4_flex_no_overflow, null, 2));

  // Test 5: Fixed height (no flex) + no overflow
  const result3 = await page.evaluate(() => {
    const test = document.createElement("div");
    test.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: 366px;
      height: 200px;
      column-count: 2;
      column-gap: 12px;
      column-fill: auto;
      box-sizing: border-box;
    `;
    test.innerHTML = `
      <div class="article">Article 1: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.</div>
      <div class="article">Article 2: Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</div>
      <div class="article">Article 3: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</div>
      <div class="article">Article 4: Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
      <div class="article">Article 5: Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</div>
    `;
    document.body.appendChild(test);
    const result = {
      scrollHeight: test.scrollHeight,
      clientHeight: test.clientHeight,
      hasOverflow: test.scrollHeight > test.clientHeight + 2,
    };
    document.body.removeChild(test);
    return result;
  });

  console.log("\n=== Test 5: Fixed height, no overflow:hidden ===");
  console.log(JSON.stringify(result3, null, 2));

  await browser.close();
}

test().catch(console.error);
