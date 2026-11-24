const DRIVE_FOLDER_ID = '15uaMvkO2toWBxgyhrWZB-jH7c229iiEO';
const TEMPLATE_ID = '1z8LMJqXj_Nj4L0bIBJjaH2-PaXiTCYhkTSgNuVjO6iQ';
const CERTIFICATES_FOLDER_ID = '1slHOhYFi-lArwC8ocHgBqAWrrxgRlGf3';
const FRONTEND_URL = 'https://congresolabiq.github.io/Sistema';
const RESET_TOKEN_EXPIRY_HOURS = 1;

// --- Fase 2: presentaciones orales (hoja propia) ---
const ORAL_PRESENTATIONS_SHEET = 'oral_presentations';
const ORAL_PRESENTATIONS_HEADERS = [
  'id', 'work_id', 'student_id', 'file_name', 'mime_type', 'file_size',
  'file_id', 'file_url', 'uploaded_at', 'updated_at'
];

// --- Estado en vivo de evaluadores ---
const EV_STATUS = { AVAILABLE: 'available', BUSY: 'busy', ABSENT: 'absent', FINISHED: 'finished' };
// Estados manuales: la actividad automática no debe sobrescribirlos.
const EV_MANUAL_STATES = [EV_STATUS.ABSENT, EV_STATUS.FINISHED];

// --- Horarios (modo Encuentro: auditorio único) ---
const AUDITORIO_UNICO = 'Auditorio Principal';
const CARTEL_LUGAR = 'Área de Carteles';
const CARTEL_HORARIO = 'Sesión Carteles';
const HORA_INICIO = 10;
const MIN_POR_TURNO = 20;

// --- FUNCIONES DE ENTRADA (GET) ---

function doGet(e) {
  const action = e.parameter.action;
  const db = SpreadsheetApp.getActiveSpreadsheet();
  let result = {};

  try {
    if (action === 'getWorks') {
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
      const presentaciones = getSheetData(db, ORAL_PRESENTATIONS_SHEET);
      const presentacionPorTrabajo = {};
      presentaciones.forEach(p => { presentacionPorTrabajo[String(p.work_id)] = p; });
      let data = works.filter(w => w.student_id === studentId).map(w => {
        const p = presentacionPorTrabajo[String(w.id)];
        return p && p.file_url ? {
          ...w,
          presentation_url: p.file_url,
          presentation_file_id: p.file_id,
          presentation_updated_at: p.updated_at
        } : w;
      });
      // En modo Encuentro el alumno no debe ver calificaciones ni retroalimentación.
      if (leerClaveConfig('encuentroiq_mode', '0') === '1') {
        const ocultos = ['final_score', 'live_score', 'feedback'];
        data = data.map(w => {
          const copia = { ...w };
          ocultos.forEach(k => { delete copia[k]; });
          return copia;
        });
      }
      result = { success: true, data: data };
    }
    else if (action === 'getEvaluators') {
      const users = getSheetData(db, 'users');
      result = { success: true, data: users.filter(u => u.user_type === 'evaluator') };
    }
    else if (action === 'getEvaluatorActivity') {
      const users = getSheetData(db, 'users');
      const assignments = getSheetData(db, 'assignments');
      const liveAssignments = getSheetData(db, 'live_assignments');
      let statuses = [];
      try { statuses = getSheetData(db, 'live_evaluator_status'); } catch (err) { statuses = []; }

      const now = Date.now();
      const estaCompletada = (a) => String(a.status || '').toLowerCase() === 'completed';
      const evaluators = users.filter(u => u.user_type === 'evaluator').map(u => {
        const row = statuses.find(s => String(s.evaluator_id) === String(u.id)) || {};
        const lastAct = row.last_activity ? new Date(row.last_activity).getTime() : 0;
        const misAsg1 = assignments.filter(a => String(a.evaluator_id) === String(u.id));
        const misAsg2 = liveAssignments.filter(a => String(a.evaluator_id) === String(u.id));
        const phase1Assigned = misAsg1.length;
        const phase2Assigned = misAsg2.length;
        const phase1Done = misAsg1.filter(estaCompletada).length;
        const phase2Done = misAsg2.filter(estaCompletada).length;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          status: row.status || 'available',
          last_activity: row.last_activity || null,
          lastActivityMs: lastAct || 0,
          activeRecently: !!lastAct && (now - lastAct < INACTIVO_MS),
          // "done" = asignaciones completadas (no documentos de evaluación, para no pasar del 100%)
          totalDone: phase1Done + phase2Done,
          assigned: phase1Assigned + phase2Assigned,
          phase1Done: phase1Done,
          phase1Assigned: phase1Assigned,
          phase2Done: phase2Done,
          phase2Assigned: phase2Assigned
        };
      });
      result = { success: true, data: evaluators };
    }
    else if (action === 'getAssignments') {
      const assignments = getSheetData(db, 'assignments');
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const evaluations = getSheetData(db, 'evaluations'); 

      const enriched = assignments.map(a => {
        const work = works.find(w => w.id === a.work_id);
        const evaluator = users.find(u => u.id === a.evaluator_id);
        const evalDoc = buscarEvaluacionDeAsignacion(a, evaluations, users);
        const manualScore = (a.total_score !== undefined && a.total_score !== '') ? a.total_score : null;
        return {
          ...a,
          works: { ...work },
          user_profiles: evaluator || (esAsignacionManual(a, users) ? { name: 'Dictamen manual' } : undefined),
          total_score: evalDoc ? evalDoc.total_score : manualScore,
          evaluation: evalDoc || null
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
          evaluation: myEval || null
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
        const mejoresOral = worksInCycle.filter(w => w.status === 'accepted_oral').sort((a, b) => b.live_score - a.live_score).slice(0, 2);
        const mejoresPoster = worksInCycle.filter(w => w.status === 'accepted_poster').sort((a, b) => b.live_score - a.live_score).slice(0, 2);
        porCiclo.push({
          ciclo_nombre: nombre,
          oral: mejoresOral.length ? mejoresOral : null,
          poster: mejoresPoster.length ? mejoresPoster : null
        });
      });
      result = { success: true, data: { oral, poster, porCiclo } };
    }
    else if (action === 'getLiveAdminDashboard') {
      assertAdmin(db, e.parameter.admin_user_id);
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const assignments = getSheetData(db, 'assignments');
      const liveAssignments = getSheetData(db, 'live_assignments');
      const statuses = getSheetData(db, 'live_evaluator_status');
      const helpRequests = getSheetData(db, 'help_requests');

      const now = Date.now();
      const evaluators = users.filter(u => u.user_type === 'evaluator').map(u => {
        const row = statuses.find(s => String(s.evaluator_id) === String(u.id)) || {};
        const lastAct = row.last_activity ? new Date(row.last_activity).getTime() : 0;
        const misAsg1 = assignments.filter(a => String(a.evaluator_id) === String(u.id));
        const misAsg2 = liveAssignments.filter(a => String(a.evaluator_id) === String(u.id));
        const esCompletada = (a) => String(a.status || '').toLowerCase() === 'completed';
        const phase1Done = misAsg1.filter(esCompletada).length;
        const phase2Done = misAsg2.filter(esCompletada).length;
        const assigned = misAsg1.length + misAsg2.length;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          facultad: u.facultad || '',
          status: row.status || EV_STATUS.AVAILABLE,
          last_activity: row.last_activity || null,
          lastActivityMs: lastAct || 0,
          updated_at: row.updated_at || null,
          activeRecently: !!lastAct && (now - lastAct < INACTIVO_MS),
          phase1Done: phase1Done,
          phase1Assigned: misAsg1.length,
          phase2Done: phase2Done,
          phase2Assigned: misAsg2.length,
          totalDone: phase1Done + phase2Done,
          // Ambos nombres para mantener compatibilidad con los dos dashboards.
          assigned: assigned,
          assignedCount: assigned
        };
      });
      const worksWithNames = works.map(w => ({
        ...w,
        student_name: (users.find(u => u.id === w.student_id) || {}).name || 'Desconocido'
      }));
      result = {
        success: true,
        data: {
          works: worksWithNames,
          evaluators: evaluators,
          liveAssignments: liveAssignments,
          helpRequests: helpRequests.filter(h => h.status === 'pending'),
          serverTime: now
        }
      };
    }
    else if (action === 'getPendingHelpSummary') {
      const requests = getSheetData(db, 'help_requests').filter(r => r.status === 'pending');
      const last = requests[requests.length - 1] || null;
      result = {
        success: true,
        data: {
          count: requests.length,
          lastMessage: last ? String(last.message || '') : '',
          evaluators: last ? String(last.evaluator_name || '') : ''
        }
      };
    }
    else if (action === 'getConfig') {
      result = { success: true, data: {
        submission_deadline: obtenerFechaLimiteSubida(),
        presentation_deadline: leerClaveConfig('presentation_deadline', ''),
        event_date: obtenerFechaEvento(),
        encuentroiq_mode: leerClaveConfig('encuentroiq_mode', '0')
      } };
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

function esAutoEvaluacion(work, evaluator) {
  if (!work || !evaluator) return false;
  const nombreEv = String(evaluator.name).trim().toUpperCase();
  return String(work.profesor_cargo || '').split(',').some(n => String(n).trim().toUpperCase() === nombreEv);
}

function generarShortId(db, semestre) {
  const prefijos = { "1er Semestre": "A", "2do Semestre": "B", "3er Semestre": "C", "4to Semestre": "D", "5to Semestre": "E", "6to Semestre": "F", "7mo Semestre": "G", "8vo Semestre": "H", "9no Semestre": "I" };
  const letra = prefijos[semestre] || "Z";
  const works = getSheetData(db, 'works');
  const total = works.filter(w => w.semester === semestre).length;
  return letra + (total + 1).toString().padStart(2, '0');
}

function hashPassword(password) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function obtenerFechaEvento() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = db.getSheetByName('config');
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === 'event_date') {
        return String(data[i][1]).trim();
      }
    }
  }
  return '15-17 de julio de 2026';
}

function obtenerFechaLimiteSubida() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = db.getSheetByName('config');
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === 'submission_deadline') {
        const val = data[i][1];
        if (val instanceof Date) return val.toISOString();
        return String(val).trim();
      }
    }
  }
  return '';
}

function formatearFechaLimite(fecha) {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return 'la fecha límite configurada';
  return d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear() + ' a las ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function seExcedioFechaLimiteSubida() {
  const limite = obtenerFechaLimiteSubida();
  if (!limite) return false;
  const fecha = new Date(limite);
  if (isNaN(fecha.getTime())) return false;
  return new Date() > fecha;
}

function getConfigSheet() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = db.getSheetByName('config');
  if (sheet) return sheet;
  const all = db.getSheets();
  for (const s of all) {
    if (s.getName().trim().toLowerCase() === 'config') return s;
  }
  return null;
}

function leerClaveConfig(key, fallback) {
  const configSheet = getConfigSheet();
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === String(key).trim().toLowerCase()) {
        const v = data[i][1];
        if (v !== '' && v !== null && v !== undefined) return String(v).trim();
      }
    }
  }
  return fallback;
}

