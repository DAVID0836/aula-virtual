import React, { useState, useEffect } from 'react';

const API_URL = "http://localhost:5000";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState("");
  const [rolActivo, setRolActivo] = useState("usuario");
  const [correoActivo, setCorreoActivo] = useState("");
  const [tabActiva, setTabActiva] = useState("dashboard");

  const [tareas, setTareas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [notificacionNueva, setNotificacionNueva] = useState(false);

  const [userIn, setUserIn] = useState("");
  const [passIn, setPassIn] = useState("");
  const [formT, setFormT] = useState({ id: null, titulo: "", descripcion: "", vencimiento: "", hora: "23:59", adjunto: "", estado: "Publicada" });
  const [formA, setFormA] = useState({ user: "", pass: "", correo: "" });

  // ✅ CAMBIO 1: archivo real en lugar de texto
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  const syncData = async () => {
    try {
      const resT = await fetch(`${API_URL}/tareas`);
      if (resT.ok) {
        const listaTareas = await resT.json();
        if (tareas.length > 0 && listaTareas.length > tareas.length && rolActivo === "usuario") {
          setNotificacionNueva(true);
        }
        setTareas(listaTareas);
      }

      const resE = await fetch(`${API_URL}/entregas`);
      if (resE.ok) setEntregas(await resE.json());

      if (rolActivo === "admin") {
        const resU = await fetch(`${API_URL}/usuarios`);
        if (resU.ok) setAlumnos(await resU.json());
      }
    } catch (e) {
      console.error("Error sincronizando datos.");
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      syncData();
      const i = setInterval(syncData, 8000);
      return () => clearInterval(i);
    }
  }, [isLoggedIn, rolActivo]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userIn || !passIn) return alert("Por favor complete los campos obligatorios.");

    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userIn, pass: passIn })
    });

    const data = await res.json();
    if (res.ok) {
      setUsuarioActivo(data.user);
      setRolActivo(data.rol);
      setCorreoActivo(data.correo || "maestro@classroom.com");
      setIsLoggedIn(true);
    } else {
      alert(data.mensaje);
    }
  };

  const saveTarea = async () => {
    if (!formT.titulo || !formT.vencimiento) return alert("El título y la fecha límite son requeridos.");
    const method = formT.id ? 'PUT' : 'POST';
    const url = formT.id ? `${API_URL}/tareas/${formT.id}` : `${API_URL}/tareas`;
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formT)
    });
    setFormT({ id: null, titulo: "", descripcion: "", vencimiento: "", hora: "23:59", adjunto: "", estado: "Publicada" });
    syncData();
  };

  const deleteTarea = async (id) => {
    if (confirm("¿Seguro que deseas eliminar esta tarea escolar?")) {
      await fetch(`${API_URL}/tareas/${id}`, { method: 'DELETE' });
      syncData();
    }
  };

  const saveAlumno = async () => {
    if (!formA.user || !formA.pass || !formA.correo) return alert("Rellene todos los campos del alumno.");
    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formA)
      });
      if (res.ok) {
        setFormA({ user: "", pass: "", correo: "" });
        syncData();
        alert("¡Alumno matriculado exitosamente!");
      } else {
        const errData = await res.json();
        alert("Error del servidor: " + (errData.mensaje || "No se pudo registrar."));
      }
    } catch (error) {
      alert("Error de conexión al guardar alumno. Verifica el backend.");
    }
  };

  const deleteAlumno = async (name) => {
    if (confirm(`¿Dar de baja definitiva al alumno ${name}?`)) {
      await fetch(`${API_URL}/usuarios/${name}`, { method: 'DELETE' });
      syncData();
    }
  };

  // ✅ CAMBIO 2: función subirEvidencia con archivo real
  const subirEvidencia = async (idTarea) => {
    if (!archivoSeleccionado) return alert("Selecciona un archivo primero.");

    const formData = new FormData();
    formData.append('archivo', archivoSeleccionado);

    try {
      const resUpload = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await resUpload.json();

      if (!resUpload.ok) {
        return alert("Error al subir archivo: " + uploadData.mensaje);
      }

      await fetch(`${API_URL}/entregas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tarea: idTarea,
          alumno: usuarioActivo,
          archivo_evidencia: uploadData.nombre_archivo
        })
      });

      setArchivoSeleccionado(null);
      syncData();
      alert("¡Evidencia subida y registrada con éxito!");

    } catch (error) {
      alert("Error de conexión al subir el archivo.");
    }
  };

  const exportToExcel = () => {
    let csv = "REPORTE ACADEMICO - AULA INTERACTIVA\n";
    csv += "Alumno,Correo,Contrasena,Tareas Entregadas,Tareas Faltantes\n";
    alumnos.forEach(a => {
      const ent = entregas.filter(e => e.alumno === a.user).length;
      const falt = tareas.length - ent;
      csv += `${a.user},${a.correo},${a.pass},${ent},${falt}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Reporte_General_Alumnos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    let txt = "==================================================\n";
    txt += " REPORTE ACADÉMICO OFICIAL - PROF. JUAND \n";
    txt += "==================================================\n\n";
    txt += `Fecha de Generación: ${new Date().toLocaleDateString()}\n`;
    txt += `Total de Alumnos Matriculados: ${alumnos.length}\n`;
    txt += `Total de Tareas Publicadas: ${tareas.length}\n\n`;
    txt += "DETALLE DE ENTREGAS POR ACTIVIDAD:\n";
    tareas.forEach(t => {
      const countE = entregas.filter(e => e.id_tarea === t.id).length;
      txt += `• [Tarea ID: ${t.id}] ${t.titulo} | Entregaron: ${countE} alumnos | Pendientes: ${alumnos.length - countE}\n`;
    });
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Reporte_Escolar_Oficial.pdf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoggedIn) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1e293b', fontFamily: 'sans-serif' }}>
      <form onSubmit={handleLogin} style={{ background: '#ffffff', padding: '40px', borderRadius: '16px', width: '340px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ background: '#3b82f6', color: 'white', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '24px', fontWeight: 'bold' }}>C</div>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: '22px' }}>Aula Virtual</h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '5px' }}>Ingresa tus credenciales de acceso</p>
        </div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '5px' }}>Usuario o Alumno</label>
        <input type="text" placeholder="Ej: juand o nombre_alumno" value={userIn} onChange={e => setUserIn(e.target.value)} style={{ width: '93%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '5px' }}>Contraseña</label>
        <input type="password" placeholder="••••••••" value={passIn} onChange={e => setPassIn(e.target.value)} style={{ width: '93%', padding: '10px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Iniciar Sesión</button>
      </form>
    </div>
  );

  const alumnosFiltrados = alumnos.filter(a => a.user.toLowerCase().includes(busquedaAlumno.toLowerCase()));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* SIDEBAR */}
      <div style={{ width: '260px', background: '#0f172a', color: '#94a3b8', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: '#3b82f6', padding: '5px 10px', borderRadius: '6px', fontSize: '14px' }}>Pro</span>
          Classroom
        </div>
        <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '25px' }}>
          <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>{rolActivo === 'admin' ? "Prof. JUAND" : usuarioActivo}</div>
          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>{rolActivo}</div>
        </div>
        {rolActivo === 'admin' ? (
          <>
            <div onClick={() => setTabActiva("dashboard")} style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', color: tabActiva === 'dashboard' ? '#fff' : '', background: tabActiva === 'dashboard' ? '#3b82f6' : '', marginBottom: '5px' }}>📊 Dashboard</div>
            <div onClick={() => setTabActiva("tareas")} style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', color: tabActiva === 'tareas' ? '#fff' : '', background: tabActiva === 'tareas' ? '#3b82f6' : '', marginBottom: '5px' }}>📚 Control Tareas</div>
            <div onClick={() => setTabActiva("alumnos")} style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', color: tabActiva === 'alumnos' ? '#fff' : '', background: tabActiva === 'alumnos' ? '#3b82f6' : '', marginBottom: '5px' }}>🎓 Alumnos Activos</div>
          </>
        ) : (
          <div style={{ padding: '12px', color: '#fff', background: '#3b82f6', borderRadius: '8px' }}>📖 Mis Tareas Escolares</div>
        )}
        <button onClick={() => setIsLoggedIn(false)} style={{ marginTop: 'auto', padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Sesión</button>
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        {notificacionNueva && (
          <div style={{ background: '#dbeafe', borderLeft: '4px solid #3b82f6', color: '#1e40af', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔔 <b>¡Aviso Escolar!</b> El Profesor JUAND ha publicado una nueva tarea en tu tablón.</span>
            <button onClick={() => setNotificacionNueva(false)} style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
          </div>
        )}

        {/* DASHBOARD */}
        {rolActivo === 'admin' && tabActiva === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>Panel General del Maestro</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={exportToExcel} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📥 Descargar Excel</button>
                <button onClick={exportToPDF} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📄 Exportar Reporte PDF</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>ALUMNOS MATRICULADOS</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '5px' }}>{alumnos.length}</div>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>TAREAS ASIGNADAS</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6', marginTop: '5px' }}>{tareas.length}</div>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>TOTAL DE EVIDENCIAS SUBIDAS</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981', marginTop: '5px' }}>{entregas.length}</div>
              </div>
            </div>
            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>Historial y Registro Técnico de Evidencias</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
                    <th style={{ padding: '12px 8px' }}>Estudiante</th>
                    <th>ID Actividad</th>
                    <th>Archivo Adjunto</th>
                    <th>Fecha de Carga</th>
                    <th>Hora Exacta</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {entregas.map((e, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{e.alumno}</td>
                      <td>{e.id_tarea}</td>
                      <td style={{ color: '#2563eb' }}>📁 {e.archivo_evidencia}</td>
                      <td>{e.fecha_entrega}</td>
                      <td>{e.hora_entrega}</td>
                      <td><span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>{e.estado_entrega}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAREAS */}
        {rolActivo === 'admin' && tabActiva === 'tareas' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#0f172a' }}>Gestor y Distribuidor de Tareas Escolares</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <h4 style={{ margin: '0 0 15px 0' }}>{formT.id ? "📝 Modificar Parámetros de Tarea" : "➕ Crear y Publicar Nueva Tarea"}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <input type="text" placeholder="Título de la tarea" value={formT.titulo} onChange={e => setFormT({ ...formT, titulo: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input type="date" value={formT.vencimiento} onChange={e => setFormT({ ...formT, vencimiento: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input type="time" value={formT.hora} onChange={e => setFormT({ ...formT, hora: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <textarea placeholder="Instrucciones o descripción detallada..." value={formT.descripcion} onChange={e => setFormT({ ...formT, descripcion: e.target.value })} style={{ width: '98%', padding: '10px', height: '60px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px' }}></textarea>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={saveTarea} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{formT.id ? "Guardar Cambios" : "Publicar a Todos"}</button>
                {formT.id && <button onClick={() => setFormT({ id: null, titulo: "", descripcion: "", vencimiento: "", hora: "23:59", adjunto: "", estado: "Publicada" })} style={{ background: '#94a3b8', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px' }}>Cancelar</button>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              {tareas.map(t => (
                <div key={t.id} style={{ background: '#fff', padding: '15px', borderRadius: '10px', borderTop: '4px solid #3b82f6', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>{t.titulo}</h4>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>{t.descripcion}</p>
                  <div style={{ fontSize: '11px', color: '#334155', marginBottom: '15px' }}>⏳ Límite: <b>{t.vencimiento}</b> a las <b>{t.hora}</b></div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => setFormT(t)} style={{ background: '#f1f5f9', color: '#1e293b', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Editar</button>
                    <button onClick={() => deleteTarea(t.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALUMNOS */}
        {rolActivo === 'admin' && tabActiva === 'alumnos' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#0f172a' }}>Control Administrativo de Estudiantes</h2>
            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <h4 style={{ margin: '0 0 15px 0' }}>Matricular Alumno en la Base de Datos</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="Nombre de usuario" value={formA.user} onChange={e => setFormA({ ...formA, user: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }} />
                <input type="text" placeholder="Correo institucional" value={formA.correo} onChange={e => setFormA({ ...formA, correo: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }} />
                <input type="text" placeholder="Contraseña de acceso" value={formA.pass} onChange={e => setFormA({ ...formA, pass: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }} />
                <button onClick={saveAlumno} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Matricular</button>
              </div>
            </div>
            <input type="text" placeholder="🔍 Buscar alumno en tiempo real..." value={busquedaAlumno} onChange={e => setBusquedaAlumno(e.target.value)} style={{ width: '40%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }} />
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                    <th style={{ padding: '10px' }}>Alumno</th>
                    <th>Correo Electrónico</th>
                    <th>Contraseña Visible (Admin)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnosFiltrados.map(a => (
                    <tr key={a.user} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#0f172a' }}>👤 {a.user}</td>
                      <td>{a.correo}</td>
                      <td style={{ color: '#e11d48', fontFamily: 'monospace', fontWeight: 'bold' }}>{a.pass}</td>
                      <td>
                        <button onClick={() => deleteAlumno(a.user)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>Dar de Baja</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA ALUMNO */}
        {rolActivo === 'usuario' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#0f172a' }}>Mis Asignaciones Pendientes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {tareas.map(t => {
                const entregada = entregas.find(e => e.id_tarea === t.id && e.alumno === usuarioActivo);
                return (
                  <div key={t.id} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderLeft: entregada ? '6px solid #10b981' : '6px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h3 style={{ margin: '0 0 5px 0' }}>{t.titulo}</h3>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', background: entregada ? '#dcfce7' : '#fef3c7', color: entregada ? '#15803d' : '#b45309' }}>
                        {entregada ? "ENTREGADA" : "PENDIENTE"}
                      </span>
                    </div>
                    <p style={{ color: '#475569', fontSize: '13px' }}>{t.descripcion}</p>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px' }}>📅 Fecha Límite: {t.vencimiento} a las {t.hora}</div>

                    {/* ✅ CAMBIO 3: input de archivo real */}
                    {!entregada ? (
                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                          Subir Evidencia (PDF, Word, ZIP, Imagen)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg"
                          onChange={e => setArchivoSeleccionado(e.target.files[0])}
                          style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}
                        />
                        {archivoSeleccionado && (
                          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px' }}>
                            📎 {archivoSeleccionado.name}
                          </div>
                        )}
                        <button
                          onClick={() => subirEvidencia(t.id)}
                          style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '7px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Enviar Evidencia
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#15803d' }}>✔️ Archivo entregado: <b>{entregada.archivo_evidencia}</b></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;