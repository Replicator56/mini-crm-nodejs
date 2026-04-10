import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock des models AVANT import du controller
vi.mock("../../models/index.js", () => {
  return {
    Appointment: {
      findByPk: vi.fn(),
      create: vi.fn(),
    },
    Client: {
      findAll: vi.fn(),
    },
    User: {},
  };
});

import { updateAppointment } from "../../controllers/appointmentController.js";
import { Appointment, Client } from "../../models/index.js";

function makeReq(overrides = {}) {
  return {
    params: { id: "42" },
    body: {
      date: "2099-12-31",
      time: "14:45",
      notes: "n",
      clientIds: ["1", "2"],
    },
    flash: vi.fn(),
    session: {},
    ...overrides,
  };
}

function makeRes() {
  return {
    redirect: vi.fn(),
    render: vi.fn(),
  };
}

describe("appointmentController.updateAppointment (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige /appointments si RDV introuvable", async () => {
    Appointment.findByPk.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(Appointment.findByPk).toHaveBeenCalledWith("42");
    expect(req.flash).toHaveBeenCalledWith("error", "Rendez-vous introuvable.");
    expect(res.redirect).toHaveBeenCalledWith("/appointments");
  });

  it("refuse la modification si la date ou l'heure manque", async () => {
    const apptInstance = {
      update: vi.fn(),
      setClients: vi.fn(),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);

    const req = makeReq({
      body: {
        date: "",
        time: "14:45",
        notes: "updated",
        clientIds: ["1"],
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "La date et l’heure sont obligatoires."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/42/edit");
    expect(apptInstance.update).not.toHaveBeenCalled();
    expect(apptInstance.setClients).not.toHaveBeenCalled();
  });

  it("refuse la modification si aucun client n'est sélectionné", async () => {
    const apptInstance = {
      update: vi.fn(),
      setClients: vi.fn(),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);

    const req = makeReq({
      body: {
        date: "2099-12-31",
        time: "14:45",
        notes: "updated",
        clientIds: [],
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "Vous devez sélectionner au moins un client."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/42/edit");
    expect(apptInstance.update).not.toHaveBeenCalled();
    expect(apptInstance.setClients).not.toHaveBeenCalled();
  });

  it("refuse la modification d'un rendez-vous dans le passé", async () => {
    const apptInstance = {
      update: vi.fn(),
      setClients: vi.fn(),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);

    const req = makeReq({
      body: {
        date: "2000-01-01",
        time: "10:00",
        notes: "updated",
        clientIds: ["1"],
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "Vous ne pouvez pas enregistrer un rendez-vous dans le passé."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/42/edit");
    expect(apptInstance.update).not.toHaveBeenCalled();
    expect(apptInstance.setClients).not.toHaveBeenCalled();
  });

  it("refuse la modification si un ou plusieurs clients sont invalides", async () => {
    const apptInstance = {
      update: vi.fn(),
      setClients: vi.fn(),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);

    Client.findAll.mockResolvedValue([{ id: 1 }]);

    const req = makeReq({
      body: {
        date: "2099-12-31",
        time: "14:45",
        notes: "updated",
        clientIds: ["1", "999"],
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "Un ou plusieurs clients sélectionnés sont invalides."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/42/edit");
    expect(apptInstance.update).not.toHaveBeenCalled();
    expect(apptInstance.setClients).not.toHaveBeenCalled();
  });

  it("met à jour et set les clients (clientIds array) puis redirect", async () => {
    const apptInstance = {
      update: vi.fn().mockResolvedValue(undefined),
      setClients: vi.fn().mockResolvedValue(undefined),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);
    Client.findAll.mockResolvedValue([{ id: 10 }, { id: 20 }]);

    const req = makeReq({
      body: {
        date: "2099-12-31",
        time: "14:45",
        notes: "updated",
        clientIds: ["10", "20", ""],
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(apptInstance.update).toHaveBeenCalledTimes(1);
    const payload = apptInstance.update.mock.calls[0][0];

    expect(payload.notes).toBe("updated");
    expect(payload.datetime).toBeInstanceOf(Date);

    expect(apptInstance.setClients).toHaveBeenCalledWith([10, 20]);

    expect(req.flash).toHaveBeenCalledWith("success", "Rendez-vous mis à jour.");
    expect(res.redirect).toHaveBeenCalledWith("/appointments");
  });

  it("accepte clientId (string) au lieu de clientIds", async () => {
    const apptInstance = {
      update: vi.fn().mockResolvedValue(undefined),
      setClients: vi.fn().mockResolvedValue(undefined),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);
    Client.findAll.mockResolvedValue([{ id: 7 }]);

    const req = makeReq({
      body: {
        date: "2099-12-31",
        time: "14:45",
        notes: "ok",
        clientId: "7",
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(apptInstance.setClients).toHaveBeenCalledWith([7]);
    expect(res.redirect).toHaveBeenCalledWith("/appointments");
  });

  it("utilise req.appointment s'il est déjà chargé par le middleware", async () => {
    const apptInstance = {
      update: vi.fn().mockResolvedValue(undefined),
      setClients: vi.fn().mockResolvedValue(undefined),
    };

    Client.findAll.mockResolvedValue([{ id: 1 }]);

    const req = makeReq({
      appointment: apptInstance,
      body: {
        date: "2099-12-31",
        time: "15:00",
        notes: "middleware loaded",
        clientIds: ["1"],
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(Appointment.findByPk).not.toHaveBeenCalled();
    expect(apptInstance.update).toHaveBeenCalled();
    expect(apptInstance.setClients).toHaveBeenCalledWith([1]);
    expect(res.redirect).toHaveBeenCalledWith("/appointments");
  });

  it("si Appointment.findByPk rejette -> next(err)", async () => {
    Appointment.findByPk.mockRejectedValue(new Error("db down"));

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toContain("db down");
  });

  it("si appointment.update rejette avec une erreur classique -> next(err) et setClients n'est pas appelé", async () => {
    Client.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const apptInstance = {
      update: vi.fn().mockRejectedValue(new Error("update failed")),
      setClients: vi.fn(),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toContain("update failed");
    expect(apptInstance.setClients).not.toHaveBeenCalled();
  });

  it("si appointment.update rejette avec une SequelizeValidationError -> flash + redirect", async () => {
    Client.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const validationError = {
      name: "SequelizeValidationError",
      errors: [{ message: "Validation modèle échouée." }],
    };

    const apptInstance = {
      update: vi.fn().mockRejectedValue(validationError),
      setClients: vi.fn(),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "Validation modèle échouée."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/42/edit");
    expect(next).not.toHaveBeenCalled();
    expect(apptInstance.setClients).not.toHaveBeenCalled();
  });

  it("si appointment.setClients rejette -> next(err)", async () => {
    Client.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const apptInstance = {
      update: vi.fn().mockResolvedValue(undefined),
      setClients: vi.fn().mockRejectedValue(new Error("setClients failed")),
    };
    Appointment.findByPk.mockResolvedValue(apptInstance);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await updateAppointment(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toContain("setClients failed");
  });
});