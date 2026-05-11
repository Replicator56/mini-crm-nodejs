import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { register } from "../helpers/auth.js";
import { extractCsrfToken } from "../helpers/csrf.js";
import { sequelize, Appointment, Client } from "../../models/index.js";

function futureDate(daysToAdd = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split("T")[0];
}

async function createClientViaUI(agent, { name, email }) {
  const page = await agent.get("/clients/new");
  expect(page.status).toBe(200);
  const csrf = extractCsrfToken(page.text);

  const res = await agent.post("/clients").type("form").send({
    _csrf: csrf,
    name,
    email,
    phone: "0600000000",
    notes: "notes",
  });

  expect(res.status).toBe(302);
  expect(res.headers.location).toBe("/clients");
}

async function createAppointmentViaUI(agent, { date, time, notes, clientIds }) {
  const page = await agent.get("/appointments/new");
  expect(page.status).toBe(200);
  const csrf = extractCsrfToken(page.text);

  const res = await agent.post("/appointments").type("form").send({
    _csrf: csrf,
    date,
    time,
    notes,
    clientIds,
  });

  expect(res.status).toBe(302);
  expect(res.headers.location).toBe("/appointments");
}

async function getAppointmentParticipantsIds(appointmentId) {
  const appt = await Appointment.findByPk(appointmentId);
  const clients = await appt.getClients({ order: [["id", "ASC"]] });
  return clients.map((c) => c.id);
}

