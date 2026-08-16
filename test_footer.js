import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 997 });
  await page.goto('http://localhost:3331/');
  
  // Wait for React to mount
  await page.waitForTimeout(2000);
  
  // Extract bounding boxes
  const data = await page.evaluate(() => {
    const textDiv = document.querySelector('.brand-signoff-mark');
    const textSpan = document.querySelector('.shiny-text');
    const gridCanvas = document.querySelector('.ripple-grid-container canvas');
    const footer = document.querySelector('#app-footer');
    
    return {
      textDiv: textDiv ? textDiv.getBoundingClientRect().toJSON() : null,
      textSpan: textSpan ? textSpan.getBoundingClientRect().toJSON() : null,
      gridCanvas: gridCanvas ? gridCanvas.getBoundingClientRect().toJSON() : null,
      footer: footer ? footer.getBoundingClientRect().toJSON() : null,
    };
  });
  
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
