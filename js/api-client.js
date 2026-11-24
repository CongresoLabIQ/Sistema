// --- GESTIÓN DE SESIÓN LOCAL ---
function saveSession(user) { localStorage.setItem('congreso_user', JSON.stringify(user)); }
function getSession() {
    try {
        return JSON.parse(localStorage.getItem('congreso_user'));
    } catch (e) {
        return null;
    }
}
function logoutUser() { localStorage.removeItem('congreso_user'); return Promise.resolve(true); }

// --- API CLIENTE ---
const apiClient = {
    // Autenticación
    async loginUser(email, password) {
        const result = await postData({
            action: 'login',
            email,
            password
        });
        if (result.success) saveSession(result.data.profile);
        return result;
    },

    // En api-client.js
    async registerUser(email, password, name, userType, groups = "", adminCode = "") {
        return await postData({
            action: 'register',
            email,
            password,
            name,
            user_type: userType,
            grupos_imparte: groups,
            admin_code: adminCode
        });
    },

    async getUserProfile(id) {
        const s = getSession();
        return (s && s.id === id) ? s : null;
    },

    async checkAuth() {
        const s = getSession();
        return s ? { user: { id: s.id } } : null;
    },

    logoutUser,

    // Trabajos
    async submitWork(workData, file) {
        try {
            const base64 = await toBase64(file);
                const body = JSON.stringify({
                action: 'submitWork',
                student_id: workData.student_id,
                title: workData.title,
                abstract: workData.abstract,
                semester: workData.semester,
                group: workData.group,
                facultad: workData.facultad,
                project_type: workData.project_type,
                asesores: workData.asesores,
                professor_cargo: workData.professor_cargo,
                professor_email: workData.professor_email,
                team_members: workData.team_members,
                modality: "Pendiente",
                fileName: file.name,
                fileBase64: base64.split(',')[1]
            });
            return await postDataRaw(body);
        } catch (e) { return { success: false, error: e.message }; }
    },

    async getStudentWorks(studentId) {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStudentWorks&studentId=${studentId}`);
        const json = await res.json();
        return json.success ? json.data : [];
    },

    async getAllWorks() {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getWorks`);
        const json = await res.json();
        return json.success ? json.data : [];
    },

    // Admin / Evaluadores
    async getEvaluators() {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEvaluators`);
        const json = await res.json();
        return json.success ? json.data : [];
    },

    async getAssignments() {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAssignments`);
        const json = await res.json();
        return json.success ? json.data : [];
    },

    async assignWork(workId, evaluatorId) {
        return await postData({
            action: 'assignWork',
            work_id: workId,
            evaluator_id: evaluatorId
        });
    },

    // ✅ NUEVO: Asignar TODOS los trabajos pendientes en una sola llamada al backend
    async assignAllPending() {
        return await postData({ action: 'assignAllPending' });
    },

    // Evaluación
    async submitEvaluation(evaluationData) {
        evaluationData.action = 'submitEvaluation';
        return await postData(evaluationData);
    },

    async batchFinalize() {
        return await postData({ action: 'batchFinalize' });
    },

    async previewFinalize() {
        return await postData({ action: 'previewFinalize' });
    },

    async applyFinalize(decisions) {
        return await postData({ action: 'applyFinalize', decisions });
    },

    async assignLiveWorks() {
        return await postData({ action: 'assignLiveWorks' });
    },

    async getLiveAssignments() {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getLiveAssignments`);
        const json = await res.json();
        return json.success ? json.data : [];
    },

    async submitLiveEvaluation(data) {
        data.action = 'submitLiveEvaluation';
        return await postData(data);
    },

    async getWinners() {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getWinners`);
        const json = await res.json();
        return json.success ? json.data : { oral: [], poster: [] };
    },

    async generateCertificates(workId) {
        return await postData({ action: 'generateCertificates', work_id: workId });
    },

    async getProfessorsBySemester(semester) {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getProfessorsBySemester&semester=${encodeURIComponent(semester)}`);
            return await res.json();
        } catch (e) { return { success: false, data: [] }; }
    },

    // Configuración del sistema
    async getConfig() {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getConfig`);
            const json = await res.json();
            return json.success ? json.data : {};
        } catch (e) { return {}; }
    },

    async setSubmissionDeadline(deadlineISO) {
        return await postData({ action: 'setSubmissionDeadline', deadline: deadlineISO });
    },

    async setConfig(key, value) {
        return await postData({ action: 'setConfig', key, value });
    },

    // Actividad de evaluadores
    async getEvaluatorActivity() {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEvaluatorActivity`);
            const json = await res.json();
            return json.success ? json.data : [];
        } catch (e) { return []; }
    },

    async registerActivity(status = 'available') {
        const s = getSession();
        if (!s) return { success: false };
        return await postData({ action: 'registerActivity', user_id: s.id, status });
    },

    // --- Dashboard en vivo, ayuda y operaciones de Fase 2 ---
    _sessionId() {
        return getSession()?.id || '';
    },

    async getLiveAdminDashboard() {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getLiveAdminDashboard&admin_user_id=${encodeURIComponent(this._sessionId())}`);
            const json = await res.json();
            return json.success ? json.data : null;
        } catch (e) { return null; }
    },

    async getPendingHelpSummary() {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPendingHelpSummary`);
            const json = await res.json();
            return json.success ? json.data : { count: 0, lastMessage: '', evaluators: '' };
        } catch (e) { return { count: 0, lastMessage: '', evaluators: '' }; }
    },

    async setEvaluatorStatus(evaluatorId, status) {
        return await postData({
            action: 'setEvaluatorStatus',
            admin_user_id: this._sessionId(),
            evaluator_id: evaluatorId,
            status
        });
    },

    async markEvaluatorAbsent(evaluatorId) {
        return await postData({
            action: 'markEvaluatorAbsent',
            admin_user_id: this._sessionId(),
            evaluator_id: evaluatorId
        });
    },

    async reactivateEvaluator(evaluatorId) {
        return await postData({
            action: 'reactivateEvaluator',
            admin_user_id: this._sessionId(),
            evaluator_id: evaluatorId
        });
    },

    async requestHelp(message) {
        return await postData({
            action: 'requestHelp',
            user_id: this._sessionId(),
            message
        });
    },

    async resolveHelpRequest(requestId, status = 'resolved') {
        return await postData({
            action: 'resolveHelpRequest',
            admin_user_id: this._sessionId(),
            request_id: requestId,
            status
        });
    },

    async reassignLiveEvaluator(workId, oldEvaluatorId, newEvaluatorId, reason = '') {
        return await postData({
            action: 'reassignLiveEvaluator',
            admin_user_id: this._sessionId(),
            work_id: workId,
            old_evaluator_id: oldEvaluatorId,
            new_evaluator_id: newEvaluatorId,
            reason
        });
    },

    // Sube la presentación oral (PDF/PPTX) de un trabajo aceptado como oral
    async submitPresentation(workId, studentId, file) {
        try {
            const base64 = await toBase64(file);
            const body = JSON.stringify({
                action: 'submitPresentation',
                work_id: workId,
                student_id: studentId,
                fileName: file.name,
                fileBase64: base64.split(',')[1]
            });
            return await postDataRaw(body);
        } catch (e) { return { success: false, error: e.message }; }
    },

    async notifyFinalResults() {
        return await postData({
            action: 'notifyFinalResults',
            admin_user_id: this._sessionId()
        });
    },

    async notifyEventReminder() {
        return await postData({
            action: 'notifyEventReminder',
            admin_user_id: this._sessionId()
        });
    },

    async notifyAgendaCorrection(facultad) {
        const payload = {
            action: 'notifyAgendaCorrection',
            admin_user_id: this._sessionId()
        };
        if (facultad) payload.facultad = facultad;
        return await postData(payload);
    },

    async assignSchedules() {
        return await postData({
            action: 'assignSchedules',
            admin_user_id: this._sessionId()
        });
    },

    async importFesZaragoza(worksCsvUrl, usersCsvUrl) {
        return await postData({
            action: 'importFesZaragoza',
            admin_user_id: this._sessionId(),
            works_csv_url: worksCsvUrl,
            users_csv_url: usersCsvUrl || ''
        });
    },

    async generatePremiacionMasiva() {
        return await postData({
            action: 'generatePremiacionMasiva',
            admin_user_id: this._sessionId()
        });
    },

    // Recuperación de contraseña
    async forgotPassword(email) {
        return await postData({
            action: 'forgotPassword',
            email
        });
    },

    async resetPassword(token, password) {
        return await postData({
            action: 'resetPassword',
            token,
            password
        });
    },

    // ✅ Método genérico POST expuesto para llamadas directas desde el HTML
    async post(data) {
        return await postData(data);
    }
};

// --- HELPERS ---
async function postData(data) {
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            redirect: "follow",
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) { return { success: false, error: e.message }; }
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

async function postDataRaw(body) {
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            redirect: 'follow',
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body
        });
        const responseText = await res.text();
        if (!responseText.trim()) {
            return { success: false, error: 'El servidor respondió sin contenido. Intenta enviar el trabajo nuevamente.' };
        }
        try {
            return JSON.parse(responseText);
        } catch (e) {
            return { success: false, error: 'El servidor respondió con un formato inesperado. Intenta nuevamente.' };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// Exponer globalmente
window.apiClient = apiClient;
window.supabaseClient = apiClient; // compatibilidad
