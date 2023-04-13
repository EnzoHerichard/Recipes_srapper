//executablePath: 'C:/Users/heric/chrome-win/chrome-win/chrome.exe'
const puppeteer = require('puppeteer');
const fs = require('fs');
const mysql = require('mysql2/promise');
const MongoClient = require('mongodb').MongoClient;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Users/heric/chrome-win/chrome-win/chrome.exe'
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
  
      const ingredientList = await page.$('.mntl-structured-ingredients__list');
      const ingredientEls = await ingredientList.$$('li');
  
      for (const ingredientEl of ingredientEls) {
        const qtIng = await ingredientEl.$eval('span[data-ingredient-quantity]', el => el.textContent.trim());
        const unitIng = await ingredientEl.$eval('span[data-ingredient-unit]', el => el.textContent.trim());
        const nameIng = await ingredientEl.$eval('span[data-ingredient-name]', el => el.textContent.trim());
  
        ingredients.push({ qt: qtIng, unit: unitIng, name: nameIng });
      }
  
      recipes.push({ title: h1, img: imageSrc, desc: subheading, ingredients: ingredients });
  
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
// INSERTION DES RECETTES ET INGREDIENTS DANS LA BASE DE DONNEES MYSQL
(async () => {

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant'
  });
  await connection.execute(`CREATE TABLE IF NOT EXISTS recettes (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(255)
  )`);

  await connection.execute(`CREATE TABLE IF NOT EXISTS ingredients (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL
  )`);

  await connection.execute(`CREATE TABLE IF NOT EXISTS ingredients_recettes (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    recette_id INT(11) NOT NULL,
    ingredient_id INT(11) NOT NULL,
    FOREIGN KEY (recette_id) REFERENCES recettes(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  )`);
 

const jsonFilePathRecipes = 'recipes.json';

try {
  const data = await fs.promises.readFile(jsonFilePathRecipes, 'utf8');
  const recipes = JSON.parse(data);

  // Boucle sur les recettes et insérez-les dans la base de données
  
  for (const recipe of recipes) {
    const [existingRecipe] = await connection.execute(
      'SELECT id FROM recettes WHERE titre = ?',
      [recipe.title]
    );
    let recetteId;
    if (existingRecipe.length === 0) { // Si la recette n'existe pas, on l'insère
      const [result] = await connection.execute(
        'INSERT INTO recettes (titre, description, image) VALUES (?, ?, ?)',
        [recipe.title, recipe.desc, recipe.img]
      );
      recetteId = result.insertId;
    } else { // Sinon, on récupère l'ID de la recette existante
      recetteId = existingRecipe[0].id;
    }

    // INSERTION DES INGREDIENTS DE LA RECETTE
    for (const ingredient of recipe.ingredients) {
      const [existingIngredient] = await connection.execute(
        'SELECT id FROM ingredients WHERE nom = ?',
        [ingredient.name]
      );
      let ingredientId;
    if (existingIngredient.length === 0) { // Si l'ingrédient n'existe pas, on l'insère
      const [ingredientResult] = await connection.execute(
        'INSERT INTO ingredients (nom) VALUES (?)',
        [ingredient.name]
      );
      ingredientId = ingredientResult.insertId;
    } else { // Sinon, on récupère l'ID de l'ingrédient existant
      ingredientId = existingIngredient[0].id;
    }

      

      // INSERTION DE LA LIAISON ENTRE LA RECETTE ET L'INGREDIENT
      await connection.execute(
        'INSERT INTO ingredients_recettes (recette_id, ingredient_id) VALUES (?, ?)',
        [recetteId, ingredientId]
      );
    }
  }
  console.log(`Les recettes et les ingrédients ont été insérés avec succès dans la base de données!`);
} catch (err) {
  console.error(`Erreur lors de la lecture du fichier JSON: ${err}`);
} 

await connection.end();

})();

// INSERTION DES RECETTES ET INGREDIENTS DANS LA BASE DE DONNEES MONGODB
const url = 'mongodb://localhost:27017';
const dbName = 'restaurant';

(async () => {
  const client = await MongoClient.connect(url);
  const db = client.db(dbName);
  db.collection('recettes').drop()
  await db.createCollection("recettes")
  db.collection('ingredients').drop()
  await db.createCollection('ingredients');
  db.collection('ingredients_recettes').drop()
  await db.createCollection('ingredients_recettes');
  
  const jsonFilePathRecipes = 'recipes.json';

  try {
    const data = await fs.promises.readFile(jsonFilePathRecipes, 'utf8');
    const recipes = JSON.parse(data);

    for (const recipe of recipes) {
      // INSERTION DE LA RECETTE
      const existingRecipe = await db.collection('recettes').findOne({ titre: recipe.title });
      let recetteId;
      if (!existingRecipe) { // Si la recette n'existe pas, on l'insère
        const result = await db.collection('recettes').insertOne({ titre: recipe.title, description: recipe.desc, image: recipe.img });
        recetteId = result.insertedId;
      } else { // Sinon, on récupère l'ID de la recette existante
        recetteId = existingRecipe._id;
      }

      // INSERTION DES INGREDIENTS DE LA RECETTE
      for (const ingredient of recipe.ingredients) {
        const existingIngredient = await db.collection('ingredients').findOne({ nom: ingredient.name });
        let ingredientId;
        if (!existingIngredient) { 
          const ingredientResult = await db.collection('ingredients').insertOne({ nom: ingredient.name });
          ingredientId = ingredientResult.insertedId;
        } else {
          ingredientId = existingIngredient._id;
        }

        // INSERTION DE LA LIAISON ENTRE LA RECETTE ET L'INGREDIENT
        await db.collection('ingredients_recettes').insertOne({ recette_id: recetteId, ingredient_id: ingredientId });
      }
    }
    console.log(`Les recettes et les ingrédients ont été insérés avec succès dans la base de données!`);
  } catch (err) {
    console.error(`Erreur lors de la lecture du fichier JSON: ${err}`);
  }

  await client.close();
})();
