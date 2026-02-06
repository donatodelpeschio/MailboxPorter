function migrationApp() {
    return {
        migrating: false,
        logOutput: '',
        jobId: null,
        statusText: 'PRONTO',
        currentFolder: 'Attesa avvio...',
        progressPercent: 0,
        statsSummary: 'Messaggi: 0 / 0',
        showSummary: false,
        summaryData: {
            transferred: 0,
            skipped: 0,
            errors: 0,
            size: '0 MB',
            time: '0s'
        },
        pollInterval: null,

        init() {
            const savedJob = localStorage.getItem('active_job_id');
            if (savedJob) {
                this.jobId = savedJob;
                this.migrating = true;
                this.statusText = 'RECOVERY';
                this.startPolling();
            }
        },

        async testConnection(type) {
            Swal.fire({ title: 'Verifica...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const formData = new FormData(document.getElementById('mig-form'));
            formData.append('test_type', type);

            try {
                const res = await fetch('api/test_connection.php', { method: 'POST', body: formData });
                const data = await res.json();
                if(data.success) {
                    Swal.fire('Connesso!', data.message, 'success');
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Errore',
                        html: `<pre class="text-left text-[10px] bg-slate-100 p-2 overflow-auto max-h-40 font-mono">${data.debug || data.message}</pre>`
                    });
                }
            } catch (e) { Swal.fire('Errore', 'Errore API.', 'error'); }
        },

        async startMigration() {
            // 1. RESET DELLO STATO (Per nuove migrazioni dopo la prima)
            this.showSummary = false;
            this.logOutput = '> Inizializzazione...\n';
            this.progressPercent = 0;
            this.currentFolder = 'Avvio in corso...';
            this.statsSummary = 'Messaggi: 0 / 0';
            this.statusText = 'AVVIO';

            this.migrating = true;
            const formData = new FormData(document.getElementById('mig-form'));

            try {
                const response = await fetch('api/start_migration.php', { method: 'POST', body: formData });
                const data = await response.json();
                if (data.success) {
                    this.jobId = data.job_id;
                    localStorage.setItem('active_job_id', data.job_id);
                    this.statusText = 'IN CORSO';
                    this.startPolling();
                } else { throw new Error(data.message); }
            } catch (e) {
                this.logOutput += `> ERRORE: ${e.message}\n`;
                this.migrating = false;
            }
        },

        startPolling() {
            this.pollInterval = setInterval(async () => {
                if (!this.jobId) return;
                try {
                    const res = await fetch(`api/get_log.php?job_id=${this.jobId}`);
                    const data = await res.json();
                    if (data.success) {
                        const lines = data.content.split('\n');
                        this.logOutput = lines.filter(l => !l.match(/Modules|kill|PID|Perl|RCSfile|Load|Effective|Authen|IO|Mail|Net/)).join('\n');

                        this.$nextTick(() => {
                            const consoleDiv = document.getElementById('console-log');
                            if (consoleDiv) consoleDiv.scrollTop = consoleDiv.scrollHeight;
                        });

                        const folderMatch = this.logOutput.match(/Syncing folder "([^"]+)"/g);
                        if (folderMatch) {
                            const lastFolderLine = folderMatch[folderMatch.length - 1];
                            this.currentFolder = lastFolderLine.match(/"([^"]+)"/)[1];
                        }

                        const msgMatch = this.logOutput.match(/(\d+)\/(\d+) identified messages/);
                        if (msgMatch) {
                            const current = parseInt(msgMatch[1]);
                            const total = parseInt(msgMatch[2]);
                            this.progressPercent = Math.round((current / total) * 100);
                            this.statsSummary = `MESSAGGI: ${current} / ${total}`;
                        }

                        if (data.content.includes('Exiting with return value') || data.content.includes('Removing pidfile')) {
                            clearInterval(this.pollInterval);
                            this.migrating = false;
                            this.statusText = 'COMPLETATO';
                            this.currentFolder = 'Sincronizzazione Terminata! ✅';
                            this.progressPercent = 100;
                            this.parseFinalStats(data.content);
                            localStorage.removeItem('active_job_id');
                            Swal.fire('Fatto!', 'Migrazione completata.', 'success');
                        }

                        if (data.content.includes('failed login') || data.content.includes('AUTHENTICATION_FAILURE')) {
                            clearInterval(this.pollInterval);
                            this.migrating = false;
                            this.statusText = 'ERRORE';
                            this.currentFolder = 'Fallimento autenticazione ❌';
                            localStorage.removeItem('active_job_id');
                            Swal.fire('Errore', 'Autenticazione fallita.', 'error');
                        }
                    }
                } catch (e) { console.error(e); }
            }, 2000);
        },

        parseFinalStats(content) {
            const tr = content.match(/Messages transferred\s+:\s+(\d+)/);
            const sk = content.match(/Messages skipped\s+:\s+(\d+)/);
            const er = content.match(/Detected\s+(\d+)\s+errors/);
            const sz = content.match(/Total bytes transferred\s+:\s+(\d+)/); // Solo i byte
            const tm = content.match(/Transfer time\s+:\s+([\d\.]+)\s+sec/); // Solo il numero e sec

            // Conversione Byte -> MB con 2 decimali
            let sizeMb = '0 MB';
            if (sz && sz[1]) {
                const bytes = parseInt(sz[1]);
                sizeMb = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
            }

            this.summaryData = {
                transferred: tr ? tr[1] : 0,
                skipped: sk ? sk[1] : 0,
                errors: er ? er[1] : 0,
                size: sizeMb,
                time: tm ? tm[1] + ' sec.' : '0 sec.'
            };
            this.showSummary = true;
        }
    }
}