const express = require('express');
const app = express();
const mysql = require('mysql');
const port = 3000;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'restaurant'
});

connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données : ', err);
    return;
  }
  console.log('Connexion à la base de données établie');
});

app.get('/recipes', (req, res) => {
  connection.query('SELECT * FROM recettes', (error, results, fields) => {
    if (error) {
      console.error('Erreur lors de la récupération des recettes : ', error);
      res.status(500).send('Erreur lors de la récupération des recettes');
      return;
    }
    res.send(results);
  });
});

app.get('/recipes/:id_recette/ingredients', (req, res) => {
    const id_recette = req.params.id_recette;
    const query = `
      SELECT DISTINCT i.nom, titre, description, image
      FROM ingredients_recettes ir 
      INNER JOIN ingredients i ON ir.ingredient_id = i.id INNER JOIN recettes r ON ir.recette_id = r.id
      WHERE ir.recette_id = ${id_recette}
    `;
    connection.query(query, (error, results, fields) => {
      if (error) {
        console.error('Erreur lors de la récupération des ingrédients : ', error);
        res.status(500).send('Erreur lors de la récupération des ingrédients');
        return;
      }
      res.send(results);
    });
  });
  app.get('/recipes/:id_recette/details', (req, res) => {
    const id_recette = req.params.id_recette;
    const query = `
      SELECT r.titre, r.description, r.image, GROUP_CONCAT(DISTINCT i.nom SEPARATOR '-') AS ingredients
      FROM recettes r
      INNER JOIN ingredients_recettes ir ON r.id = ir.recette_id
      INNER JOIN ingredients i ON ir.ingredient_id = i.id
      WHERE r.id = ${id_recette}
      GROUP BY r.id
    `;
    connection.query(query, (error, results, fields) => {
      if (error) {
        console.error('Erreur lors de la récupération des détails de la recette : ', error);
        res.status(500).send('Erreur lors de la récupération des détails de la recette');
        return;
      }
      if (results.length === 0) {
        res.status(404).send(`Recette avec l'identifiant ${id_recette} non trouvée`);
      } else {
        res.send(results[0]);
      }
    });
  });


  app.get('/ingredients/:id_recette', (req, res) => {
    const id_recette = req.params.id_recette;
    const query = `
      SELECT DISTINCT i.nom 
      FROM ingredients_recettes ir 
      INNER JOIN ingredients i ON ir.ingredient_id = i.id 
      WHERE ir.recette_id = ${id_recette}
    `;
    connection.query(query, (error, results, fields) => {
      if (error) {
        console.error('Erreur lors de la récupération des ingrédients : ', error);
        res.status(500).send('Erreur lors de la récupération des ingrédients');
        return;
      }
      res.send(results);
    });
  });


app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});
