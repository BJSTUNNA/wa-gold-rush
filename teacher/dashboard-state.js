/**
 * Teacher Dashboard - Student Management & Progress Tracking
 * Handles student data, level assignment, and class statistics
 */

class TeacherDashboard {
    constructor() {
        this.students = [];
        this.gameConfig = null;
        this.classStats = {
            totalStudents: 0,
            averageNetWorth: 0,
            highestNetWorth: 0,
            wealthiestStudent: null,
            mostMinesOwned: 0,
            topMineOwner: null,
            averageRound: 0
        };
    }

    /**
     * Load game configuration
     */
    async loadConfig(configPath = '../shared/game-config.json') {
        try {
            const response = await fetch(configPath);
            this.gameConfig = await response.json();
            return true;
        } catch (error) {
            console.error('Failed to load game config:', error);
            return false;
        }
    }

    /**
     * Add a new student
     */
    addStudent(studentData) {
        const student = {
            id: this.generateStudentId(),
            name: studentData.name,
            email: studentData.email || '',
            level: studentData.level || 1,
            assignedDate: new Date().toISOString(),
            gameState: {
                round: 1,
                cash: 200,
                netWorth: 300,
                ownedMines: 1,
                machinery: 0,
                totalProfitLoss: 0,
                lastPlayed: null
            },
            createdAt: new Date().toISOString(),
            notes: ''
        };
        
        this.students.push(student);
        this.saveToLocalStorage();
        return student;
    }