describe("PUT /appointments/:id — update (DB-driven)", () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  it("met à jour datetime + notes + participants (pivot)", async () => {
    const agent = request.agent(app);

    const reg = await register(agent, {
      name: "User1",
      email: "u1@example.com",
      password: "Str0ng!Passw0rd",
    });

    expect(reg.status).toBe(302);
    expect(reg.headers.location).toBe("/clients");

    await createClientViaUI(agent, { name: "Client A", email: "a@example.com" });
    await createClientViaUI(agent, { name: "Client B", email: "b@example.com" });

    const clients = await Client.findAll({ order: [["id", "ASC"]] });
    expect(clients.length).toBeGreaterThanOrEqual(2);

    const clientAId = clients[0].id;
    const clientBId = clients[1].id;

    await createAppointmentViaUI(agent, {
      date: futureDate(10),
      time: "10:30",
      notes: "initial",
      clientIds: [String(clientAId)],
    });

    const rdvBefore = await Appointment.findOne({ order: [["id", "DESC"]] });
    expect(rdvBefore).toBeTruthy();

    const rdvId = rdvBefore.id;

    const beforeParticipants = await getAppointmentParticipantsIds(rdvId);
    expect(beforeParticipants).toEqual([clientAId]);

    const editPage = await agent.get(`/appointments/${rdvId}/edit`);
    expect(editPage.status).toBe(200);

    const csrf = extractCsrfToken(editPage.text);

    const updateDate = futureDate(11);

    const updateRes = await agent
      .put(`/appointments/${rdvId}`)
      .type("form")
      .send({
        _csrf: csrf,
        date: updateDate,
        time: "14:45",
        notes: "updated",
        clientIds: [String(clientAId), String(clientBId)],
      });

    expect(updateRes.status).toBe(302);
    expect(updateRes.headers.location).toBe("/appointments");

    const rdvAfter = await Appointment.findByPk(rdvId);
    expect(rdvAfter.notes).toBe("updated");

    const d = new Date(rdvAfter.datetime);
    const expectedDate = new Date(updateDate);

    expect(d.getFullYear()).toBe(expectedDate.getFullYear());
    expect(d.getMonth()).toBe(expectedDate.getMonth());
    expect(d.getDate()).toBe(expectedDate.getDate());
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(45);

    const afterParticipants = await getAppointmentParticipantsIds(rdvId);
    expect(afterParticipants).toEqual([clientAId, clientBId].sort((a, b) => a - b));
  });

  it("refuse date/heure invalide (redirect edit) et ne modifie pas la DB", async () => {
    const agent = request.agent(app);

    await register(agent, {
      name: "User1",
      email: "u2@example.com",
      password: "Str0ng!Passw0rd",
    });

    await createClientViaUI(agent, { name: "Client A", email: "a2@example.com" });

    const [clientA] = await Client.findAll({ order: [["id", "ASC"]] });

    await createAppointmentViaUI(agent, {
      date: futureDate(10),
      time: "10:30",
      notes: "initial",
      clientIds: [String(clientA.id)],
    });

    const rdv = await Appointment.findOne({ order: [["id", "DESC"]] });
    const rdvId = rdv.id;
    const oldDatetime = new Date(rdv.datetime).getTime();

    const editPage = await agent.get(`/appointments/${rdvId}/edit`);
    const csrf = extractCsrfToken(editPage.text);

    const res = await agent.put(`/appointments/${rdvId}`).type("form").send({
      _csrf: csrf,
      date: "not-a-date",
      time: "25:99",
      notes: "should-not-apply",
      clientIds: [String(clientA.id)],
    });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/appointments/${rdvId}/edit`);

    const rdvAfter = await Appointment.findByPk(rdvId);
    expect(rdvAfter.notes).toBe("initial");
    expect(new Date(rdvAfter.datetime).getTime()).toBe(oldDatetime);
  });

  it("refuse si aucun client sélectionné (redirect edit) et ne modifie pas le pivot", async () => {
    const agent = request.agent(app);

    await register(agent, {
      name: "User1",
      email: "u3@example.com",
      password: "Str0ng!Passw0rd",
    });

    await createClientViaUI(agent, { name: "Client A", email: "a3@example.com" });

    const [clientA] = await Client.findAll({ order: [["id", "ASC"]] });

    await createAppointmentViaUI(agent, {
      date: futureDate(10),
      time: "10:30",
      notes: "initial",
      clientIds: [String(clientA.id)],
    });

    const rdv = await Appointment.findOne({ order: [["id", "DESC"]] });
    const rdvId = rdv.id;

    const editPage = await agent.get(`/appointments/${rdvId}/edit`);
    const csrf = extractCsrfToken(editPage.text);

    const res = await agent.put(`/appointments/${rdvId}`).type("form").send({
      _csrf: csrf,
      date: futureDate(11),
      time: "12:00",
      notes: "should-not-apply",
      clientIds: [],
    });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/appointments/${rdvId}/edit`);

    const rdvAfter = await Appointment.findByPk(rdvId);
    expect(rdvAfter.notes).toBe("initial");

    const participants = await getAppointmentParticipantsIds(rdvId);
    expect(participants).toEqual([clientA.id]);
  });

  it("refuse l’update si pas propriétaire (owner check) et ne modifie rien", async () => {
    const agent1 = request.agent(app);

    await register(agent1, {
      name: "Owner",
      email: "owner@example.com",
      password: "Str0ng!Passw0rd",
    });

    await createClientViaUI(agent1, { name: "Client A", email: "oa@example.com" });

    const [clientA] = await Client.findAll({ order: [["id", "ASC"]] });

    await createAppointmentViaUI(agent1, {
      date: futureDate(10),
      time: "10:30",
      notes: "owner-rdv",
      clientIds: [String(clientA.id)],
    });

    const rdv = await Appointment.findOne({ order: [["id", "DESC"]] });
    const rdvId = rdv.id;

    const agent2 = request.agent(app);

    await register(agent2, {
      name: "Attacker",
      email: "attacker@example.com",
      password: "Str0ng!Passw0rd",
    });

    const edit = await agent2.get(`/appointments/${rdvId}/edit`);
    expect(edit.status).toBe(302);
    expect(edit.headers.location).toBe("/appointments");

    const rdvAfter = await Appointment.findByPk(rdvId);
    expect(rdvAfter.notes).toBe("owner-rdv");

    const participants = await getAppointmentParticipantsIds(rdvId);
    expect(participants).toEqual([clientA.id]);
  });
});