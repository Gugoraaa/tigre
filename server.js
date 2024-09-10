import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './config/database.js'; // Asegúrate de que pool está exportado

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let usuario = {
  id: 0,
  nombre: ""
};

app.use(express.static(join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  res.render('index', { usuario: usuario });
});

app.get('/register', async (req, res) => {
  res.render('register');
});

app.get('/login', async (req, res) => {
  res.render('login');
});

app.get('/user_screen', async (req, res) => {
  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  if (usuario && usuario.nombre) {
    usuario.nombre = capitalizeFirstLetter(usuario.nombre);
  }

  // Consulta a la base de datos
  const result = await pool.query('SELECT * FROM obtener_opiniones_con_nombres($1)', [usuario.id]);

  const opiniones = result.rows;  // Obtener todas las filas

  // Crear un arreglo para almacenar las opiniones del usuario
  let opiniones_usuario = opiniones.map(opinion => ({
    maestro: opinion.maestro_nombre_completo,
    materia: opinion.materia_nombre,
    contenido: opinion.contentido,  // Asegúrate de que la columna se llame así en tu base de datos
    likes: opinion.likes,
    dislikes: opinion.dislikes
  }));

  // Renderizar la vista con el usuario y las opiniones
  res.render('profile', { usuario, opiniones: opiniones_usuario });
});

app.post('/new', async (req, res) => {
  const { email, password, usuario: userName, 'confirm-password': confirmPassword } = req.body;

  try {
    const usuarioExists = await pool.query('SELECT 1 FROM users WHERE usuario = $1', [userName]);

    if (usuarioExists.rows.length > 0) {
      return res.redirect('/register?message=El nombre de usuario ya está registrado&messageType=error');
    }

    const emailExists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);

    if (emailExists.rows.length > 0) {
      return res.redirect('/register?message=El correo ya está registrado&messageType=error');
    }

    if (password !== confirmPassword) {
      return res.redirect('/register?message=Las contraseñas no coinciden&messageType=error');
    }

    await pool.query('INSERT INTO users (email, password, usuario) VALUES ($1, $2, $3)', [email, password, userName]);

    return res.redirect('/login?message=Se creo la cuenta con exito ');
  } catch (err) {
    console.error('Error al registrar el usuario:', err);
    res.status(500).send('Error al crear la cuenta');
  }
});

app.post('/login_val', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Actualiza el objeto usuario con los datos del usuario encontrado
      usuario.id = user.id;
      usuario.nombre = user.usuario;
  
      // Renderiza la vista 'index' pasando el objeto usuario actualizado
      res.render('index', { usuario: usuario });

    } else {
      return res.redirect('/login?message=No existen credenciales&messageType=error');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


