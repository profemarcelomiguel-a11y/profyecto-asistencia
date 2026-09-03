import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [pantalla, setPantalla] = useState('menu');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [modoRegistro, setModoRegistro] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  const [escuelas, setEscuelas] = useState([]);
  const [cursos, setCursos] = useState([]); 
  
  // Estados Admin - Cursos
  const [crudCursoId, setCrudCursoId] = useState(null);
  const [adminEscuela, setAdminEscuela] = useState('');
  const [nuevaSede, setNuevaSede] = useState('');
  const [nuevoCurso, setNuevoCurso] = useState('');
  const [nuevaComision, setNuevaComision] = useState(''); 
  const [nuevaMateria, setNuevaMateria] = useState('');
  const [nuevosDias, setNuevosDias] = useState('');
  const [nuevosHorarios, setNuevosHorarios] = useState('');
  const [textoAlumnos, setTextoAlumnos] = useState('');

  // Estados CRUD Instituciones
  const [crudEscuelaId, setCrudEscuelaId] = useState(null);
  const [crudNombre, setCrudNombre] = useState('');
  const [crudCens, setCrudCens] = useState('');
  const [crudSede, setCrudSede] = useState('');
  const [crudDomicilio, setCrudDomicilio] = useState('');
  const [crudLocalidad, setCrudLocalidad] = useState('');

  // Estados Toma de Lista y Reportes
  const [escuelaId, setEscuelaId] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [reporte, setReporte] = useState([]);
  const [nuevoAlumnoNombre, setNuevoAlumnoNombre] = useState('');
  
  const [estadisticas, setEstadisticas] = useState([]);
  const [totalClasesCurso, setTotalClasesCurso] = useState(0);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarDatosIniciales(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        cargarDatosIniciales(session.user.id);
      } else {
        setCursos([]); setEscuelas([]); setAlumnos([]); setEstadisticas([]); setPantalla('menu');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const cargarDatosIniciales = async (userId) => {
    const { data: escData } = await supabase.from('escuelas').select('*').order('id', { ascending: true });
    if (escData) setEscuelas(escData);
    
    const { data: curData } = await supabase.from('cursos').select('*').eq('profesor_id', userId);
    if (curData) setCursos(curData);
  };

  const manejarAuth = async (e) => {
    e.preventDefault();
    setLoginError(''); setMensajeExito('');
    if (modoRegistro) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setLoginError(error.message);
      else { setMensajeExito('¡Registro exitoso! Ya puedes iniciar sesión.'); setModoRegistro(false); setPassword(''); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setLoginError('Credenciales incorrectas');
    }
  };

  const cerrarSesion = async () => await supabase.auth.signOut();

  // --- CRUD INSTITUCIONES ---
  const limpiarFormularioEscuela = () => { setCrudEscuelaId(null); setCrudNombre(''); setCrudCens(''); setCrudSede(''); setCrudDomicilio(''); setCrudLocalidad(''); };
  const guardarEscuela = async () => {
    if (!crudNombre) return alert("El nombre es obligatorio");
    const datosEscuela = { nombre: crudNombre, cens: crudCens, nombre_sede: crudSede, domicilio: crudDomicilio, localidad: crudLocalidad };
    if (crudEscuelaId) { await supabase.from('escuelas').update(datosEscuela).eq('id', crudEscuelaId); alert("Actualizada"); } 
    else { await supabase.from('escuelas').insert([datosEscuela]); alert("Agregada"); }
    limpiarFormularioEscuela(); cargarDatosIniciales(session.user.id);
  };
  const editarEscuela = (esc) => {
    setCrudEscuelaId(esc.id); setCrudNombre(esc.nombre); setCrudCens(esc.cens || ''); setCrudSede(esc.nombre_sede || ''); setCrudDomicilio(esc.domicilio || ''); setCrudLocalidad(esc.localidad || ''); window.scrollTo(0, 0);
  };
  const eliminarEscuela = async (id) => {
    if(confirm("¿Borrar esta institución?")) { await supabase.from('escuelas').delete().eq('id', id); cargarDatosIniciales(session.user.id); }
  };

  // --- CRUD CURSOS ---
  const limpiarFormularioCurso = () => {
    setCrudCursoId(null); setAdminEscuela(''); setNuevaSede(''); setNuevoCurso(''); setNuevaComision(''); setNuevaMateria(''); setNuevosDias(''); setNuevosHorarios(''); setTextoAlumnos('');
  };

  const guardarCurso = async () => {
    if (!adminEscuela || !nuevoCurso || !nuevaMateria) return alert("Faltan Institución, Materia y Curso.");

    const datosCurso = { 
      escuela_id: adminEscuela, profesor_id: session.user.id, nombre: nuevoCurso, comision: nuevaComision,
      materia: nuevaMateria, sede: nuevaSede, dias: nuevosDias, horarios: nuevosHorarios 
    };

    if (crudCursoId) {
      const { error } = await supabase.from('cursos').update(datosCurso).eq('id', crudCursoId);
      if (error) return alert(`Error: ${error.message}`);
      alert("Datos del curso actualizados.");
    } else {
      if (!textoAlumnos.trim()) return alert("Falta la lista de alumnos.");
      const { data: cursoCreado, error: errorCurso } = await supabase.from('cursos').insert([datosCurso]).select();
      if (errorCurso) return alert(`Error: ${errorCurso.message}`);

      const idDelCurso = cursoCreado[0].id;
      const lineas = textoAlumnos.split('\n');
      let alumnosAInsertar = [];
      
      lineas.forEach(linea => {
        const matchDNI = linea.match(/\b\d{7,8}\b/);
        if (matchDNI) {
          const dni = matchDNI[0];
          let soloTexto = linea.replace(/[\d()]/g, '').trim();
          let apellidoExtraido = ""; let nombreExtraido = "";
          if (soloTexto.includes(',')) { const partes = soloTexto.split(','); apellidoExtraido = partes[0].trim(); nombreExtraido = partes[1].trim(); } 
          else { const partes = soloTexto.split(' '); apellidoExtraido = partes.shift() || ''; nombreExtraido = partes.join(' ').trim(); }
          apellidoExtraido = apellidoExtraido.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '').trim(); nombreExtraido = nombreExtraido.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '').trim();
          if (apellidoExtraido.length > 1) alumnosAInsertar.push({ curso_id: idDelCurso, dni: dni, nombre_completo: `${nombreExtraido} ${apellidoExtraido}`, apellido: apellidoExtraido, nombre: nombreExtraido });
        }
      });
      if (alumnosAInsertar.length > 0) { await supabase.from('alumnos').insert(alumnosAInsertar); alert(`¡Éxito! Curso creado y ${alumnosAInsertar.length} alumnos cargados.`); } 
      else alert("Curso creado, pero no se detectaron alumnos.");
    }
    limpiarFormularioCurso(); cargarDatosIniciales(session.user.id);
  };

  const editarCurso = (cur) => {
    setCrudCursoId(cur.id); setAdminEscuela(cur.escuela_id); setNuevaSede(cur.sede || ''); setNuevoCurso(cur.nombre || '');
    setNuevaComision(cur.comision || ''); setNuevaMateria(cur.materia || ''); setNuevosDias(cur.dias || ''); setNuevosHorarios(cur.horarios || '');
    setTextoAlumnos(''); window.scrollTo(0, 0);
  };

  const eliminarCurso = async (id) => {
    if(confirm("🛑 ¿Seguro que deseas eliminar este curso? Se borrarán todos sus alumnos y las asistencias tomadas.")) {
      await supabase.from('cursos').delete().eq('id', id); cargarDatosIniciales(session.user.id);
    }
  };

  // --- MOTOR REPORTES Y ASISTENCIA ---
  const generarReporte = async (idCurso) => {
    setCursoId(idCurso); 
    if (!idCurso) {
      setEstadisticas([]);
      return;
    }

    // Traemos datos y capturamos posibles errores
    const { data: alumnosData, error: errAlumnos } = await supabase.from('alumnos').select('*').eq('curso_id', idCurso).order('apellido', { ascending: true });
    const { data: asistenciasData, error: errAsistencias } = await supabase.from('asistencias').select('*').eq('curso_id', idCurso);

    if (errAlumnos || errAsistencias) {
      alert("Error de lectura en Supabase. Verifica que no haya bloqueos de RLS.");
      return;
    }

    if (alumnosData && asistenciasData) {
      let maxClasesTomadas = 0;
      const estadisticasCalculadas = alumnosData.map(alumno => {
        const registrosAlumno = asistenciasData.filter(a => a.alumno_id === alumno.id);
        const presentes = registrosAlumno.filter(a => a.estado === 'Presente').length;
        const ausentes = registrosAlumno.filter(a => a.estado === 'Ausente').length;
        const clasesDelAlumno = presentes + ausentes;
        
        if (clasesDelAlumno > maxClasesTomadas) maxClasesTomadas = clasesDelAlumno;
        
        const porcentaje = clasesDelAlumno > 0 ? Math.round((presentes / clasesDelAlumno) * 100) : 0;
        return { ...alumno, presentes, ausentes, porcentaje };
      });
      
      setTotalClasesCurso(maxClasesTomadas); 
      setEstadisticas(estadisticasCalculadas);
    }
  };

  const hablar = (texto) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const msg = new SpeechSynthesisUtterance(texto); msg.lang = 'es-AR'; window.speechSynthesis.speak(msg); } };
  
  const iniciarAsistenciaDesdeCard = async (curso) => {
    setCursoId(curso.id); const { data } = await supabase.from('alumnos').select('*').eq('curso_id', curso.id);
    if (data && data.length > 0) { setAlumnos(data); setReporte([]); setIndiceActual(0); setPantalla('asistencia_activa'); hablar(data[0].nombre_completo); } 
    else alert("Este curso no tiene alumnos cargados.");
  };

  const marcar = (estado) => {
    setReporte([...reporte, { alumno_id: alumnos[indiceActual].id, curso_id: cursoId, estado: estado }]);
    const proximo = indiceActual + 1;
    if (proximo < alumnos.length) { setIndiceActual(proximo); hablar(alumnos[proximo].nombre_completo); } 
    else finalizarLista();
  };

  const agregarAlumnoEnCaliente = async () => {
    if (!nuevoAlumnoNombre) return;
    const partes = nuevoAlumnoNombre.split(' '); const apellidoExtraido = partes.shift() || ''; const nombreExtraido = partes.join(' ') || '';
    const { data, error } = await supabase.from('alumnos').insert([{ nombre_completo: nuevoAlumnoNombre, apellido: apellidoExtraido, nombre: nombreExtraido, curso_id: cursoId }]).select();
    if (!error && data) { const nuevaLista = [...alumnos]; nuevaLista.splice(indiceActual + 1, 0, data[0]); setAlumnos(nuevaLista); setNuevoAlumnoNombre(''); alert("Alumno agregado."); }
  };

  const deshacerUltimo = () => { if (indiceActual > 0) { const nuevoReporte = [...reporte]; nuevoReporte.pop(); setReporte(nuevoReporte); setIndiceActual(indiceActual - 1); hablar(alumnos[indiceActual - 1].nombre_completo); } };
  const cancelarAsistencia = () => { if (confirm("¿Seguro que deseas cancelar? No se guardará ninguna asistencia.")) { setReporte([]); setIndiceActual(0); setPantalla('seleccion_asistencia'); } };
  const finalizarLista = async () => { hablar("Toma de lista finalizada. Guardando."); setPantalla('resultados'); await supabase.from('asistencias').insert(reporte); };

  // ==========================================
  // RENDERIZADO
  // ==========================================
  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        {/* Contenedor principal centrado verticalmente */}
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="container" style={{ width: '100%', maxWidth: '400px', margin: 0 }}>
            <h1 style={{fontSize: '2rem', marginBottom: '20px'}}>{modoRegistro ? 'Registro Docente 📝' : 'Acceso CENS 👨‍🏫'}</h1>
            <form onSubmit={manejarAuth}>
              <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required minLength="6" />
              {loginError && <p style={{color: 'red', fontWeight: 'bold'}}>{loginError}</p>}
              {mensajeExito && <p style={{color: 'green', fontWeight: 'bold'}}>{mensajeExito}</p>}
              <button type="submit" className="btn btn-blue" style={{marginTop: '15px'}}>{modoRegistro ? 'Registrarme' : 'INGRESAR'}</button>
            </form>
            <button className="btn btn-gray" style={{marginTop: '15px'}} onClick={() => { setModoRegistro(!modoRegistro); setLoginError(''); setMensajeExito(''); }}>
              {modoRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿NUEVO DOCENTE? REGÍSTRATE GRATIS'}
            </button>
          </div>
        </main>

        {/* FOOTER CÓDIGO AGAPE */}
        <footer style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '30px 20px 20px', textAlign: 'center', borderTop: '3px solid #d4af37' }}>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>© 2026 Todos los derechos reservados.</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.8rem', color: '#ccc', textTransform: 'uppercase', letterSpacing: '1px' }}>Desarrollo web con propósito</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo-agape.png" alt="Logo Código Agape" style={{ width: '35px', height: 'auto', borderRadius: '4px' }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', color: '#d4af37', fontWeight: 'bold', letterSpacing: '1.5px' }}>CÓDIGO AGAPE</span>
            </div>
          </div>
        </footer>
        
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar" style={{ flexWrap: 'wrap' }}>
        <button className={`nav-btn ${pantalla === 'menu' ? 'active' : ''}`} onClick={() => setPantalla('menu')}>🏠 Inicio</button>
        <button className={`nav-btn ${pantalla === 'crud_escuelas' ? 'active' : ''}`} onClick={() => setPantalla('crud_escuelas')}>🏫 Inst.</button>
        <button className={`nav-btn ${pantalla === 'admin' ? 'active' : ''}`} onClick={() => {limpiarFormularioCurso(); setPantalla('admin');}}>➕ Cursos</button>
        <button className={`nav-btn ${pantalla === 'seleccion_asistencia' ? 'active' : ''}`} onClick={() => setPantalla('seleccion_asistencia')}>📋 Mis Listas</button>
        <button className={`nav-btn ${pantalla === 'reportes' ? 'active' : ''}`} onClick={() => setPantalla('reportes')} style={{backgroundColor: pantalla === 'reportes' ? '#9c27b0' : '#e1bee7', color: pantalla === 'reportes' ? 'white' : 'black'}}>📊 Reportes</button>
        <button className="nav-btn salir" onClick={cerrarSesion}>🚪</button>
      </nav>

      <div className="container" style={{ maxWidth: '1000px' }}>
        
        {pantalla === 'menu' && (
          <div>
            {/* AQUÍ ESTÁ EL HERO BANNER */}
            <div className="hero-banner">
              <h1>Sistema de Asistencia</h1>
              <p>Herramienta de gestión para docentes de Educación de Jóvenes y Adultos.</p>
            </div>
            
            <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #90caf9', textAlign: 'left' }}>
              <p style={{ margin: 0, color: '#0d47a1', fontSize: '1.1rem' }}>👨‍🏫 <strong>Profesor activo:</strong> {session?.user?.email}</p>
            </div>
            
            <div className="cards-grid">
              <button className="curso-card" style={{justifyContent: 'center', alignItems: 'center', backgroundColor: '#e8f5e9'}} onClick={() => {limpiarFormularioCurso(); setPantalla('admin');}}>
                <h3 style={{color: '#2e7d32'}}>➕ Gestionar Cursos</h3>
                <span style={{color: '#555'}}>Crear o editar materias</span>
              </button>
              <button className="curso-card" style={{justifyContent: 'center', alignItems: 'center', backgroundColor: '#e3f2fd'}} onClick={() => setPantalla('seleccion_asistencia')}>
                <h3 style={{color: '#1565c0'}}>📋 Tomar Asistencia</h3>
                <span style={{color: '#555'}}>Ir a mis listas de alumnos</span>
              </button>
              <button className="curso-card" style={{justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3e5f5'}} onClick={() => setPantalla('reportes')}>
                <h3 style={{color: '#7b1fa2'}}>📊 Ver Reportes</h3>
                <span style={{color: '#555'}}>Métricas y regulares</span>
              </button>
            </div>
          </div>
        )}

        {pantalla === 'crud_escuelas' && (
          <div>
            <h2>Gestión de Instituciones</h2>
            <div style={{ backgroundColor: '#f4f6f8', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #ddd' }}>
              <h3>{crudEscuelaId ? '✏️ Editar Institución' : '✨ Agregar Nueva Institución'}</h3>
              <input type="text" placeholder="Nombre Principal (ej. CENS 497)" value={crudNombre} onChange={e => setCrudNombre(e.target.value)} />
              <input type="text" placeholder="N° CENS (ej. 497)" value={crudCens} onChange={e => setCrudCens(e.target.value)} />
              <input type="text" placeholder="Nombre de Sede (ej. Pañol Pedro Luque)" value={crudSede} onChange={e => setCrudSede(e.target.value)} />
              <input type="text" placeholder="Domicilio (ej. Concejal Gómez 2098)" value={crudDomicilio} onChange={e => setCrudDomicilio(e.target.value)} />
              <input type="text" placeholder="Localidad (ej. Gregorio de Laferrere)" value={crudLocalidad} onChange={e => setCrudLocalidad(e.target.value)} />
              <button className="btn btn-green" onClick={guardarEscuela}>{crudEscuelaId ? 'Actualizar Institución' : 'Guardar Nueva Institución'}</button>
              {crudEscuelaId && <button className="btn btn-gray" onClick={limpiarFormularioEscuela}>Cancelar Edición</button>}
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3>Instituciones Cargadas ({escuelas.length})</h3>
              {escuelas.map(esc => (
                <div key={esc.id} style={{ borderBottom: '1px solid #ccc', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <strong style={{ fontSize: '1.2rem', color: '#1976d2' }}>{esc.nombre}</strong> {esc.cens && `(CENS ${esc.cens})`}<br/>
                    <small style={{ color: '#555' }}>📍 {esc.nombre_sede} | {esc.domicilio}, {esc.localidad}</small>
                  </div>
                  <div>
                    <button className="btn btn-blue" style={{ width: 'auto', padding: '8px 12px', margin: '0 5px' }} onClick={() => editarEscuela(esc)}>✏️ Editar</button>
                    <button className="btn btn-red" style={{ width: 'auto', padding: '8px 12px', margin: '0' }} onClick={() => eliminarEscuela(esc.id)}>🗑️ Borrar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AQUÍ ESTÁ EL CRUD DE CURSOS */}
        {pantalla === 'admin' && (
          <div>
            <h2>Gestión de Cursos</h2>
            <div style={{ backgroundColor: '#f4f6f8', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #ddd' }}>
              <h3>{crudCursoId ? '✏️ Editar Curso' : '✨ Nuevo Curso y Alumnos'}</h3>
              <select value={adminEscuela} onChange={e => setAdminEscuela(e.target.value)}>
                <option value="">-- Seleccionar Institución --</option>
                {escuelas.map(esc => <option key={esc.id} value={esc.id}>{esc.nombre} - {esc.nombre_sede}</option>)}
              </select>
              <input type="text" placeholder="Sede / Anexo" value={nuevaSede} onChange={e => setNuevaSede(e.target.value)} />
              <input type="text" placeholder="Materia" value={nuevaMateria} onChange={e => setNuevaMateria(e.target.value)} />
              
              <div style={{display: 'flex', gap: '10px'}}>
                <input type="text" placeholder="Año/Div (ej. 1°A)" value={nuevoCurso} onChange={e => setNuevoCurso(e.target.value)} style={{flex: 1}} />
                <input type="text" placeholder="Comisión (ej. Com 1)" value={nuevaComision} onChange={e => setNuevaComision(e.target.value)} style={{flex: 1}} />
              </div>

              <input type="text" placeholder="Días" value={nuevosDias} onChange={e => setNuevosDias(e.target.value)} />
              <input type="text" placeholder="Horarios" value={nuevosHorarios} onChange={e => setNuevosHorarios(e.target.value)} />
              
              {!crudCursoId && (
                <div style={{border: '2px dashed #ccc', padding: '15px', marginTop: '15px', borderRadius: '8px'}}>
                  <p style={{margin: '0 0 10px 0', fontWeight: 'bold'}}>📋 Copia y pega aquí la lista de alumnos</p>
                  <textarea rows="6" value={textoAlumnos} onChange={e => setTextoAlumnos(e.target.value)} style={{width: '100%', padding: '10px', boxSizing: 'border-box'}} />
                </div>
              )}
              
              <button className="btn btn-green" onClick={guardarCurso}>{crudCursoId ? 'Actualizar Curso' : 'Guardar Curso y Alumnos'}</button>
              {crudCursoId && <button className="btn btn-gray" onClick={limpiarFormularioCurso}>Cancelar Edición</button>}
            </div>

            <div style={{ textAlign: 'left' }}>
              <h3>Mis Cursos ({cursos.length})</h3>
              {cursos.map(cur => (
                <div key={cur.id} style={{ borderBottom: '1px solid #ccc', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <strong style={{ fontSize: '1.2rem', color: '#1976d2' }}>{cur.materia}</strong><br/>
                    <small style={{ color: '#555' }}>📖 {cur.nombre} {cur.comision ? `(Com ${cur.comision})` : ''} | 📍 {cur.sede}</small>
                  </div>
                  <div>
                    <button className="btn btn-blue" style={{ width: 'auto', padding: '8px 12px', margin: '0 5px' }} onClick={() => editarCurso(cur)}>✏️ Editar</button>
                    <button className="btn btn-red" style={{ width: 'auto', padding: '8px 12px', margin: '0' }} onClick={() => eliminarCurso(cur.id)}>🗑️ Borrar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pantalla === 'seleccion_asistencia' && (
          <div>
            <h2>Tus Clases Asignadas</h2>
            {cursos.length === 0 ? (
              <div style={{padding: '30px', backgroundColor: '#fff3e0', borderRadius: '8px'}}>
                <p>No tienes clases asignadas aún.</p>
                <button className="btn btn-green" onClick={() => {limpiarFormularioCurso(); setPantalla('admin');}}>Crear mi primer curso</button>
              </div>
            ) : (
              <div className="cards-grid">
                {cursos.map(cur => {
                  const escuela = escuelas.find(e => e.id === cur.escuela_id);
                  return (
                    <div key={cur.id} className="curso-card">
                      <h3 style={{marginTop: 0, color: '#1976d2', borderBottom: '2px solid #e3f2fd', paddingBottom: '10px'}}>{cur.materia}</h3>
                      <div className="curso-card-info">
                        <strong>🏫 Inst:</strong> {escuela?.nombre} {escuela?.cens ? `(CENS ${escuela.cens})` : ''}<br/>
                        <strong>📍 Sede:</strong> {cur.sede}<br/>
                        <strong>📖 Curso:</strong> {cur.nombre} {cur.comision ? `| Com: ${cur.comision}` : ''}<br/>
                        <strong>📅 Días:</strong> {cur.dias}<br/>
                        <strong>⏰ Horario:</strong> {cur.horarios}
                      </div>
                      <button className="btn btn-blue" style={{marginTop: 'auto', width: '100%', borderRadius: '8px'}} onClick={() => iniciarAsistenciaDesdeCard(cur)}>
                        ▶ Tomar Lista
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {pantalla === 'asistencia_activa' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 className="alumno-display" style={{ margin: '0 0 10px 0', color: '#333' }}>{alumnos[indiceActual]?.nombre_completo}</h2>
            <p style={{ color: '#666', marginBottom: '25px' }}>DNI: {alumnos[indiceActual]?.dni || 'No registrado'} | Alumno {indiceActual + 1} de {alumnos.length}</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button className="btn btn-green" style={{ flex: 1, padding: '15px', fontSize: '1.1rem' }} onClick={() => marcar('Presente')}>PRESENTE</button>
              <button className="btn btn-red" style={{ flex: 1, padding: '15px', fontSize: '1.1rem' }} onClick={() => marcar('Ausente')}>AUSENTE</button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-gray" onClick={deshacerUltimo} disabled={indiceActual === 0} style={{ flex: 1, opacity: indiceActual === 0 ? 0.5 : 1 }}>↩️ Deshacer</button>
              <button className="btn btn-gray" onClick={cancelarAsistencia} style={{ flex: 1, backgroundColor: '#ef5350', color: 'white' }}>❌ Cancelar</button>
            </div>

            <hr style={{margin: '30px 0'}} />
            <h4>¿Llegó un alumno nuevo?</h4>
            <input type="text" placeholder="Apellido y Nombre" value={nuevoAlumnoNombre} onChange={e => setNuevoAlumnoNombre(e.target.value)} />
            <button className="btn btn-gray" onClick={agregarAlumnoEnCaliente}>Agregar ahora</button>
          </div>
        )}

        {pantalla === 'resultados' && (
          <div>
            <h2>¡Lista Guardada! ✅</h2>
            <p>Los datos ya están seguros en la base de datos.</p>
            <button className="btn btn-blue" onClick={() => setPantalla('seleccion_asistencia')}>Volver a Mis Listas</button>
          </div>
        )}

        {pantalla === 'reportes' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{marginTop: 0}}>Reportes del Cuatrimestre</h2>
            
            <select 
              value={escuelaId} 
              onChange={e => {
                setEscuelaId(e.target.value);
                setCursoId(''); // Forzamos limpieza del curso al cambiar de escuela
                setEstadisticas([]); // Limpiamos la tabla
              }}
            >
              <option value="">-- Filtrar por Institución (Opcional) --</option>
              {escuelas.map(esc => <option key={esc.id} value={esc.id}>{esc.nombre}</option>)}
            </select>

            <select 
              value={cursoId} 
              onChange={e => generarReporte(e.target.value)}
            >
              <option value="">-- Seleccionar Curso para ver métricas --</option>
              {cursos
                .filter(c => escuelaId ? c.escuela_id.toString() === escuelaId : true)
                .map(cur => (
                  <option key={cur.id} value={cur.id}>
                    {cur.materia} - {cur.nombre} {cur.comision ? `(Com: ${cur.comision})` : ''}
                  </option>
              ))}
            </select>

            {/* AVISO: Si elegimos un curso pero no tiene alumnos */}
            {cursoId && estadisticas.length === 0 && (
              <div style={{ padding: '20px', backgroundColor: '#fff3e0', marginTop: '20px', borderRadius: '8px', border: '1px solid #ffcc80' }}>
                <p style={{ margin: 0, color: '#e65100' }}>
                  <strong>No hay datos:</strong> Este curso no tiene alumnos registrados aún. Ve a "Gestionar Cursos" para agregar la lista.
                </p>
              </div>
            )}

            {/* TABLA: Se muestra solo si hay alumnos procesados */}
            {estadisticas.length > 0 && (
              <div style={{ marginTop: '20px', textAlign: 'left' }}>
                <p><strong>Clases dictadas (Días evaluados max):</strong> {totalClasesCurso}</p>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Apellido y Nombre</th>
                        <th>Presentes</th>
                        <th>Ausentes</th>
                        <th>% Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticas.map(alumno => (
                        <tr key={alumno.id}>
                          <td><strong>{alumno.apellido}</strong>, {alumno.nombre}</td>
                          <td style={{color: 'green', fontWeight: 'bold'}}>{alumno.presentes}</td>
                          <td style={{color: 'red'}}>{alumno.ausentes}</td>
                          <td>
                            <span className="badge" style={{
                              backgroundColor: alumno.porcentaje >= 75 ? '#c8e6c9' : alumno.porcentaje >= 50 ? '#fff9c4' : '#ffcdd2',
                              color: alumno.porcentaje >= 75 ? '#2e7d32' : alumno.porcentaje >= 50 ? '#f57f17' : '#c62828'
                            }}>
                              {alumno.porcentaje}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '30px 20px 20px', textAlign: 'center', marginTop: '60px', borderTop: '3px solid #d4af37' }}>
        <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>© 2026 Todos los derechos reservados.</p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <span style={{ fontSize: '0.8rem', color: '#ccc', textTransform: 'uppercase', letterSpacing: '1px' }}>Desarrollo web con propósito</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo-agape.png" alt="Logo Código Agape" style={{ width: '35px', height: 'auto', borderRadius: '4px' }} />
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', color: '#d4af37', fontWeight: 'bold', letterSpacing: '1.5px' }}>CÓDIGO AGAPE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;