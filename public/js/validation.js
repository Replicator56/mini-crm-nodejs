document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', e => {
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value;
            const name = registerForm.name.value.trim();
            if (!name || !email || !password) {
                alert('Tous les champs sont requis.');
                e.preventDefault();
                return;
            }
            if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                alert('Email invalide.');
                e.preventDefault();
                return;
            }
            if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
                alert('Le mot de passe doit contenir 8+ caractères, maj, min, chiffre et symbole.');
                e.preventDefault();
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;
            if (!email || !password) {
                alert('Veuillez remplir tous les champs.');
                e.preventDefault();
            }
        });
    }

    const clientForm = document.getElementById('clientForm');
    if (clientForm) {
        clientForm.addEventListener('submit', e => {
            const name = clientForm.name.value.trim();
            const email = clientForm.email.value.trim();
            if (!name) {
                alert('Le nom du client est requis.');
                e.preventDefault();
                return;
            }
            if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                alert('Email du client invalide.');
                e.preventDefault();
            }
        });
    }

    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', e => {
            const clientId = appointmentForm.clientId?.value;
            const date = appointmentForm.date?.value;
            const time = appointmentForm.time?.value;
            if (!clientId) {
                alert('Veuillez choisir un client.');
                e.preventDefault();
                return;
            }
            if (!date || !time) {
                alert('Veuillez préciser la date et l’heure du rendez-vous.');
                e.preventDefault();
            }
        });
    }
});
