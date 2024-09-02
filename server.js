import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query,pool } from './config/database.js';  

const app = express();
const port = 3000;


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


app.use(express.static(join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index');  
});


app.get('/register', (req, res) => {
  res.render('register');  
});


app.post('/new', async (req, res) => {
  const { email, password,usuario,facultad } = req.body;

    //corregir tabla y query
    try {
        const result = await pool.query('INSERT INTO users (email, password,usuario,facultad) VALUES ($1, $2)', [email, password,usuario,facultad]);
        res.send('Cuenta creada con éxito');
    } catch (err) {
        console.error('Error al registrar el usuario:', err);
        res.status(500).send('Error al crear la cuenta');
    }

});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    
    const result = await query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.rows.length > 0) {
      res.send('Inicio de sesión exitoso');
    } else {
      res.status(401).send('Credenciales inválidas');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