function guardarClaveConfig(key, value) {
  let configSheet = getConfigSheet();
  if (!configSheet) configSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('config');
  const rows = configSheet.getDataRange().getValues();
  const k = String(key).trim().toLowerCase();
  let idx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === k) { idx = i; break; }
  }
  if (idx > -1) configSheet.getRange(idx + 1, 2).setValue(value);
  else configSheet.appendRow([k, value]);
}

// --- ACTIVIDAD DE EVALUADORES (live_evaluator_status) ---

const INACTIVO_MS = 5 * 60 * 1000;

function getEvaluatorStatusSheet(db) {
  let sheet = db.getSheetByName('live_evaluator_status');
  if (!sheet) {
    sheet = db.insertSheet('live_evaluator_status');
    sheet.appendRow(['evaluator_id', 'status', 'last_activity', 'updated_at']);
  }
  return sheet;
}

// Upsert: si no existe el evaluador lo crea; si existe actualiza last_activity.
function registerEvaluatorActivity(db, userId, forceStatus) {
  const sheet = getEvaluatorStatusSheet(db);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const eIdx = headers.indexOf('evaluator_id');
  const sIdx = headers.indexOf('status');
  const laIdx = headers.indexOf('last_activity');
  const uaIdx = headers.indexOf('updated_at');
  const now = new Date();

  if (eIdx === -1) throw new Error('live_evaluator_status no tiene la columna evaluator_id');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][eIdx]) === String(userId)) {
      const actual = data[i][sIdx] || EV_STATUS.AVAILABLE;
      const esManual = EV_MANUAL_STATES.indexOf(actual) > -1;
      sheet.getRange(i + 1, laIdx + 1).setValue(now);
      sheet.getRange(i + 1, uaIdx + 1).setValue(now);
      if (sIdx > -1) sheet.getRange(i + 1, sIdx + 1).setValue(forceStatus && !esManual ? forceStatus : actual);
      return;
    }
  }
  sheet.appendRow([String(userId), forceStatus || 'available', now, now]);
}

