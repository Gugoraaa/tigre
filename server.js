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
  nombre: "",
  role: 0
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



app.get('/perfil-maestro', async (req, res) => {
  const query = req.query.q.toLowerCase();

  try {
    // Buscar al maestro en la base de datos por nombre completo
    const data = await pool.query(
      'SELECT id, nombre, apellido FROM maestros WHERE LOWER(CONCAT(nombre, \' \', apellido)) = $1',
      [query]
    );

    if (data.rows.length > 0) {
      const maestro = data.rows[0];

      // Capitalizar cada palabra en el nombre y apellido
      const nombreCapitalizado = maestro.nombre.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      const apellidoCapitalizado = maestro.apellido.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // Buscar las materias del maestro
      const materias = await pool.query(
        'SELECT materia_id_1, materia_id_2, materia_id_3, materia_id_4, materia_id_5 FROM materias_maestro WHERE id = $1',
        [maestro.id]
      );

      // Filtrar las materias que no sean nulas
      const materiaIds = [
        materias.rows[0].materia_id_1,
        materias.rows[0].materia_id_2,
        materias.rows[0].materia_id_3,
        materias.rows[0].materia_id_4,
        materias.rows[0].materia_id_5
      ].filter(id => id !== null && id !== undefined);

      // Obtener las materias correspondientes
      const materiasInfo = await pool.query(
        'SELECT id, nombre FROM materias WHERE id = ANY($1::int[])',
        [materiaIds]
      );

      // Transformar las materias en una lista de nombres
      const materiasLista = materiasInfo.rows.map(materia => materia.nombre);

      const maestro_info = {
        nombre: nombreCapitalizado,
        apellido: apellidoCapitalizado,
        id:maestro.id
      };

      const result = await pool.query('SELECT * FROM public.obtener_opiniones_de_maestro($1) ORDER BY likes DESC', [maestro_info.id]);

      const opiniones = result.rows;  // Obtener todas las filas

      // Crear un arreglo para almacenar las opiniones del usuario
      let opiniones_maestro = opiniones.map(opinion => ({
        usuario: opinion.username,
        materia: opinion.materia_nombre,
        contenido: opinion.contenido,  // Asegúrate de que la columna se llame así en tu base de datos
        likes: opinion.likes,
        dislikes: opinion.dislikes
      }));


      // Renderizar la vista con la información del maestro y su lista de materias
      res.render('maestro_profile', { id: maestro.id, usuario: usuario, materias: materiasLista, maestro: maestro_info, usuario_id:usuario.id ,opiniones: opiniones_maestro});
    } else {
      res.status(404).send('Maestro no encontrado');
    }
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).send('Error interno del servidor');
  }
});


app.get('/buscar', async (req, res) => {
  const query = req.query.q.toLowerCase();

  // Obtener los datos de la base de datos
  const data = await pool.query('SELECT nombre, apellido FROM maestros');

  // Combinar nombre y apellido
  const maestros = data.rows.map(maestro => `${maestro.nombre} ${maestro.apellido}`);

  // Filtrar los resultados basados en la consulta
  const resultados = maestros.filter(maestro => maestro.toLowerCase().includes(query));

  // Enviar los resultados filtrados como JSON
  res.json(resultados);
});


app.post('/post_opinion', async (req, res) => {
  const { materia, opinion, maestroID } = req.body; // Cambia 'contenido' a 'opinion' y 'maestro' a 'maestroID'

  // Validar que opinion no esté vacío
  if (!opinion || !opinion.trim()) {
    return res.status(400).send('El contenido de la opinión es requerido.');
  }


  try {
    // Obtener el id de la materia
    const idMateriaResult = await pool.query('SELECT id FROM materias WHERE nombre=$1', [materia]);
    const idMateria = idMateriaResult.rows[0].id;

    // Obtener el id del maestro
    const idMaestro = maestroID; // Usa maestroID directamente

    // Insertar la opinión en la base de datos
    await pool.query(
      'INSERT INTO opiniones (user_id, maestro_id, materia_id, contenido, likes, dislikes) VALUES ($1, $2, $3, $4, 0, 0)',
      [usuario.id, idMaestro, idMateria, opinion] // Usa 'opinion' en lugar de 'contenido'
    );

    // Enviar una respuesta exitosa 
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).send('Hubo un error al procesar la solicitud');
  }
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
      usuario.role= user

  
      // Renderiza la vista 'index' pasando el objeto usuario actualizado
      res.render('index', { usuario: usuario });

    } else {
      return res.redirect('/login?message=' + encodeURIComponent('No existen credenciales') + '&messageType=error');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


