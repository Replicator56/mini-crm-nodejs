console.log("validation.js chargé");

function getTodayLocalDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("date");

  if (dateInput) {
    dateInput.min = getTodayLocalDateString();
  }
});

document.addEventListener("submit", (e) => {
  const form = e.target;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  if (form.matches("#registerForm")) {
    const email = form.email.value.trim();
    const password = form.password.value;
    const name = form.name.value.trim();

    if (!name || !email || !password) {
      alert("Tous les champs sont requis.");
      e.preventDefault();
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      alert("Email invalide.");
      e.preventDefault();
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
      alert("Le mot de passe doit contenir 8+ caractères, maj, min, chiffre et symbole.");
      e.preventDefault();
      return;
    }
  }

  if (form.matches("#loginForm")) {
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      alert("Veuillez remplir tous les champs.");
      e.preventDefault();
      return;
    }
  }

  if (form.matches("#clientForm")) {
    const name = form.name.value.trim();
    const email = form.email.value.trim();

    if (!name) {
      alert("Le nom du client est requis.");
      e.preventDefault();
      return;
    }

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      alert("Email du client invalide.");
      e.preventDefault();
      return;
    }
  }

  if (form.matches("#appointmentForm")) {
    const clientIdsField = form.querySelector('[name="clientIds"]');
    const dateField = form.querySelector('[name="date"]');
    const timeField = form.querySelector('[name="time"]');

    const hasSelectedClient =
      clientIdsField &&
      (
        (clientIdsField instanceof HTMLSelectElement &&
          clientIdsField.multiple &&
          clientIdsField.selectedOptions.length > 0) ||
        (!!clientIdsField.value && clientIdsField.value.trim() !== "")
      );

    if (!hasSelectedClient) {
      alert("Veuillez choisir au moins un client.");
      e.preventDefault();
      return;
    }

    if (!dateField?.value || !timeField?.value) {
      alert("Veuillez préciser la date et l’heure du rendez-vous.");
      e.preventDefault();
      return;
    }

    const today = getTodayLocalDateString();

    if (dateField.value < today) {
      alert("Vous ne pouvez pas sélectionner une date passée.");
      e.preventDefault();
      return;
    }

    const selectedDateTime = new Date(`${dateField.value}T${timeField.value}`);
    const now = new Date();

    if (selectedDateTime < now) {
      alert("Vous ne pouvez pas sélectionner un rendez-vous dans le passé.");
      e.preventDefault();
      return;
    }
  }

  if (form.matches(".delete-form-client")) {
    const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?");
    if (!confirmed) {
      e.preventDefault();
      return;
    }
  }

  if (form.matches(".delete-form-appointment")) {
    const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?");
    if (!confirmed) {
      e.preventDefault();
    }
  }
});