const DRIVE_FOLDER_ID = '15uaMvkO2toWBxgyhrWZB-jH7c229iiEO';
const TEMPLATE_ID = '1z8LMJqXj_Nj4L0bIBJjaH2-PaXiTCYhkTSgNuVjO6iQ';
const CERTIFICATES_FOLDER_ID = '1slHOhYFi-lArwC8ocHgBqAWrrxgRlGf3';

function testDrive() {
  DriveApp.getFolderById(DRIVE_FOLDER_ID);
  Logger.log("Permiso concedido");
}

function doGet(e) {
  const action = e.parameter.action;
  const db = SpreadsheetApp.getActiveSpreadsheet();
  let result = {};

  try {
    if (action === 'login') {
      const users = getSheetData(db, 'users');
      // Forzamos String() en ambos lados de la comparación del password
      const user = users.find(u => 
        u.email === e.parameter.email && 
        String(u.password) === String(e.parameter.password)
      );
      
      if (user) {
        result = { success: true, data: { user: { id: user.id }, profile: user } };
      } else {
        result = { success: false, error: 'Credenciales inválidas' };
      }
    }
    else if (action === 'getWorks') {
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const data = works.map(w => ({
        ...w,
        student_name: (users.find(u => u.id === w.student_id) || {}).name || 'Desconocido'
      }));
      result = { success: true, data: data };
    }
    else if (action === 'getStudentWorks') {
      const studentId = e.parameter.studentId;
      const works = getSheetData(db, 'works');
      const data = works.filter(w => w.student_id === studentId);
      result = { success: true, data: data };
    }
    else if (action === 'getEvaluators') {
      const users = getSheetData(db, 'users');
      result = { success: true, data: users.filter(u => u.user_type === 'evaluator') };
    }
    else if (action === 'getAssignments') {
      const assignments = getSheetData(db, 'assignments');
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const enriched = assignments.map(a => {
        const work = works.find(w => w.id === a.work_id);
        const evaluator = users.find(u => u.id === a.evaluator_id);
        const student = work ? users.find(u => u.id === work.student_id) : null;
        return {
          ...a,
          works: { ...work, student_name: student ? student.name : '' },
          user_profiles: evaluator
        };
      });
      result = { success: true, data: enriched };
    }
    else if (action === 'getLiveAssignments') {
      const assignments = getSheetData(db, 'live_assignments');
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const liveEvals = getSheetData(db, 'live_evaluations');
      const enriched = assignments.map(a => {
        const work = works.find(w => w.id === a.work_id);
        const student = work ? users.find(u => u.id === work.student_id) : null;
        const myEval = liveEvals.find(e => e.work_id === a.work_id && e.evaluator_id === a.evaluator_id);
        return {
          ...a,
          works: { ...work, student_name: student ? student.name : '' },
          evaluation: myEval ? { total_score: myEval.total_score } : null
        };
      });
      result = { success: true, data: enriched };
    }
    else if (action === 'getProfessorsBySemester') {
       const semester = e.parameter.semester;
       const professors = getSheetData(db, 'catalog_professors');
       const filtered = professors.filter(p => p.semester === semester);
       result = { success: true, data: filtered };
    }
    else if (action === 'getWinners') {
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const ciclos = {
        "Básico": ["1er Semestre", "2do Semestre", "3er Semestre"],
        "Intermedio": ["4to Semestre", "5to Semestre", "6to Semestre"],
        "Terminal": ["7mo Semestre", "8vo Semestre", "9no Semestre"]
      };
      const scoredWorks = works.filter(w => w.live_score !== "" && Number(w.live_score) > 0).map(w => ({
          ...w, student_name: (users.find(u => u.id === w.student_id) || {}).name || 'N/A'
      }));
      const oral = scoredWorks.filter(w => w.status === 'accepted_oral').sort((a, b) => b.live_score - a.live_score).slice(0, 3);
      const poster = scoredWorks.filter(w => w.status === 'accepted_poster').sort((a, b) => b.live_score - a.live_score).slice(0, 3);
      let porCiclo = [];
      Object.keys(ciclos).forEach(nombre => {
        const semestres = ciclos[nombre];
        const worksInCycle = scoredWorks.filter(w => semestres.includes(w.semester));
        const mejorOral = worksInCycle.filter(w => w.status === 'accepted_oral').sort((a, b) => b.live_score - a.live_score)[0];
        const mejorPoster = worksInCycle.filter(w => w.status === 'accepted_poster').sort((a, b) => b.live_score - a.live_score)[0];
        porCiclo.push({
          ciclo_nombre: nombre,
          oral: mejorOral ? { ...mejorOral } : null,
          poster: mejorPoster ? { ...mejorPoster } : null
        });
      });
      result = { success: true, data: { oral, poster, porCiclo } };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// --- LOGICA DE APOYO ---

function tieneConflictoDeGrupo(grupoTrabajo, gruposProfesorString) {
  if (!grupoTrabajo || !gruposProfesorString) return false;
  const gB = String(grupoTrabajo).trim().toUpperCase();
  const lista = String(gruposProfesorString).split(',').map(g => g.trim().toUpperCase());
  return lista.includes(gB);
}

function generarShortId(db, semestre) {
  const prefijos = { "1er Semestre": "A", "2do Semestre": "B", "3er Semestre": "C", "4to Semestre": "D", "5to Semestre": "E", "6to Semestre": "F", "7mo Semestre": "G", "8vo Semestre": "H", "9no Semestre": "I" };
  const letra = prefijos[semestre] || "Z";
  const works = getSheetData(db, 'works');
  const total = works.filter(w => w.semester === semestre).length;
  return letra + (total + 1).toString().padStart(2, '0');
}

function shuffleArray(array) {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- POST ---

function doPost(e) {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  let result = {};
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'register') {
      const uSheet = db.getSheetByName('users');
      const uData = getSheetData(db, 'users');
      if (uData.find(u => u.email === data.email)) throw new Error('Email ya registrado');
      const id = Utilities.getUuid();
      const h = uSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const row = new Array(h.length).fill("");
      row[h.indexOf('id')] = id;
      row[h.indexOf('email')] = data.email;
      row[h.indexOf('password')] = "'" + data.password;
      row[h.indexOf('name')] = data.name;
      row[h.indexOf('user_type')] = data.user_type;
      row[h.indexOf('timestamp')] = new Date();
      if (h.indexOf('grupos_imparte') > -1) row[h.indexOf('grupos_imparte')] = data.grupos_imparte || "";
      uSheet.appendRow(row);
      result = { success: true };
    }

    else if (data.action === 'submitWork') {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.fileBase64), 'application/pdf', data.fileName);
      const file = folder.createFile(blob);
      
      // Intentamos obtener los datos del archivo, si falla usamos texto genérico
      let fileUrl = "";
      let fileId = "";
      try {
        fileUrl = file.getUrl();
        fileId = file.getId();
        // Intentar compartir de forma silenciosa
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch(e) {
        fileUrl = "https://drive.google.com/open?id=" + file.getId();
        fileId = file.getId();
      }

      const worksSheet = db.getSheetByName('works');
      if (!worksSheet) throw new Error("No se encontró la pestaña 'works'");

      const h = worksSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      
      // Creamos la fila vacía del tamaño de las columnas
      const newRow = new Array(h.length).fill("");
      
      const sId = generarShortId(db, data.semester);
      const id = Utilities.getUuid();
                  
      // Mapeo manual ultra-seguro (si indexOf devuelve -1, no rompe el script)
      if (h.indexOf('id') > -1) newRow[h.indexOf('id')] = id;
      if (h.indexOf('short_id') > -1) newRow[h.indexOf('short_id')] = sId;
      if (h.indexOf('student_id') > -1) newRow[h.indexOf('student_id')] = data.student_id;
      if (h.indexOf('title') > -1) newRow[h.indexOf('title')] = data.title;
      if (h.indexOf('abstract') > -1) newRow[h.indexOf('abstract')] = data.abstract;
      if (h.indexOf('modality') > -1) newRow[h.indexOf('modality')] = "Pendiente";
      if (h.indexOf('file_url') > -1) newRow[h.indexOf('file_url')] = fileUrl;
      if (h.indexOf('file_id') > -1) newRow[h.indexOf('file_id')] = fileId;
      if (h.indexOf('status') > -1) newRow[h.indexOf('status')] = 'pending';
      if (h.indexOf('submitted_at') > -1) newRow[h.indexOf('submitted_at')] = new Date();
      if (h.indexOf('semester') > -1) newRow[h.indexOf('semester')] = data.semester;
      if (h.indexOf('team_members') > -1) newRow[h.indexOf('team_members')] = data.team_members;
      if (h.indexOf('grupo') > -1) newRow[h.indexOf('grupo')] = data.group;
      if (h.indexOf('profesor_cargo') > -1) newRow[h.indexOf('profesor_cargo')] = data.professor_cargo;
      
      // AGREGAR LA FILA
      worksSheet.appendRow(newRow);
      
      // Forzar a Google a escribir los datos YA
      SpreadsheetApp.flush();
      
      result = { success: true, shortId: sId };
    }

    
    else if (data.action === 'assignWork') {
      const work = getSheetData(db, 'works').find(w => w.id === data.work_id);
      const ev = getSheetData(db, 'users').find(u => u.id === data.evaluator_id);
      if (tieneConflictoDeGrupo(work.grupo, ev.grupos_imparte)) {
        result = { success: false, error: `Conflicto: El profesor imparte clase al grupo ${work.grupo}.` };
      } else {
        db.getSheetByName('assignments').appendRow([Utilities.getUuid(), data.work_id, data.evaluator_id, 'assigned', new Date(), '']);
        updateRow(db, 'works', 'id', data.work_id, { status: 'under_review' });
        result = { success: true };
      }
    }

    else if (data.action === 'assignAllPending') {
      const works = getSheetData(db, 'works');
      const evaluators = getSheetData(db, 'users').filter(u => u.user_type === 'evaluator');
      const assigns = getSheetData(db, 'assignments');
      const sheet = db.getSheetByName('assignments');
      let workload = {};
      evaluators.forEach(ev => workload[ev.id] = assigns.filter(a => a.evaluator_id === ev.id).length);
      let count = 0;
      works.filter(w => w.status === 'pending').forEach(work => {
        let aptos = evaluators.filter(ev => !tieneConflictoDeGrupo(work.grupo, ev.grupos_imparte));
        if (aptos.length < 3) return;
        aptos.sort((a, b) => workload[a.id] - workload[b.id]).slice(0, 3).forEach(ev => {
          sheet.appendRow([Utilities.getUuid(), work.id, ev.id, 'assigned', new Date(), '']);
          workload[ev.id]++;
        });
        updateRow(db, 'works', 'id', work.id, { status: 'under_review' });
        count++;
      });
      result = { success: true, count: count };
    }

    else if (data.action === 'submitEvaluation') {
      const eSheet = db.getSheetByName('evaluations');
      const h = eSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const row = new Array(h.length).fill("");
      
      row[h.indexOf('id')] = Utilities.getUuid();
      row[h.indexOf('work_id')] = data.work_id;
      row[h.indexOf('evaluator_id')] = data.evaluator_id;
      row[h.indexOf('total_score')] = data.total_score;
      row[h.indexOf('modalidad_sugerida')] = data.modalidad_sugerida;
      row[h.indexOf('comentarios')] = data.comentarios;
      row[h.indexOf('timestamp')] = new Date();
      
      // Guardar puntaje de pertinencia (Parte 2) si la columna existe
      if (h.indexOf('score_pertinencia') > -1) {
        row[h.indexOf('score_pertinencia')] = data.score_pertinencia;
      }
      
      eSheet.appendRow(row);

      if (data.assignment_id) {
        const aSheet = db.getSheetByName('assignments');
        const aData = aSheet.getDataRange().getValues();
        for (let i = 1; i < aData.length; i++) {
          if (aData[i][0] == data.assignment_id) {
            aSheet.getRange(i + 1, 4).setValue('completed');
            aSheet.getRange(i + 1, 6).setValue(new Date());
            break;
          }
        }
      }
      result = { success: true };
    }

    // DICTAMEN MASIVO V6 (HORARIO FIJO 10:00 AM Y LÓGICA LINEAL)
    else if (data.action === 'batchFinalize') {
  const wSheet = db.getSheetByName('works');
  const works = getSheetData(db, 'works');
  const evals = getSheetData(db, 'evaluations');
  const users = getSheetData(db, 'users');
  const h = wSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
  const mappingCiclos = {
    "1er Semestre": "Básico", "2do Semestre": "Básico", "3er Semestre": "Básico",
    "4to Semestre": "Intermedio", "5to Semestre": "Intermedio", "6to Semestre": "Intermedio",
    "7mo Semestre": "Terminal", "8vo Semestre": "Terminal", "9no Semestre": "Terminal"
  };
  let semesterPools = {};
  // 1. Recolectar y promediar
  works.forEach((w, idx) => {
    if (w.status === 'rejected') return;
    const wEvals = evals.filter(e => e.work_id === w.id);
    if (wEvals.length < 3) return;
    const avgTotal = parseFloat((wEvals.reduce((s, c) => s + Number(c.total_score), 0) / wEvals.length).toFixed(1));
    const avgPert = parseFloat((wEvals.reduce((s, c) => s + Number(c.score_pertinencia || 0), 0) / wEvals.length).toFixed(1));
    const pasoPertinencia = avgPert >= 6;
    const fb = wEvals.map((e, i) => `Juez ${i + 1}: ${e.comentarios}`).join('\n\n');
    if (!semesterPools[w.semester]) semesterPools[w.semester] = [];
    semesterPools[w.semester].push({
      rowIndex: idx + 2, ...w, avgScore: avgTotal, avgPertinencia: avgPert, ApprovedPert: pasoPertinencia, feedback: fb
    });
  });
  // 2. Clasificar por semestre (rank 0 → UMIEZ, rank 1 → Auditorio Principal)
  let salas = {
    "UMIEZ": { "Básico": [], "Intermedio": [], "Terminal": [] },
    "Auditorio Principal": { "Básico": [], "Intermedio": [], "Terminal": [] }
  };
  const totalSemestres = Object.keys(semesterPools).length;
  const totalOralSlots = totalSemestres * 2;
  let assignedOral = 0;
  Object.keys(semesterPools).forEach(sem => {
    let group = semesterPools[sem].sort((a, b) => b.avgScore - a.avgScore);
    let ciclo = mappingCiclos[sem] || "Básico";
    group.forEach((w, rank) => {
      if (w.avgScore < 60 || !w.ApprovedPert) {
        w.fStat = 'rejected'; w.fAud = ''; w.fHor = '';
        if (!w.ApprovedPert && w.avgScore >= 60)
          w.feedback += "\n\nRechazado por puntaje insuficiente en Pertinencia.";
      }
      else if (rank === 0) {
        w.fStat = 'accepted_oral'; w.fAud = 'UMIEZ';
        salas["UMIEZ"][ciclo].push(w); assignedOral++;
      }
      else if (rank === 1) {
        w.fStat = 'accepted_oral'; w.fAud = 'Auditorio Principal';
        salas["Auditorio Principal"][ciclo].push(w); assignedOral++;
      }
      else {
        w.fStat = 'accepted_poster'; w.fAud = ''; w.fHor = 'Sesión Carteles';
      }
    });
  });
  // 3. Backfill: llenar huecos orales con los mejores trabajos de poster (global)
  const huecos = totalOralSlots - assignedOral;
  if (huecos > 0) {
    const posterPool = [];
    Object.keys(semesterPools).forEach(sem => {
      semesterPools[sem].forEach(w => {
        if (w.fStat === 'accepted_poster') posterPool.push(w);
      });
    });
    posterPool.sort((a, b) => b.avgScore - a.avgScore);
    const backfill = posterPool.slice(0, huecos);
    const salasArr = ['UMIEZ', 'Auditorio Principal'];
    backfill.forEach((w, i) => {
      w.fStat = 'accepted_oral';
      w.fAud = salasArr[i % 2];
      const ciclo = mappingCiclos[w.semester] || "Básico";
      salas[w.fAud][ciclo].push(w);
    });
  }
  // 4. Generar Horarios (INICIO 10:00 AM)
  const HORA_INICIO = 10;
  const MINUTOS_TURNO = 20;
  function buildSched(pool) {
    const b = shuffleArray(pool["Básico"]), i = shuffleArray(pool["Intermedio"]), t = shuffleArray(pool["Terminal"]);
    let res = [];
    for (let j = 0; j < 3; j++) {
      let sec = [];
      if (b[j]) sec.push(b[j]); if (i[j]) sec.push(i[j]); if (t[j]) sec.push(t[j]);
      res = res.concat(shuffleArray(sec));
    }
    return res;
  }
  ["UMIEZ", "Auditorio Principal"].forEach(sala => {
    const listaFinal = buildSched(salas[sala]);
    listaFinal.forEach((work, index) => {
      let totalMins = index * MINUTOS_TURNO;
      let currentH = HORA_INICIO + Math.floor(totalMins / 60);
      let currentM = totalMins % 60;
      work.fHor = currentH + ":" + (currentM === 0 ? "00" : currentM);
    });
  });
  // 5. Escribir resultados y enviar correos
  let count = 0;
  Object.keys(semesterPools).forEach(sem => {
    semesterPools[sem].forEach(w => {
      wSheet.getRange(w.rowIndex, h.indexOf('status') + 1).setValue(w.fStat);
      wSheet.getRange(w.rowIndex, h.indexOf('final_score') + 1).setValue(w.avgScore);
      wSheet.getRange(w.rowIndex, h.indexOf('feedback') + 1).setValue(w.feedback);
      if (h.indexOf('auditorio') > -1) wSheet.getRange(w.rowIndex, h.indexOf('auditorio') + 1).setValue(w.fAud || "");
      if (h.indexOf('horario') > -1) wSheet.getRange(w.rowIndex, h.indexOf('horario') + 1).setValue("'" + (w.fHor || ""));
      const student = users.find(u => u.id === w.student_id);
      if (student && student.email) {
        let msg = `Hola ${student.name},\n\nDictamen: ${w.fStat}\nLugar: ${w.fAud || 'N/A'}\nHora: ${w.fHor || 'N/A'}\n\nRetroalimentación:\n${w.feedback}`;
        try { MailApp.sendEmail(student.email, "Resultado Congreso LABIQ", msg); } catch(e) {}
      }
      count++;
    });
  });
  result = { success: true, count: count };
}

    else if (data.action === 'notifyJudgesAgenda') {
      const liveAssignments = getSheetData(db, 'live_assignments');
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const evaluators = users.filter(u => u.user_type === 'evaluator');

      evaluators.forEach(ev => {
        const myTasks = liveAssignments.filter(a => a.evaluator_id === ev.id);
        if (myTasks.length === 0) return;

        let html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
            <h2 style="color: #0d6efd; text-align: center;">📌 Agenda de Evaluación</h2>
            <p>Estimado(a) <strong>Prof. ${ev.name}</strong>,</p>
            <p>Le informamos que se le han asignado los siguientes trabajos para evaluar durante el evento presencial.</p>
            
            <div style="background-color: #f8f9fa; padding: 10px; border-left: 5px solid #0d6efd; margin-bottom: 20px;">
               <strong>📅 Fecha del Evento:</strong> Martes 02 de Junio, 2026<br>
               <strong>📍 Sede:</strong> Facultad de Estudios Superiores Zaragoza
            </div>

            <table border="1" style="border-collapse:collapse; width:100%; font-size: 13px;">
              <thead>
                <tr style="background-color: #0d6efd; color: white;">
                  <th style="padding: 10px;">Hora</th>
                  <th style="padding: 10px;">ID</th>
                  <th style="padding: 10px;">Ubicación</th>
                  <th style="padding: 10px;">Trabajo / Equipo</th>
                </tr>
              </thead>
              <tbody>`;

        myTasks.forEach(task => {
          const work = works.find(w => w.id === task.work_id);
          if (work) {
            const isOral = work.status === 'accepted_oral';
            html += `
              <tr>
                <td style="padding: 10px; text-align: center; font-weight: bold;">${work.horario || (isOral ? 'Por asignar' : 'Sesión Cartel')}</td>
                <td style="padding: 10px; text-align: center; background: #eef;">${work.short_id}</td>
                <td style="padding: 10px;">${work.auditorio || '<b>Área de Carteles</b>'}</td>
                <td style="padding: 10px;">
                  <div style="font-weight: bold; color: #0d6efd;">${work.title}</div>
                  <div style="font-size: 11px; color: #666; margin-top: 5px;">👥 ${work.team_members}</div>
                </td>
              </tr>`;
          }
        });

        html += `
              </tbody>
            </table>
            
            <p style="margin-top: 20px; font-size: 14px;">
              <strong>Instrucciones importantes:</strong><br>
              1. Por favor, presente su dispositivo móvil con la sesión iniciada en el portal.<br>
              2. La evaluación se realiza en tiempo real a través de los controles (sliders) del panel.<br>
              3. En caso de no poder asistir, favor de notificar al comité a la brevedad.
            </p>
            
            <p style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
              Congreso Estudiantil de Laboratorios de Ingeniería Química<br>
              <i>"Por mi raza hablará el espíritu"</i>
            </p>
          </div>`;

        try {
          MailApp.sendEmail({
            to: ev.email,
            subject: "📋 Su Agenda de Evaluación - 02 de Junio, 2026",
            htmlBody: html
          });
        } catch(e) { console.log("Error mail a " + ev.email); }
      });
      result = { success: true };
    }

    else if (data.action === 'assignLiveWorks') {
      const works = getSheetData(db, 'works');
      const evaluators = getSheetData(db, 'users').filter(u => u.user_type === 'evaluator');
      const existing = getSheetData(db, 'live_assignments');
      const lSheet = db.getSheetByName('live_assignments');
      let workload = {};
      evaluators.forEach(ev => workload[ev.id] = existing.filter(a => a.evaluator_id === ev.id).length);
      const shuff = shuffleArray(evaluators);
      const p1 = shuff.slice(0, Math.ceil(shuff.length/2)), p2 = shuff.slice(Math.ceil(shuff.length/2));
      let count = 0;
      function asignar(lista, w) {
        let aptos = lista.filter(ev => !tieneConflictoDeGrupo(w.grupo, ev.grupos_imparte));
        aptos.sort((a,b) => workload[a.id] - workload[b.id]).slice(0,3).forEach(ev => {
          lSheet.appendRow([Utilities.getUuid(), w.id, ev.id, 'assigned', new Date(), '']);
          workload[ev.id]++; count++;
        });
      }
      works.filter(w => w.status === 'accepted_oral').forEach(w => { if(!existing.some(a => a.work_id === w.id)) asignar(w.auditorio==='UMIEZ'?p1:p2, w); });
      works.filter(w => w.status === 'accepted_poster').forEach(w => { if(!existing.some(a => a.work_id === w.id)) asignar(evaluators, w); });
      result = { success: true, count: count };
    }

    else if (data.action === 'submitLiveEvaluation') {
      db.getSheetByName('live_evaluations').appendRow([Utilities.getUuid(), data.work_id, data.evaluator_id, data.total_score, data.s1, data.s2, data.s3, data.s4, data.s5, data.s6, data.comments, new Date()]);
      updateRow(db, 'live_assignments', 'id', data.assignment_id, { status: 'completed', completed_at: new Date() });
      const evs = getSheetData(db, 'live_evaluations').filter(e => e.work_id === data.work_id);
      const avg = (evs.reduce((s, c) => s + Number(c.total_score), 0) / evs.length).toFixed(2);
      updateRow(db, 'works', 'id', data.work_id, { live_score: avg });
      result = { success: true };
    }

    else if (data.action === 'generateCertificates') {
      const work = getSheetData(db, 'works').find(w => w.id === data.work_id);
      const copy = DriveApp.getFileById(TEMPLATE_ID).makeCopy(`Reconocimiento - ${work.short_id}`, DriveApp.getFolderById(CERTIFICATES_FOLDER_ID));
      const pres = SlidesApp.openById(copy.getId());
      const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
      const hoy = new Date();
      pres.replaceAllText('{{INTEGRANTES}}', work.team_members);
      pres.replaceAllText('{{TITULO}}', work.title);
      pres.replaceAllText('{{PROFESOR}}', work.professor_cargo || "No asignado");
      pres.replaceAllText('{{MODALIDAD}}', work.status === 'accepted_oral' ? 'Ponencia Oral' : 'Cartel');
      pres.replaceAllText('{{FECHA}}', `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`);
      pres.saveAndClose();
      const pdf = DriveApp.getFolderById(CERTIFICATES_FOLDER_ID).createFile(copy.getAs(MimeType.PDF));
      copy.setTrashed(true);
      result = { success: true, fileUrl: pdf.getUrl() };
    }

  } catch (error) {
    result = { success: false, error: error.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// --- HELPERS GENERALES ---

function getSheetData(db, name) {
  const sheet = db.getSheetByName(name);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function updateRow(db, sheetName, idCol, idVal, updates) {
  const sheet = db.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx = headers.indexOf(idCol);
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIdx] == idVal) {
      Object.keys(updates).forEach(k => {
        const uIdx = headers.indexOf(k);
        if (uIdx > -1) sheet.getRange(i + 1, uIdx + 1).setValue(updates[k]);
      });
      break;
    }
  }
}

// ============================================================
// SIMULACIONES
// ============================================================

/**
 * SIMULAR EVALUACIONES PRESENCIALES (FASE 2)
 * Asigna puntuaciones aleatorias a trabajos aceptados.
 * Usa live_score_base para poder restaurar después.
 */
function simularEvaluacionesPresenciales() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const sWorks = db.getSheetByName('works');
  const wData = sWorks.getDataRange().getValues();
  const headers = wData[0].map(h => String(h).trim().toLowerCase());
  const idxStatus = headers.indexOf('status');
  const idxLiveScore = headers.indexOf('live_score');
  const idxLiveBase = headers.indexOf('live_score_base');

  if (!wData[0].includes('live_score_base')) {
    // Crear columna de respaldo si no existe
    const lastCol = wData[0].length + 1;
    sWorks.getRange(1, lastCol).setValue('live_score_base');
    headers.push('live_score_base');
  }

  const idxLiveBase2 = headers.indexOf('live_score_base');
  let contador = 0;

  for (let i = 1; i < wData.length; i++) {
    const status = String(wData[i][idxStatus]);
    if (status === 'accepted_oral' || status === 'accepted_poster') {
      const scoreActual = wData[i][idxLiveScore];
      // Guardar valor original si existe
      if (scoreActual !== "" && scoreActual !== undefined) {
        sWorks.getRange(i + 1, idxLiveBase2 + 1).setValue(scoreActual);
      }
      // Asignar puntuación simulada entre 60 y 100
      const simScore = Math.floor(Math.random() * 41) + 60;
      sWorks.getRange(i + 1, idxLiveScore + 1).setValue(simScore);
      contador++;
    }
  }

  SpreadsheetApp.flush();
  Logger.log(`✅ Simulación: ${contador} trabajos recibieron puntuación presencial.`);
}

/**
 * RESTAURAR puntuaciones originales después de simularEvaluacionesPresenciales()
 */
function limpiarSimulacionPresencial() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const sWorks = db.getSheetByName('works');
  const wData = sWorks.getDataRange().getValues();
  const headers = wData[0].map(h => String(h).trim().toLowerCase());
  const idxLiveScore = headers.indexOf('live_score');
  const idxLiveBase = headers.indexOf('live_score_base');

  if (idxLiveBase === -1) {
    Logger.log('No hay columna live_score_base. No hay nada que restaurar.');
    return;
  }

  let restaurados = 0;
  for (let i = 1; i < wData.length; i++) {
    const baseVal = wData[i][idxLiveBase];
    if (baseVal !== "" && baseVal !== undefined) {
      sWorks.getRange(i + 1, idxLiveScore + 1).setValue(baseVal);
      sWorks.getRange(i + 1, idxLiveBase + 1).setValue('');
      restaurados++;
    }
  }

  SpreadsheetApp.flush();
  Logger.log(`✅ Restaurados ${restaurados} trabajos a su puntuación original.`);
}

function prepararDatosCapitacion() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = db.getSheetByName('users');
  const wSheet = db.getSheetByName('works');
  const sems = ["1er Semestre", "2do Semestre", "3er Semestre", "4to Semestre", "5to Semestre", "6to Semestre", "7mo Semestre", "8vo Semestre", "9no Semestre"];
  const grps = ["1101", "1201", "1301", "1401"];

  sems.forEach((sem, sIdx) => {
    for (let i = 1; i <= 3; i++) {
      const studentId = Utilities.getUuid();
      uSheet.appendRow([studentId, `capacitacion_${sIdx}_${i}@test.com`, "'123456", `Alumno Capacitación ${sem} ${i}`, 'student', new Date(), ""]);
      const h = wSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const row = new Array(h.length).fill("");
      row[h.indexOf('id')] = Utilities.getUuid();
      row[h.indexOf('short_id')] = generarShortId(db, sem);
      row[h.indexOf('student_id')] = studentId;
      row[h.indexOf('title')] = `Proyecto ${sem} - ${i}`;
      row[h.indexOf('status')] = "pending";
      row[h.indexOf('semester')] = sem;
      row[h.indexOf('grupo')] = grps[Math.floor(Math.random()*grps.length)];
      row[h.indexOf('team_members')] = "Integrante A, Integrante B";
      row[h.indexOf('profesor_cargo')] = "Profesor de Prueba";
      wSheet.appendRow(row);
    }
  });
}

function borrarDatosCapitacion() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const sWorks = db.getSheetByName('works');
  const sUsers = db.getSheetByName('users');
  const sAssign = db.getSheetByName('assignments');
  const sEval = db.getSheetByName('evaluations');

  const wData = sWorks.getDataRange().getValues();
  for (let i = wData.length - 1; i >= 1; i--) {
    if (String(wData[i][2]).includes("CAPACITACIÓN")) sWorks.deleteRow(i + 1);
  }
  const uData = sUsers.getDataRange().getValues();
  for (let i = uData.length - 1; i >= 1; i--) {
    if (String(uData[i][1]).includes("capacitacion_")) sUsers.deleteRow(i + 1);
  }
  // Limpia tablas de relación para que no queden IDs huérfanos
  [sAssign, sEval].forEach(s => {
    if (!s) return;
    const d = s.getDataRange().getValues();
    for (let i = d.length -1; i >=1; i--) {
      // Si la columna work_id (asumiendo índice 1) ya no existe en works, borrar
      // O más simple: si el status es de prueba
    }
  });
}
// ============================================================
// FUNCIÓN PARA SIMULAR EVALUACIONES DE LOS JUECES ASIGNADOS
// ============================================================

function simularEvaluacionesDeAsignados() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const sAssign = db.getSheetByName('assignments');
  const sEval = db.getSheetByName('evaluations');
  const sWorks = db.getSheetByName('works');

  if (!sAssign || !sEval || !sWorks) {
    Logger.log("❌ Error: Faltan hojas (assignments, evaluations o works).");
    return;
  }

  // 1. Obtener datos de asignaciones
  const assignData = sAssign.getDataRange().getValues();
  const assignHeaders = assignData[0].map(h => String(h).trim().toLowerCase());
  const statusAssignIdx = assignHeaders.indexOf('status');
  const workIdIdx = assignHeaders.indexOf('work_id');
  const evaluatorIdIdx = assignHeaders.indexOf('evaluator_id');
  const idAssignIdx = assignHeaders.indexOf('id');

  // 2. Obtener encabezados de evaluaciones para insertar correctamente
  const evalHeaders = sEval.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());

  let totalSimuladas = 0;

  Logger.log("--- INICIANDO SIMULACIÓN DE EVALUACIONES ---");

  // 3. Recorrer asignaciones (saltando cabecera)
  for (let i = 1; i < assignData.length; i++) {
    const status = String(assignData[i][statusAssignIdx]);

    // Solo evaluamos lo que está 'assigned' (pendiente)
    if (status === 'assigned') {
      const workId = assignData[i][workIdIdx];
      const evaluatorId = assignData[i][evaluatorIdIdx];
      const assignId = assignData[i][idAssignIdx];

      // --- GENERAR DATOS ALEATORIOS ---
      // Puntaje total (Parte 1 + Parte 2) entre 75 y 98
      const totalScore = Math.floor(Math.random() * 24) + 75; 
      // Puntaje de pertinencia (Parte 2) entre 7 y 10 (para que pasen el filtro de 6)
      const pertinenciaScore = Math.floor(Math.random() * 4) + 7;
      
      const comentarios = [
        "El trabajo presenta una metodología sólida y una estructura coherente con los objetivos planteados inicialmente.",
        "Excelente manejo de conceptos técnicos. Se recomienda profundizar un poco más en la discusión de resultados finales.",
        "La investigación cumple con todos los requisitos académicos y muestra un alto grado de innovación y pertinencia social.",
        "Un proyecto muy bien estructurado. La bibliografía utilizada es actual y el análisis de datos es impecable y claro.",
        "Felicidades por la integración de conocimientos de semestres anteriores en la solución de este problema ingenieril."
      ];
      const feedbackAleatorio = comentarios[Math.floor(Math.random() * comentarios.length)];

      // --- 4. INSERTAR EN HOJA 'EVALUATIONS' ---
      const newEvalRow = new Array(evalHeaders.length).fill("");
      newEvalRow[evalHeaders.indexOf('id')] = Utilities.getUuid();
      newEvalRow[evalHeaders.indexOf('work_id')] = workId;
      newEvalRow[evalHeaders.indexOf('evaluator_id')] = evaluatorId;
      newEvalRow[evalHeaders.indexOf('total_score')] = totalScore;
      newEvalRow[evalHeaders.indexOf('score_pertinencia')] = pertinenciaScore;
      newEvalRow[evalHeaders.indexOf('modalidad_sugerida')] = ""; // Ya no la usamos
      newEvalRow[evalHeaders.indexOf('comentarios')] = feedbackAleatorio;
      newEvalRow[evalHeaders.indexOf('timestamp')] = new Date();

      sEval.appendRow(newEvalRow);

      // --- 5. MARCAR ASIGNACIÓN COMO COMPLETADA ---
      sAssign.getRange(i + 1, statusAssignIdx + 1).setValue('completed');
      sAssign.getRange(i + 1, assignHeaders.indexOf('completed_at') + 1).setValue(new Date());

      totalSimuladas++;
    }
  }

  // Forzar actualización de la hoja
  SpreadsheetApp.flush();

  Logger.log(`✅ SIMULACIÓN TERMINADA: Se generaron ${totalSimuladas} evaluaciones.`);
  Logger.log("👉 Ahora puedes ir al Panel Admin Web y usar 'Dictaminar y Notificar'.");
}

/**
 * FUNCIÓN PARA CAMBIAR EL ID DE UN EVALUADOR EN TODO EL SISTEMA
 * @param {string} idViejo - El UUID largo que tiene actualmente (ej: "550e8400-e29b...")
 * @param {string} idNuevo - El nombre corto que quieras (ej: "PROFE_GARCIA")
 */
function ejecutarCambioDeId(idViejo, idNuevo) {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  // Pestañas donde aparece el ID del evaluador
  const pestanas = [
    { nombre: 'users', columna: 'id' },
    { nombre: 'assignments', columna: 'evaluator_id' },
    { nombre: 'evaluations', columna: 'evaluator_id' },
    { nombre: 'live_assignments', columna: 'evaluator_id' },
    { nombre: 'live_evaluations', columna: 'evaluator_id' }
  ];

  Logger.log(`--- Iniciando cambio de ID: ${idViejo} -> ${idNuevo} ---`);

  pestanas.forEach(p => {
    const sheet = db.getSheetByName(p.nombre);
    if (!sheet) {
      Logger.log(`⚠️ La pestaña ${p.nombre} no existe, saltando...`);
      return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const colIdx = headers.indexOf(p.columna.toLowerCase());

    if (colIdx === -1) {
      Logger.log(`❌ No se encontró la columna ${p.columna} en ${p.nombre}`);
      return;
    }

    let cambiosEnEstaHoja = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colIdx]) === String(idViejo)) {
        sheet.getRange(i + 1, colIdx + 1).setValue(idNuevo);
        cambiosEnEstaHoja++;
      }
    }
    Logger.log(`✅ ${p.nombre}: ${cambiosEnEstaHoja} filas actualizadas.`);
  });

  Logger.log("--- PROCESO COMPLETADO ---");
}

// ÚSALA AQUÍ PARA HACER LOS CAMBIOS
function dispararCambios() {
  // Copia y pega esta línea por cada profesor que quieras cambiar:
  ejecutarCambioDeId("f1993a50-4def-492a-9e54-d297d434c5ea", "LindaV");
}

// ============================================================
// DIAGNÓSTICO: Prueba qué devolvería getWinners
// ============================================================
function debugGetWinners() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const works = getSheetData(db, 'works');
  const users = getSheetData(db, 'users');

  Logger.log("Total de trabajos en hoja: " + works.length);

  const scored = works.filter(w => w.live_score !== "" && Number(w.live_score) > 0);
  Logger.log("Trabajos con live_score > 0: " + scored.length);

  const statuses = {};
  works.forEach(w => {
    const s = w.status || '(vacio)';
    statuses[s] = (statuses[s] || 0) + 1;
  });
  Logger.log("Distribución de estados: " + JSON.stringify(statuses));

  const headers = db.getSheetByName('works').getDataRange().getValues()[0];
  Logger.log("Columnas en works: " + JSON.stringify(headers));

  Logger.log("¿Existe 'live_score' en headers? " + headers.includes('live_score'));

  if (scored.length === 0) {
    Logger.log("❌ No hay trabajos con live_score > 0. Revisa que exista la columna 'live_score' y tenga valores.");
    return;
  }

  scored.forEach(w => {
    Logger.log(`  → ${w.short_id} | ${w.title} | estado:${w.status} | semestre:${w.semester} | score:${w.live_score}`);
  });
}