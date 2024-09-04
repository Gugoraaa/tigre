import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './config/database.js'; // Asegúrate de que pool está exportado

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  res.render('index');
});

app.get('/register', async (req, res) => {

  res.render('register');
 
});

app.post('/new', async (req, res) => {

  const { email, password, usuario, 'confirm-password': confirmPassword  } = req.body;

  const usuarioExists = await pool.query('SELECT 1 FROM users WHERE usuario = $1', [usuario]);

  if (usuarioExists.rows.length > 0) {
    return res.redirect('/register?message=El nombre de usuariio ya está registrado &messageType=error');
    
  }

    // Verificar si el correo ya está registrado en la base de datos
  const emailExists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);

  if (emailExists.rows.length > 0) {
    return res.redirect('/register?message=El correo ya está registrado &messageType=error');
    
  }

  if (password != confirmPassword){
    return res.redirect('/register?message=Las contraseñas no coinciden &messageType=error');
  }

  try {
    // Insertar en la base de datos. Aquí se hace una inserción por cada facultad seleccionada.
    await pool.query('INSERT INTO users (email, password, usuario) VALUES ($1, $2, $3)', [email, password, usuario]);
    
    res.send('Cuenta creada con éxito');
  } catch (err) {
    console.error('Error al registrar el usuario:', err);
    res.status(500).send('Error al crear la cuenta');
  }

});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
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