function obtenerCodigoEvaluador() {
  const db = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = db.getSheetByName('config');
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === 'evaluator_code') {
        return String(data[i][1]).trim().toLowerCase();
      }
    }
  }
  return 'zaragoza';
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

    if (data.action === 'login') {
      const users = getSheetData(db, 'users');
      const emailInput = String(data.email == null ? '' : data.email).trim().toLowerCase();
      const passwordInput = String(data.password == null ? '' : data.password);
      const hashedInput = hashPassword(passwordInput);
      const user = users.find(u => {
        if (String(u.email == null ? '' : u.email).trim().toLowerCase() !== emailInput) return false;
        const stored = String(u.password).replace(/^'/, '');
        if (stored === hashedInput) return true;
        if (stored === passwordInput) {
          const h = db.getSheetByName('users').getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
          const pwdIdx = h.indexOf('password');
          if (pwdIdx > -1) {
            const sheet = db.getSheetByName('users');
            const dataRows = sheet.getDataRange().getValues();
            for (let i = 1; i < dataRows.length; i++) {
              if (String(dataRows[i][h.indexOf('id')]) === String(u.id)) {
                sheet.getRange(i + 1, pwdIdx + 1).setValue("'" + hashedInput);
                break;
              }
            }
          }
          return true;
        }
        return false;
      });
      if (user) {
        result = { success: true, data: { user: { id: user.id }, profile: user } };
      } else {
        result = { success: false, error: 'Credenciales inválidas' };
      }
    }

    else if (data.action === 'register') {
      const uSheet = db.getSheetByName('users');
      const uData = getSheetData(db, 'users');
      const newEmail = String(data.email == null ? '' : data.email).trim().toLowerCase();
      if (uData.find(u => String(u.email == null ? '' : u.email).trim().toLowerCase() === newEmail)) throw new Error('Email ya registrado');

      // Validar código de evaluador en backend
      if (data.user_type === 'evaluator') {
        const validCode = obtenerCodigoEvaluador();
        if (!data.admin_code || String(data.admin_code).toLowerCase() !== validCode) {
          throw new Error('Código de acceso docente incorrecto.');
        }
      }

      const id = Utilities.getUuid();
      const h = uSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const row = new Array(h.length).fill("");
      row[h.indexOf('id')] = id;
      row[h.indexOf('email')] = data.email;
      row[h.indexOf('password')] = "'" + hashPassword(data.password);
      row[h.indexOf('name')] = data.name;
      row[h.indexOf('user_type')] = data.user_type;
      row[h.indexOf('timestamp')] = new Date();
      if (h.indexOf('grupos_imparte') > -1) row[h.indexOf('grupos_imparte')] = data.grupos_imparte || "";
      uSheet.appendRow(row);
      result = { success: true };
    }

    else if (data.action === 'submitWork') {
      if (seExcedioFechaLimiteSubida()) {
        throw new Error('La fecha límite para subir trabajos (' + formatearFechaLimite(obtenerFechaLimiteSubida()) + ') ya ha pasado.');
      }
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.fileBase64), 'application/pdf', data.fileName);
      const file = folder.createFile(blob);
      let fileUrl = "";
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      } catch(e) { fileUrl = "https://drive.google.com/open?id=" + file.getId(); }

      const wSheet = db.getSheetByName('works');
      const h = wSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const row = new Array(h.length).fill("");
      const lock = LockService.getScriptLock();
      const lockAcquired = lock.tryLock(10000);
      let sId;
      try {
        sId = generarShortId(db, data.semester);

        row[h.indexOf('id')] = Utilities.getUuid();
        row[h.indexOf('short_id')] = sId;
        row[h.indexOf('student_id')] = data.student_id;
        row[h.indexOf('title')] = data.title;
        row[h.indexOf('abstract')] = data.abstract;
        row[h.indexOf('modality')] = "Pendiente";
        row[h.indexOf('file_url')] = fileUrl;
        row[h.indexOf('file_id')] = file.getId();
        row[h.indexOf('status')] = 'pending';
        row[h.indexOf('submitted_at')] = new Date();
        row[h.indexOf('semester')] = data.semester;
        row[h.indexOf('team_members')] = data.team_members;
        if (h.indexOf('grupo') > -1) row[h.indexOf('grupo')] = data.group;
        if (h.indexOf('profesor_cargo') > -1) row[h.indexOf('profesor_cargo')] = data.professor_cargo;
        if (h.indexOf('profesor_email') > -1) row[h.indexOf('profesor_email')] = data.professor_email || '';
        if (h.indexOf('facultad') > -1) row[h.indexOf('facultad')] = data.facultad || '';
        if (h.indexOf('project_type') > -1) row[h.indexOf('project_type')] = data.project_type || '';
        if (h.indexOf('asesores') > -1) row[h.indexOf('asesores')] = data.asesores || '';
        if (h.indexOf('facultad') > -1) row[h.indexOf('facultad')] = data.facultad || '';
        if (h.indexOf('project_type') > -1) row[h.indexOf('project_type')] = data.project_type || '';
        if (h.indexOf('asesores') > -1) row[h.indexOf('asesores')] = data.asesores || '';

        wSheet.appendRow(row);
        SpreadsheetApp.flush();
      } finally {
        if (lockAcquired) lock.releaseLock();
      }

      // Notificar al profesor/asesor indicado en el formulario.
      const profesorEmail = String(data.professor_email || '').trim();
      if (profesorEmail) {
        try {
          const student = getSheetData(db, 'users').find(u => u.id === data.student_id) || {};
          notificarProfesorEnvioTrabajo({
            profesorEmail: profesorEmail,
            shortId: sId,
            title: data.title,
            abstract: data.abstract,
            semester: data.semester,
            group: data.group,
            facultad: data.facultad,
            projectType: data.project_type,
            professor: data.professor_cargo,
            advisors: data.asesores,
            teamMembers: data.team_members,
            studentName: student.name,
            studentEmail: student.email,
            fileUrl: fileUrl,
            submittedAt: new Date()
          });
        } catch (e) {
          // La notificación no debe impedir que el trabajo quede registrado.
        }
      }

      result = { success: true, shortId: sId };
    }

    else if (data.action === 'setSubmissionDeadline') {
      guardarClaveConfig('submission_deadline', data.deadline || '');
      result = { success: true };
    }

    else if (data.action === 'setConfig') {
      const key = String(data.key || '').trim().toLowerCase();
      const value = String(data.value === undefined ? '' : data.value).trim();
      if (!key) throw new Error('Falta la clave de configuración.');
      guardarClaveConfig(key, value);
      result = { success: true };
    }

    else if (data.action === 'registerActivity') {
      const evaluator = getSheetData(db, 'users').find(u => u.id === data.user_id);
      if (!evaluator) throw new Error('Evaluador no encontrado.');
      registerEvaluatorActivity(db, evaluator.id, data.status || 'available');
      result = { success: true };
    }

    else if (data.action === 'assignWork') {
      const work = getSheetData(db, 'works').find(w => w.id === data.work_id);
      const ev = getSheetData(db, 'users').find(u => u.id === data.evaluator_id);
      
      const esAutoEval = esAutoEvaluacion(work, ev);

      if (tieneConflictoDeGrupo(work.grupo, ev.grupos_imparte) || esAutoEval) {
        result = { success: false, error: `Conflicto: El profesor tiene relación directa con este trabajo.` };
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
        let aptos = evaluators.filter(ev => {
          return !tieneConflictoDeGrupo(work.grupo, ev.grupos_imparte) && !esAutoEvaluacion(work, ev);
        });

        if (aptos.length < 2) return; 

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
      row[h.indexOf('comentarios')] = data.comentarios;
      row[h.indexOf('timestamp')] = new Date();
      if (h.indexOf('score_pertinencia') > -1) row[h.indexOf('score_pertinencia')] = data.score_pertinencia;
      if (h.indexOf('cumple_extension') > -1) row[h.indexOf('cumple_extension')] = data.cumple_extension === false ? 'no' : 'si';
      
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

    else if (data.action === 'previewFinalize') {
      const calc = calcularDictamenBackend(db);
      result = { success: true, mode: calc.mode, count: calc.works.length, works: calc.works };
    }

    else if (data.action === 'applyFinalize') {
      const count = aplicarDictamenBackend(db, data.decisions);
      result = { success: true, count: count };
    }

    else if (data.action === 'batchFinalize') {
      const calc = calcularDictamenBackend(db);
      const decisiones = calc.works.map(w => ({ work_id: w.work_id, status: w.defaultStatus }));
      const count = aplicarDictamenBackend(db, decisiones);
      result = { success: true, count: count };
    }

    else if (data.action === 'notifyJudgesAgenda') {
      const liveAssigns = getSheetData(db, 'live_assignments');
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      users.filter(u => u.user_type === 'evaluator').forEach(ev => {
        const tasks = liveAssigns.filter(a => a.evaluator_id === ev.id);
        if (tasks.length === 0) return;
        const fechaEvento = obtenerFechaEvento();
        let html = `<h2>Agenda para Prof. ${ev.name}</h2><p><strong>Fecha del evento:</strong> ${fechaEvento}</p><table border="1" style="border-collapse:collapse; width:100%;"><tr style="background:#0d6efd; color:white;"><th>Hora</th><th>Lugar</th><th>Trabajo</th></tr>`;
        tasks.forEach(t => {
          const w = works.find(work => work.id === t.work_id);
          if (w) html += `<tr><td>${w.horario || 'N/A'}</td><td>${w.auditorio || 'Carteles'}</td><td><b>${w.short_id}</b> - ${w.title}</td></tr>`;
        });
        html += `</table>`;
        try { MailApp.sendEmail({ to: ev.email, subject: "Agenda de Evaluación - Congreso LABIQ", htmlBody: html }); } catch(e) {}
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
      
      const p1 = evaluators.slice(0, Math.ceil(evaluators.length/2)), p2 = evaluators.slice(Math.ceil(evaluators.length/2));
      let count = 0;
      function asignar(lista, w) {
        let aptos = lista.filter(ev => {
           return !tieneConflictoDeGrupo(w.grupo, ev.grupos_imparte) && !esAutoEvaluacion(w, ev);
        });
        aptos.sort((a,b) => workload[a.id] - workload[b.id]).slice(0,3).forEach(ev => {
          lSheet.appendRow([Utilities.getUuid(), w.id, ev.id, 'assigned', new Date(), '']);
          workload[ev.id]++; count++;
        });
      }
      works.filter(w => w.status === 'accepted_oral').forEach(w => { if(!existing.some(a => a.work_id === w.id)) asignar(w.auditorio==='UMIEZ'?p1:p2, w); });
      works.filter(w => w.status === 'accepted_poster').forEach(w => { if(!existing.some(a => a.work_id === w.id)) asignar(evaluators, w); });
      result = { success: true, count: count };
    }

    else if (data.action === 'assignManualLive') {
      const lSheet = db.getSheetByName('live_assignments');
      const existing = getSheetData(db, 'live_assignments');
      if (existing.some(a => a.work_id === data.work_id && a.evaluator_id === data.evaluator_id)) {
        result = { success: false, error: 'Ese juez ya está asignado a ese trabajo.' };
      } else {
        const work = getSheetData(db, 'works').find(w => w.id === data.work_id);
        const ev = getSheetData(db, 'users').find(u => u.id === data.evaluator_id);
        if (!work || !ev) {
          result = { success: false, error: 'Trabajo o evaluador no encontrado.' };
        } else if (tieneConflictoDeGrupo(work.grupo, ev.grupos_imparte) || esAutoEvaluacion(work, ev)) {
          result = { success: false, error: 'Conflicto: El evaluador tiene relación directa con este trabajo.' };
        } else {
          lSheet.appendRow([Utilities.getUuid(), data.work_id, data.evaluator_id, 'assigned', new Date(), '']);
          result = { success: true };
        }
      }
    }

    else if (data.action === 'submitLiveEvaluation') {
      const evSheet = db.getSheetByName('live_evaluations');
      const headers = evSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const fields = {
        id: Utilities.getUuid(),
        work_id: data.work_id,
        evaluator_id: data.evaluator_id,
        total_score: data.total_score,
        s1: data.s1, s2: data.s2, s3: data.s3, s4: data.s4,
        s5: data.s5, s6: data.s6, s7: data.s7, s8: data.s8,
        c1: data.c1, c2: data.c2, c3: data.c3, c4: data.c4,
        c5: data.c5, c6: data.c6, c7: data.c7, c8: data.c8,
        c9: data.c9, c10: data.c10,
        comments: data.comments,
        timestamp: new Date()
      };
      const row = [];
      Object.keys(fields).forEach(k => {
        let idx = headers.indexOf(k);
        if (idx === -1) {
          evSheet.getRange(1, headers.length + 1).setValue(k);
          headers.push(k);
          idx = headers.length - 1;
        }
        row[idx] = fields[k];
      });
      for (let i = 0; i < headers.length; i++) if (row[i] === undefined) row[i] = "";
      evSheet.appendRow(row);

      updateRow(db, 'live_assignments', 'id', data.assignment_id, { status: 'completed', completed_at: new Date() });
      const evs = getSheetData(db, 'live_evaluations').filter(e => e.work_id === data.work_id);
      const avg = (evs.reduce((s, c) => s + Number(c.total_score), 0) / evs.length).toFixed(2);
      updateRow(db, 'works', 'id', data.work_id, { live_score: avg });
      result = { success: true };
    }

    else if (data.action === 'generateCertificates') {
      const work = getSheetData(db, 'works').find(w => w.id === data.work_id);
      if (!work) throw new Error('Trabajo no encontrado.');
      const student = getUserById(db, work.student_id);
      const prof = getAsesores(work) || 'No asignado';
      const lugar = lugarDeGanador_(db, work.id);
      const url = crearSlideEditable({ ...work, student_name: student ? student.name : '' }, prof, lugar);
      result = { success: true, fileUrl: url, lugar: lugar };
    }

    else if (data.action === 'forgotPassword') {
      const users = getSheetData(db, 'users');
      const user = users.find(u => u.email === data.email);
      if (user) {
        const token = Utilities.getUuid();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
        const sheet = db.getSheetByName('reset_tokens');
        let headers;
        if (!sheet) {
          const newSheet = db.insertSheet('reset_tokens');
          headers = ['token', 'email', 'created_at', 'expires_at', 'used'];
          newSheet.appendRow(headers);
        } else {
          headers = sheet.getDataRange().getValues()[0];
        }
        const row = new Array(headers.length).fill("");
        row[headers.indexOf('token')] = token;
        row[headers.indexOf('email')] = data.email;
        row[headers.indexOf('created_at')] = now;
        row[headers.indexOf('expires_at')] = expiresAt;
        row[headers.indexOf('used')] = 'false';
        sheet.appendRow(row);
        const resetLink = FRONTEND_URL + '/set-new-password.html?token=' + token;
        const subject = 'Recuperación de contraseña - Congreso LABIQ';
        const body = 'Hola,\n\nHas solicitado restablecer tu contraseña.\n\nHaz clic en el siguiente enlace para crear una nueva contraseña:\n' + resetLink + '\n\nEste enlace expirará en ' + RESET_TOKEN_EXPIRY_HOURS + ' hora(s).\n\nSi no solicitaste esto, ignora este mensaje.\n\nAtentamente,\nSistema Congreso LABIQ';
        try { MailApp.sendEmail(data.email, subject, body); } catch (e) {}
      }
      result = { success: true };
    }

    else if (data.action === 'resetPassword') {
      const sheet = db.getSheetByName('reset_tokens');
      if (!sheet) throw new Error('Token inválido o expirado.');
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const tIdx = headers.indexOf('token');
      const eIdx = headers.indexOf('email');
      const expIdx = headers.indexOf('expires_at');
      const usedIdx = headers.indexOf('used');
      let foundRow = -1, email = '';
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][tIdx] === data.token && String(rows[i][usedIdx]).toLowerCase() === 'false') {
          const expires = new Date(rows[i][expIdx]);
          if (expires > new Date()) {
            foundRow = i;
            email = rows[i][eIdx];
          }
          break;
        }
      }
      if (foundRow === -1) throw new Error('El enlace ha expirado o ya fue utilizado.');
      const usersSheet = db.getSheetByName('users');
      const userRows = usersSheet.getDataRange().getValues();
      const uHeaders = userRows[0];
      const emailIdx = uHeaders.indexOf('email');
      const pwdIdx = uHeaders.indexOf('password');
      let userFound = false;
      for (let i = 1; i < userRows.length; i++) {
        if (String(userRows[i][emailIdx]).toLowerCase() === String(email).toLowerCase()) {
          usersSheet.getRange(i + 1, pwdIdx + 1).setValue("'" + hashPassword(data.password));
          userFound = true;
          break;
        }
      }
      if (!userFound) throw new Error('Usuario no encontrado.');
      sheet.getRange(foundRow + 1, usedIdx + 1).setValue('true');
      result = { success: true };
    }

    // --- Operación en vivo: estado de evaluadores, ayuda y reasignación ---

    else if (data.action === 'setEvaluatorStatus') {
      assertAdmin(db, data.admin_user_id);
      if (!data.evaluator_id) throw new Error('Falta evaluator_id');
      const valid = [EV_STATUS.AVAILABLE, EV_STATUS.BUSY, EV_STATUS.ABSENT, EV_STATUS.FINISHED];
      if (valid.indexOf(data.status) === -1) throw new Error('Estado inválido');
      setEvaluatorStatusInternal(db, data.evaluator_id, data.status);
      result = { success: true };
    }

    else if (data.action === 'markEvaluatorAbsent') {
      assertAdmin(db, data.admin_user_id);
      if (!data.evaluator_id) throw new Error('Falta evaluator_id');
      setEvaluatorStatusInternal(db, data.evaluator_id, EV_STATUS.ABSENT);
      result = { success: true };
    }

    else if (data.action === 'reactivateEvaluator') {
      assertAdmin(db, data.admin_user_id);
      if (!data.evaluator_id) throw new Error('Falta evaluator_id');
      setEvaluatorStatusInternal(db, data.evaluator_id, EV_STATUS.AVAILABLE);
      result = { success: true };
    }

    else if (data.action === 'requestHelp') {
      const evaluador = assertUser(db, data.user_id);
      const mensaje = String(data.message == null ? '' : data.message).substring(0, 500);
      if (!mensaje.trim()) throw new Error('Escribe un mensaje para solicitar ayuda.');
      addHelpRequest(db, evaluador, mensaje);
      // Sin Web Push: aviso opcional por correo si se configura la clave help_email.
      const correoAyuda = leerClaveConfig('help_email', '');
      if (correoAyuda) {
        try {
          MailApp.sendEmail(correoAyuda, 'Solicitud de ayuda - Congreso LABIQ',
            'Evaluador: ' + evaluador.name + '\nMensaje: ' + mensaje);
        } catch (e) { Logger.log('requestHelp (correo): ' + e.message); }
      }
      result = { success: true };
    }

    else if (data.action === 'resolveHelpRequest') {
      assertAdmin(db, data.admin_user_id);
      const sheet = getHelpSheet(db);
      const dataRows = sheet.getDataRange().getValues();
      const headers = dataRows[0];
      const idIdx = headers.indexOf('id');
      const stIdx = headers.indexOf('status');
      const raIdx = headers.indexOf('resolved_at');
      const rbIdx = headers.indexOf('resolved_by');
      for (let i = 1; i < dataRows.length; i++) {
        if (String(dataRows[i][idIdx]) === String(data.request_id)) {
          const status = data.status === 'resolved' ? 'resolved' : 'acknowledged';
          sheet.getRange(i + 1, stIdx + 1).setValue(status);
          if (status === 'resolved' && raIdx > -1) sheet.getRange(i + 1, raIdx + 1).setValue(new Date());
          if (rbIdx > -1) sheet.getRange(i + 1, rbIdx + 1).setValue(data.admin_user_id);
          break;
        }
      }
      result = { success: true };
    }

    else if (data.action === 'reassignLiveEvaluator') {
      assertAdmin(db, data.admin_user_id);
      const workId = data.work_id;
      const oldEv = data.old_evaluator_id;
      const newEv = data.new_evaluator_id;
      if (!workId || !oldEv || !newEv) throw new Error('Faltan datos de reasignación');

      const work = getSheetData(db, 'works').find(w => w.id === workId);
      const newEvaluator = getUserById(db, newEv);
      if (!work || !newEvaluator) throw new Error('Trabajo o evaluador nuevo no encontrado');
      if (esAutoEvaluacion(work, newEvaluator)) throw new Error('Conflicto: el nuevo evaluador es asesor del trabajo.');

      const lSheet = db.getSheetByName('live_assignments');
      const lData = lSheet.getDataRange().getValues();
      const lHeaders = lData[0];
      const wIdx = lHeaders.indexOf('work_id');
      const eIdx = lHeaders.indexOf('evaluator_id');
      for (let i = 1; i < lData.length; i++) {
        if (String(lData[i][wIdx]) === String(workId) && String(lData[i][eIdx]) === String(oldEv)) {
          lSheet.getRange(i + 1, eIdx + 1).setValue(newEv);
          break;
        }
      }
      const finalData = lSheet.getDataRange().getValues();
      const existe = finalData.some(r => String(r[wIdx]) === String(workId) && String(r[eIdx]) === String(newEv));
      if (!existe) {
        lSheet.appendRow([Utilities.getUuid(), workId, newEv, 'assigned', new Date(), '']);
      }

      const statusSheet = getEvaluatorStatusSheet(db);
      const statusData = statusSheet.getDataRange().getValues();
      for (let i = 1; i < statusData.length; i++) {
        if (String(statusData[i][0]) === String(oldEv) && String(statusData[i][1]) === EV_STATUS.ABSENT) {
          statusSheet.getRange(i + 1, 2).setValue(EV_STATUS.FINISHED);
          break;
        }
      }
      logReassign(db, workId, oldEv, newEv, data.admin_user_id, data.reason || '');
      result = { success: true };
    }

    // --- Fase 2: presentaciones orales ---

    else if (data.action === 'submitPresentation') {
      const work = getSheetData(db, 'works').find(w => String(w.id) === String(data.work_id));
      if (!work) {
        result = { success: false, error: 'Trabajo no encontrado.' };
      } else if (String(work.student_id) !== String(data.student_id)) {
        result = { success: false, error: 'Solo el autor del trabajo puede subir la presentación.' };
      } else if (work.status !== 'accepted_oral') {
        result = { success: false, error: 'Solo los trabajos aceptados para ponencia oral pueden subir presentación.' };
      } else if (presentacionDeadlinePasada()) {
        result = { success: false, error: 'La fecha límite para subir la presentación ya pasó.' };
      } else if (!data.fileBase64 || !data.fileName) {
        result = { success: false, error: 'Falta el archivo de la presentación.' };
      } else {
        const ext = String(data.fileName).split('.').pop().toLowerCase();
        if (['pdf', 'pptx', 'ppt'].indexOf(ext) === -1) {
          result = { success: false, error: 'Solo se permiten archivos PDF o PPTX.' };
        } else {
          const mime = (ext === 'pptx' || ext === 'ppt')
            ? (MimeType.MICROSOFT_POWERPOINT || 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
            : MimeType.PDF;
          const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
          const bytes = Utilities.base64Decode(data.fileBase64);
          const nombreBase = String(work.short_id || work.id || 'trabajo').replace(/[^A-Za-z0-9._-]+/g, '_');
          const nombreArchivo = String(data.fileName).replace(/[\\/:*?"<>|]+/g, '_');
          const blob = Utilities.newBlob(bytes, mime, nombreBase + ' - Presentacion - ' + nombreArchivo);
          const file = folder.createFile(blob);
          let fileUrl;
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileUrl = file.getUrl();
          } catch (e) {
            fileUrl = 'https://drive.google.com/open?id=' + file.getId();
          }

          const ahora = new Date();
          const registro = {
            work_id: work.id,
            student_id: data.student_id,
            file_name: data.fileName,
            mime_type: mime,
            file_size: bytes.length,
            file_id: file.getId(),
            file_url: fileUrl,
            updated_at: ahora
          };
          const existing = getOralPresentationByWork_(db, work.id);
          if (existing) {
            updateRow(db, ORAL_PRESENTATIONS_SHEET, 'work_id', work.id, registro);
          } else {
            getOralPresentationsSheet_(db).appendRow([
              Utilities.getUuid(), registro.work_id, registro.student_id, registro.file_name,
              registro.mime_type, registro.file_size, registro.file_id, registro.file_url,
              ahora, ahora
            ]);
          }
          result = { success: true, fileUrl: fileUrl };
        }
      }
    }

    // --- Correos y horarios ---

    else if (data.action === 'notifyFinalResults') {
      assertAdmin(db, data.admin_user_id);
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const statusLabel = {
        'accepted_oral': 'Aceptado — Ponencia Oral',
        'accepted_poster': 'Aceptado — Cartel',
        'rejected': 'No seleccionado'
      };
      let sent = 0;
      works.forEach(w => {
        if (!statusLabel[w.status]) return;
        const student = users.find(u => u.id === w.student_id);
        if (!student || !student.email) return;
        const hora = String(w.horario || '').replace(/^'/, '');
        const msg = 'Dictamen: ' + statusLabel[w.status] +
          '\nLugar: ' + lugarDeTrabajo_(w) +
          '\nHora: ' + (hora || 'N/A') +
          '\n\nRetroalimentación:\n' + (w.feedback || 'N/A');
        try {
          MailApp.sendEmail(student.email, 'Resultado Congreso LABIQ', msg);
          sent++;
        } catch (e) { Logger.log('notifyFinalResults: ' + e.message); }
      });
      result = { success: true, count: sent };
    }

    else if (data.action === 'notifyEventReminder') {
      assertAdmin(db, data.admin_user_id);
      const works = getSheetData(db, 'works');
      const users = getSheetData(db, 'users');
      const modalidad = {
        'accepted_oral': 'PONENCIA ORAL',
        'accepted_poster': 'PRESENTACIÓN EN CARTEL'
      };
      const fechaEvento = escapeHtml_(obtenerFechaEvento());
      const deadline = leerClaveConfig('presentation_deadline', '');
      const avisoDeadline = deadline
        ? 'La fecha límite para subir la presentación es el ' + escapeHtml_(formatearFechaLimite(deadline)) + '.'
        : '';
      let sent = 0, skipped = 0;
      const errores = [];
      works.forEach(w => {
        if (!modalidad[w.status]) return;
        const student = users.find(u => u.id === w.student_id);
        if (!student || !student.email) { skipped++; return; }
        const titulo = escapeHtml_(w.title || '(sin título)');
        const avisoPresentacion = w.status === 'accepted_oral'
          ? '<p>La sección <strong>Presentación oral (Fase 2)</strong> está habilitada en la página para subir su archivo en <strong>PDF o PPTX</strong>. ' + avisoDeadline + '</p>'
          : '';
        const htmlBody = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2933;line-height:1.65;max-width:640px;margin:0 auto;">'
          + '<div style="background:#003D79;color:#fff;padding:24px;border-radius:12px 12px 0 0;">'
          + '<h1 style="margin:0;font-size:20px;">Congreso LABIQ</h1>'
          + '<p style="margin:8px 0 0;font-weight:600;">SU TRABAJO FUE SELECCIONADO</p></div>'
          + '<div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px;">'
          + '<p>Estimadas y estimados participantes:</p>'
          + '<p>Nos complace recordarles que su trabajo <strong>«' + titulo + '»</strong> fue seleccionado en la modalidad de <strong>' + modalidad[w.status] + '</strong>.</p>'
          + '<p><strong>Fecha del evento:</strong> ' + fechaEvento + '</p>'
          + '<p><strong>Lugar:</strong> ' + escapeHtml_(lugarDeTrabajo_(w)) + '</p>'
          + '<p><strong>Hora:</strong> ' + escapeHtml_(String(w.horario || '').replace(/^'/, '') || 'Por confirmar') + '</p>'
          + avisoPresentacion
          + '<p>Consulte los detalles en <a href="' + escapeHtml_(FRONTEND_URL) + '">la página del evento</a>.</p>'
          + '<p>Atentamente,<br><strong>Comité Organizador — Congreso LABIQ</strong></p></div></div>';
        try {
          MailApp.sendEmail({
            to: student.email,
            subject: 'Recordatorio: Congreso LABIQ — ' + fechaEvento,
            htmlBody: htmlBody
          });
          sent++;
        } catch (e) {
          errores.push({ work_id: w.id, email: student.email, error: e.message });
        }
      });
      result = { success: true, count: sent, skipped: skipped, errores: errores };
    }

    else if (data.action === 'notifyAgendaCorrection') {
      assertAdmin(db, data.admin_user_id);
      const soloFac = String(data.facultad == null ? '' : data.facultad).trim().toLowerCase();
      const liveAssigns = getSheetData(db, 'live_assignments');
      const users = getSheetData(db, 'users');
      const works = getSheetData(db, 'works');
      const conAsignaciones = {};
      liveAssigns.forEach(a => { conAsignaciones[String(a.evaluator_id)] = true; });
      const fechaEvento = escapeHtml_(obtenerFechaEvento());
      const contacto = leerClaveConfig('contacto_evento', '');
      let sent = 0, skipped = 0;
      const errores = [];
      users.filter(u => u.user_type === 'evaluator').forEach(ev => {
        if (soloFac && String(ev.facultad || '').trim().toLowerCase().indexOf(soloFac) === -1) return;
        if (!conAsignaciones[String(ev.id)] || !ev.email) { skipped++; return; }
        const tareas = liveAssigns.filter(a => String(a.evaluator_id) === String(ev.id));
        let filas = '';
        tareas.forEach(t => {
          const w = works.find(x => x.id === t.work_id);
          if (w) {
            filas += '<tr><td>' + escapeHtml_(String(w.horario || '').replace(/^'/, '') || 'N/A') + '</td>'
              + '<td>' + escapeHtml_(lugarDeTrabajo_(w)) + '</td>'
              + '<td><b>' + escapeHtml_(w.short_id) + '</b> — ' + escapeHtml_(w.title) + '</td></tr>';
          }
        });
        const htmlBody = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2933;line-height:1.65;max-width:640px;">'
          + '<h1 style="font-size:20px;color:#003D79;">Fe de erratas: agenda de evaluación</h1>'
          + '<p>Estimadas profesoras y profesores evaluadores:</p>'
          + '<p>Les escribimos para confirmar los lugares y horarios correctos de las presentaciones del evento (<strong>' + fechaEvento + '</strong>).</p>'
          + '<table border="1" style="border-collapse:collapse;width:100%;"><tr style="background:#0d6efd;color:#fff;"><th>Hora</th><th>Lugar</th><th>Trabajo</th></tr>' + filas + '</table>'
          + (contacto ? '<p>Dudas: ' + escapeHtml_(contacto) + '</p>' : '')
          + '<p>Atentamente,<br><strong>Comité Organizador — Congreso LABIQ</strong></p></div>';
        try {
          MailApp.sendEmail({
            to: ev.email,
            subject: 'Fe de erratas: agenda de evaluación — Congreso LABIQ',
            htmlBody: htmlBody
          });
          sent++;
        } catch (e) {
          errores.push({ evaluator_id: ev.id, email: ev.email, error: e.message });
        }
      });
      result = { success: true, count: sent, skipped: skipped, errores: errores, facultad: soloFac || 'TODAS' };
    }

    else if (data.action === 'assignSchedules') {
      assertAdmin(db, data.admin_user_id);
      const wSheet = db.getSheetByName('works');
      const headers = wSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const audIdx = headers.indexOf('auditorio');
      const horIdx = headers.indexOf('horario');
      if (audIdx === -1 || horIdx === -1) throw new Error('La hoja works no tiene las columnas auditorio/horario.');

      const works = getSheetData(db, 'works');
      const rowIndexById = {};
      works.forEach((w, i) => { rowIndexById[String(w.id)] = i + 2; });
      const orales = works.filter(w => w.status === 'accepted_oral');
      let oralesAsignados = 0;

      if (leerClaveConfig('encuentroiq_mode', '0') === '1') {
        // Modo Encuentro: auditorio único, conservando horarios válidos y sin empalmes.
        const orden = { FQ: 0, FC: 1, FZ: 2 };
        orales.sort((a, b) =>
          ((orden[facultadKey(a.facultad)] === undefined ? 99 : orden[facultadKey(a.facultad)]) -
           (orden[facultadKey(b.facultad)] === undefined ? 99 : orden[facultadKey(b.facultad)])) ||
          String(a.short_id || '').localeCompare(String(b.short_id || '')));
        const ocupados = {};
        let cursor = 0;
        const siguienteLibre = () => {
          while (ocupados[slotHora(cursor)]) cursor++;
          const t = slotHora(cursor);
          ocupados[t] = true;
          cursor++;
          return t;
        };
        orales.forEach(w => {
          let hora = normalizarHora(w.horario);
          if (!hora || ocupados[hora]) hora = siguienteLibre();
          else ocupados[hora] = true;
          const r = rowIndexById[String(w.id)];
          wSheet.getRange(r, audIdx + 1).setValue(AUDITORIO_UNICO);
          wSheet.getRange(r, horIdx + 1).setNumberFormat('@').setValue(hora);
          oralesAsignados++;
        });
      } else {
        // Modo Congreso: se mantiene el reparto en UMIEZ / Auditorio Principal por ciclo.
        const detalles = orales.map(w => ({
          id: w.id,
          semester: w.semester,
          avgScore: Number(w.final_score || w.live_score || 0)
        }));
        asignarSalasFESZ(detalles);
        detalles.forEach(d => {
          const r = rowIndexById[String(d.id)];
          wSheet.getRange(r, audIdx + 1).setValue(d.auditorio || '');
          wSheet.getRange(r, horIdx + 1).setNumberFormat('@').setValue(d.horario || '');
          oralesAsignados++;
        });
      }

      let carteles = 0;
      works.filter(w => w.status === 'accepted_poster').forEach(w => {
        const r = rowIndexById[String(w.id)];
        wSheet.getRange(r, audIdx + 1).setValue(CARTEL_LUGAR);
        wSheet.getRange(r, horIdx + 1).setNumberFormat('@').setValue(CARTEL_HORARIO);
        carteles++;
      });
      SpreadsheetApp.flush();
      result = { success: true, orales: oralesAsignados, carteles: carteles, auditorio: AUDITORIO_UNICO };
    }

    else if (data.action === 'importFesZaragoza') {
      assertAdmin(db, data.admin_user_id);
      const worksUrl = resolverUrlCsv(data.works_csv_url);
      const usersUrl = data.users_csv_url ? resolverUrlCsv(data.users_csv_url) : '';
      if (!worksUrl) throw new Error('Falta la URL de la hoja de trabajos.');

      const worksRows = parseCsv(fetchCsv_(worksUrl));
      if (!worksRows.length) throw new Error('La hoja de trabajos está vacía o no se pudo leer.');
      const usersRows = usersUrl ? parseCsv(fetchCsv_(usersUrl)) : [];

      const srcUsers = {};
      usersRows.forEach(u => {
        const id = String(u.id || '').trim();
        const email = String(u.email || '').trim().toLowerCase();
        const name = String(u.name || '').trim().toLowerCase();
        if (id) srcUsers[id] = u;
        if (email) srcUsers[email] = u;
        if (name) srcUsers['name:' + name] = u;
      });

      const uSheet = db.getSheetByName('users');
      const uHeaders = uSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const uCol = k => uHeaders.indexOf(k);
      const usersByEmail = {};
      getSheetData(db, 'users').forEach(u => { usersByEmail[String(u.email || '').trim().toLowerCase()] = u; });

      const wSheet = db.getSheetByName('works');
      const wHeaders = wSheet.getDataRange().getValues()[0].map(h => String(h).trim().toLowerCase());
      const wCol = k => wHeaders.indexOf(k);

      const existingWorks = getSheetData(db, 'works');
      const refKey = (title, studentId) => String(title || '').trim().toLowerCase() + '|' + String(studentId || '').trim().toLowerCase();
      const existingRefs = {};
      existingWorks.forEach(w => { existingRefs[refKey(w.title, w.student_id)] = true; });
      let fzCount = existingWorks.filter(w => String(w.facultad || '').toLowerCase().indexOf('zaragoza') > -1).length;

      let imported = 0, alumnosCreados = 0, omitidos = 0;
      const errores = [];
      worksRows.forEach((row, n) => {
        try {
          const title = String(row.title || '').trim();
          if (!title) { omitidos++; return; }
          const srcStudentId = String(row.student_id || '').trim();
          const srcEmail = String(row.student_email || row.email || '').trim().toLowerCase();
          const srcName = String(row.student_name || row.nombre || '').trim();
          const src = srcUsers[srcStudentId] || (srcEmail ? srcUsers[srcEmail] : null) ||
            (srcName ? srcUsers['name:' + srcName.toLowerCase()] : null) || {};
          const email = String(src.email || srcEmail || '').trim().toLowerCase();
          const name = String(src.name || srcName || '').trim() || 'Estudiante FES Zaragoza';
          const rawPassword = String((src.password != null && src.password !== '') ? src.password : (row.password || '')).trim();

          let student = email ? usersByEmail[email] : null;
          if (!student && email) {
            const uid = Utilities.getUuid();
            const uRow = new Array(uHeaders.length).fill('');
            if (uCol('id') > -1) uRow[uCol('id')] = uid;
            if (uCol('email') > -1) uRow[uCol('email')] = email;
            if (uCol('password') > -1) uRow[uCol('password')] = rawPassword ? ("'" + rawPassword.replace(/^'/, '')) : '';
            if (uCol('name') > -1) uRow[uCol('name')] = name;
            if (uCol('user_type') > -1) uRow[uCol('user_type')] = 'student';
            if (uCol('facultad') > -1) uRow[uCol('facultad')] = 'FES Zaragoza';
            if (uCol('timestamp') > -1) uRow[uCol('timestamp')] = new Date();
            uSheet.appendRow(uRow);
            student = { id: uid, email: email, name: name };
            usersByEmail[email] = student;
            alumnosCreados++;
          }

          const studentId = student ? student.id : (srcStudentId || ('fz-' + slug_(title)));
          const key = refKey(title, studentId);
          if (existingRefs[key]) { omitidos++; return; }

          const status = String(row.status || 'pending').trim();
          const modality = String(row.modality || (
            status === 'accepted_oral' ? 'Oral' :
              status === 'accepted_poster' ? 'Cartel' : 'Pendiente')).trim();
          const wRow = new Array(wHeaders.length).fill('');
          const setW = (k, v) => { const idx = wCol(k); if (idx > -1) wRow[idx] = v; };
          setW('id', Utilities.getUuid());
          setW('short_id', 'FZ' + String(++fzCount).padStart(2, '0'));
          setW('student_id', studentId);
          setW('title', title);
          setW('abstract', String(row.abstract || row.resumen || '').trim());
          setW('modality', modality);
          setW('file_url', String(row.file_url || '').trim());
          setW('file_id', String(row.file_id || '').trim());
          setW('status', status);
          setW('submitted_at', parseFechaImport_(row.submitted_at));
          setW('semester', String(row.semester || '').trim());
          setW('team_members', String(row.team_members || '').trim());
          setW('grupo', String(row.grupo || '').trim());
          setW('profesor_cargo', String(row.profesor_cargo || '').trim());
          setW('final_score', row.final_score !== undefined && row.final_score !== '' ? Number(row.final_score) : '');
          setW('feedback', String(row.feedback || '').trim());
          setW('auditorio', '');
          setW('horario', '');
          setW('facultad', 'FES Zaragoza');
          wSheet.appendRow(wRow);
          existingRefs[key] = true;
          imported++;
        } catch (err) {
          errores.push('Fila ' + (n + 2) + ': ' + err.message);
        }
      });
      SpreadsheetApp.flush();
      result = { success: true, imported: imported, alumnosCreados: alumnosCreados, omitidos: omitidos, errores: errores };
    }

    else if (data.action === 'generatePremiacionMasiva') {
      assertAdmin(db, data.admin_user_id);
      const count = generarPremiacionMasiva(db);
      result = { success: true, count: count };
    }

    else {
      result = { success: false, error: 'Acción no reconocida.' };
    }

  } catch (error) {
    result = { success: false, error: error.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// FUNCIONES DE RECONOCIMIENTOS EDITABLES (12 GANADORES)
// ============================================================

// Genera reconocimientos editables + PDF individual + PDF global.
// Modo Congreso: Top 2 por ciclo (comportamiento original).
// Modo Encuentro: Top 3 oral general + Top 3 cartel por facultad.
// Se puede llamar sin argumentos desde el editor de Apps Script (compatibilidad).
function generarPremiacionMasiva(db) {
  db = db || SpreadsheetApp.getActiveSpreadsheet();
  const listaGanadores = obtenerGanadoresConLugar(db);
  if (listaGanadores.length === 0) {
    Logger.log('No hay ganadores con puntaje para generar reconocimientos.');
    return 0;
  }
  const folderId = CERTIFICATES_FOLDER_ID;
  listaGanadores.forEach(g => {
    const editable = crearSlideFile(g.w, getAsesores(g.w) || 'No asignado', g.l, folderId);
    exportarSlidePdf(editable, 'PDF: ' + g.l + ' - ' + g.w.short_id, folderId);
  });
  let globalPdf = null;
  try {
    globalPdf = generarPdfGlobal(listaGanadores, folderId);
  } catch (e) {
    // El PDF global requiere el servicio avanzado Slides API; los PDF individuales ya están listos.
    Logger.log('No se pudo generar el PDF global: ' + e.toString());
  }
  const correo = leerClaveConfig('awards_email', '');
  if (correo) {
    try {
      const mail = {
        to: correo,
        subject: 'Reconocimientos Congreso LABIQ (PDF global)',
        body: globalPdf
          ? 'Se adjunta el PDF con todos los reconocimientos generados.'
          : 'Se generaron los reconocimientos individuales. El PDF global no estuvo disponible.'
      };
      if (globalPdf) mail.attachments = [globalPdf];
      MailApp.sendEmail(mail);
    } catch (e) {
      Logger.log('No se pudo enviar el PDF global por correo: ' + e.toString());
    }
  }
  Logger.log(listaGanadores.length + ' editables, ' + listaGanadores.length + ' PDF individuales y 1 PDF global generados.');
  return listaGanadores.length;
}

// Devuelve [{ w, l }] con la etiqueta del lugar según el modo de evento.
function obtenerGanadoresConLugar(db) {
  const works = getSheetData(db, 'works');
  const users = getSheetData(db, 'users');
  const scored = works
    .filter(w => w.live_score !== '' && w.live_score !== null && w.live_score !== undefined && Number(w.live_score) > 0)
    .map(w => ({ ...w, student_name: (users.find(u => u.id === w.student_id) || {}).name || '' }));
  const ordinal = ['1er', '2do', '3er'];
  const lista = [];

  if (leerClaveConfig('encuentroiq_mode', '0') === '1') {
    scored.filter(w => w.status === 'accepted_oral')
      .sort((a, b) => Number(b.live_score) - Number(a.live_score))
      .slice(0, 3)
      .forEach((w, i) => lista.push({ w: w, l: (ordinal[i] || (i + 1) + 'º') + ' Lugar Ponencia Oral' }));

    const porFacultad = {};
    scored.filter(w => w.status === 'accepted_poster').forEach(w => {
      const key = facultadKey(w.facultad) || String(w.facultad || 'Sin Facultad');
      (porFacultad[key] = porFacultad[key] || []).push(w);
    });
    Object.keys(porFacultad).sort().forEach(key => {
      porFacultad[key].sort((a, b) => Number(b.live_score) - Number(a.live_score)).slice(0, 3)
        .forEach((w, i) => {
          const copia = { ...w, facultad: w.facultad || key };
          lista.push({ w: copia, l: (ordinal[i] || (i + 1) + 'º') + ' Lugar Cartel — ' + key });
        });
    });
    return lista;
  }

  const ciclos = {
    'Básico': ['1er Semestre', '2do Semestre', '3er Semestre'],
    'Intermedio': ['4to Semestre', '5to Semestre', '6to Semestre'],
    'Terminal': ['7mo Semestre', '8vo Semestre', '9no Semestre']
  };
  Object.keys(ciclos).forEach(nombreCiclo => {
    const delCiclo = scored.filter(w => ciclos[nombreCiclo].indexOf(w.semester) > -1);
    ['accepted_oral', 'accepted_poster'].forEach(status => {
      const etiqueta = status === 'accepted_oral' ? 'Ponencia' : 'Cartel';
      delCiclo.filter(w => w.status === status)
        .sort((a, b) => Number(b.live_score) - Number(a.live_score)).slice(0, 2)
        .forEach((w, i) => lista.push({ w: w, l: (i + 1) + 'er Lugar ' + etiqueta + ' - Ciclo ' + nombreCiclo }));
    });
  });
  return lista;
}

function lugarDeGanador_(db, workId) {
  const ganador = obtenerGanadoresConLugar(db).find(g => String(g.w.id) === String(workId));
  return ganador ? ganador.l : 'Participación';
}

function getAsesores(work) {
  if (!work) return '';
  return String(work.asesores || work.profesor_cargo || '');
}

function normalizarNombre_(nombre) {
  return String(nombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim().toUpperCase();
}

function formatearAsesores(profesor) {
  const lista = String(profesor || '').split(',').map(s => s.trim()).filter(Boolean);
  return lista.length ? lista.join('\n') : 'No asignado';
}

function formatearIntegrantes(work) {
  const lista = String((work && work.team_members) || '').split(',').map(s => s.trim()).filter(Boolean);
  const autor = String((work && work.student_name) || '').trim();
  const autorValido = autor && !/^(N\/A|DESCONOCIDO|DESCONOCIDA|NO ASIGNADO)$/i.test(autor);
  if (autorValido && !lista.some(n => normalizarNombre_(n) === normalizarNombre_(autor))) lista.unshift(autor);
  return lista.length ? lista.join(', ') : 'No asignado';
}

function fechaActualTexto() {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  return hoy.getDate() + ' de ' + meses[hoy.getMonth()] + ' de ' + hoy.getFullYear();
}

// Mantiene la firma original (3 argumentos) y añade carpeta opcional.
function crearSlideEditable(work, profesor, lugarTexto, folderId) {
  return crearSlideFile(work, profesor, lugarTexto, folderId).getUrl();
}

function crearSlideFile(work, profesor, lugarTexto, folderId) {
  const folder = DriveApp.getFolderById(folderId || CERTIFICATES_FOLDER_ID);
  const copy = DriveApp.getFileById(TEMPLATE_ID).makeCopy('EDITABLE: ' + lugarTexto + ' - ' + work.short_id, folder);
  const pres = SlidesApp.openById(copy.getId());
  pres.replaceAllText('{{INTEGRANTES}}', formatearIntegrantes(work));
  pres.replaceAllText('{{TITULO}}', String(work.title || 'Sin título'));
  pres.replaceAllText('{{PROFESOR}}', formatearAsesores(profesor));
  pres.replaceAllText('{{MODALIDAD}}', work.status === 'accepted_oral' ? 'Ponencia Oral' : 'Cartel');
  pres.replaceAllText('{{LUGAR}}', String(lugarTexto || 'Participación'));
  pres.replaceAllText('{{FECHA}}', fechaActualTexto());
  pres.saveAndClose();
  return copy;
}

function exportarSlidePdf(file, nombre, folderId) {
  const folder = DriveApp.getFolderById(folderId || CERTIFICATES_FOLDER_ID);
  const blob = file.getAs(MimeType.PDF);
  blob.setName(nombre + '.pdf');
  folder.createFile(blob);
  return blob;
}

// Requiere el servicio avanzado Slides API habilitado en el proyecto.
function generarPdfGlobal(lista, folderId) {
  const folder = DriveApp.getFolderById(folderId || CERTIFICATES_FOLDER_ID);
  const nombreBase = 'GLOBAL: Reconocimientos Congreso LABIQ - ' + fechaActualTexto();
  const master = DriveApp.getFileById(TEMPLATE_ID).makeCopy(nombreBase, folder);
  const masterId = master.getId();
  const originalId = SlidesApp.openById(masterId).getSlides()[0].getObjectId();
  const pageIds = [originalId];
  for (let i = 1; i < lista.length; i++) pageIds.push('slide_' + (i + 1));

  const requests = [];
  for (let i = 1; i < lista.length; i++) {
    requests.push({
      duplicateObject: {
        objectId: pageIds[i - 1],
        objectIds: { [pageIds[i - 1]]: pageIds[i] }
      }
    });
  }
  lista.forEach((g, i) => {
    const campos = {
      '{{INTEGRANTES}}': formatearIntegrantes(g.w),
      '{{TITULO}}': String(g.w.title || 'Sin título'),
      '{{PROFESOR}}': formatearAsesores(getAsesores(g.w) || 'No asignado'),
      '{{MODALIDAD}}': g.w.status === 'accepted_oral' ? 'Ponencia Oral' : 'Cartel',
      '{{LUGAR}}': g.l,
      '{{FECHA}}': fechaActualTexto()
    };
    Object.keys(campos).forEach(find => {
      requests.push({
        replaceAllText: {
          containsText: { text: find, matchCase: true },
          replaceText: campos[find],
          pageObjectIds: [pageIds[i]]
        }
      });
    });
  });
  Slides.Presentations.batchUpdate({ requests: requests }, masterId);
  const blob = master.getAs(MimeType.PDF);
  blob.setName(nombreBase + '.pdf');
  folder.createFile(blob);
  return blob;
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

// Una asignación es "manual" (dictamen/descalificación a mano) cuando no apunta
// a un evaluador real; suelen usar ids como man-01, man-02, etc.
function esAsignacionManual(a, users) {
  const evId = String(a.evaluator_id == null ? '' : a.evaluator_id);
  if (users.some(u => String(u.id) === evId)) return false;
  return /^man/i.test(evId) || /^man/i.test(String(a.id == null ? '' : a.id));
}

// Busca la evaluación correspondiente a una asignación. Para las asignaciones
// manuales tolera que el id de la evaluación viva en el campo id (man-01) o que
// su evaluator_id no corresponda a ningún usuario real.
function buscarEvaluacionDeAsignacion(a, evaluations, users) {
  let doc = evaluations.find(e =>
    String(e.work_id) === String(a.work_id) && String(e.evaluator_id) === String(a.evaluator_id));
  if (doc) return doc;

  doc = evaluations.find(e =>
    String(e.work_id) === String(a.work_id) && String(e.evaluator_id) === String(a.id));
  if (doc) return doc;

  if (esAsignacionManual(a, users)) {
    const idsReales = users.map(u => String(u.id));
    doc = evaluations.find(e =>
      String(e.work_id) === String(a.work_id) && idsReales.indexOf(String(e.evaluator_id)) === -1);
    if (doc) return doc;
  }
  return null;
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
// DICTAMINACIÓN (usada por batchFinalize, previewFinalize y applyFinalize)
// ============================================================

const MAPPING_CICLOS = { "1er Semestre": "Básico", "2do Semestre": "Básico", "3er Semestre": "Básico", "4to Semestre": "Intermedio", "5to Semestre": "Intermedio", "6to Semestre": "Intermedio", "7mo Semestre": "Terminal", "8vo Semestre": "Terminal", "9no Semestre": "Terminal" };

// Calcula la propuesta de dictamen SIN escribir nada ni notificar.
// Modo Encuentro: ranking global (sin semestres/ciclos). Top 2 -> ponencia, siguientes 15 -> cartel, resto -> rechazado.
// Modo FESZ: rechaza por reglas y Top 2 por semestre -> ponencia (UMIEZ / Auditorio Principal), resto -> cartel.
function calcularDictamenBackend(db) {
  const works = getSheetData(db, 'works');
  const evals = getSheetData(db, 'evaluations');
  const users = getSheetData(db, 'users');
  const isEncuentro = leerClaveConfig('encuentroiq_mode', '0') === '1';
  const minEvals = isEncuentro ? 1 : 2;

  const resultados = [];
  works.forEach((w, idx) => {
    const st = String(w.status || '');
    if (st === 'rejected' || st === 'accepted_oral' || st === 'accepted_poster') return;
    const wEvals = evals.filter(e => e.work_id === w.id);
    if (wEvals.length < minEvals) return;

    const avgTotal = parseFloat((wEvals.reduce((s, c) => s + Number(c.total_score || 0), 0) / wEvals.length).toFixed(1));
    const avgPert = parseFloat((wEvals.reduce((s, c) => s + Number(c.score_pertinencia || 0), 0) / wEvals.length).toFixed(1));
    const algunaNoCumple = wEvals.some(e => String(e.cumple_extension || '').toLowerCase() === 'no');
    const feedback = wEvals.map((e, i) => `Juez ${i + 1}: ${e.comentarios}`).join('\n\n');
    const student = users.find(u => u.id === w.student_id) || {};

    resultados.push({
      work_id: w.id,
      rowIndex: idx + 2,
      short_id: w.short_id,
      title: w.title,
      student_name: student.name || '',
      semester: w.semester,
      avgScore: avgTotal,
      avgPertinencia: avgPert,
      evaluaciones: wEvals.length,
      cumpleExtension: !algunaNoCumple,
      feedback: feedback,
      defaultStatus: '',
      auditorio: '',
      horario: ''
    });
  });

  if (isEncuentro) {
    // Ranking puro global: sin filtros por puntaje, extensión ni semestre.
    resultados.sort((a, b) => b.avgScore - a.avgScore);
    resultados.forEach((r, i) => {
      if (i < 2) r.defaultStatus = 'accepted_oral';
      else if (i < 17) r.defaultStatus = 'accepted_poster';
      else r.defaultStatus = 'rejected';
    });
  } else {
    const porSemestre = {};
    resultados.forEach(r => { (porSemestre[r.semester] = porSemestre[r.semester] || []).push(r); });
    Object.keys(porSemestre).forEach(sem => {
      const grupo = porSemestre[sem].sort((a, b) => b.avgScore - a.avgScore);
      grupo.forEach((r, rank) => {
        const rechazar = !r.cumpleExtension || r.avgScore < 60 || r.avgPertinencia < 6;
        if (rechazar) r.defaultStatus = 'rejected';
        else if (rank === 0 || rank === 1) r.defaultStatus = 'accepted_oral';
        else r.defaultStatus = 'accepted_poster';
      });
    });
    asignarSalasFESZ(resultados.filter(r => r.defaultStatus === 'accepted_oral'));
  }

  return { mode: isEncuentro ? 'encuentro' : 'fesz', works: resultados };
}

// Asigna sala y horario a las ponencias de FESZ (intercalando ciclos, 20 min por turno desde las 10:00).
function asignarSalasFESZ(orales) {
  if (!orales || !orales.length) return;
  const salas = { "UMIEZ": { "Básico": [], "Intermedio": [], "Terminal": [] }, "Auditorio Principal": { "Básico": [], "Intermedio": [], "Terminal": [] } };

  const porSemestre = {};
  orales.forEach(d => { (porSemestre[d.semester] = porSemestre[d.semester] || []).push(d); });
  Object.keys(porSemestre).forEach(sem => {
    const grupo = porSemestre[sem].sort((a, b) => b.avgScore - a.avgScore);
    const ciclo = MAPPING_CICLOS[sem] || "Básico";
    grupo.forEach((d, rank) => {
      d.auditorio = (rank % 2 === 0) ? 'UMIEZ' : 'Auditorio Principal';
      salas[d.auditorio][ciclo].push(d);
    });
  });

  const hInicio = 10, mTurno = 20;
  ["UMIEZ", "Auditorio Principal"].forEach(sala => {
    const b = shuffleArray(salas[sala]["Básico"]), i = shuffleArray(salas[sala]["Intermedio"]), t = shuffleArray(salas[sala]["Terminal"]);
    const slots = Math.max(b.length, i.length, t.length);
    let res = [];
    for (let j = 0; j < slots; j++) {
      let sec = [];
      if (b[j]) sec.push(b[j]);
      if (i[j]) sec.push(i[j]);
      if (t[j]) sec.push(t[j]);
      res = res.concat(shuffleArray(sec));
    }
    res.forEach((d, idx) => {
      const totalMins = idx * mTurno;
      d.horario = (hInicio + Math.floor(totalMins / 60)) + ":" + (totalMins % 60).toString().padStart(2, '0');
    });
  });
}

// Escribe el dictamen final (con los ajustes manuales del admin) y notifica por correo.
// decisiones: [{ work_id, status }]
function aplicarDictamenBackend(db, decisiones) {
  const wSheet = db.getSheetByName('works');
  if (!wSheet) return 0;
  const h = wSheet.getDataRange().getValues()[0].map(x => String(x).trim().toLowerCase());
  const works = getSheetData(db, 'works');
  const evals = getSheetData(db, 'evaluations');
  const users = getSheetData(db, 'users');
  const isEncuentro = leerClaveConfig('encuentroiq_mode', '0') === '1';

  const detalles = [];
  (decisiones || []).forEach(d => {
    const work = works.find(w => w.id === d.work_id);
    if (!work) return;
    const idx = works.indexOf(work);
    const wEvals = evals.filter(e => e.work_id === work.id);
    const avgTotal = wEvals.length ? parseFloat((wEvals.reduce((s, c) => s + Number(c.total_score || 0), 0) / wEvals.length).toFixed(1)) : 0;
    const feedback = wEvals.map((e, i) => `Juez ${i + 1}: ${e.comentarios}`).join('\n\n');
    detalles.push({
      rowIndex: idx + 2,
      work: work,
      status: d.status,
      avgScore: avgTotal,
      feedback: feedback,
      semester: work.semester,
      auditorio: '',
      horario: ''
    });
  });

  // En Encuentro solo hay una sede y el reparto de horarios se hace en otra plataforma: no se asignan sala ni hora.
  if (!isEncuentro) {
    asignarSalasFESZ(detalles.filter(d => d.status === 'accepted_oral'));
  }

  detalles.forEach(d => {
    const r = d.rowIndex;
    if (h.indexOf('status') > -1) wSheet.getRange(r, h.indexOf('status') + 1).setValue(d.status);
    if (h.indexOf('final_score') > -1) wSheet.getRange(r, h.indexOf('final_score') + 1).setValue(d.avgScore);
    if (h.indexOf('feedback') > -1) wSheet.getRange(r, h.indexOf('feedback') + 1).setValue(d.feedback);
    if (h.indexOf('modality') > -1) wSheet.getRange(r, h.indexOf('modality') + 1).setValue(d.status === 'accepted_oral' ? 'Ponencia' : d.status === 'accepted_poster' ? 'Cartel' : '');
    if (h.indexOf('auditorio') > -1) wSheet.getRange(r, h.indexOf('auditorio') + 1).setValue(d.auditorio || '');
    if (h.indexOf('horario') > -1) {
      const horCell = wSheet.getRange(r, h.indexOf('horario') + 1);
      horCell.setNumberFormat('@').setValue(d.horario || '');
    }

    const student = users.find(u => u.id === d.work.student_id);
    if (student && student.email) {
      try {
        if (isEncuentro) {
          // Correo general sin calificación ni retroalimentación, con formato (negritas) y respaldo en texto plano.
          const idRaw = String(d.work.short_id || '').trim();
          const idSuffix = idRaw ? ' — ID ' + idRaw : '';
          const asunto = 'Resultado del 9.º Encuentro Estudiantil de Ingeniería Química' + idSuffix;
          const esAceptado = d.status === 'accepted_oral' || d.status === 'accepted_poster';
          const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const titulo = esc(d.work.title);
          const workId = esc(d.work.short_id);
          const cierre = 'Comité Organizador del 9.º Encuentro Estudiantil de Ingeniería Química';
          const estilo = 'font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#222; line-height:1.5;';
          let msg, html;
          if (esAceptado) {
            const modalidad = d.status === 'accepted_oral' ? 'Ponencia Oral' : 'Cartel';
            msg = `Estimadas y estimados participantes:\n\n`
              + `Nos complace informarles que, tras el proceso de evaluación, su trabajo "${d.work.title || ''}" (ID ${d.work.short_id || ''}) fue seleccionado para participar en el 9.º Encuentro Estudiantil de Ingeniería Química.\n\n`
              + `Modalidad en la que fue aceptado: ${modalidad} (ID ${d.work.short_id || 'S/N'})\n\n`
              + `La evaluación de su trabajo fue realizada por varios académicos, quienes asignaron puntuaciones de forma individual conforme a los criterios establecidos. Con base en estos resultados, su trabajo se encuentra entre los 17 con mayor puntaje seleccionados, de acuerdo con el cupo disponible para esta edición.\n\n`
              + `En los próximos días les enviaremos el horario que corresponde a su trabajo, junto con la información logística para su presentación. Les pedimos estar atentos a este mismo correo.\n\n`
              + `Agradecemos su participación, su esfuerzo académico y el compromiso de las y los estudiantes y asesores, y les damos la bienvenida a esta edición del Encuentro.\n\n`
              + `Atentamente,\n${cierre}`;
            html = `<div style="${estilo}">`
              + `<p>Estimadas y estimados participantes:</p>`
              + `<p>Nos complace informarles que, tras el proceso de evaluación, su trabajo <strong>«${titulo}»</strong> (ID <strong>${workId}</strong>) fue <strong>seleccionado</strong> para participar en el <strong>9.º Encuentro Estudiantil de Ingeniería Química</strong>.</p>`
              + `<p><strong>Modalidad en la que fue aceptado: ${modalidad}</strong> (ID <strong>${workId}</strong>)</p>`
              + `<p>La evaluación de su trabajo fue realizada por varios académicos, quienes asignaron puntuaciones de forma individual conforme a los criterios establecidos. Con base en estos resultados, su trabajo se encuentra entre los <strong>17 con mayor puntaje</strong> seleccionados, de acuerdo con el cupo disponible para esta edición.</p>`
              + `<p>En los próximos días les enviaremos <strong>el horario que corresponde a su trabajo</strong>, junto con la información logística para su presentación. Les pedimos estar atentos a este mismo correo.</p>`
              + `<p>Agradecemos su participación, su esfuerzo académico y el compromiso de las y los estudiantes y asesores, y les damos la bienvenida a esta edición del Encuentro.</p>`
              + `<p>Atentamente,<br><strong>${cierre}</strong></p>`
              + `</div>`;
          } else {
            msg = `Reciban nuestro reconocimiento y un cordial saludo en este proceso de preselección.\n\n`
              + `Estimadas y estimados participantes:\n\n`
              + `Les informamos que, tras el proceso de evaluación, su trabajo no fue seleccionado para participar en el 9.º Encuentro Estudiantil de Ingeniería Química.\n\n`
              + `La evaluación de su trabajo fue realizada por varios académicos, quienes asignaron puntuaciones de forma individual conforme a los criterios establecidos. Con base en los resultados, les comunicamos que se seleccionaron los 17 trabajos con mayor puntaje, de acuerdo con el cupo disponible para esta edición.\n\n`
              + `Esta decisión de ninguna manera demerita la calidad, el esfuerzo académico ni la relevancia de su propuesta. Reconocemos, valoramos y agradecemos la dedicación y el compromiso de las y los estudiantes, así como de los asesores, por su interés en contribuir al intercambio de conocimientos en Ingeniería Química.\n\n`
              + `Agradecemos sinceramente su participación y les invitamos a continuar fortaleciendo sus proyectos y a aprovechar futuras oportunidades para compartir sus trabajos.\n\n`
              + `Atentamente,\n${cierre}`;
            html = `<div style="${estilo}">`
              + `<p>Reciban nuestro reconocimiento y un cordial saludo en este proceso de preselección.</p>`
              + `<p>Estimadas y estimados participantes:</p>`
              + `<p>Les informamos que, tras el proceso de evaluación, su trabajo <strong>no fue seleccionado</strong> para participar en el <strong>9.º Encuentro Estudiantil de Ingeniería Química</strong>.</p>`
              + `<p>La evaluación de su trabajo fue realizada por varios académicos, quienes asignaron puntuaciones de forma individual conforme a los criterios establecidos. Con base en los resultados, les comunicamos que se seleccionaron los <strong>17 trabajos con mayor puntaje</strong>, de acuerdo con el cupo disponible para esta edición.</p>`
              + `<p>Esta decisión de ninguna manera demerita la <strong>calidad, el esfuerzo académico ni la relevancia de su propuesta</strong>. Reconocemos, valoramos y agradecemos la dedicación y el compromiso de las y los estudiantes, así como de los asesores, por su interés en contribuir al intercambio de conocimientos en Ingeniería Química.</p>`
              + `<p>Agradecemos sinceramente su participación y les invitamos a continuar fortaleciendo sus proyectos y a aprovechar futuras oportunidades para compartir sus trabajos.</p>`
              + `<p>Atentamente,<br><strong>${cierre}</strong></p>`
              + `</div>`;
          }
          MailApp.sendEmail({ to: student.email, subject: asunto, body: msg, htmlBody: html });
        } else {
          const etiqueta = d.status === 'accepted_oral' ? 'ACEPTADO - Ponencia Oral'
            : d.status === 'accepted_poster' ? 'ACEPTADO - Cartel' : 'NO ACEPTADO';
          let msg = `Resultado del dictamen: ${etiqueta}\n`;
          if (d.auditorio) msg += `Lugar: ${d.auditorio}\n`;
          if (d.horario) msg += `Hora: ${d.horario}\n`;
          msg += `\nRetroalimentación:\n${d.feedback}`;
          MailApp.sendEmail(student.email, "Resultado Congreso LABIQ", msg);
        }
      } catch (e) { }
    }
  });

  return detalles.length;
}

// ============================================================
// NOTIFICACIÓN AL PROFESOR AL REGISTRAR UN TRABAJO
// ============================================================

function notificarProfesorEnvioTrabajo(info) {
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const valor = (v) => {
    const s = String(v == null ? '' : v).trim();
    return s || 'No indicado';
  };
  const fecha = Utilities.formatDate(info.submittedAt || new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

  const campos = [
    ['ID del trabajo', valor(info.shortId)],
    ['Título', valor(info.title)],
    ['Semestre', valor(info.semester)],
    ['Grupo', valor(info.group)],
    ['Facultad', valor(info.facultad)],
    ['Tipo de proyecto', valor(info.projectType)],
    ['Profesor a cargo', valor(info.professor)],
    ['Asesores', valor(info.advisors)],
    ['Integrantes del equipo', valor(info.teamMembers)],
    ['Palabras clave / resumen', valor(info.abstract)],
    ['Registrado por', valor(info.studentName)],
    ['Correo del estudiante', valor(info.studentEmail)],
    ['Fecha de envío', fecha]
  ];

  const texto = campos.map(([k, v]) => `${k}: ${v}`).join('\n');
  const body = `Estimado/a ${valor(info.professor)}:\n\n`
    + `Se ha registrado un nuevo trabajo en el Congreso Estudiantil de Laboratorios de Ingeniería Química (Congreso LABIQ) en el que apareces como profesor/asesor responsable.\n\n`
    + `Datos del trabajo:\n${texto}\n\n`
    + `Puedes ver el trabajo (PDF) en: ${valor(info.fileUrl)}\n\n`
    + `Portal del Congreso: ${FRONTEND_URL}\n\n`
    + `Atentamente,\nSistema Congreso LABIQ`;

  const filas = campos.map(([k, v]) => `<tr><th style="text-align:left;padding:6px 10px;background:#f2f4f7;">${esc(k)}</th><td style="padding:6px 10px;">${esc(v)}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.5;">`
    + `<p>Estimado/a <strong>${esc(valor(info.professor))}</strong>:</p>`
    + `<p>Se ha registrado un nuevo trabajo en el <strong>Congreso Estudiantil de Laboratorios de Ingeniería Química</strong> (Congreso LABIQ) en el que apareces como profesor/asesor responsable.</p>`
    + `<table style="border-collapse:collapse;width:100%;border:1px solid #d0d5dd;">${filas}</table>`
    + `<p><strong>Ver trabajo (PDF):</strong> <a href="${esc(valor(info.fileUrl))}">${esc(valor(info.fileUrl))}</a></p>`
    + `<p><strong>Portal del Congreso:</strong> <a href="${esc(FRONTEND_URL)}">${esc(FRONTEND_URL)}</a></p>`
    + `<p>Atentamente,<br><strong>Sistema Congreso LABIQ</strong></p>`
    + `</div>`;

  MailApp.sendEmail({
    to: info.profesorEmail,
    subject: `Nuevo trabajo registrado — Congreso LABIQ — ID ${valor(info.shortId)}`,
    body: body,
    htmlBody: html
  });
}

// ============================================================
// VALIDACIÓN DE PERMISOS (server-side)
// ============================================================

function getUserById(db, userId) {
  if (!userId) return null;
  return getSheetData(db, 'users').find(x => String(x.id) === String(userId)) || null;
}

function assertAdmin(db, userId) {
  const u = getUserById(db, userId);
  if (!u) throw new Error('No autenticado: usuario no encontrado.');
  if (u.user_type !== 'admin') throw new Error('Permiso denegado: se requiere rol de administrador.');
  return u;
}

function assertUser(db, userId) {
  const u = getUserById(db, userId);
  if (!u) throw new Error('No autenticado: usuario no encontrado.');
  return u;
}

// ============================================================
// ESTADO EN VIVO / AYUDA / REASIGNACIÓN
// ============================================================

function setEvaluatorStatusInternal(db, evaluatorId, status) {
  const sheet = getEvaluatorStatusSheet(db);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const eIdx = headers.indexOf('evaluator_id');
  const sIdx = headers.indexOf('status');
  const uaIdx = headers.indexOf('updated_at');
  const now = new Date();
  if (eIdx === -1) throw new Error('live_evaluator_status no tiene la columna evaluator_id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][eIdx]) === String(evaluatorId)) {
      if (sIdx > -1) sheet.getRange(i + 1, sIdx + 1).setValue(status);
      if (uaIdx > -1) sheet.getRange(i + 1, uaIdx + 1).setValue(now);
      return true;
    }
  }
  sheet.appendRow([evaluatorId, status, '', now]);
  return false;
}

function getHelpSheet(db) {
  let sheet = db.getSheetByName('help_requests');
  if (!sheet) {
    sheet = db.insertSheet('help_requests');
    sheet.appendRow(['id', 'evaluator_id', 'evaluator_name', 'message', 'status', 'created_at', 'resolved_at', 'resolved_by']);
  }
  return sheet;
}

function addHelpRequest(db, evaluator, message) {
  getHelpSheet(db).appendRow([
    Utilities.getUuid(), evaluator.id, evaluator.name, message, 'pending', new Date(), '', ''
  ]);
}

function logReassign(db, workId, oldEv, newEv, adminId, reason) {
  let sheet = db.getSheetByName('reassign_log');
  if (!sheet) {
    sheet = db.insertSheet('reassign_log');
    sheet.appendRow(['id', 'work_id', 'old_evaluator_id', 'new_evaluator_id', 'by_admin_id', 'reason', 'timestamp']);
  }
  sheet.appendRow([Utilities.getUuid(), workId, oldEv, newEv, adminId, reason, new Date()]);
}

// ============================================================
// PRESENTACIONES ORALES (Fase 2)
// ============================================================

function getOralPresentationsSheet_(db) {
  let sheet = db.getSheetByName(ORAL_PRESENTATIONS_SHEET);
  if (!sheet) {
    sheet = db.insertSheet(ORAL_PRESENTATIONS_SHEET);
    sheet.appendRow(ORAL_PRESENTATIONS_HEADERS.slice());
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(ORAL_PRESENTATIONS_HEADERS.slice());
  }
  return sheet;
}

function getOralPresentationByWork_(db, workId) {
  return getSheetData(db, ORAL_PRESENTATIONS_SHEET)
    .find(p => String(p.work_id) === String(workId)) || null;
}

function presentacionDeadlinePasada() {
  const limite = leerClaveConfig('presentation_deadline', '');
  if (!limite) return false;
  const fecha = new Date(limite);
  return !isNaN(fecha.getTime()) && new Date() > fecha;
}

// ============================================================
// HORARIOS Y AYUDAS DE IMPORTACIÓN
// ============================================================

function slotHora(index) {
  const total = index * MIN_POR_TURNO;
  return (HORA_INICIO + Math.floor(total / 60)) + ':' + String(total % 60).padStart(2, '0');
}

function normalizarHora(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) {
    return String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0');
  }
  const s = String(v).replace(/^'/, '').trim();
  const iso = s.match(/T(\d{2}):(\d{2})/);
  if (iso) return iso[1] + ':' + iso[2];
  const m = s.match(/(\d{1,2}):(\d{2})/);
  return m ? (m[1].padStart(2, '0') + ':' + m[2]) : '';
}

function facultadKey(facultad) {
  const s = String(facultad || '').trim().toLowerCase();
  if (s.indexOf('zaragoza') > -1) return 'FZ';
  if (s.indexOf('cuautitlan') > -1 || s.indexOf('cuautitlán') > -1) return 'FC';
  if (s.indexOf('quimica') > -1 || s.indexOf('química') > -1) return 'FQ';
  return null;
}

function lugarDeTrabajo_(work) {
  if (!work) return 'N/A';
  if (work.status === 'accepted_poster') return CARTEL_LUGAR;
  return String(work.auditorio || '').trim() ||
    (work.status === 'accepted_oral' ? AUDITORIO_UNICO : 'N/A');
}

function escapeHtml_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolverUrlCsv(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.indexOf('output=csv') > -1 || s.indexOf('format=csv') > -1) return s;
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return s;
  const gid = (s.match(/[#&?]gid=(\d+)/) || [])[1];
  let out = 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=csv';
  if (gid) out += '&gid=' + gid;
  return out;
}

function fetchCsv_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) {
    throw new Error('No se pudo descargar la hoja (HTTP ' + res.getResponseCode() + '). Verifica que esté publicada o con acceso de lectura.');
  }
  return res.getContentText();
}

function normalizarHeader(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .trim().toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsv(text) {
  const s = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map(normalizarHeader);
  return rows.slice(1)
    .filter(r => r.some(v => String(v).trim() !== ''))
    .map(r => {
      const o = {};
      headers.forEach((h, idx) => { if (h) o[h] = r[idx]; });
      return o;
    });
}

function slug_(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function parseFechaImport_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return new Date();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}
