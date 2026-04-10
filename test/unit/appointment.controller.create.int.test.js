import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock des modèles
vi.mock("../../models/index.js", () => {
  return {
    Appointment: {
      create: vi.fn(),
    },
    Client: {
      findAll: vi.fn(),
    },
    User: {},
  };
});

import { createAppointment } from "../../controllers/appointmentController.js";
import { Appointment, Client } from "../../models/index.js";

function makeReq(overrides = {}) {
  return {
    body: {
      date: "2099-12-31",
      time: "10:15",
      notes: "test",
      clientIds: ["1", "2"],
    },
    session: { user: { id: 1 } },
    flash: vi.fn(),
    ...overrides,
  };
}

function makeRes() {
  return {
    redirect: vi.fn(),
  };
}

describe("appointmentController.createAppointment (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse si utilisateur non connecté", async () => {
    const req = makeReq({ session: {} });
    const res = makeRes();
    const next = vi.fn();

    await createAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "Vous devez être connecté pour créer un rendez-vous."
    );
    expect(res.redirect).toHaveBeenCalledWith("/login");
    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it("refuse si date ou heure manquante", async () => {
    const req = makeReq({
      body: { date: "", time: "", clientIds: ["1"] },
    });
    const res = makeRes();
    const next = vi.fn();

    await createAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "La date et l’heure sont obligatoires."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/new");
  });

  it("refuse si aucun client", async () => {
    const req = makeReq({
      body: { date: "2099-12-31", time: "10:00", clientIds: [] },
    });
    const res = makeRes();
    const next = vi.fn();

    await createAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "Vous devez sélectionner au moins un client."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/new");
  });

  it("refuse si rendez-vous dans le passé", async () => {
    const req = makeReq({
      body: { date: "2000-01-01", time: "10:00", clientIds: ["1"] },
    });
    const res = makeRes();
    const next = vi.fn();

    await createAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "Vous ne pouvez pas créer un rendez-vous dans le passé."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/new");
  });

  it("refuse si client invalide", async () => {
    Client.findAll.mockResolvedValue([{ id: 1 }]);

    const req = makeReq({
      body: {
        date: "2099-12-31",
        time: "10:00",
        clientIds: ["1", "999"],
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await createAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "Un ou plusieurs clients sélectionnés sont invalides."
    );
    expect(res.redirect).toHaveBeenCalledWith("/appointments/new");
    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it("crée un rendez-vous valide", async () => {
    const setClients = vi.fn();

    Client.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    Appointment.create.mockResolvedValue({
      setClients,
    });

    const req = makeReq({
      body: {
        date: "2099-12-31",
        time: "10:15",
        clientIds: ["1", "2"],
        notes: "ok",
      },
    });
    const res = makeRes();
    const next = vi.fn();

    await createAppointment(req, res, next);

    expect(Appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        datetime: expect.any(Date),
        notes: "ok",
      })
    );

    expect(setClients).toHaveBeenCalledWith([1, 2]);

    expect(req.flash).toHaveBeenCalledWith("success", "Rendez-vous ajouté.");
    expect(res.redirect).toHaveBeenCalledWith("/appointments");
  });

  it("gère une erreur SequelizeValidationError", async () => {
    Client.findAll.mockResolvedValue([{ id: 1 }]);

    const validationError = {
      name: "SequelizeValidationError",
      errors: [{ message: "Erreur modèle" }],
    };

    Appointment.create.mockRejectedValue(validationError);

    const req = makeReq({
      body: {
        date: "2099-12-31",
        time: "10:00",
        clientIds: ["1"],
      },
    });

    const res = makeRes();
    const next = vi.fn();

    await createAppointment(req, res, next);

    expect(req.flash).toHaveBeenCalledWith("error", "Erreur modèle");
    expect(res.redirect).toHaveBeenCalledWith("/appointments/new");
    expect(next).not.toHaveBeenCalled();
  });

  it("si erreur inconnue -> next(err)", async () => {
    Client.findAll.mockResolvedValue([{ id: 1 }]);

    Appointment.create.mockRejectedValue(new Error("DB crash"));

    const req = makeReq({
      body: {
        date: "2099-12-31",
        time: "10:00",
        clientIds: ["1"],
      },
    });

    const res = makeRes();
    const next = vi.fn();

    await createAppointment(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toContain("DB crash");
  });
});