    /**
     * Generate unique student ID
     */
    generateStudentId() {
        return 'STU' + Date.now() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Bulk import students from CSV or JSON.
     * Returns { added: [...], skipped: [...] }
     */
    bulkImportStudents(data, format = 'csv') {
        let rawStudents = [];

        if (format === 'csv') {
            // Parse CSV: name,email,level
            const lines = data.trim().split('\n');

            // Bug 1: detect header row by checking if the first line's third field
            // is a valid level integer (1–5). If not, treat it as a header and skip it.
            const firstFields = lines[0].split(',').map(s => s.trim());
            const firstLevelVal = firstFields.length >= 3 ? parseInt(firstFields[2], 10) : NaN;
            const firstLineIsHeader = isNaN(firstLevelVal) || firstLevelVal < 1 || firstLevelVal > 5;
            const dataLines = firstLineIsHeader ? lines.slice(1) : lines;

            const headerOffset = firstLineIsHeader ? 1 : 0;

            // Preserve original 1-based line numbers in the original pasted input (including header, if present)
            dataLines.forEach((line, idx) => {
                const originalRow = idx + 1 + headerOffset;
                if (line.trim() === '') return;  // Bug 2: skip blank/whitespace-only lines
                if (fields.length < 3) {
                    rawStudents.push({ _row: originalRow, _skipReason: `fewer than 3 fields` });
                    return;
                }
                const [name, email, level] = fields;
                rawStudents.push({ _row: originalRow, name, email, level: parseInt(level, 10) || 1 });
            });
        } else if (format === 'json') {
            const parsed = JSON.parse(data);
            // Bug 3: validate the parsed result is an array
            if (!Array.isArray(parsed)) {
                throw new Error('JSON must be an array of student objects, e.g. [{"name":"Alex","email":"","level":2}]');
            }
            // Bug 4: normalise common field-name variants; use ?? to avoid truthy-string short-circuit
            rawStudents = parsed.map((item, idx) => ({
                _row: idx + 1,
                name: item.name ?? item.Name ?? item.studentName ?? item.student_name ?? '',
                email: item.email ?? item.Email ?? '',
                level: parseInt(item.level ?? item.Level ?? item.assignedLevel, 10) || 1
            }));
        }

        const added = [];
        const skipped = [];

        rawStudents.forEach(studentData => {
            if (studentData._skipReason) {
                skipped.push({ row: studentData._row || '?', reason: studentData._skipReason });
                return;
            }
            // Bug 4 / Bug 7: skip records with no name after normalisation
            if (!studentData.name) {
                skipped.push({ row: studentData._row || '?', reason: 'Missing name' });
                return;
            }
            added.push(this.addStudent(studentData));
        });

        return { added, skipped };
    }

    /**
     * Update student level assignment
     */
    assignLevel(studentId, level) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            student.level = level;
            student.levelAssignedDate = new Date().toISOString();
            this.saveToLocalStorage();
            return { success: true, message: `Assigned Level ${level} to ${student.name}` };
        }
        return { success: false, error: 'Student not found' };
    }

    /**
     * Update student game state (from student's localStorage)
     */
    updateStudentProgress(studentId, gameStateData) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            student.gameState = {
                ...student.gameState,
                ...gameStateData,
                lastPlayed: new Date().toISOString()
            };
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Get student by ID
     */
    getStudent(studentId) {
        return this.students.find(s => s.id === studentId);
    }

    /**
     * Get all students
     */
    getAllStudents() {
        return this.students.sort((a, b) => b.gameState.netWorth - a.gameState.netWorth);
    }

    /**
     * Get students by level
     */
    getStudentsByLevel(level) {
        return this.students.filter(s => s.level === level);
    }

    /**
     * Calculate class statistics
     */
    calculateClassStats() {
        if (this.students.length === 0) {
            return this.classStats;
        }

        const totalNetWorth = this.students.reduce((sum, s) => sum + s.gameState.netWorth, 0);
        const totalRounds = this.students.reduce((sum, s) => sum + s.gameState.round, 0);
        
        const sortedByNetWorth = [...this.students].sort((a, b) => b.gameState.netWorth - a.gameState.netWorth);
        const sortedByMines = [...this.students].sort((a, b) => b.gameState.ownedMines - a.gameState.ownedMines);

        this.classStats = {
            totalStudents: this.students.length,
            averageNetWorth: totalNetWorth / this.students.length,
            highestNetWorth: sortedByNetWorth[0]?.gameState.netWorth || 0,
            wealthiestStudent: sortedByNetWorth[0],
            mostMinesOwned: sortedByMines[0]?.gameState.ownedMines || 0,
            topMineOwner: sortedByMines[0],
            averageRound: totalRounds / this.students.length
        };

        return this.classStats;
    }

    /**
     * Get leaderboard (sorted by net worth)
     */
    getLeaderboard() {
        return [...this.students]
            .sort((a, b) => b.gameState.netWorth - a.gameState.netWorth)
            .map((student, index) => ({
                rank: index + 1,
                ...student
            }));
    }

    /**
     * Upsert student progress from shared class gameplay record
     */
    syncFromPlayerRecord(record) {
        const studentId = record.studentId || record.playerKey;
        let student = this.students.find(s => s.id === studentId);

        if (!student) {
            student = {
                id: studentId,
                name: record.studentName || 'Unknown Student',
                email: '',
                level: 2,
                assignedDate: new Date().toISOString(),
                gameState: {
                    round: 1,
                    cash: 200,
                    netWorth: 300,
                    ownedMines: 1,
                    machinery: 0,
                    totalProfitLoss: 0,
                    averageRoundProfit: 0,
                    strategyLabel: '',
                    companyName: '',
                    lastPlayed: null
                },
                createdAt: new Date().toISOString(),
                notes: ''
            };
            this.students.push(student);
        }

        student.name = record.studentName || student.name;
        student.gameState = {
            ...student.gameState,
            round: record.round ?? student.gameState.round,
            cash: record.cash ?? student.gameState.cash,
            netWorth: record.netWorth ?? student.gameState.netWorth,
            ownedMines: record.minesOwned ?? student.gameState.ownedMines,
            machinery: record.machineryOwned ?? student.gameState.machinery,
            totalProfitLoss: record.totalProfitLoss ?? student.gameState.totalProfitLoss,
            averageRoundProfit: record.averageRoundProfit ?? student.gameState.averageRoundProfit,
            strategyLabel: record.strategyLabel ?? student.gameState.strategyLabel,
            companyName: record.companyName ?? student.gameState.companyName,
            lastPlayed: record.updatedAt || new Date().toISOString()
        };
        return student;
    }

    /**
     * Delete student
     */
    deleteStudent(studentId) {
        const index = this.students.findIndex(s => s.id === studentId);
        if (index !== -1) {
            const deleted = this.students.splice(index, 1)[0];
            this.saveToLocalStorage();
            return { success: true, message: `Deleted ${deleted.name}` };
        }
        return { success: false, error: 'Student not found' };
    }

    /**
     * Export class data as CSV
     */
    exportAsCSV() {
        const headers = ['Rank', 'Name', 'Email', 'Level', 'Net Worth', 'Cash', 'Mines', 'Machinery', 'Round', 'Total P/L'];
        const rows = this.getLeaderboard().map(student => [
            student.rank,
            student.name,
            student.email,
            student.level,
            student.gameState.netWorth.toFixed(2),
            student.gameState.cash.toFixed(2),
            student.gameState.ownedMines,
            student.gameState.machinery,
            student.gameState.round,
            student.gameState.totalProfitLoss.toFixed(2)
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return csv;
    }

    /**
     * Save to localStorage
     */
    saveToLocalStorage() {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                students: this.students
            };
            localStorage.setItem('teacher_dashboard', JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    /**
     * Load from localStorage
     */
    loadFromLocalStorage() {
        try {
            const data = JSON.parse(localStorage.getItem('teacher_dashboard'));
            if (data && data.students) {
                this.students = data.students;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return false;
        }
    }

    /**
     * Clear all data
     */
    clearAll() {
        this.students = [];
        localStorage.removeItem('teacher_dashboard');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeacherDashboard;
}
