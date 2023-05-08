const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
    const browser = await puppeteer.launch({
      executablePath: "C:/Users/heric/chrome-win/chrome-win/chrome.exe",
    });
    const page = await browser.newPage();
    const url = "https://www.allrecipes.com/recipes/";
    await page.goto(url);
  
    const hrefs = await page.$$eval("a[data-tax-levels]", (links) =>
      links.map((link) => link.href)
    );
    const recipes = [];
    const ingredientsList = [];
    for (const href of hrefs) {
      const ingredients = []; // Initialiser la liste des ingrédients pour chaque page
  
      if (href && href.startsWith("https://www.allrecipes.com/recipe/")) {
        await page.goto(href);
        const h1 = await page.$eval("h1", (el) => el.textContent.trim());
        const imageSrc = await page.$eval(
          ".img-placeholder img",
          (img) => img.src
        );
        const subheading = await page.$eval(
          ".comp.type--dog.article-subheading",
          (el) => el.textContent.trim()
        );
  
        const ingredientList = await page.$(".mntl-structured-ingredients__list");
        const ingredientEls = await ingredientList.$$("li");
  
        for (const ingredientEl of ingredientEls) {
          const qtIng = await ingredientEl.$eval(
            "span[data-ingredient-quantity]",
            (el) => el.textContent.trim()
          );
          const unitIng = await ingredientEl.$eval(
            "span[data-ingredient-unit]",
            (el) => el.textContent.trim()
          );
          const nameIng = await ingredientEl.$eval(
            "span[data-ingredient-name]",
            (el) => el.textContent.trim()
          );
  
          ingredients.push({ qt: qtIng, unit: unitIng, name: nameIng });
        }
  
        recipes.push({
          title: h1,
          img: imageSrc,
          desc: subheading,
          ingredients: ingredients,
        });
  
        for (const ingredient of ingredients) {
          const found = ingredientsList.find((i) => i.name === ingredient.name);
          if (found === undefined) {
            ingredientsList.push({ name: ingredient.name });
          }
        }
      }
    }
    fs.writeFile("recipes.json", JSON.stringify(recipes), (err) => {
      if (err) throw err;
      console.log("Le fichier JSON a été créé avec succès!");
    });
    fs.writeFile("ingredients.json", JSON.stringify(ingredientsList), (err) => {
      if (err) throw err;
      console.log("Le fichier JSON a été créé avec succès!");
    });
    await browser.close();
  })();