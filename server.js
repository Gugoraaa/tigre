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
  try {
    const result = await pool.query('SELECT siglas FROM facultades;');
    const siglasArray = result.rows.map(row => row.siglas);
    res.render('register', { siglas: siglasArray });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en la base de datos');
  }
});

app.post('/new', async (req, res) => {

  function correoUANL(correo) {
    const regex = /^[a-zA-Z0-9._%+-]+@uanl\.com$/;
    return regex.test(correo);
  } 

  const { email, password, usuario, facultades, 'confirm-password': confirmPassword  } = req.body;

  const usuarioExists = await pool.query('SELECT 1 FROM users WHERE usuario = $1', [usuario]);

  if (usuarioExists.rows.length > 0) {
    return res.redirect('/register?message=El nombre de usuariio ya está registrado &messageType=error');
    
  }

  if (correoUANL(email)=== false) {
    return res.redirect('/register?message=Necesitar un correo de la asociacion  &messageType=error');
 
  }

    // Verificar si el correo ya está registrado en la base de datos
  const emailExists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);

  if (emailExists.rows.length > 0) {
    return res.redirect('/register?message=El correo ya está registrado &messageType=error');
    
  }

  if (password != confirmPassword){
    return res.redirect('/register?message=Las contraseñas no coinciden &messageType=error');
  }

  if (!facultades || facultades.length === 0){
    return res.redirect('/register?message=Debes seleccionar una facultad &messageType=error')
  }


    // Verificar si 'facultades' es un array. Si no, convertirlo en uno.
  const selectedFacultades = Array.isArray(facultades) ? facultades : [facultades];

  try {
    // Insertar en la base de datos. Aquí se hace una inserción por cada facultad seleccionada.
    for (const facultad of selectedFacultades) {
      await pool.query('INSERT INTO users (email, password, usuario, facultad) VALUES ($1, $2, $3, $4)', [email, password, usuario, facultad]);
    }
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
