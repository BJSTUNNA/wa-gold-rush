/**
 * Shared Student Session Utilities
 * Handles reading/writing/clearing the active player session in localStorage.
 *
 * Storage key: wa_gold_rush_player_key
 * Shape:
 *   { studentId, studentName, username, assignedLevel, companyName, loginAt }
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.StudentSession = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const PLAYER_SESSION_KEY = 'wa_gold_rush_player_key';

    /**
     * Validate and normalise a raw session object.
     * Returns null if the shape is unrecognisable.
     * @param {any} raw  Already-parsed object (not a raw string)
     * @returns {{ studentId:string, studentName:string, username:string, assignedLevel:number, companyName:string, loginAt:string }|null}
     */
    function _normalise(raw) {
        if (!raw || typeof raw !== 'object') return null;

        return {
            studentId:     String(raw.studentId     || raw.playerKey || ''),
            studentName:   String(raw.studentName   || ''),
            username:      String(raw.username       || ''),
            assignedLevel: Number(raw.assignedLevel  || 2),
            companyName:   String(raw.companyName    || ''),
            loginAt:       String(raw.loginAt        || new Date().toISOString())
        };
    }

    /**
     * Get the current player session.
     * @returns {{ studentId, studentName, username, assignedLevel, companyName, loginAt }|null}
     */
    function getPlayerSession() {
        try {
            const raw = localStorage.getItem(PLAYER_SESSION_KEY);
            if (!raw) return null;

            // Legacy format: plain string UUID stored directly (not JSON object)
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return _normalise(parsed);
                }
            } catch (e) { /* not valid JSON */ }

            // Treat as legacy plain string UUID
            return {
                studentId:     raw,
                studentName:   '',
                username:      '',
                assignedLevel: 2,
                companyName:   '',
                loginAt:       ''
            };
        } catch (e) {
            console.warn('[StudentSession] Failed to parse session:', e);
            return null;
        }
    }

    /**
     * Set (overwrite) the current player session.
     * Merges over any existing session so callers can pass partial updates.
     * @param {object} sessionData
     */
    function setPlayerSession(sessionData) {
        try {
            const existing = getPlayerSession() || {};
            const next = _normalise({ ...existing, ...sessionData });
            if (!next) return;
            localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(next));
        } catch (e) {
            console.warn('[StudentSession] Failed to save session:', e);
        }
    }

    /**
     * Clear the current player session from localStorage.
     */
    function clearPlayerSession() {
        try {
            localStorage.removeItem(PLAYER_SESSION_KEY);
        } catch (e) {
            console.warn('[StudentSession] Failed to clear session:', e);
        }
    }

    return { getPlayerSession, setPlayerSession, clearPlayerSession, PLAYER_SESSION_KEY };
}));
