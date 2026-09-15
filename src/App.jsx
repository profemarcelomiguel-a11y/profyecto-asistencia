import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  // Estados Instituciones
  const [crudEscuelaId, setCrudEscuelaId] = useState(null);
  const [crudNombre, setCrudNombre] = useState('');
  const [crudCens, setCrudCens] = useState('');
  const [crudSede, setCrudSede] = useState('');
  const [crudDomicilio, setCrudDomicilio] = useState('');
  const [crudLocalidad, setCrudLocalidad] = useState('');

  // Estados Asistencia y Reportes
  const [escuelaId, setEscuelaId] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [reporte, setReporte] = useState([]);
  const [nuevoAlumnoNombre, setNuevoAlumnoNombre] = useState('');
  const [fechaAsistencia, setFechaAsistencia] = useState(new Date().toISOString().split('T')[0]);
  const [usarVoz, setUsarVoz] = useState(true); 
  
  const [estadisticas, setEstadisticas] = useState([]);
  const [totalClasesCurso, setTotalClasesCurso] = useState(0);
  const [asistenciasReporte, setAsistenciasReporte] = useState([]);
  
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
    if(confirm("🛑 ¿Seguro que deseas eliminar este curso? Se borrarán todos sus alumnos y asistencias.")) {
      await supabase.from('cursos').delete().eq('id', id); cargarDatosIniciales(session.user.id);
    }
  };

  const generarReporte = async (idCurso) => {
    setCursoId(idCurso); 
    if (!idCurso) { setEstadisticas([]); setAsistenciasReporte([]); return; }

    const { data: alumnosData } = await supabase.from('alumnos').select('*').eq('curso_id', idCurso).order('apellido', { ascending: true });
    const { data: asistenciasData } = await supabase.from('asistencias').select('*').eq('curso_id', idCurso);

    if (alumnosData && asistenciasData) {
      setAsistenciasReporte(asistenciasData);
      const fechasUnicas = [...new Set(asistenciasData.map(a => a.fecha))];
      setTotalClasesCurso(fechasUnicas.length);

      const estadisticasCalculadas = alumnosData.map(alumno => {
        const registros = asistenciasData.filter(a => a.alumno_id === alumno.id);
        const presentes = registros.filter(a => a.estado === 'Presente').length;
        const ausentes = registros.filter(a => a.estado === 'Ausente').length;
        const tardes = registros.filter(a => a.estado === 'Tarde').length;
        const clasesDelAlumno = presentes + ausentes + tardes;
        const porcentaje = clasesDelAlumno > 0 ? Math.round(((presentes + tardes) / clasesDelAlumno) * 100) : 0;
        return { ...alumno, presentes, ausentes, tardes, porcentaje };
      });
      setEstadisticas(estadisticasCalculadas);
    }
  };

  const exportarPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      const curso = cursos.find(c => c.id.toString() === cursoId.toString());
      const escuela = escuelas.find(e => e.id === curso?.escuela_id);

      doc.setFontSize(14);
      doc.text(`Asistencia: ${curso?.materia || ''} - ${curso?.nombre || ''} (Comisión: ${curso?.comision || '-'})`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Institución: ${escuela?.nombre || ''} (CENS ${escuela?.cens || '-'})`, 14, 22);

      const fechasUnicas = [...new Set(asistenciasReporte.map(a => a.fecha))].sort();
      const headers = [['Apellido y Nombre', ...fechasUnicas.map(f => {
        if (!f) return '-';
        const partes = f.split('-'); 
        return partes.length === 3 ? `${partes[2]}/${partes[1]}` : f;
      })]];

      const body = estadisticas.map(alumno => {
        const row = [`${alumno.apellido}, ${alumno.nombre}`];
        fechasUnicas.forEach(fecha => {
          const registro = asistenciasReporte.find(a => a.alumno_id === alumno.id && a.fecha === fecha);
          let letra = '-';
          if (registro?.estado === 'Presente') letra = 'P';
          if (registro?.estado === 'Ausente') letra = 'A';
          if (registro?.estado === 'Tarde') letra = 'T';
          row.push(letra);
        });
        return row;
      });

      autoTable(doc, { 
        head: headers, 
        body: body, 
        startY: 30, 
        styles: { fontSize: 8, halign: 'center' }, 
        columnStyles: { 0: { halign: 'left' } },
        didParseCell: function (data) {
          // Pintar las letras P (Verde), A (Rojo), T (Naranja) en el PDF
          if (data.section === 'body' && data.column.index > 0) {
            const val = data.cell.raw;
            if (val === 'P') {
              data.cell.styles.textColor = [46, 125, 50]; // Verde
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'A') {
              data.cell.styles.textColor = [198, 40, 40]; // Rojo
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'T') {
              data.cell.styles.textColor = [239, 108, 0]; // Naranja
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });
      
      doc.save(`Asistencia_${curso?.materia || 'CENS'}.pdf`);
    } catch (error) {
      alert("Hubo un error al generar el PDF. Revisa la consola.");
      console.error(error);
    }
  };

  const hablar = (texto) => { 
    if (!usarVoz) return; 
    if ('speechSynthesis' in window) { 
      window.speechSynthesis.cancel(); 
      const msg = new SpeechSynthesisUtterance(texto); 
      msg.lang = 'es-AR'; 
      window.speechSynthesis.speak(msg); 
    } 
  };
  
  const iniciarAsistenciaDesdeCard = async (curso) => {
    setCursoId(curso.id); 
    setFechaAsistencia(new Date().toISOString().split('T')[0]);
    const { data } = await supabase.from('alumnos').select('*').eq('curso_id', curso.id).order('apellido', { ascending: true });
    
    if (data && data.length > 0) { 
      setAlumnos(data); setReporte([]); setIndiceActual(0); 
      setPantalla('asistencia_activa'); 
      if (usarVoz) hablar(data[0].nombre_completo); 
    } else alert("Este curso no tiene alumnos cargados.");
  };

  const editarClasePasada = async (fecha) => {
    setFechaAsistencia(fecha);
    const registrosDeEsaFecha = asistenciasReporte.filter(a => a.fecha === fecha);
    const { data } = await supabase.from('alumnos').select('*').eq('curso_id', cursoId).order('apellido', { ascending: true });
    
    setAlumnos(data || []);
    setReporte(registrosDeEsaFecha.map(r => ({ alumno_id: r.alumno_id, curso_id: r.curso_id, estado: r.estado })));
    setPantalla('asistencia_revision');
  };

  const marcar = (estado) => {
    setReporte([...reporte, { alumno_id: alumnos[indiceActual].id, curso_id: cursoId, estado: estado }]);
    const proximo = indiceActual + 1;
    if (proximo < alumnos.length) { setIndiceActual(proximo); hablar(alumnos[proximo].nombre_completo); } 
    else { hablar("Toma de lista finalizada. Por favor, revisa y guarda."); setPantalla('asistencia_revision'); }
  };

  const deshacerUltimo = () => { if (indiceActual > 0) { const nuevoReporte = [...reporte]; nuevoReporte.pop(); setReporte(nuevoReporte); setIndiceActual(indiceActual - 1); hablar(alumnos[indiceActual - 1].nombre_completo); } };
  const cancelarAsistencia = () => { if (confirm("¿Seguro que deseas cancelar? No se guardará nada.")) { setReporte([]); setIndiceActual(0); setPantalla('seleccion_asistencia'); } };
  
  const actualizarEstadoRevision = (alumnoId, nuevoEstado) => {
    setReporte(prev => {
      const existe = prev.find(r => r.alumno_id === alumnoId);
      if (existe) return prev.map(r => r.alumno_id === alumnoId ? { ...r, estado: nuevoEstado } : r);
      return [...prev, { alumno_id: alumnoId, curso_id: cursoId, estado: nuevoEstado }];
    });
  };

  const eliminarAlumnoDeCurso = async (idAlumno) => {
    if (confirm("⚠️ ¿Seguro que deseas eliminar este alumno? Se borrará de la lista permanentemente.")) {
      await supabase.from('alumnos').delete().eq('id', idAlumno);
      setAlumnos(alumnos.filter(a => a.id !== idAlumno));
      setReporte(reporte.filter(r => r.alumno_id !== idAlumno));
    }
  };

  const guardarAsistenciaDefinitiva = async () => {
    if (confirm("¿Confirmar y guardar esta asistencia en la base de datos?")) {
      const { error: errDelete } = await supabase.from('asistencias').delete().match({ curso_id: cursoId, fecha: fechaAsistencia });
      if (errDelete) return alert("❌ Error al limpiar base de datos: " + errDelete.message);

      const datosFinales = reporte.map(r => ({ ...r, fecha: fechaAsistencia }));
      const { error: errInsert } = await supabase.from('asistencias').insert(datosFinales);
      
      if (errInsert) {
        alert("❌ Error al guardar en Supabase: " + errInsert.message);
      } else {
        alert("✅ Datos guardados correctamente en la fecha: " + fechaAsistencia);
        setPantalla('resultados');
      }
    }
  };

  const eliminarListaCompleta = async () => {
    if (confirm(`⚠️ ATENCIÓN: ¿Seguro que deseas eliminar TODA la asistencia del día ${fechaAsistencia}? Esta acción borrará la columna y no se puede recuperar.`)) {
      const { error } = await supabase.from('asistencias').delete().match({ curso_id: cursoId, fecha: fechaAsistencia });
      if (error) {
        alert("❌ Error al borrar: " + error.message);
      } else {
        alert("🗑️ Lista eliminada correctamente.");
        setPantalla('reportes');
        generarReporte(cursoId);
      }
    }
  };

  const agregarAlumnoEnCaliente = async () => {
    if (!nuevoAlumnoNombre) return;
    const partes = nuevoAlumnoNombre.split(' '); const apellidoExtraido = partes.shift() || ''; const nombreExtraido = partes.join(' ') || '';
    const { data, error } = await supabase.from('alumnos').insert([{ nombre_completo: nuevoAlumnoNombre, apellido: apellidoExtraido, nombre: nombreExtraido, curso_id: cursoId }]).select();
    if (!error && data) { 
      const nuevaListaOrdenada = [...alumnos, data[0]].sort((a, b) => a.apellido.localeCompare(b.apellido));
      setAlumnos(nuevaListaOrdenada); 
      setReporte([...reporte, { alumno_id: data[0].id, curso_id: cursoId, estado: 'Presente' }]);
      setNuevoAlumnoNombre(''); 
      alert("Alumno agregado correctamente."); 
    }
  };

  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="container" style={{ width: '100%', maxWidth: '400px', margin: 0 }}>
            <h1 style={{fontSize: '2rem', marginBottom: '20px', color: '#0A4D8C'}}>{modoRegistro ? 'Registro Docente 📝' : 'Acceso Docente 👨‍🏫'}</h1>
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
        <footer style={{ backgroundColor: '#0A4D8C', color: '#fff', padding: '30px 20px 20px', textAlign: 'center', borderTop: '4px solid #F6B40E' }}>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>© 2026 Sistema de Asistencia. Todos los derechos reservados.</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <span style={{ fontSize: '0.8rem', color: '#E5F0FA', textTransform: 'uppercase', letterSpacing: '1px' }}>Desarrollo web con propósito</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo-agape.png" alt="Logo Código Agape" style={{ width: '35px', height: 'auto', borderRadius: '4px' }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', color: '#F6B40E', fontWeight: 'bold', letterSpacing: '1.5px' }}>CÓDIGO AGAPE</span>
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
        <button className={`nav-btn ${pantalla === 'reportes' ? 'active' : ''}`} onClick={() => setPantalla('reportes')} style={{backgroundColor: pantalla === 'reportes' ? '#F6B40E' : 'transparent', color: pantalla === 'reportes' ? '#0A4D8C' : 'white'}}>📊 Reportes</button>
        <button className="nav-btn salir" onClick={cerrarSesion}>🚪</button>
      </nav>

      <div className="container" style={{ maxWidth: '1000px', boxShadow: 'none', background: 'transparent', padding: '0', marginTop: '20px' }}>
        
        {pantalla === 'menu' && (
          <div>
            <div className="hero-bandera">
              <div className="sol-de-mayo"></div>
              <div className="hero-content">
                <img src="/logo-agape.png" alt="Logo Código Agape" style={{ width: '70px', height: 'auto', marginBottom: '10px', borderRadius: '8px' }} />
                <h1 style={{ color: '#0A4D8C', margin: 0, textShadow: 'none' }}>Sistema de Asistencia</h1>
                <p style={{ color: '#0A4D8C', fontWeight: 'bold' }}>Herramienta de gestión para docentes de Educación de Jóvenes y Adultos.</p>
              </div>
            </div>
            
            <div style={{ backgroundColor: '#fff', padding: '15px 25px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <p style={{ margin: 0, color: '#0A4D8C', fontSize: '1.1rem' }}>👨‍🏫 <strong>Profesor activo:</strong> {session?.user?.email}</p>
              
              <button 
                onClick={() => setUsarVoz(!usarVoz)}
                style={{
                  padding: '8px 15px', borderRadius: '8px', border: '1px solid', fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: usarVoz ? '#e8f5e9' : '#ffebee', 
                  color: usarVoz ? '#2e7d32' : '#c62828',
                  borderColor: usarVoz ? '#c8e6c9' : '#ffcdd2'
                }}
              >
                {usarVoz ? '🔊 Voz: ACTIVADA' : '🔇 Voz: SILENCIADA'}
              </button>
            </div>

            <div className="cards-grid">
              <button className="curso-card" style={{justifyContent: 'center', alignItems: 'center', borderLeft: '5px solid #2e7d32'}} onClick={() => {limpiarFormularioCurso(); setPantalla('admin');}}>
                <h3 style={{color: '#2e7d32', margin: '0 0 5px 0'}}>➕ Gestionar Cursos</h3>
                <span style={{color: '#757575'}}>Crear o editar materias</span>
              </button>
              <button className="curso-card" style={{justifyContent: 'center', alignItems: 'center', borderLeft: '5px solid #0A4D8C'}} onClick={() => setPantalla('seleccion_asistencia')}>
                <h3 style={{color: '#0A4D8C', margin: '0 0 5px 0'}}>📋 Tomar Asistencia</h3>
                <span style={{color: '#757575'}}>Ir a mis listas de alumnos</span>
              </button>
              <button className="curso-card" style={{justifyContent: 'center', alignItems: 'center', borderLeft: '5px solid #F6B40E'}} onClick={() => setPantalla('reportes')}>
                <h3 style={{color: '#b28900', margin: '0 0 5px 0'}}>📊 Ver Reportes</h3>
                <span style={{color: '#757575'}}>Métricas y regulares</span>
              </button>
            </div>
          </div>
        )}

        {pantalla === 'crud_escuelas' && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Gestión de Instituciones</h2>
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginTop: 0 }}>{crudEscuelaId ? '✏️ Editar Institución' : '✨ Agregar Nueva Institución'}</h3>
              <input type="text" placeholder="Nombre Principal (ej. CENS 497)" value={crudNombre} onChange={e => setCrudNombre(e.target.value)} />
              <input type="text" placeholder="N° CENS (ej. 497)" value={crudCens} onChange={e => setCrudCens(e.target.value)} />
              <input type="text" placeholder="Nombre de Sede (ej. Pañol Pedro Luque)" value={crudSede} onChange={e => setCrudSede(e.target.value)} />
              <input type="text" placeholder="Domicilio (ej. Concejal Gómez 2098)" value={crudDomicilio} onChange={e => setCrudDomicilio(e.target.value)} />
              <input type="text" placeholder="Localidad (ej. Gregorio de Laferrere)" value={crudLocalidad} onChange={e => setCrudLocalidad(e.target.value)} />
              <button className="btn btn-green" onClick={guardarEscuela}>{crudEscuelaId ? 'Actualizar Institución' : 'Guardar Nueva Institución'}</button>
              {crudEscuelaId && <button className="btn btn-gray" onClick={limpiarFormularioEscuela}>Cancelar Edición</button>}
            </div>
            
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', textAlign: 'left' }}>
              <h3 style={{ marginTop: 0 }}>Instituciones Cargadas ({escuelas.length})</h3>
              {escuelas.map(esc => (
                <div key={esc.id} style={{ borderBottom: '1px solid #eee', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <strong style={{ fontSize: '1.2rem', color: '#0A4D8C' }}>{esc.nombre}</strong> {esc.cens && `(CENS ${esc.cens})`}<br/>
                    <small style={{ color: '#757575' }}>📍 {esc.nombre_sede} | {esc.domicilio}, {esc.localidad}</small>
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

        {pantalla === 'admin' && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Gestión de Cursos</h2>
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginTop: 0 }}>{crudCursoId ? '✏️ Editar Curso' : '✨ Nuevo Curso y Alumnos'}</h3>
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
                <div style={{border: '2px dashed #ccc', padding: '15px', marginTop: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9'}}>
                  <p style={{margin: '0 0 10px 0', fontWeight: 'bold', color: '#0A4D8C'}}>📋 Copia y pega aquí la lista de alumnos</p>
                  <textarea rows="6" value={textoAlumnos} onChange={e => setTextoAlumnos(e.target.value)} style={{width: '100%', padding: '10px', boxSizing: 'border-box'}} />
                </div>
              )}
              <button className="btn btn-green" onClick={guardarCurso}>{crudCursoId ? 'Actualizar Curso' : 'Guardar Curso y Alumnos'}</button>
              {crudCursoId && <button className="btn btn-gray" onClick={limpiarFormularioCurso}>Cancelar Edición</button>}
            </div>
            
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', textAlign: 'left' }}>
              <h3 style={{ marginTop: 0 }}>Mis Cursos ({cursos.length})</h3>
              {cursos.map(cur => (
                <div key={cur.id} style={{ borderBottom: '1px solid #eee', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <strong style={{ fontSize: '1.2rem', color: '#0A4D8C' }}>{cur.materia}</strong><br/>
                    <small style={{ color: '#757575' }}>📖 {cur.nombre} {cur.comision ? `(Com ${cur.comision})` : ''} | 📍 {cur.sede}</small>
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
            <h2 style={{ marginBottom: '20px' }}>Tus Clases Asignadas</h2>
            {cursos.length === 0 ? (
              <div style={{padding: '30px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                <p style={{color: '#757575', fontSize: '1.1rem'}}>No tienes clases asignadas aún.</p>
                <button className="btn btn-green" style={{maxWidth: '300px'}} onClick={() => {limpiarFormularioCurso(); setPantalla('admin');}}>Crear mi primer curso</button>
              </div>
            ) : (
              <div className="cards-grid">
                {cursos.map(cur => {
                  const escuela = escuelas.find(e => e.id === cur.escuela_id);
                  return (
                    <div key={cur.id} className="curso-card" style={{borderTop: '5px solid #0A4D8C'}}>
                      <h3 style={{marginTop: 0, color: '#0A4D8C', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>{cur.materia}</h3>
                      <div className="curso-card-info">
                        <strong>🏫 Inst:</strong> {escuela?.nombre} {escuela?.cens ? `(CENS ${escuela.cens})` : ''}<br/>
                        <strong>📍 Sede:</strong> {cur.sede}<br/>
                        <strong>📖 Curso:</strong> {cur.nombre} {cur.comision ? `| Com: ${cur.comision}` : ''}<br/>
                      </div>
                      <button className="btn btn-blue" style={{marginTop: 'auto', width: '100%', borderRadius: '8px'}} onClick={() => iniciarAsistenciaDesdeCard(cur)}>
                        ▶ Tomar Lista de Hoy
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {pantalla === 'asistencia_activa' && (
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
            
            <h2 className="alumno-display" style={{ margin: '0 0 10px 0', color: '#0A4D8C' }}>{alumnos[indiceActual]?.nombre_completo}</h2>
            <p style={{ color: '#757575', marginBottom: '25px', fontWeight: 'bold' }}>Alumno {indiceActual + 1} de {alumnos.length} {usarVoz ? '🔊 (Voz activa)' : '🔇 (Silenciado)'}</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button className="btn btn-green" style={{ flex: 1, padding: '20px', fontSize: '1.2rem' }} onClick={() => marcar('Presente')}>PRESENTE</button>
              <button className="btn btn-blue" style={{ flex: 1, padding: '20px', fontSize: '1.2rem', backgroundColor: '#F6B40E', color: '#0A4D8C', border: 'none' }} onClick={() => marcar('Tarde')}>TARDE</button>
              <button className="btn btn-red" style={{ flex: 1, padding: '20px', fontSize: '1.2rem' }} onClick={() => marcar('Ausente')}>AUSENTE</button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-gray" onClick={deshacerUltimo} disabled={indiceActual === 0} style={{ flex: 1, opacity: indiceActual === 0 ? 0.5 : 1 }}>↩️ Deshacer</button>
              <button className="btn btn-gray" onClick={cancelarAsistencia} style={{ flex: 1, backgroundColor: '#ef5350', color: 'white', border: 'none' }}>❌ Cancelar</button>
            </div>

            <hr style={{margin: '30px 0', border: 'none', borderTop: '1px solid #eee'}} />
            <h4 style={{color: '#0A4D8C', marginTop: 0}}>¿Llegó un alumno nuevo?</h4>
            <div style={{display: 'flex', gap: '10px'}}>
              <input type="text" placeholder="Apellido y Nombre" value={nuevoAlumnoNombre} onChange={e => setNuevoAlumnoNombre(e.target.value)} style={{margin: 0, flex: 2}} />
              <button className="btn btn-blue" onClick={agregarAlumnoEnCaliente} style={{margin: 0, flex: 1}}>Agregar ahora</button>
            </div>
          </div>
        )}

        {pantalla === 'asistencia_revision' && (
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
            <h2 style={{ color: '#0A4D8C', marginTop: 0 }}>Revisar Asistencia</h2>
            <div style={{marginBottom: '20px', textAlign: 'left', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee'}}>
              <label style={{fontWeight: 'bold', color: '#0A4D8C'}}>📅 Fecha a guardar: </label>
              <input type="date" value={fechaAsistencia} onChange={e => setFechaAsistencia(e.target.value)} style={{padding: '8px', borderRadius: '5px', border: '1px solid #ccc', marginLeft: '10px', width: 'auto'}}/>
            </div>
            
            <div style={{marginBottom: '25px', textAlign: 'left', backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #bbdefb'}}>
              <label style={{fontWeight: 'bold', color: '#0d47a1', display: 'block', marginBottom: '8px'}}>➕ Agregar Estudiante Nuevo:</label>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <input 
                  type="text" 
                  placeholder="Apellido y Nombre (ej: PEREZ, Juan)" 
                  value={nuevoAlumnoNombre} 
                  onChange={e => setNuevoAlumnoNombre(e.target.value)} 
                  style={{margin: 0, flex: 2, minWidth: '220px', backgroundColor: 'white'}} 
                />
                <button className="btn btn-green" onClick={agregarAlumnoEnCaliente} style={{margin: 0, flex: 1, minWidth: '130px'}}>Agregar</button>
              </div>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr><th>Alumno</th><th>Estado</th><th>Eliminar</th></tr>
                </thead>
                <tbody>
                  {alumnos.map(al => {
                    const estadoActual = reporte.find(r => r.alumno_id === al.id)?.estado || 'Ausente';
                    return (
                      <tr key={al.id}>
                        <td>{al.apellido}, {al.nombre}</td>
                        <td>
                          <select value={estadoActual} onChange={(e) => actualizarEstadoRevision(al.id, e.target.value)} style={{margin: 0, padding: '8px', width: 'auto'}}>
                            <option value="Presente">Presente</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Ausente">Ausente</option>
                          </select>
                        </td>
                        <td>
                          <button className="btn btn-red" style={{padding: '8px 12px', margin: 0, width: 'auto'}} onClick={() => eliminarAlumnoDeCurso(al.id)}>🗑️</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px', flexWrap: 'wrap' }}>
              <button className="btn btn-green" onClick={guardarAsistenciaDefinitiva} style={{flex: 2, minWidth: '200px', padding: '20px'}}>💾 CONFIRMAR Y GUARDAR</button>
              <button className="btn btn-gray" onClick={cancelarAsistencia} style={{flex: 1, minWidth: '100px'}}>Descartar</button>
              <button className="btn btn-red" onClick={eliminarListaCompleta} style={{flex: 1, minWidth: '100px'}}>🗑️ Borrar Lista</button>
            </div>
          </div>
        )}

        {pantalla === 'resultados' && (
          <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
            <h2 style={{color: '#2e7d32'}}>¡Lista Guardada! ✅</h2>
            <p style={{fontSize: '1.2rem', color: '#555', marginBottom: '30px'}}>Los datos ya están seguros en la base de datos.</p>
            <button className="btn btn-blue" style={{maxWidth: '300px'}} onClick={() => setPantalla('seleccion_asistencia')}>Volver a Mis Listas</button>
          </div>
        )}

        {pantalla === 'reportes' && (
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
            <h2 style={{marginTop: 0, color: '#0A4D8C'}}>Reportes del Cuatrimestre</h2>
            
            <select value={escuelaId} onChange={e => { setEscuelaId(e.target.value); setCursoId(''); setEstadisticas([]); }}>
              <option value="">-- Filtrar por Institución (Opcional) --</option>
              {escuelas.map(esc => <option key={esc.id} value={esc.id}>{esc.nombre}</option>)}
            </select>

            <select value={cursoId} onChange={e => generarReporte(e.target.value)}>
              <option value="">-- Seleccionar Curso --</option>
              {cursos.filter(c => escuelaId ? c.escuela_id.toString() === escuelaId : true).map(cur => (
                  <option key={cur.id} value={cur.id}>{cur.materia} - {cur.nombre} {cur.comision ? `(Com: ${cur.comision})` : ''}</option>
              ))}
            </select>

            {cursoId && estadisticas.length > 0 && (
              <div style={{ marginTop: '20px', textAlign: 'left', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                <p style={{margin: '0 0 10px 0', fontWeight: 'bold', color: '#0A4D8C'}}>✏️ Editar o borrar una clase pasada:</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[...new Set(asistenciasReporte.map(a => a.fecha))].sort().map(f => (
                    <button key={f} onClick={() => editarClasePasada(f)} className="btn btn-blue" style={{width: 'auto', padding: '8px 15px', margin: 0, fontSize: '0.95rem'}}>
                      {f.split('-')[2]}/{f.split('-')[1]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cursoId && estadisticas.length === 0 && (
              <div style={{ padding: '20px', backgroundColor: '#fff3e0', marginTop: '20px', borderRadius: '8px', border: '1px solid #ffcc80' }}>
                <p style={{ margin: 0, color: '#e65100', fontWeight: 'bold' }}>No hay datos: Este curso no tiene alumnos registrados aún.</p>
              </div>
            )}

            {estadisticas.length > 0 && (
              <div style={{ marginTop: '30px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
                  <p style={{fontSize: '1.1rem'}}><strong>Días dictados:</strong> {totalClasesCurso}</p>
                  <button className="btn" onClick={exportarPDF} style={{backgroundColor: '#F6B40E', width: 'auto', color: '#0A4D8C', border: 'none'}}>📄 Descargar PDF</button>
                </div>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr><th>Alumno</th><th>P</th><th>A</th><th>T</th><th>%</th></tr>
                    </thead>
                    <tbody>
                      {estadisticas.map(alumno => (
                        <tr key={alumno.id}>
                          <td><strong>{alumno.apellido}</strong>, {alumno.nombre}</td>
                          <td style={{color: 'green', fontWeight: 'bold'}}>{alumno.presentes}</td>
                          <td style={{color: '#c62828', fontWeight: 'bold'}}>{alumno.ausentes}</td>
                          <td style={{color: '#f57c00', fontWeight: 'bold'}}>{alumno.tardes}</td>
                          <td>
                            <span className="badge" style={{ backgroundColor: alumno.porcentaje >= 75 ? '#e8f5e9' : alumno.porcentaje >= 50 ? '#fff3e0' : '#ffebee', color: alumno.porcentaje >= 75 ? '#2e7d32' : alumno.porcentaje >= 50 ? '#e65100' : '#c62828' }}>
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

      <footer style={{ backgroundColor: '#0A4D8C', color: '#fff', padding: '30px 20px 20px', textAlign: 'center', marginTop: '60px', borderTop: '4px solid #F6B40E' }}>
        <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>© 2026 Sistema de Asistencia. Todos los derechos reservados.</p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <span style={{ fontSize: '0.8rem', color: '#E5F0FA', textTransform: 'uppercase', letterSpacing: '1px' }}>Desarrollo web con propósito</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo-agape.png" alt="Logo Código Agape" style={{ width: '35px', height: 'auto', borderRadius: '4px' }} />
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', color: '#F6B40E', fontWeight: 'bold', letterSpacing: '1.5px' }}>CÓDIGO AGAPE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;